interface EonMentorUI {
  button: HTMLButtonElement | null;
  tooltip: HTMLDivElement | null;
  isVisible: boolean;
  currentSelection: string;
  hideTimeout: NodeJS.Timeout | null;
  isProcessing: boolean;
}

interface ExplanationResponse {
  explanation: string;
  analysis?: {
    confidence: number;
    sentiment: 'positive' | 'negative' | 'neutral';
    complexity: 'beginner' | 'intermediate' | 'advanced';
    topics: string[];
    entities: Array<{
      text: string;
      type: 'currency' | 'percentage' | 'company' | 'institution' | 'metric';
      value?: number;
    }>;
    keyInsights: string[];
  };
  cached?: boolean;
  processingTime?: number;
  error?: string;
  // Legacy support for old format
  terms: FinancialTerm[];
  summary?: string;
}

interface FinancialTerm {
  term: string;
  simple: string;
  detail: string;
}

class EonMentorContentScript {
  private ui: EonMentorUI = {
    button: null,
    tooltip: null,
    isVisible: false,
    currentSelection: '',
    hideTimeout: null,
    isProcessing: false
  };

  // Persistent port (MV3) to reduce "Extension context invalidated" errors
  private port: chrome.runtime.Port | null = null;
  private portName = 'EONMENTOR_PORT_V1';
  private portBackoff = 250; // ms, will grow with attempts
  private maxPortBackoff = 4000; // ms
  private pendingPortRequests: Map<string, { resolve: (v: any)=>void; reject: (e: any)=>void; timer: number; started: number; }> = new Map();

  private readonly MIN_SELECTION_LENGTH = 8; // Reduced from 15 to 8 for better UX
  private readonly TOOLTIP_TIMEOUT = 10000;
  private readonly ANALYSIS_TIMEOUT = 15000; // Increased from 8000 to reduce premature timeouts
  private tooltipTimer: number | null = null;

  // Static, instance-agnostic safe messaging helper to avoid 'this' context issues
  static safeSendMessage(message: any): Promise<ExplanationResponse> {
    const attempt = (tryNum: number): Promise<ExplanationResponse> => {
      return new Promise(resolve => {
        try {
          if (typeof chrome === 'undefined' || !chrome.runtime) {
            console.error('[EonMentor] (static) chrome.runtime unavailable (attempt', tryNum, ')');
            resolve({
              error: 'Extension runtime not available. Please reload the page.',
              explanation: '',
              terms: []
            });
            return;
          }

            chrome.runtime.sendMessage(message, (response) => {
              if (chrome.runtime.lastError) {
                const msg = chrome.runtime.lastError.message || '';
                console.error('[EonMentor] (static) runtime error (attempt', tryNum, '):', msg);
                if (msg.includes('Extension context invalidated') && tryNum === 1) {
                  // Try a light re-ping then one retry
                  try {
                    chrome.runtime.sendMessage({ type: 'EONMENTOR_PING', ts: Date.now() }, () => {});
                  } catch (_) {}
                  setTimeout(() => {
                    attempt(2).then(resolve);
                  }, 150);
                  return;
                }
                resolve({
                  error: 'Failed to analyze text. Please refresh the page.',
                  explanation: '',
                  terms: []
                });
              } else {
                resolve(response || {
                  explanation: 'No explanation available',
                  terms: [],
                  error: 'Empty response from service worker'
                });
              }
            });
        } catch (err) {
          console.error('[EonMentor] (static) unexpected error sending message (attempt', tryNum, '):', err);
          resolve({
            error: 'Unexpected error communicating with extension background.',
            explanation: '',
            terms: []
          });
        }
      });
    };
    return attempt(1);
  }

  constructor() {
    // Prevent duplicate initialization if script injected multiple times
    if (typeof window !== 'undefined' && (window as any)._eonMentorContentScriptInitialized) {
      console.log('[EonMentor] Content script already initialized, skipping duplicate instance');
      return;
    }
    if (typeof window !== 'undefined') {
      (window as any)._eonMentorContentScriptInitialized = true;
    }

      // Explicitly bind / convert methods; handleButtonClick will be an arrow function now
    this.handleSelectionChange = this.handleSelectionChange.bind(this);
    this.handleDocumentClick = this.handleDocumentClick.bind(this);
    this.hideUI = this.hideUI.bind(this);
  this.showTooltip = this.showTooltip.bind(this);

      // Expose instance globally for fallback (debug / resilience)
      if (typeof window !== 'undefined') {
        (window as any).__EONMENTOR_INSTANCE__ = this;
        // Helper for manual re-trigger if context lost
        (window as any).__EONMENTOR_EXPLAIN__ = () => {
          const inst = (window as any).__EONMENTOR_INSTANCE__ as EonMentorContentScript | undefined;
          if (inst && typeof inst.handleButtonClick === 'function') {
            inst.handleButtonClick();
          } else {
            console.warn('[EonMentor] No valid instance for manual trigger');
          }
        };
      }

    this.init();
  }

