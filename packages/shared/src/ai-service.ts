/**
 * AI Service Layer with API Key Management
 * Supports Chrome Built-in AI, OpenAI, Claude, and local fallbacks
 */

export interface AIProvider {
  name: string;
  available: boolean;
  requiresApiKey: boolean;
}

export interface AIExplanation {
  text: string;
  confidence: number;
  source: 'chrome-ai' | 'openai' | 'claude' | 'gemini' | 'local';
  complexity: 'beginner' | 'intermediate' | 'advanced';
}

export interface AIServiceConfig {
  openaiApiKey?: string;
  claudeApiKey?: string;
  geminiApiKey?: string;
  preferredProvider?: 'chrome-ai' | 'openai' | 'claude' | 'gemini' | 'local';
  fallbackEnabled: boolean;
}

export class AIService {
  private config: AIServiceConfig;
  private providers: Map<string, AIProvider> = new Map();

  constructor(config: AIServiceConfig = { fallbackEnabled: true }) {
    this.config = config;
    this.initializeProviders();
  }

  private async initializeProviders(): Promise<void> {
    // Chrome Built-in AI (no API key needed)
    this.providers.set('chrome-ai', {
      name: 'Chrome Built-in AI',
      available: await this.checkChromeAI(),
      requiresApiKey: false
    });

    // OpenAI GPT
    this.providers.set('openai', {
      name: 'OpenAI GPT',
      available: !!this.config.openaiApiKey,
      requiresApiKey: true
    });

    // Claude
    this.providers.set('claude', {
      name: 'Anthropic Claude',
      available: !!this.config.claudeApiKey,
      requiresApiKey: true
    });

    // Google Gemini
    this.providers.set('gemini', {
      name: 'Google Gemini',
      available: !!this.config.geminiApiKey,
      requiresApiKey: true
    });

    // Local algorithms (always available)
    this.providers.set('local', {
      name: 'Local Analysis',
      available: true,
      requiresApiKey: false
    });
  }

  private async checkChromeAI(): Promise<boolean> {
    try {
      // Check if browser supports Chrome built-in AI
      // This will be false in Edge and other non-Chrome browsers
      if (typeof globalThis === 'undefined') return false;
      if (typeof chrome === 'undefined') return false;
      
      // @ts-ignore - Chrome AI APIs are experimental
      if (!chrome.ai) return false;
      
      // @ts-ignore - Chrome AI APIs are experimental
      return typeof chrome?.ai?.create === 'function';
    } catch (error) {
      console.log('[AI Service] Chrome AI not available (likely Edge or other browser):', error);
      return false;
    }
  }

  async explainFinancialText(text: string, context?: string): Promise<AIExplanation> {
    const providers = this.getProviderPriority();
    
    for (const provider of providers) {
      try {
        console.log(`[AI Service] Trying ${provider}...`);
        const result = await this.callProvider(provider, text, context);
        if (result) return result;
      } catch (error) {
        console.warn(`[AI Service] ${provider} failed:`, error);
        if (!this.config.fallbackEnabled) throw error;
      }
    }

    throw new Error('All AI providers failed');
  }

  private getProviderPriority(): string[] {
    const preferred = this.config.preferredProvider || 'chrome-ai';
    const available = Array.from(this.providers.entries())
      .filter(([, provider]) => provider.available)
      .map(([name]) => name);

    // Prioritize preferred provider, then fallback order
    const priority = [preferred, 'chrome-ai', 'openai', 'claude', 'gemini', 'local'];
    return priority.filter(p => available.includes(p));
  }

  private async callProvider(provider: string, text: string, context?: string): Promise<AIExplanation | null> {
    switch (provider) {
      case 'chrome-ai':
        return this.useChromeAI(text, context);
      
      case 'openai':
        return this.useOpenAI(text, context);
      
      case 'claude':
        return this.useClaude(text, context);
      
      case 'gemini':
        return this.useGemini(text, context);
      
      case 'local':
        return this.useLocalAnalysis(text, context);
      
      default:
        return null;
    }
  }

  private async useChromeAI(text: string, context?: string): Promise<AIExplanation> {
    try {
      // @ts-ignore - Chrome AI APIs are experimental
      const ai = await chrome.ai.create({
        systemPrompt: 'You are a financial literacy expert. Explain financial terms in simple language.'
      });

      const prompt = context 
        ? `Explain this financial text in context: "${text}"\nContext: ${context}`
        : `Explain this financial term: "${text}"`;

      // @ts-ignore
      const result = await ai.prompt(prompt);

      return {
        text: result,
        confidence: 0.9,
        source: 'chrome-ai',
        complexity: this.assessComplexity(text)
      };
    } catch (error) {
      console.warn('[AI Service] Chrome AI not available:', error);
      throw error;
    }
  }

