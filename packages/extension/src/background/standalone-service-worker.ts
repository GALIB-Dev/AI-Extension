export {};
/**
 * Standalone Service Worker with embedded AI functionality
 * Avoids ES module import issues by inlining all dependencies
 */

/**
 * Extend the chrome type to include the experimental ai property.
 */
declare global {
  interface ChromeAITextSession {
    prompt(prompt: string): Promise<string>;
  }
  interface ChromeAI {
    createTextSession(): Promise<ChromeAITextSession>;
  }
  interface Chrome {
    ai?: ChromeAI;
  }
  // Ensure the global chrome variable is typed correctly
  // (Removed problematic redeclaration of 'chrome' variable)
}

// AI Service Configuration Interface
interface AIServiceConfig {
  openaiApiKey?: string;
  claudeApiKey?: string;
  geminiApiKey?: string;
  preferredProvider?: 'chrome-ai' | 'openai' | 'claude' | 'gemini' | 'local';
  fallbackEnabled: boolean;
  enableCloudAI?: boolean;
}

// AI Response Interface
interface AIExplanation {
  text: string;
  confidence: number;
  source: 'chrome-ai' | 'openai' | 'claude' | 'gemini' | 'local';
  complexity: 'beginner' | 'intermediate' | 'advanced';
}

// Embedded AI Service
class EmbeddedAIService {
  private config: AIServiceConfig = {
    fallbackEnabled: true
  };

  async loadApiKeys(): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.local.get([
        'openai_api_key', 
        'claude_api_key', 
        'gemini_api_key',
        'enable_cloud_ai'
      ]);
      
      this.config.openaiApiKey = result.openai_api_key;
      this.config.claudeApiKey = result.claude_api_key;
      this.config.geminiApiKey = result.gemini_api_key;
      this.config.enableCloudAI = result.enable_cloud_ai === true;
    }
  }

  async explainFinancialText(text: string, context?: string): Promise<AIExplanation> {
    // Try Chrome Built-in AI first if available
    try {
      if (typeof chrome !== 'undefined' && (chrome as Chrome).ai) {
        return await this.useChromeAI(text, context);
      }
    } catch (error) {
      console.log('[EonMentor] Chrome AI not available:', error);
    }

    // If cloud AI disabled globally, go straight to local
    if (!this.config.enableCloudAI) {
      console.log('[EonMentor] Cloud AI disabled by user setting, using local analysis');
      return this.useLocalAnalysis(text, context);
    }

    // Try OpenAI if API key is configured
    if (this.config.openaiApiKey) {
      try {
        return await this.useOpenAI(text, context);
      } catch (error) {
        console.log('[EonMentor] OpenAI failed:', error);
      }
    }

    // Try Claude if API key is configured
    if (this.config.claudeApiKey) {
      try {
        return await this.useClaude(text, context);
      } catch (error) {
        console.log('[EonMentor] Claude failed:', error);
      }
    }

    // Try Gemini if API key is configured
    if (this.config.geminiApiKey) {
      try {
        return await this.useGemini(text, context);
      } catch (error) {
        console.log('[EonMentor] Gemini failed:', error);
      }
    }

    // Fall back to local analysis
    return this.useLocalAnalysis(text, context);
  }

  private async useChromeAI(text: string, context?: string): Promise<AIExplanation> {
    // @ts-ignore - Chrome AI APIs are experimental
    const session = await chrome.ai.createTextSession();
    
    const prompt = context 
      ? `As a financial literacy expert, explain this financial text in simple terms: "${text}"\nContext: ${context}`
      : `As a financial literacy expert, explain this financial term in simple terms: "${text}"`;
    
    const result = await session.prompt(prompt);
    
    return {
      text: result,
      confidence: 0.95,
      source: 'chrome-ai',
      complexity: this.assessComplexity(text)
    };
  }

  private async useOpenAI(text: string, context?: string): Promise<AIExplanation> {
    if (!this.config.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: context 
              ? `As a financial literacy expert, explain this financial text in simple terms: "${text}"\nContext: ${context}`
              : `As a financial literacy expert, explain this financial term in simple terms: "${text}"`
          }
        ],
        max_tokens: 150,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      text: data.choices[0].message.content,
      confidence: 0.94,
      source: 'openai',
      complexity: this.assessComplexity(text)
    };
  }

  private async useClaude(text: string, context?: string): Promise<AIExplanation> {
    if (!this.config.claudeApiKey) {
      throw new Error('Claude API key not configured');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.config.claudeApiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: context 
              ? `As a financial literacy expert, explain this financial text in simple terms: "${text}"\nContext: ${context}`
              : `As a financial literacy expert, explain this financial term in simple terms: "${text}"`
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      text: data.content[0].text,
      confidence: 0.93,
      source: 'claude',
      complexity: this.assessComplexity(text)
    };
  }

  private async useGemini(text: string, context?: string): Promise<AIExplanation> {
    if (!this.config.geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.config.geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: context 
              ? `As a financial literacy expert, explain this financial text in simple terms: "${text}"\nContext: ${context}\n\nProvide a clear, concise explanation in 1-2 sentences.`
              : `As a financial literacy expert, explain this financial term in simple terms: "${text}"\n\nProvide a clear, concise explanation in 1-2 sentences.`
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 200
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      text: data.candidates[0].content.parts[0].text,
      confidence: 0.91,
      source: 'gemini',
      complexity: this.assessComplexity(text)
    };
  }

  private async useLocalAnalysis(text: string, _context?: string): Promise<AIExplanation> {
    // Simple local analysis - identify financial terms and provide basic explanation
    const financialKeywords = [
      'inflation', 'gdp', 'interest', 'recession', 'investment', 'portfolio',
      'dividend', 'stock', 'bond', 'market', 'profit', 'loss', 'revenue'
    ];
    
    const words = text.toLowerCase().split(/\W+/);
    const foundKeywords = words.filter(word => financialKeywords.includes(word));
    
    let explanation = '';
    if (foundKeywords.length > 0) {
      explanation = `This text contains financial terms related to: ${foundKeywords.join(', ')}. `;
      explanation += 'These are important concepts in finance and economics that affect money, investments, and economic conditions.';
    } else {
      explanation = 'This appears to be general text. While it may contain financial concepts, no specific financial terminology was identified.';
    }

    return {
      text: explanation,
      confidence: 0.7,
      source: 'local',
      complexity: this.assessComplexity(text)
    };
  }

  private assessComplexity(text: string): 'beginner' | 'intermediate' | 'advanced' {
    const advancedTerms = ['derivatives', 'arbitrage', 'volatility', 'beta', 'alpha', 'correlation'];
    const intermediateTerms = ['portfolio', 'diversification', 'compound', 'yield', 'equity'];
    
    const lowerText = text.toLowerCase();
    
    if (advancedTerms.some(term => lowerText.includes(term))) {
      return 'advanced';
    } else if (intermediateTerms.some(term => lowerText.includes(term))) {
      return 'intermediate';
    }
    return 'beginner';
  }
}

