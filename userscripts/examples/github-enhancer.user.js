// ==UserScript==
// @name         GitHub Enhancer
// @description  Adds useful features to GitHub pages
// @version      1.0
// @author       AI Browser Assistant
// @match        https://github.com/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

console.log('[GitHub Enhancer] Userscript loaded on:', window.location.href);

// Add a quick copy button to code blocks
function addCopyButtons() {
  const codeBlocks = document.querySelectorAll('pre');
  
  codeBlocks.forEach((pre, index) => {
    // Skip if already has a copy button
    if (pre.querySelector('.userscript-copy-btn')) return;
    
    const copyBtn = document.createElement('button');
    copyBtn.className = 'userscript-copy-btn';
    copyBtn.textContent = 'Copy';
    copyBtn.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      padding: 4px 8px;
      background: #238636;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      z-index: 10;
    `;
    
    // Make pre position relative if not already
    if (getComputedStyle(pre).position === 'static') {
      pre.style.position = 'relative';
    }
    
    copyBtn.addEventListener('click', async () => {
      const code = pre.textContent || '';
      try {
        await navigator.clipboard.writeText(code);
        copyBtn.textContent = 'Copied!';
        copyBtn.style.background = '#1a7f37';
        
        setTimeout(() => {
          copyBtn.textContent = 'Copy';
          copyBtn.style.background = '#238636';
        }, 2000);
      } catch (err) {
        console.error('[GitHub Enhancer] Failed to copy:', err);
        copyBtn.textContent = 'Failed';
        copyBtn.style.background = '#da3633';
      }
    });
    
    pre.appendChild(copyBtn);
  });
  
  console.log(`[GitHub Enhancer] Added copy buttons to ${codeBlocks.length} code blocks`);
}

// Run on page load and when content changes
addCopyButtons();

// Watch for dynamic content changes
const observer = new MutationObserver(() => {
  addCopyButtons();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

console.log('[GitHub Enhancer] Initialized successfully'); 