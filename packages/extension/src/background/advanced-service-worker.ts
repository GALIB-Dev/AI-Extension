/**
 * Advanced Service Worker with AI-powered analysis and intelligent caching
 */

// Import types and interfaces
interface FinancialEntity {
  text: string;
  type: 'currency' | 'percentage' | 'company' | 'institution' | 'metric';
  value?: number;
  context?: string;
}

interface AnalysisResult {
  confidence: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  complexity: 'beginner' | 'intermediate' | 'advanced';
  topics: string[];
  entities: FinancialEntity[];
  summary?: string;
  keyInsights: string[];
}

// Advanced text analyzer implementation
class AdvancedTextAnalyzer {
  private stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should']);
  
  private financialTerms = new Set([
    'investment', 'portfolio', 'dividend', 'equity', 'bond', 'stock', 'share', 'market',
    'roi', 'return', 'profit', 'loss', 'revenue', 'expense', 'asset', 'liability',
    'debt', 'credit', 'loan', 'mortgage', 'interest', 'rate', 'yield', 'compound',
    'inflation', 'deflation', 'recession', 'bull', 'bear', 'volatility', 'risk'
  ]);

  analyze(text: string): AnalysisResult {
    const tokens = this.tokenize(text);
    const financialScore = this.calculateFinancialScore(tokens);
    const sentiment = this.analyzeSentiment(text);
    const complexity = this.assessComplexity(text, tokens);
    const entities = this.extractEntities(text);
    const topics = this.extractTopics(tokens);

    return {
      confidence: Math.min(0.95, 0.6 + (financialScore * 0.35)),
      sentiment,
      complexity,
      topics,
      entities,
      keyInsights: this.generateInsights(text, entities, sentiment)
    };
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 2 && !this.stopWords.has(token));
  }

  private calculateFinancialScore(tokens: string[]): number {
    const financialTokens = tokens.filter(token => this.financialTerms.has(token));
    return Math.min(1, financialTokens.length / Math.max(10, tokens.length));
  }

  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['profit', 'gain', 'growth', 'increase', 'up', 'rise', 'bull', 'opportunity', 'strong'];
    const negativeWords = ['loss', 'decline', 'decrease', 'down', 'fall', 'bear', 'risk', 'weak', 'crash'];
    
    const words = text.toLowerCase().split(/\s+/);
    const positiveCount = words.filter(word => positiveWords.some(pos => word.includes(pos))).length;
    const negativeCount = words.filter(word => negativeWords.some(neg => word.includes(neg))).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private assessComplexity(text: string, tokens: string[]): 'beginner' | 'intermediate' | 'advanced' {
    const avgWordLength = tokens.reduce((sum, token) => sum + token.length, 0) / tokens.length;
    const sentenceCount = text.split(/[.!?]+/).length;
    const avgSentenceLength = tokens.length / sentenceCount;
    
    if (avgWordLength > 6 || avgSentenceLength > 20) return 'advanced';
    if (avgWordLength > 4 || avgSentenceLength > 12) return 'intermediate';
    return 'beginner';
  }

  private extractEntities(text: string): FinancialEntity[] {
    const entities: FinancialEntity[] = [];
    
    // Extract percentages
    const percentageRegex = /(\d+(?:\.\d+)?)%/g;
    let match;
    while ((match = percentageRegex.exec(text)) !== null) {
      entities.push({
        text: match[0],
        type: 'percentage',
        value: parseFloat(match[1])
      });
    }
    
    // Extract currency amounts
    const currencyRegex = /\$(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;
    while ((match = currencyRegex.exec(text)) !== null) {
      entities.push({
        text: match[0],
        type: 'currency',
        value: parseFloat(match[1].replace(/,/g, ''))
      });
    }
    
    return entities;
  }

  private extractTopics(tokens: string[]): string[] {
    const topicMap = new Map<string, number>();
    
    tokens.forEach(token => {
      if (this.financialTerms.has(token)) {
        topicMap.set(token, (topicMap.get(token) || 0) + 1);
      }
    });
    
    return Array.from(topicMap.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic);
  }

  private generateInsights(text: string, entities: FinancialEntity[], sentiment: string): string[] {
    const insights: string[] = [];
    
    if (entities.length > 0) {
      insights.push(`Found ${entities.length} financial metrics in the text`);
    }
    
    if (sentiment !== 'neutral') {
      insights.push(`Overall sentiment appears ${sentiment}`);
    }
    
    if (text.length > 200) {
      insights.push('This is a detailed financial text that may require careful analysis');
    }
    
    return insights;
  }
}

// Advanced cache implementation
class AdvancedCache {
  private memoryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private maxMemorySize = 100;

