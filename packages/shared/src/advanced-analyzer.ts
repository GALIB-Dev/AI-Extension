/**
 * Advanced Financial Text Analysis Engine
 * Uses multiple algorithms for term extraction, sentiment analysis, and text processing
 */

export interface AnalysisResult {
  confidence: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  complexity: 'beginner' | 'intermediate' | 'advanced';
  topics: string[];
  entities: FinancialEntity[];
  summary?: string;
  keyInsights: string[];
}

export interface FinancialEntity {
  text: string;
  type: 'currency' | 'percentage' | 'company' | 'institution' | 'metric';
  value?: number;
  context?: string;
}

export interface TermVector {
  term: string;
  tfidf: number;
  frequency: number;
  positions: number[];
}

export class AdvancedTextAnalyzer {
  private readonly stopWords = new Set([
    'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
    'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
    'might', 'must', 'can', 'this', 'that', 'these', 'those', 'they', 'them',
    'their', 'there', 'then', 'than', 'when', 'where', 'how', 'why', 'what',
    'which', 'who', 'whom', 'whose', 'if', 'unless', 'until', 'while'
  ]);

  private readonly sentimentLexicon = {
    positive: new Set([
      'growth', 'increase', 'rise', 'gain', 'profit', 'boom', 'bull', 'strong',
      'robust', 'healthy', 'positive', 'upward', 'recovery', 'improvement',
      'expansion', 'success', 'benefit', 'advantage', 'opportunity', 'optimistic'
    ]),
    negative: new Set([
      'decline', 'fall', 'loss', 'crash', 'bear', 'weak', 'poor', 'negative',
      'downward', 'recession', 'crisis', 'risk', 'threat', 'problem', 'concern',
      'volatility', 'instability', 'uncertainty', 'pessimistic', 'collapse'
    ])
  };

  private readonly complexityIndicators = {
    beginner: new Set([
      'money', 'buy', 'sell', 'price', 'cost', 'save', 'spend', 'bank', 'loan'
    ]),
    intermediate: new Set([
      'investment', 'portfolio', 'dividend', 'interest', 'mortgage', 'credit',
      'debt', 'budget', 'insurance', 'retirement', 'stock', 'bond'
    ]),
    advanced: new Set([
      'derivative', 'leverage', 'arbitrage', 'hedging', 'volatility', 'liquidity',
      'algorithmic', 'quantitative', 'macroeconomic', 'microeconomic', 'econometrics'
    ])
  };

  /**
   * Performs comprehensive text analysis using multiple algorithms
   */
  public analyzeText(text: string): AnalysisResult {
    const tokens = this.tokenize(text);
    const termVectors = this.calculateTFIDF(tokens);
    const entities = this.extractEntities(text);
    const sentiment = this.analyzeSentiment(tokens);
    const complexity = this.assessComplexity(tokens);
    const topics = this.extractTopics(termVectors);
    const keyInsights = this.generateInsights(entities, sentiment, complexity);
    
    return {
      confidence: this.calculateConfidence(termVectors, entities),
      sentiment,
      complexity,
      topics,
      entities,
      summary: text.length > 200 ? this.generateSmartSummary(text, termVectors) : undefined,
      keyInsights
    };
  }

  /**
   * Advanced tokenization with stemming and normalization
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s%$.-]/g, ' ')
      .split(/\s+/)
      .filter(word => 
        word.length > 2 && 
        !this.stopWords.has(word) &&
        !/^\d+$/.test(word)
      )
      .map(word => this.stemWord(word));
  }

  /**
   * Basic stemming for financial terms
   */
  private stemWord(word: string): string {
    const rules: Array<[RegExp, string]> = [
      [/ies$/, 'y'],
      [/ied$/, 'y'],
      [/ying$/, 'y'],
      [/([^aeiou])ies$/, '$1y'],
      [/([lr])ies$/, '$1y'],
      [/([^f])ves$/, '$1fe'],
      [/([^aeiouy]|qu)ies$/, '$1y'],
      [/s$/, ''],
      [/ing$/, ''],
      [/ed$/, ''],
      [/er$/, ''],
      [/ly$/, '']
    ];

    for (const [pattern, replacement] of rules) {
      if (pattern.test(word)) {
        return word.replace(pattern, replacement);
      }
    }
    return word;
  }