  private async useOpenAI(text: string, context?: string): Promise<AIExplanation> {
    if (!this.config.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a financial literacy expert. Explain financial terms in simple, clear language for beginners.'
          },
          {
            role: 'user',
            content: context 
              ? `Explain this financial text: "${text}"\nContext: ${context}`
              : `Explain this financial term: "${text}"`
          }
        ],
        max_tokens: 200,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      text: data.choices[0].message.content,
      confidence: 0.95,
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
    // Use our existing local analysis logic directly
    const analysis = this.performLocalAnalysis(text);

    // Generate basic explanation using local knowledge
    const explanation = this.generateLocalExplanation(text, analysis);

    return {
      text: explanation,
      confidence: analysis.confidence,
      source: 'local',
      complexity: analysis.complexity
    };
  }

  private performLocalAnalysis(text: string): any {
    const words = text.toLowerCase().split(/\s+/);
    const financialWords = words.filter(word => 
      ['investment', 'profit', 'loss', 'stock', 'bond', 'dividend', 'interest', 'rate'].includes(word)
    );
    
    return {
      confidence: Math.min(0.8, financialWords.length / Math.max(5, words.length)),
      sentiment: 'neutral',
      complexity: 'intermediate',
      keyInsights: financialWords.length > 0 ? ['Contains financial terminology'] : ['General text']
    };
  }

  private generateLocalExplanation(text: string, analysis: any): string {
    const financialTerms = {
      'interest rate': 'The cost of borrowing money, usually expressed as a percentage',
      'dividend': 'A payment made by companies to their shareholders',
      'portfolio': 'A collection of investments owned by an investor',
      'roi': 'Return on Investment - how much profit you make compared to what you invested',
      'bull market': 'A period when stock prices are rising',
      'bear market': 'A period when stock prices are falling',
      'volatility': 'How much the price of an investment goes up and down'
    };

    const lowerText = text.toLowerCase();
    for (const [term, definition] of Object.entries(financialTerms)) {
      if (lowerText.includes(term)) {
        return `${term.charAt(0).toUpperCase() + term.slice(1)}: ${definition}`;
      }
    }

    return `This appears to be ${analysis.sentiment} financial content with ${analysis.complexity} complexity level. ${analysis.keyInsights.join(' ')}`;
  }

  private assessComplexity(text: string): 'beginner' | 'intermediate' | 'advanced' {
    const complexTerms = ['derivatives', 'arbitrage', 'liquidity', 'volatility', 'correlation'];
    const intermediateTerms = ['portfolio', 'dividend', 'yield', 'margin', 'equity'];
    
    const lowerText = text.toLowerCase();
    
    if (complexTerms.some(term => lowerText.includes(term))) {
      return 'advanced';
    }
    
    if (intermediateTerms.some(term => lowerText.includes(term))) {
      return 'intermediate';
    }
    
    return 'beginner';
  }

  // API Key management methods
  async setApiKey(provider: 'openai' | 'claude' | 'gemini', apiKey: string): Promise<void> {
    if (provider === 'openai') {
      this.config.openaiApiKey = apiKey;
    } else if (provider === 'claude') {
      this.config.claudeApiKey = apiKey;
    } else if (provider === 'gemini') {
      this.config.geminiApiKey = apiKey;
    }

    // Store securely in Chrome extension storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({
        [`${provider}_api_key`]: apiKey
      });
    }

    await this.initializeProviders();
  }

  async loadApiKeys(): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.local.get(['openai_api_key', 'claude_api_key', 'gemini_api_key']);
      
      if (result.openai_api_key) {
        this.config.openaiApiKey = result.openai_api_key;
      }
      
      if (result.claude_api_key) {
        this.config.claudeApiKey = result.claude_api_key;
      }

      if (result.gemini_api_key) {
        this.config.geminiApiKey = result.gemini_api_key;
      }
      
      await this.initializeProviders();
    }
  }

  getAvailableProviders(): AIProvider[] {
    return Array.from(this.providers.values());
  }
}

// Export singleton instance
export const aiService = new AIService();