  async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const memoryItem = this.memoryCache.get(key);
    if (memoryItem && Date.now() - memoryItem.timestamp < memoryItem.ttl) {
      return memoryItem.data as T;
    }

    // Remove expired item from memory
    if (memoryItem) {
      this.memoryCache.delete(key);
    }

    return null;
  }

  async set<T>(key: string, value: T, ttl: number = 3600000): Promise<void> {
    // Add to memory cache
    this.memoryCache.set(key, {
      data: value,
      timestamp: Date.now(),
      ttl
    });

    // Maintain memory cache size
    if (this.memoryCache.size > this.maxMemorySize) {
      const oldestKey = this.memoryCache.keys().next().value;
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
      }
    }
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();
  }

  async getStats(): Promise<{ memorySize: number; totalRequests: number }> {
    return {
      memorySize: this.memoryCache.size,
      totalRequests: this.memoryCache.size
    };
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    for (const [key, item] of this.memoryCache.entries()) {
      if (now - item.timestamp >= item.ttl) {
        this.memoryCache.delete(key);
      }
    }
  }
}

// Create global instances
const cache = new AdvancedCache();

interface AdvancedExplanationRequest {
  type: 'EXPLAIN_TEXT' | 'GET_STATS' | 'CLEAR_CACHE';
  payload?: { 
    text?: string; 
    forceRefresh?: boolean;
    analysisLevel?: 'basic' | 'detailed' | 'comprehensive';
  };
}

interface AdvancedExplanationResponse {
  explanation: string;
  analysis?: AnalysisResult;
  cached?: boolean;
  processingTime?: number;
  error?: string;
  stats?: any;
}

class AdvancedServiceWorker {
  private analyzer = new AdvancedTextAnalyzer();
  private requestCount = 0;
  private totalProcessingTime = 0;
  private cacheHits = 0;

  constructor() {
    this.setupMessageListener();
    this.schedulePeriodicCleanup();
    console.log('[EonMentor Advanced] Service worker initialized with AI-powered analysis');
    console.log('[EonMentor Advanced] Browser:', this.detectBrowser());
  }