  /**
   * Calculate TF-IDF vectors for important terms
   */
  private calculateTFIDF(tokens: string[]): TermVector[] {
    const termFreq: Record<string, { count: number; positions: number[] }> = {};
    
    // Calculate term frequency and positions
    tokens.forEach((token, index) => {
      if (!termFreq[token]) {
        termFreq[token] = { count: 0, positions: [] };
      }
      termFreq[token].count++;
      termFreq[token].positions.push(index);
    });

    const totalTokens = tokens.length;
    const vectors: TermVector[] = [];

    for (const [term, data] of Object.entries(termFreq)) {
      if (data.count >= 2) { // Only consider terms that appear at least twice
        const tf = data.count / totalTokens;
        const idf = Math.log(1 + (totalTokens / data.count)); // Simplified IDF
        const tfidf = tf * idf;
        
        vectors.push({
          term,
          tfidf,
          frequency: data.count,
          positions: data.positions
        });
      }
    }

    return vectors.sort((a, b) => b.tfidf - a.tfidf).slice(0, 10);
  }

  /**
   * Extract financial entities using regex patterns
   */
  private extractEntities(text: string): FinancialEntity[] {
    const entities: FinancialEntity[] = [];
    
    // Currency patterns
    const currencyPattern = /\$[\d,]+\.?\d*|€[\d,]+\.?\d*|£[\d,]+\.?\d*|\d+\s*(dollar|euro|pound|yen|yuan)s?/gi;
    const currencyMatches = text.match(currencyPattern);
    if (currencyMatches) {
      currencyMatches.forEach(match => {
        entities.push({
          text: match.trim(),
          type: 'currency',
          value: this.extractNumericValue(match)
        });
      });
    }

    // Percentage patterns
    const percentagePattern = /\d+\.?\d*\s*%|\d+\.?\d*\s*percent/gi;
    const percentageMatches = text.match(percentagePattern);
    if (percentageMatches) {
      percentageMatches.forEach(match => {
        entities.push({
          text: match.trim(),
          type: 'percentage',
          value: this.extractNumericValue(match)
        });
      });
    }

    // Company/Institution patterns (simplified)
    const institutionPattern = /\b([A-Z][a-z]+\s+(Bank|Corp|Inc|LLC|Ltd|Group|Holdings|Financial|Capital|Investment|Securities))\b/g;
    const institutionMatches = text.match(institutionPattern);
    if (institutionMatches) {
      institutionMatches.forEach(match => {
        entities.push({
          text: match.trim(),
          type: 'institution'
        });
      });
    }

    return entities;
  }

  /**
   * Extract numeric value from text
   */
  private extractNumericValue(text: string): number {
    const numMatch = text.match(/[\d,]+\.?\d*/);
    if (numMatch) {
      return parseFloat(numMatch[0].replace(/,/g, ''));
    }
    return 0;
  }

  /**
   * Analyze sentiment using lexicon-based approach
   */
  private analyzeSentiment(tokens: string[]): 'positive' | 'negative' | 'neutral' {
    let positiveScore = 0;
    let negativeScore = 0;
    
    tokens.forEach(token => {
      if (this.sentimentLexicon.positive.has(token)) {
        positiveScore++;
      } else if (this.sentimentLexicon.negative.has(token)) {
        negativeScore++;
      }
    });

    const threshold = Math.max(1, tokens.length * 0.05);
    
    if (positiveScore > negativeScore + threshold) return 'positive';
    if (negativeScore > positiveScore + threshold) return 'negative';
    return 'neutral';
  }

  /**
   * Assess text complexity level
   */
  private assessComplexity(tokens: string[]): 'beginner' | 'intermediate' | 'advanced' {
    let beginnerCount = 0;
    let intermediateCount = 0;
    let advancedCount = 0;

    tokens.forEach(token => {
      if (this.complexityIndicators.beginner.has(token)) beginnerCount++;
      if (this.complexityIndicators.intermediate.has(token)) intermediateCount++;
      if (this.complexityIndicators.advanced.has(token)) advancedCount++;
    });

    if (advancedCount > 0) return 'advanced';
    if (intermediateCount > beginnerCount) return 'intermediate';
    return 'beginner';
  }

