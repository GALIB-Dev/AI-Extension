console.log("[EonMentor] Content script loaded");

// Selection tracking and floating button
let eonButton = null;
let eonTooltip = null;
let lastSelection = '';

function createButton() {
  eonButton = document.createElement('button');
  eonButton.textContent = '🧠 Explain';
  eonButton.style.cssText = `
    position: absolute;
    z-index: 2147483647;
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 500;
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    display: none;
    font-family: system-ui, -apple-system, sans-serif;
    transition: all 0.2s ease;
  `;
  
  eonButton.addEventListener('mouseenter', () => {
    eonButton.style.transform = 'scale(1.05)';
  });
  
  eonButton.addEventListener('mouseleave', () => {
    eonButton.style.transform = 'scale(1)';
  });
  
  eonButton.addEventListener('click', async () => {
    if (!lastSelection.trim()) return;
    
    eonButton.textContent = '⏳ Processing...';
    eonButton.style.background = '#64748b';
    
    try {
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          type: 'EXPLAIN_TEXT',
          payload: { text: lastSelection.trim() }
        }, resolve);
      });
      
      showTooltip(response?.explanation || 'Unable to explain text.');
    } catch (error) {
      showTooltip('Error: Unable to process text.');
    }
    
    eonButton.textContent = '🧠 Explain';
    eonButton.style.background = 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
  });
  
  document.body.appendChild(eonButton);
}

function showButton(range) {
  if (!eonButton) createButton();
  
  const rect = range.getBoundingClientRect();
  eonButton.style.display = 'block';
  eonButton.style.top = `${window.scrollY + rect.top - 40}px`;
  eonButton.style.left = `${window.scrollX + rect.left}px`;
}

function hideButton() {
  if (eonButton) eonButton.style.display = 'none';
  hideTooltip();
}

function createTooltip() {
  eonTooltip = document.createElement('div');
  eonTooltip.style.cssText = `
    position: absolute;
    max-width: 350px;
    background: #1f2937;
    color: #f9fafb;
    padding: 16px;
    font-size: 14px;
    line-height: 1.5;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    z-index: 2147483647;
    display: none;
    font-family: system-ui, -apple-system, sans-serif;
    border: 1px solid #374151;
  `;
  document.body.appendChild(eonTooltip);
}

function showTooltip(text) {
  if (!eonTooltip) createTooltip();
  if (!eonButton) return;
  
  eonTooltip.textContent = text;
  eonTooltip.style.display = 'block';
  eonTooltip.style.top = `${parseInt(eonButton.style.top) + 35}px`;
  eonTooltip.style.left = eonButton.style.left;
  
  setTimeout(hideTooltip, 8000);
}

function hideTooltip() {
  if (eonTooltip) eonTooltip.style.display = 'none';
}

// Selection event listener
document.addEventListener('selectionchange', () => {
  const selection = window.getSelection();
  
  if (!selection || selection.isCollapsed) {
    hideButton();
    lastSelection = '';
    return;
  }
  
  const text = selection.toString().trim();
  
  if (text && text.length > 10) {
    lastSelection = text;
    const range = selection.getRangeAt(0);
    showButton(range);
  } else {
    hideButton();
  }
});

// Hide on click outside
document.addEventListener('click', (e) => {
  if (e.target !== eonButton && e.target !== eonTooltip) {
    hideButton();
  }
});