  private detectBrowser(): string {
    if (typeof chrome !== 'undefined') {
      // @ts-ignore
      if (chrome.ai) return 'Chrome (with AI support)';
      if (navigator.userAgent.includes('Edg/')) return 'Microsoft Edge';
      return 'Chrome-based browser';
    }
    return 'Unknown browser';
  }

  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((
      message: AdvancedExplanationRequest,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: AdvancedExplanationResponse) => void
    ): boolean => {
      console.log('[EonMentor Advanced] Received message:', message.type);

      switch (message.type) {
        case 'EXPLAIN_TEXT':
          this.handleAdvancedExplainText(message.payload?.text || '', {
            forceRefresh: message.payload?.forceRefresh || false,
            analysisLevel: message.payload?.analysisLevel || 'detailed'
          })
            .then(sendResponse)
            .catch((error) => {
              console.error('[EonMentor Advanced] Error processing text:', error);
              sendResponse({
                explanation: 'Advanced analysis failed. Please try again.',
                error: error.message
              });
            });
          return true;

        case 'GET_STATS':
          this.getServiceStats()
            .then(stats => sendResponse({ explanation: '', stats }))
            .catch(error => sendResponse({ explanation: '', error: error.message }));
          return true;

        case 'CLEAR_CACHE':
          cache.clear()
            .then(() => sendResponse({ explanation: 'Cache cleared successfully' }))
            .catch(error => sendResponse({ explanation: '', error: error.message }));
          return true;

        default:
          return false;
      }
    });
  }

  private async handleAdvancedExplainText(
    text: string, 
    options: { forceRefresh: boolean; analysisLevel: string }
  ): Promise<AdvancedExplanationResponse> {
    const startTime = performance.now();
    this.requestCount++;

    if (!text || text.length < 10) {
      return {
        explanation: 'Text too short for meaningful analysis (minimum 10 characters)',
        processingTime: performance.now() - startTime
      };
    }

    // Generate cache key based on text and analysis level
    const cacheKey = this.generateCacheKey(text, options.analysisLevel);
    
    // Try to get from cache unless forced refresh
    if (!options.forceRefresh) {
      try {
        const cachedResult = await cache.get<AdvancedExplanationResponse>(cacheKey);
        if (cachedResult) {
          this.cacheHits++;
          return {
            ...cachedResult,
            cached: true,
            processingTime: performance.now() - startTime
          };
        }
      } catch (error) {
        console.warn('[EonMentor Advanced] Cache read error:', error);
      }
    }

    // Perform advanced analysis
    try {
      const analysis = this.analyzer.analyze(text);
      const explanation = this.generateAdvancedExplanation(analysis, text);
      
      const result: AdvancedExplanationResponse = {
        explanation,
        analysis,
        cached: false,
        processingTime: performance.now() - startTime
      };

      // Cache the result
      try {
        await cache.set(cacheKey, result, this.getCacheTTL(analysis.confidence));
      } catch (error) {
        console.warn('[EonMentor Advanced] Cache write error:', error);
      }

      this.totalProcessingTime += result.processingTime!;
      return result;
      
    } catch (error) {
      console.error('[EonMentor Advanced] Analysis error:', error);
      return {
        explanation: 'Analysis engine encountered an error. Please try again.',
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: performance.now() - startTime
      };
    }
  }

  private generateCacheKey(text: string, analysisLevel: string): string {
    // Create hash-like key from text and options
    const textHash = this.simpleHash(text.toLowerCase().trim());
    return `analysis_${analysisLevel}_${textHash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private getCacheTTL(confidence: number): number {
    // Higher confidence = longer cache time
    const baseTTL = 1000 * 60 * 30; // 30 minutes
    const confidenceMultiplier = 1 + confidence;
    return Math.floor(baseTTL * confidenceMultiplier);
  }

  private generateAdvancedExplanation(analysis: AnalysisResult, originalText: string): string {
    const parts: string[] = [];

    // Header with confidence and complexity
    parts.push(`🧠 **Advanced Financial Analysis** (${Math.round(analysis.confidence * 100)}% confidence)`);
    
    // Complexity and sentiment indicators
    const indicators = [
      `📊 ${analysis.complexity.toUpperCase()} level`,
      `💭 ${analysis.sentiment.toUpperCase()} sentiment`
    ];
    parts.push(indicators.join(' • '));

    // Topics section
    if (analysis.topics.length > 0) {
      parts.push(`\n🎯 **Key Topics:** ${analysis.topics.join(', ')}`);
    }

    // Entities section
    if (analysis.entities.length > 0) {
      parts.push('\n💰 **Financial Data Found:**');
      analysis.entities.forEach(entity => {
        const value = entity.value ? ` (${entity.value})` : '';
        parts.push(`• ${entity.text}${value} [${entity.type.toUpperCase()}]`);
      });
    }

    // Summary section
    if (analysis.summary) {
      parts.push(`\n📝 **Smart Summary:**\n${analysis.summary}`);
    }

    // Key insights
    if (analysis.keyInsights.length > 0) {
      parts.push('\n💡 **Key Insights:**');
      analysis.keyInsights.forEach(insight => {
        parts.push(`• ${insight}`);
      });
    }

    // Complexity-specific advice
    parts.push(this.getComplexityAdvice(analysis.complexity));

    // Word count and reading stats
    const wordCount = originalText.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200); // ~200 WPM average
    parts.push(`\n📖 **Text Stats:** ${wordCount} words • ~${readingTime} min read`);

    return parts.join('\n');
  }

  private getComplexityAdvice(complexity: string): string {
    const advice = {
      beginner: '\n🎓 **For Beginners:** This content covers fundamental financial concepts. Great starting point!',
      intermediate: '\n📈 **Intermediate Level:** Requires basic financial knowledge. Consider reviewing key terms if unfamiliar.',
      advanced: '\n🎯 **Advanced Content:** Complex financial concepts discussed. May require specialized knowledge.'
    };

    return advice[complexity as keyof typeof advice] || '';
  }

  private async getServiceStats(): Promise<any> {
    const cacheStats = await cache.getStats();
    
    return {
      service: {
        requestCount: this.requestCount,
        cacheHits: this.cacheHits,
        averageProcessingTime: this.requestCount > 0 ? 
          Math.round(this.totalProcessingTime / this.requestCount) : 0,
        cacheHitRate: this.requestCount > 0 ? 
          Math.round((this.cacheHits / this.requestCount) * 100) : 0
      },
      cache: cacheStats,
      performance: {
        totalProcessingTime: Math.round(this.totalProcessingTime),
        requestsPerMinute: this.calculateRPM()
      }
    };
  }

  private calculateRPM(): number {
    // Simple RPM calculation (would be more accurate with time windows)
    const uptime = performance.now() / (1000 * 60); // minutes
    return uptime > 0 ? Math.round(this.requestCount / uptime) : 0;
  }

  private schedulePeriodicCleanup(): void {
    // Clean up cache every 30 minutes
    setInterval(async () => {
      try {
        await cache.cleanup();
        console.log('[EonMentor Advanced] Periodic cache cleanup completed');
      } catch (error) {
        console.warn('[EonMentor Advanced] Cache cleanup error:', error);
      }
    }, 30 * 60 * 1000);
  }
}

// Initialize advanced service worker
new AdvancedServiceWorker();