  /**
   * Extract main topics from term vectors
   */
  private extractTopics(termVectors: TermVector[]): string[] {
    const topicMapping: Record<string, string> = {
      'rate': 'Interest Rates',
      'interest': 'Interest Rates',
      'inflat': 'Inflation',
      'price': 'Pricing',
      'market': 'Financial Markets',
      'stock': 'Stock Market',
      'bond': 'Fixed Income',
      'invest': 'Investment',
      'gdp': 'Economic Growth',
      'unemploy': 'Employment',
      'bank': 'Banking',
      'credit': 'Credit Markets',
      'debt': 'Debt Markets',
      'currenc': 'Currency',
      'trade': 'International Trade',
      'fiscal': 'Government Policy',
      'monetari': 'Monetary Policy'
    };

    const topics = new Set<string>();
    
    termVectors.slice(0, 5).forEach(vector => {
      for (const [stem, topic] of Object.entries(topicMapping)) {
        if (vector.term.includes(stem)) {
          topics.add(topic);
          break;
        }
      }
    });

    return Array.from(topics);
  }

  /**
   * Generate key insights based on analysis
   */
  private generateInsights(
    entities: FinancialEntity[], 
    sentiment: string, 
    complexity: string
  ): string[] {
    const insights: string[] = [];

    if (entities.length > 0) {
      const currencyEntities = entities.filter(e => e.type === 'currency');
      const percentageEntities = entities.filter(e => e.type === 'percentage');
      
      if (currencyEntities.length > 0) {
        insights.push(`Contains ${currencyEntities.length} monetary value(s)`);
      }
      
      if (percentageEntities.length > 0) {
        const avgPercentage = percentageEntities.reduce((sum, e) => sum + (e.value || 0), 0) / percentageEntities.length;
        insights.push(`Average percentage mentioned: ${avgPercentage.toFixed(1)}%`);
      }
    }

    insights.push(`Sentiment: ${sentiment} tone detected`);
    insights.push(`Complexity: ${complexity} level content`);

    if (sentiment === 'negative') {
      insights.push('May discuss economic challenges or market concerns');
    } else if (sentiment === 'positive') {
      insights.push('Likely discusses growth opportunities or positive trends');
    }

    return insights;
  }

  /**
   * Generate smart summary using TF-IDF and entity information
   */
  private generateSmartSummary(text: string, termVectors: TermVector[]): string {
    const sentences = text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 30);

    if (sentences.length <= 2) return sentences.join('. ') + '.';

    const importantTerms = new Set(termVectors.slice(0, 5).map(v => v.term));
    
    const scoredSentences = sentences.map(sentence => {
      const lowerSentence = sentence.toLowerCase();
      let score = 0;
      
      // Score based on important terms
      importantTerms.forEach(term => {
        if (lowerSentence.includes(term)) {
          score += 2;
        }
      });
      
      // Bonus for first and last sentences
      const index = sentences.indexOf(sentence);
      if (index === 0 || index === sentences.length - 1) {
        score += 1;
      }
      
      // Penalty for very short or very long sentences
      if (sentence.length < 50 || sentence.length > 200) {
        score -= 1;
      }
      
      return { sentence, score, index };
    });

    return scoredSentences
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .sort((a, b) => a.index - b.index)
      .map(item => item.sentence)
      .join('. ') + '.';
  }

  /**
   * Calculate overall confidence score
   */
  private calculateConfidence(termVectors: TermVector[], entities: FinancialEntity[]): number {
    let confidence = 0;
    
    // Base confidence from term analysis
    if (termVectors.length > 0) {
      const avgTfidf = termVectors.reduce((sum, v) => sum + v.tfidf, 0) / termVectors.length;
      confidence += Math.min(avgTfidf * 0.5, 0.4);
    }
    
    // Bonus for entities
    confidence += Math.min(entities.length * 0.1, 0.3);
    
    // Bonus for diverse entity types
    const entityTypes = new Set(entities.map(e => e.type));
    confidence += Math.min(entityTypes.size * 0.05, 0.2);
    
    // Bonus for high-value content indicators
    const hasHighValueTerms = termVectors.some(v => 
      ['market', 'econom', 'financi', 'invest', 'rate'].some(term => v.term.includes(term))
    );
    
    if (hasHighValueTerms) confidence += 0.1;
    
    return Math.min(Math.max(confidence, 0), 1);
  }
}