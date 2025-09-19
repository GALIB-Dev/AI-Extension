import { aiService } from '../../../shared/src/ai-service';

interface FinancialTerm {
  term: string;
  simple: string;
  detail: string;
  category?: string;
}

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

class EonMentorServiceWorker {
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
    this.setupMessageListener();
    console.log('[EonMentor] Service worker initialized with', this.financialTerms.length, 'financial terms');
  }

  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((
      message: ExplanationRequest,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response: ExplanationResponse) => void
    ): boolean => {
      console.log('[EonMentor Service Worker] Received message:', message.type);
      console.log('[EonMentor Service Worker] Message payload:', message.payload);
      console.log('[EonMentor Service Worker] Sender:', sender);

      if (message.type === 'EXPLAIN_TEXT') {
        console.log('[EonMentor Service Worker] Processing EXPLAIN_TEXT request');
        this.handleExplainText(message.payload.text)
          .then((response) => {
            console.log('[EonMentor Service Worker] Sending response:', response);
            sendResponse(response);
          })
          .catch((error) => {
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
  }

  private async handleExplainText(text: string): Promise<ExplanationResponse> {
    console.log('[EonMentor Service Worker] Analyzing text:', text.substring(0, 100) + '...');
    console.log('[EonMentor Service Worker] Text length:', text.length);

    if (!text || text.length < 10) {
      console.log('[EonMentor Service Worker] Text too short, returning error');
      return {
        explanation: '',
        terms: [],
        error: 'Text too short to analyze'
      };
    }

    try {
      // Initialize AI service and load API keys
      console.log('[EonMentor Service Worker] Initializing AI service...');
      await aiService.loadApiKeys();
      
      // Try AI analysis first
      console.log('[EonMentor Service Worker] Attempting AI analysis...');
      const aiResult = await aiService.explainFinancialText(text);
      
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
      
      // Fallback to local analysis if AI fails
      console.log('[EonMentor Service Worker] AI analysis returned empty result, using local fallback');
      return this.handleLocalAnalysis(text);
      
    } catch (error) {
      console.error('[EonMentor Service Worker] AI service error:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          console.log('[EonMentor Service Worker] API key issue, using local analysis');
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          console.log('[EonMentor Service Worker] Network issue, using local analysis');
        }
      }
      
      // Fallback to local analysis on error
      return this.handleLocalAnalysis(text);
    }
  }

  private async handleLocalAnalysis(text: string): Promise<ExplanationResponse> {
    console.log('[EonMentor Service Worker] Using local analysis fallback');
    
    // Find financial terms in the text
    const foundTerms = this.findFinancialTerms(text);
    console.log('[EonMentor Service Worker] Found terms:', foundTerms.map(t => t.term));
    
    // Generate summary for longer texts
    const summary = text.length > 150 ? this.generateSummary(text) : undefined;
    console.log('[EonMentor Service Worker] Generated summary:', summary);
    
    // Calculate confidence based on terms found and text length
    const confidence = this.calculateConfidence(foundTerms, text);
    console.log('[EonMentor Service Worker] Calculated confidence:', confidence);
    
    // Generate explanation
    const explanation = this.generateExplanation(foundTerms, text, confidence);
    console.log('[EonMentor Service Worker] Generated explanation:', explanation);

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
      
      const isFound = termVariations.some(variation => 
        normalizedText.includes(variation)
      );
      
      if (isFound) {
        found.push(term);
      }
    }
    
    // Remove duplicates and sort by category
    return found
      .filter((term, index, arr) => 
        arr.findIndex(t => t.term === term.term) === index
      )
      .sort((a, b) => (a.category || '').localeCompare(b.category || ''));
  }

  private getTermSynonyms(term: string): string[] {
    const synonyms: Record<string, string[]> = {
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
    // Simple extractive summarization
    const sentences = text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20);
    
    if (sentences.length <= maxSentences) {
      return sentences.join('. ') + '.';
    }

    // Score sentences based on word frequency and financial term presence
    const wordFreq = this.calculateWordFrequency(text);
    
    const scoredSentences = sentences.map(sentence => {
      const words = sentence.toLowerCase().match(/\b\w{3,}\b/g) || [];
      let score = 0;
      
      // Score based on word frequency
      words.forEach(word => {
        score += wordFreq[word] || 0;
      });
      
      // Bonus for financial terms
      if (this.containsFinancialTerms(sentence)) {
        score *= 1.5;
      }
      
      // Normalize by sentence length
      score = score / Math.max(words.length, 1);
      
      return { sentence, score };
    });

    return scoredSentences
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSentences)
      .map(item => item.sentence)
      .join('. ') + '.';
  }

  private calculateWordFrequency(text: string): Record<string, number> {
    const words = text.toLowerCase().match(/\b\w{3,}\b/g) || [];
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
      'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
      'might', 'must', 'can', 'this', 'that', 'these', 'those', 'they', 'them'
    ]);
    
    const freq: Record<string, number> = {};
    
    words.forEach(word => {
      if (!stopWords.has(word) && word.length > 2) {
        freq[word] = (freq[word] || 0) + 1;
      }
    });
    
    return freq;
  }

  private containsFinancialTerms(text: string): boolean {
    const normalized = text.toLowerCase();
    return this.financialTerms.some(term => 
      normalized.includes(term.term.toLowerCase())
    );
  }

  private calculateConfidence(terms: FinancialTerm[], text: string): number {
    let confidence = 0;
    
    // Base confidence from term count
    confidence += Math.min(terms.length * 0.2, 0.6);
    
    // Bonus for text length (longer = more context)
    if (text.length > 100) confidence += 0.1;
    if (text.length > 300) confidence += 0.1;
    
    // Bonus for multiple term categories
    const categories = new Set(terms.map(t => t.category));
    confidence += Math.min(categories.size * 0.1, 0.2);
    
    return Math.min(confidence, 1.0);
  }

  private generateExplanation(terms: FinancialTerm[], text: string, confidence: number): string {
    if (terms.length === 0) {
      return `This text (${text.length} characters) does not contain commonly recognized financial terms. It may discuss general economic concepts or business topics.`;
    }
    
    const categories = this.groupTermsByCategory(terms);
    let explanation = `Found ${terms.length} financial term${terms.length === 1 ? '' : 's'} `;
    
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

  private groupTermsByCategory(terms: FinancialTerm[]): string[] {
    const categoryMap: Record<string, string> = {
      'monetary': 'monetary policy',
      'economic': 'economic indicators',
      'policy': 'government policy',
      'institution': 'financial institutions',
      'markets': 'financial markets',
      'investments': 'investments'
    };
    
    const categories = new Set(
      terms
        .map(t => t.category || 'general')
        .map(cat => categoryMap[cat] || cat)
    );
    
    return Array.from(categories);
  }
}

// Initialize service worker
new EonMentorServiceWorker();