// Financial Terms Interface
interface FinancialTerm {
  term: string;
  simple: string;
  detail: string;
  category?: string;
}

// Request/Response Interfaces
interface ExplanationRequest {
  type: 'EXPLAIN_TEXT';
  payload: { text: string };
}

interface ExplanationResponse {
  explanation: string;
  terms: FinancialTerm[];
  summary?: string;
  confidence?: number;
  error?: string;
}

// Main Service Worker Class
class EonMentorServiceWorker {
  private readonly aiService: EmbeddedAIService;
  private readonly financialTerms: FinancialTerm[] = [
    { term: "Inflation", simple: "Rising prices that reduce buying power", detail: "When average price levels increase over time, making money worth less", category: "monetary" },
    { term: "GDP", simple: "Total value of a country's economic output", detail: "Gross Domestic Product measures all goods and services produced", category: "economic" },
    { term: "Interest Rate", simple: "Cost of borrowing or reward for saving money", detail: "Percentage charged on loans or paid on deposits", category: "monetary" },
    { term: "Fiscal Policy", simple: "Government spending and taxation decisions", detail: "How governments use budgets to influence the economy", category: "policy" },
    { term: "Monetary Policy", simple: "Central bank control of money supply", detail: "Actions by central banks to manage inflation and employment", category: "policy" },
    { term: "Federal Reserve", simple: "The US central bank", detail: "Independent agency that controls American monetary policy", category: "institution" },
    { term: "Stock Market", simple: "Where company shares are bought and sold", detail: "Public exchanges for trading corporate securities", category: "markets" },
    { term: "Recession", simple: "Period of economic decline", detail: "Two consecutive quarters of negative economic growth", category: "economic" },
    { term: "Bull Market", simple: "Period of rising stock prices", detail: "Sustained upward trend in market values", category: "markets" },
    { term: "Bear Market", simple: "Period of falling stock prices", detail: "20% or greater decline from recent highs", category: "markets" },
    { term: "Unemployment Rate", simple: "Percentage of people actively seeking work", detail: "Key indicator of economic health and labor market conditions", category: "economic" },
    { term: "Consumer Price Index", simple: "Measure of inflation based on common purchases", detail: "CPI tracks price changes for typical household goods and services", category: "economic" },
    { term: "Supply and Demand", simple: "Market forces that determine prices", detail: "When supply exceeds demand, prices fall; when demand exceeds supply, prices rise", category: "economic" },
    { term: "Market Cap", simple: "Total value of a company's shares", detail: "Market capitalization = share price × number of shares outstanding", category: "markets" },
    { term: "Dividend", simple: "Cash payment to shareholders", detail: "Portion of company profits distributed to stock owners", category: "investments" }
  ];

