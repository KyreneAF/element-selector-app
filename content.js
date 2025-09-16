// Content script for Element Selector Chrome Extension
// This runs on every webpage and facilitates communication

(function() {
    'use strict';
    
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'startSelection') {
            // The actual injection will be handled by the popup using chrome.scripting.executeScript
            // This content script is mainly for future communication needs
            sendResponse({ success: true });
        } else if (request.action === 'stopSelection') {
            if (window.stopElementSelection) {
                window.stopElementSelection();
            }
            sendResponse({ success: true });
        }
    });
    
    // Optional: Listen for element selection events and forward to popup
    window.addEventListener('elementSelected', (event) => {
        chrome.runtime.sendMessage({
            action: 'elementSelected',
            data: event.detail
        });
    });
})();
