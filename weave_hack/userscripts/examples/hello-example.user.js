// ==UserScript==
// @name         Hello Example
// @description  Demo userscript that logs a message on example.com
// @version      1.0
// @author       AI Browser Assistant
// @match        https://example.com/*
// @match        http://example.com/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

console.log('[Hello Example] Userscript is running!');
console.log('[Hello Example] Current URL:', window.location.href);
console.log('[Hello Example] Page title:', document.title);

// Add a small notification to the page
const notification = document.createElement('div');
notification.textContent = 'Hello from userscript!';
notification.style.cssText = `
  position: fixed;
  top: 20px;
  right: 20px;
  background: #4CAF50;
  color: white;
  padding: 10px 20px;
  border-radius: 5px;
  font-family: Arial, sans-serif;
  font-size: 14px;
  z-index: 9999;
  cursor: pointer;
`;

document.body.appendChild(notification);

// Remove notification after 5 seconds or on click
setTimeout(() => {
  if (notification.parentNode) {
    notification.remove();
  }
}, 5000);

notification.addEventListener('click', () => {
  notification.remove();
}); 