  constructor() {
    this.aiService = new EmbeddedAIService();
    this.setupMessageListener();
    console.log('[EonMentor] Standalone service worker initialized');
  }

  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((
      message: ExplanationRequest,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: ExplanationResponse) => void
    ): boolean => {
      console.log('[EonMentor Service Worker] Received message:', message.type);

      if (message.type === 'EXPLAIN_TEXT') {
        console.log('[EonMentor Service Worker] Processing EXPLAIN_TEXT request');
        
        this.handleExplainText(message.payload.text)
          .then(response => {
            console.log('[EonMentor Service Worker] Sending response:', response);
            sendResponse(response);
          })
          .catch(error => {
            console.error('[EonMentor Service Worker] Error processing text:', error);
            const errorResponse = {
              explanation: '',
              terms: [],
              error: 'Failed to process text'
            };
            console.log('[EonMentor Service Worker] Sending error response:', errorResponse);
            sendResponse(errorResponse);
          });
        
        return true; // Keep message channel open for async response
      }

      console.log('[EonMentor Service Worker] Unknown message type, ignoring');
      return false;
    });

    // Persistent port channel for more reliable messaging
    chrome.runtime.onConnect.addListener((port) => {
      if (!port.name || !port.name.startsWith('EONMENTOR_PORT')) return;
      console.log('[EonMentor Service Worker] Port connected:', port.name);
      port.onMessage.addListener(async (msg: any) => {
        if (!msg || msg.type !== 'EXPLAIN_TEXT') return;
        const cid = msg._cid;
        try {
          const res = await this.handleExplainText(msg.payload?.text || '');
          (res as any)._cid = cid;
          port.postMessage(res);
        } catch (err) {
          port.postMessage({
            explanation: '',
            terms: [],
            error: 'Failed to process text',
            _cid: cid
          });
        }
      });
      port.onDisconnect.addListener(() => {
        console.log('[EonMentor Service Worker] Port disconnected:', port.name);
      });
    });
  }

  private async handleExplainText(text: string): Promise<ExplanationResponse> {
    console.log('[EonMentor Service Worker] Analyzing text:', text.substring(0, 100) + '...');

    if (!text || text.length < 10) {
      return {
        explanation: '',
        terms: [],
        error: 'Text too short to analyze'
      };
    }

    try {
      // Initialize AI service and load API keys
      console.log('[EonMentor Service Worker] Loading API keys...');
      await this.aiService.loadApiKeys();
      
      // Try AI analysis first
  console.log('[EonMentor Service Worker] Attempting AI analysis (cloud enabled:', this.aiService['config'].enableCloudAI, ')');
      const aiResult = await this.aiService.explainFinancialText(text);
      
      if (aiResult && aiResult.text && aiResult.text.length > 0) {
        console.log('[EonMentor Service Worker] AI analysis successful, source:', aiResult.source);
        
        // Also find local financial terms for additional context
        const foundTerms = this.findFinancialTerms(text);
        
        return {
          explanation: aiResult.text,
          terms: foundTerms,
          summary: text.length > 150 ? this.generateSummary(text) : undefined,
          confidence: aiResult.confidence || 0.8
        };
      }
      
  console.log('[EonMentor Service Worker] AI analysis failed or unavailable, using local fallback');
      return this.handleLocalAnalysis(text);
      
    } catch (error) {
      console.error('[EonMentor Service Worker] AI service error, falling back to local:', error);
      return this.handleLocalAnalysis(text);
    }
  }

  private handleLocalAnalysis(text: string): ExplanationResponse {
    console.log('[EonMentor Service Worker] Using local analysis fallback');
    
    const foundTerms = this.findFinancialTerms(text);
    const summary = text.length > 150 ? this.generateSummary(text) : undefined;
    const confidence = this.calculateConfidence(foundTerms, text);
    const explanation = this.generateExplanation(foundTerms, text, confidence);

    return {
      explanation,
      terms: foundTerms,
      summary,
      confidence
    };
  }

  private findFinancialTerms(text: string): FinancialTerm[] {
    const normalizedText = text.toLowerCase();
    const found: FinancialTerm[] = [];
    
    for (const term of this.financialTerms) {
      const termVariations = [
        term.term.toLowerCase(),
        term.term.toLowerCase().replace(/\s+/g, ''),
        ...this.getTermSynonyms(term.term)
      ];
      
      if (termVariations.some(variation => normalizedText.includes(variation))) {
        found.push(term);
      }
    }
    
    return found
      .filter((term, index, array) => array.findIndex(t => t.term === term.term) === index)
      .sort((a, b) => (a.category || '').localeCompare(b.category || ''));
  }

  private getTermSynonyms(term: string): string[] {
    const synonyms: { [key: string]: string[] } = {
      'GDP': ['gross domestic product', 'gdp'],
      'Federal Reserve': ['fed', 'central bank', 'federal reserve'],
      'Stock Market': ['stock exchange', 'equity market', 'share market'],
      'Interest Rate': ['interest rates', 'borrowing rate', 'lending rate'],
      'Consumer Price Index': ['cpi', 'price index'],
      'Market Cap': ['market capitalization', 'market value']
    };
    
    return synonyms[term] || [];
  }

  private generateSummary(text: string, maxSentences: number = 2): string {
    const sentences = text.split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20);
    
    if (sentences.length <= maxSentences) {
      return sentences.join('. ') + '.';
    }
    
    // Simple scoring based on financial terms and length
    const scored = sentences.map(sentence => {
      let score = 0;
      const words = sentence.toLowerCase().match(/\b\w{3,}\b/g) || [];
      
      words.forEach(word => {
        if (this.financialTerms.some(term => term.term.toLowerCase().includes(word))) {
          score += 2;
        }
      });
      
      return { sentence, score: score / Math.max(words.length, 1) };
    });
    
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSentences)
      .map(item => item.sentence)
      .join('. ') + '.';
  }

  private calculateConfidence(foundTerms: FinancialTerm[], text: string): number {
    let confidence = 0;
    
    // Base confidence on number of terms found
    confidence += Math.min(foundTerms.length * 0.2, 0.6);
    
    // Bonus for longer text (more context)
    if (text.length > 100) confidence += 0.1;
    if (text.length > 300) confidence += 0.1;
    
    // Bonus for category diversity
    const categories = new Set(foundTerms.map(term => term.category));
    confidence += Math.min(categories.size * 0.1, 0.2);
    
    return Math.min(confidence, 1);
  }

  private generateExplanation(foundTerms: FinancialTerm[], text: string, confidence: number): string {
    if (foundTerms.length === 0) {
      return `This text (${text.length} characters) does not contain commonly recognized financial terms. It may discuss general economic concepts or business topics.`;
    }
    
    const categories = this.groupTermsByCategory(foundTerms);
    let explanation = `Found ${foundTerms.length} financial term${foundTerms.length === 1 ? '' : 's'} `;
    
    if (categories.length > 1) {
      explanation += `across ${categories.length} categories: ${categories.join(', ')}.`;
    } else {
      explanation += `related to ${categories[0]}.`;
    }
    
    if (confidence > 0.7) {
      explanation += ' This appears to be financial or economic content.';
    } else if (confidence > 0.4) {
      explanation += ' This text contains some financial concepts.';
    } else {
      explanation += ' Financial terms are present but may not be the main focus.';
    }
    
    return explanation;
  }

  private groupTermsByCategory(foundTerms: FinancialTerm[]): string[] {
    const categoryMap: { [key: string]: string } = {
      'monetary': 'monetary policy',
      'economic': 'economic indicators', 
      'policy': 'government policy',
      'institution': 'financial institutions',
      'markets': 'financial markets',
      'investments': 'investments'
    };
    
    const categories = new Set(
      foundTerms
        .map(term => term.category || 'general')
        .map(category => categoryMap[category] || category)
    );
    
    return Array.from(categories);
  }
}

// Initialize the service worker
new EonMentorServiceWorker();