  private init(): void {
    console.log('[EonMentor] Content script initialized');
    this.setupEventListeners();
    this.injectStyles();
    this.establishPort();
    // Warm-up ping to keep service worker alive and validate messaging early
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
        chrome.runtime.sendMessage({ type: 'EONMENTOR_PING', ts: Date.now() }, () => {
          if (chrome.runtime.lastError) {
            console.warn('[EonMentor] Warm-up ping error (non-fatal):', chrome.runtime.lastError.message);
          } else {
            console.log('[EonMentor] Warm-up ping successful');
          }
        });
      }
    } catch (e) {
      console.warn('[EonMentor] Warm-up ping threw (ignored):', e);
    }
  }

  // Establish (or re-establish) a persistent Port to the service worker
  private establishPort(force: boolean = false): void {
    if (typeof chrome === 'undefined' || !chrome.runtime?.connect) {
      console.warn('[EonMentor] chrome.runtime.connect unavailable');
      return;
    }
    if (this.port && !force) return; // already connected
    try {
      this.port = chrome.runtime.connect({ name: this.portName });
      console.log('[EonMentor] Port connected:', this.portName);
      this.portBackoff = 250; // reset backoff on success

      this.port.onMessage.addListener((msg: any) => {
        if (!msg || !msg._cid) return;
        const entry = this.pendingPortRequests.get(msg._cid);
        if (entry) {
          clearTimeout(entry.timer);
          this.pendingPortRequests.delete(msg._cid);
          entry.resolve(msg);
        }
      });

      this.port.onDisconnect.addListener(() => {
        console.warn('[EonMentor] Port disconnected');
        // Fail any in-flight requests so they can fallback
        for (const [cid, entry] of this.pendingPortRequests.entries()) {
          clearTimeout(entry.timer);
          entry.reject(new Error('Port disconnected'));
          this.pendingPortRequests.delete(cid);
        }
        this.port = null;
        // Reconnect with backoff
        const delay = this.portBackoff;
        this.portBackoff = Math.min(this.portBackoff * 2, this.maxPortBackoff);
        setTimeout(() => this.establishPort(), delay);
      });
    } catch (e) {
      console.warn('[EonMentor] Failed to establish port:', e);
      const delay = this.portBackoff;
      this.portBackoff = Math.min(this.portBackoff * 2, this.maxPortBackoff);
      setTimeout(() => this.establishPort(), delay);
    }
  }

  // Send a message via the persistent port with timeout handling. Falls back externally on rejection.
  private sendPortMessage(message: any): Promise<ExplanationResponse> {
    return new Promise((resolve, reject) => {
      if (!this.port) {
        reject(new Error('No port'));
        return;
      }
      try {
        const cid = message._cid || ('cid-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8));
        message._cid = cid;
        const started = performance.now();
        const timer = window.setTimeout(() => {
          this.pendingPortRequests.delete(cid);
          reject(new Error('Port request timeout'));
        }, this.ANALYSIS_TIMEOUT);
        this.pendingPortRequests.set(cid, { resolve: (msg) => {
          if (!msg) {
            reject(new Error('Empty port response'));
            return;
          }
          resolve(msg);
        }, reject, timer, started });
        this.port.postMessage(message);
      } catch (err) {
        reject(err);
      }
    });
  }

  private injectStyles(): void {
    const styleId = 'eonmentor-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .eonmentor-button {
        position: absolute;
        z-index: 2147483647;
        padding: 10px 20px;
        font-size: 14px;
        font-weight: 600;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', system-ui, sans-serif;
        background: linear-gradient(135deg, #87CEEB 0%, #5A9FD4 100%);
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        box-shadow: 0 4px 16px rgba(135, 206, 235, 0.3), 0 2px 8px rgba(0, 0, 0, 0.1);
        display: none;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.3);
        letter-spacing: 0.5px;
      }

      .eonmentor-button .eonmentor-icon {
        display: inline-block;
        width: 16px;
        height: 16px;
        margin-right: 8px;
        vertical-align: -2px;
        background: currentColor;
        -webkit-mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="black"><path d="M12 2a7 7 0 0 0-7 7c0 2.5 1.5 4.6 3.6 5.6-.2.8-.7 1.5-1.4 2.2-.3.3-.4.8-.2 1.1.3.4.8.5 1.2.3 1.3-.6 2.3-1.3 3-2 .7.2 1.4.3 2.2.3a7 7 0 0 0 0-14Zm0 12.5c-.7 0-1.3-.1-1.9-.3-.4-.1-.8 0-1 .3-.3.3-.7.7-1.3 1 0-.5.2-1 .3-1.4.1-.4-.1-.9-.5-1.1A5.01 5.01 0 0 1 7 9a5 5 0 1 1 5 5.5Z"/></svg>') center / contain no-repeat;
        mask: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="black"><path d="M12 2a7 7 0 0 0-7 7c0 2.5 1.5 4.6 3.6 5.6-.2.8-.7 1.5-1.4 2.2-.3.3-.4.8-.2 1.1.3.4.8.5 1.2.3 1.3-.6 2.3-1.3 3-2 .7.2 1.4.3 2.2.3a7 7 0 0 0 0-14Zm0 12.5c-.7 0-1.3-.1-1.9-.3-.4-.1-.8 0-1 .3-.3.3-.7.7-1.3 1 0-.5.2-1 .3-1.4.1-.4-.1-.9-.5-1.1A5.01 5.01 0 0 1 7 9a5 5 0 1 1 5 5.5Z"/></svg>') center / contain no-repeat;
      }

      .eonmentor-button .eonmentor-icon.spinning {
        animation: eonmentor-spin 1s linear infinite;
      }

      @keyframes eonmentor-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      .eonmentor-button .eonmentor-label { 
        display: inline-block; 
      }
      
      .eonmentor-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(135, 206, 235, 0.4), 0 4px 12px rgba(0, 0, 0, 0.15);
        background: linear-gradient(135deg, #5A9FD4 0%, #4A90D9 100%);
      }
      
      .eonmentor-button:active {
        transform: translateY(0);
      }
      
      .eonmentor-button.processing {
        background: linear-gradient(135deg, #A0AEC0 0%, #718096 100%);
        cursor: wait;
      }
      
      .eonmentor-tooltip {
        position: absolute;
        max-width: 380px;
        min-width: 300px;
        background: linear-gradient(135deg, #FFFFFF 0%, #F8FBFF 100%);
        color: #2D3748;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 8px 32px rgba(135, 206, 235, 0.25), 0 4px 16px rgba(0, 0, 0, 0.1);
        z-index: 2147483647;
        display: none;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', system-ui, sans-serif;
        font-size: 14px;
        line-height: 1.6;
        backdrop-filter: blur(20px);
        border: 1px solid rgba(135, 206, 235, 0.3);
      }
      
      .eonmentor-tooltip h4 {
        margin: 0 0 12px 0;
        font-size: 16px;
        font-weight: 700;
        color: #1A365D;
      }
      
      .eonmentor-tooltip .terms {
        margin: 12px 0;
      }
      
      .eonmentor-tooltip .term {
        margin: 8px 0;
        padding: 12px 16px;
        background: rgba(135, 206, 235, 0.1);
        border-radius: 6px;
        border-left: 3px solid #87CEEB;
      }
      
      .eonmentor-tooltip .term-name {
        font-weight: 600;
        color: #2B6CB0;
        margin-bottom: 4px;
      }
      
      .eonmentor-tooltip .summary {
        margin-top: 12px;
        padding: 12px 16px;
        background: rgba(72, 187, 120, 0.1);
        border-radius: 6px;
        border-left: 3px solid #48BB78;
      }
      
      .eonmentor-tooltip .error {
        color: #E53E3E;
        background: rgba(239, 68, 68, 0.1);
        padding: 12px 16px;
        border-radius: 6px;
        border-left: 3px solid #E53E3E;
      }
    `;
    
    document.head.appendChild(style);
  }

  private setupEventListeners(): void {
    document.addEventListener('selectionchange', this.handleSelectionChange.bind(this));
    document.addEventListener('click', this.handleDocumentClick.bind(this));
    document.addEventListener('scroll', this.hideUI.bind(this), true);
    window.addEventListener('resize', this.hideUI.bind(this));
  }

  private handleSelectionChange(): void {
    const selection = window.getSelection();
    console.log('[EonMentor] Selection changed:', selection?.toString().length, 'chars');
    
    // Clear any pending hide timeout
    if (this.ui.hideTimeout) {
      clearTimeout(this.ui.hideTimeout);
      this.ui.hideTimeout = null;
    }
    
    if (!selection || selection.isCollapsed) {
      console.log('[EonMentor] Selection collapsed or empty');
      // If we have a current selection and button is visible, keep it visible longer
      if (this.ui.currentSelection && this.ui.isVisible && !this.ui.isProcessing) {
        console.log('[EonMentor] Keeping button visible for 12.5 seconds after selection ends');
        this.ui.hideTimeout = setTimeout(() => {
          // Double-check we're not hovering over the button before hiding
          if (this.ui.button && !this.ui.button.matches(':hover') && !this.ui.isProcessing) {
            this.hideUI();
          }
        }, 12500); // 12.5 second delay - very generous timing
      } else if (!this.ui.currentSelection) {
        this.hideUI();
      }
      return;
    }

    const text = selection.toString().trim();
    console.log('[EonMentor] Selected text:', `"${text}"`, `(${text.length} chars)`);
    
    if (text.length >= this.MIN_SELECTION_LENGTH) {
      console.log('[EonMentor] Text meets minimum length, showing button');
      this.ui.currentSelection = text;
      const range = selection.getRangeAt(0);
      this.showButton(range);
    } else {
      console.log('[EonMentor] Text too short, minimum is', this.MIN_SELECTION_LENGTH, 'chars');
      // For short selections, hide after a delay
      this.ui.hideTimeout = setTimeout(() => {
        if (!this.ui.isProcessing) {
          this.hideUI();
        }
      }, 2000);
    }
  }

  private handleDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    
    // Don't hide if clicking on our UI elements
    if (target.closest('.eonmentor-button') || target.closest('.eonmentor-tooltip')) {
      console.log('[EonMentor] Click on our UI, keeping visible');
      return;
    }
    
    // Don't hide immediately if we're processing
    if (this.ui.isProcessing) {
      console.log('[EonMentor] Processing, ignoring document click');
      return;
    }
    
    // Don't hide on document clicks - let the timeout handle it
    console.log('[EonMentor] Document click detected, but letting timeout handle hiding');
  }

  private createButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'eonmentor-button';
  button.innerHTML = '<span class="eonmentor-icon" aria-hidden="true"></span><span class="eonmentor-label">Explain</span>';
    // Use already-bound handleButtonClick (bound in constructor)
    button.addEventListener('click', this.handleButtonClick);
    
    // Add hover event listeners to prevent hiding
    button.addEventListener('mouseenter', () => {
      console.log('[EonMentor] Mouse entered button, clearing hide timeout');
      if (this.ui.hideTimeout) {
        clearTimeout(this.ui.hideTimeout);
        this.ui.hideTimeout = null;
      }
    });
    
    button.addEventListener('mouseleave', () => {
      console.log('[EonMentor] Mouse left button, setting hide timeout');
      if (!this.ui.isProcessing && this.ui.currentSelection) {
        this.ui.hideTimeout = setTimeout(() => {
          this.hideUI();
        }, 2000); // 2 seconds after mouse leaves
      }
    });
    
    document.body.appendChild(button);
    return button;
  }

  private handleButtonClick = async (): Promise<void> => {
    // Defensive: ensure instance context is intact
    if (!this || !(this as any).ui) {
      console.error('[EonMentor] handleButtonClick called with invalid this context');
      return;
    }

    if (!this.ui.currentSelection) return;

    const button = this.ui.button!;
    
    // Set processing state
    this.ui.isProcessing = true;
    
    // Clear any hide timeout since we're actively using the feature
    if (this.ui.hideTimeout) {
      clearTimeout(this.ui.hideTimeout);
      this.ui.hideTimeout = null;
    }
    
    // Show loading state
  button.innerHTML = '<span class="eonmentor-icon spinning" aria-hidden="true"></span><span class="eonmentor-label">Analyzing...</span>';
    button.classList.add('processing');

    console.log('[EonMentor] Starting analysis for text:', this.ui.currentSelection);

    try {
      const message = {
        type: 'EXPLAIN_TEXT',
        payload: { text: this.ui.currentSelection },
        _cid: 'cid-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
      } as any;
      
      console.log('[EonMentor] Sending message to service worker:', message);
      
      // Use static safe messaging (instance-agnostic) with timeout for clarity
      const send = (EonMentorContentScript as any).safeSendMessage as (m:any)=>Promise<ExplanationResponse>;
      
      const startTs = performance.now();
      let response: ExplanationResponse | undefined;

      // Prefer persistent port if available
      if (this.port) {
        try {
          response = await this.sendPortMessage(message);
          console.log('[EonMentor] Received response via port');
        } catch (e) {
          console.warn('[EonMentor] Port path failed, falling back to runtime messaging:', e);
        }
      } else {
        // Attempt to (re)connect quickly before fallback
        this.establishPort();
      }

      if (!response) {
        response = await Promise.race([
          send(message),
          new Promise<ExplanationResponse>((_unused, reject) => {
            setTimeout(() => {
              reject(new Error(`Background timeout after ${this.ANALYSIS_TIMEOUT}ms`));
            }, this.ANALYSIS_TIMEOUT);
          })
        ]);
        console.log('[EonMentor] Response received via runtime messaging');
      }

      console.log('[EonMentor] Analysis response time:', Math.round(performance.now() - startTs), 'ms');
      
      console.log('[EonMentor] Received response from service worker:', response);

      if (response?.error) {
        console.error('[EonMentor] Service worker returned error:', response.error);
        this.showTooltip({ error: response.error } as ExplanationResponse);
      } else if (!response) {
        console.error('[EonMentor] No response received from service worker');
        this.showTooltip({ 
          error: 'No response from background service',
          explanation: '',
          terms: []
        });
      } else {
        console.log('[EonMentor] Analysis successful, showing tooltip');
        this.showTooltip(response);
      }
    } catch (error: any) {
      const rawMsg = String(error?.message || error || 'Unknown error');
      console.error('[EonMentor] Error in handleButtonClick (likely timeout/messaging):', rawMsg);

      // Attempt quick local fallback so user still gets value
      const localFallback = this.runLocalInlineAnalysis(this.ui.currentSelection);
      if (localFallback) {
        this.showTooltip(localFallback);
      } else {
        const userMessage = 'Failed to analyze text. Please try again.';
        this.showTooltip({
          error: userMessage,
          explanation: '',
          terms: []
        });
      }
    } finally {
      // Reset button and processing state (ensure button still exists)
      if (this.ui.button) {
  this.ui.button.innerHTML = '<span class="eonmentor-icon" aria-hidden="true"></span><span class="eonmentor-label">Explain</span>';
        this.ui.button.classList.remove('processing');
      }
      this.ui.isProcessing = false;
      console.log('[EonMentor] Analysis completed, button reset');
    }
  }

  // Lightweight inline fallback (re-implements a tiny portion of local analysis for resilience)
  private runLocalInlineAnalysis(text: string): ExplanationResponse | null {
    try {
      if (!text || text.length < 10) return null;
      const keywords = ['inflation','gdp','interest','recession','investment','portfolio','dividend','stock','bond','market','profit','loss','revenue'];
      const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
      const found = Array.from(new Set(words.filter(w => keywords.includes(w))));
      const explanation = found.length
        ? `Local quick scan: detected terms -> ${found.join(', ')}.`
        : 'Local quick scan: no common financial terms detected.';
      return {
        explanation,
        terms: found.map(f => ({ term: f, simple: f, detail: f })),
        summary: text.length > 160 ? text.slice(0, 160) + '…' : undefined
      } as ExplanationResponse;
    } catch (e) {
      console.warn('[EonMentor] Local inline analysis failed:', e);
      return null;
    }
  }

  // (Removed legacy instance sendMessage: replaced by static safeSendMessage)

  private showButton(range: Range): void {
    console.log('[EonMentor] Showing button for selection');
    
    if (!this.ui.button) {
      console.log('[EonMentor] Creating new button');
      this.ui.button = this.createButton();
    }

    const rect = range.getBoundingClientRect();
    const button = this.ui.button;
    
    console.log('[EonMentor] Button position:', {
      top: window.scrollY + rect.top - 50,
      left: window.scrollX + rect.left + (rect.width / 2) - 50
    });
    
    button.style.display = 'block';
    button.style.top = `${window.scrollY + rect.top - 50}px`;
    button.style.left = `${window.scrollX + rect.left + (rect.width / 2) - 50}px`;
    
    this.ui.isVisible = true;
    console.log('[EonMentor] Button is now visible');
  }

  private createTooltip(): HTMLDivElement {
    const tooltip = document.createElement('div');
    tooltip.className = 'eonmentor-tooltip';
    document.body.appendChild(tooltip);
    return tooltip;
  }

  private showTooltip(data: ExplanationResponse): void {
    if (!this.ui.tooltip) {
      this.ui.tooltip = this.createTooltip();
    }
    
    const tooltip = this.ui.tooltip;
    let content = '';
    
    if (data.error) {
  content = `<div class="error">Error: ${data.error}</div>`;
    } else {
  content = '<h4>Advanced Financial Analysis</h4>';
      
      // Show the main explanation
      if (data.explanation) {
        content += `<div style="margin-bottom: 16px; line-height: 1.6;">${data.explanation.replace(/\n/g, '<br>')}</div>`;
      }
      
      // Handle advanced analysis data
      if (data.analysis) {
        const { analysis } = data;
        
        // Show entities (financial data)
        if (analysis.entities && analysis.entities.length > 0) {
          content += '<div class="terms"><strong>Financial Data Found:</strong>';
          analysis.entities.forEach(entity => {
            const valueDisplay = entity.value ? ` (${entity.value})` : '';
            content += `
              <div class="term">
                <div class="term-name">${entity.text}${valueDisplay}</div>
                <div>Type: ${entity.type.toUpperCase()}</div>
              </div>
            `;
          });
          content += '</div>';
        }
        
        // Show key topics
        if (analysis.topics && analysis.topics.length > 0) {
          content += `<div style="margin: 12px 0;"><strong>Key Topics:</strong> ${analysis.topics.join(', ')}</div>`;
        }
        
        // Show key insights
        if (analysis.keyInsights && analysis.keyInsights.length > 0) {
          content += '<div style="margin: 12px 0;"><strong>Key Insights:</strong><ul>';
          analysis.keyInsights.forEach(insight => {
            content += `<li>${insight}</li>`;
          });
          content += '</ul></div>';
        }
        
        // Show processing info
        if (data.cached) {
          content += '<div style="margin-top: 12px; font-size: 12px; color: #666;">Cached result</div>';
        }
        if (data.processingTime) {
          content += `<div style="font-size: 12px; color: #666;">Processed in ${Math.round(data.processingTime)}ms</div>`;
        }
      }
      
      // Fallback for legacy format (terms and summary)
      else {
        if (data.terms && data.terms.length > 0) {
          content += '<div class="terms">';
          data.terms.forEach(term => {
            content += `
              <div class="term">
                <div class="term-name">${term.term}</div>
                <div>${term.simple}</div>
              </div>
            `;
          });
          content += '</div>';
        }
        
        if (data.summary) {
          content += `
            <div class="summary">
              <strong>Summary:</strong><br>
              ${data.summary}
            </div>
          `;
        }
        
        if (!data.terms?.length && !data.summary) {
          content += '<div>No specific financial terms detected in the selected text.</div>';
        }
      }
    }

    tooltip.innerHTML = content;
    
    // Position tooltip
    if (this.ui.button) {
      const buttonRect = this.ui.button.getBoundingClientRect();
      tooltip.style.display = 'block';
      tooltip.style.top = `${window.scrollY + buttonRect.bottom + 10}px`;
      tooltip.style.left = `${window.scrollX + buttonRect.left}px`;
      
      // Adjust if tooltip goes off screen
      const tooltipRect = tooltip.getBoundingClientRect();
      if (tooltipRect.right > window.innerWidth) {
        tooltip.style.left = `${window.scrollX + window.innerWidth - tooltipRect.width - 20}px`;
      }
    }

    // Auto-hide after timeout
    if (this.tooltipTimer) {
      clearTimeout(this.tooltipTimer);
    }
    
    this.tooltipTimer = window.setTimeout(() => {
      this.hideTooltip();
    }, this.TOOLTIP_TIMEOUT);
  }  private hideTooltip(): void {
    if (this.ui.tooltip) {
      this.ui.tooltip.style.display = 'none';
    }
    
    if (this.tooltipTimer) {
      clearTimeout(this.tooltipTimer);
      this.tooltipTimer = null;
    }
  }

  private hideUI(): void {
    // Clear any pending hide timeout
    if (this.ui.hideTimeout) {
      clearTimeout(this.ui.hideTimeout);
      this.ui.hideTimeout = null;
    }
    
    if (this.ui.button) {
      this.ui.button.style.display = 'none';
    }
    
    this.hideTooltip();
    this.ui.isVisible = false;
    this.ui.currentSelection = '';
    this.ui.isProcessing = false;
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new EonMentorContentScript());
} else {
  new EonMentorContentScript();
}