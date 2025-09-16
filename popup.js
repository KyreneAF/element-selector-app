document.addEventListener('DOMContentLoaded', function() {
    const startBtn = document.getElementById('startSelection');
    const stopBtn = document.getElementById('stopSelection');
    const status = document.getElementById('status');
    
    let isSelecting = false;
    
    // Update UI state
    function updateUI(selecting) {
        isSelecting = selecting;
        startBtn.disabled = selecting;
        stopBtn.disabled = !selecting;
        
        if (selecting) {
            status.textContent = 'Selection mode active - click elements on the page';
            status.className = 'status active';
        } else {
            status.textContent = 'Ready to select elements';
            status.className = 'status inactive';
        }
    }
    
    // Start selection
    startBtn.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Inject the element selector script
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['elementSelector.js']
            });
            
            // Start selection mode
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    if (window.selectElement) {
                        window.selectElement(
                            (result) => {
                                console.log('Element selected:', result);
                                // You can send this data back to the extension if needed
                            },
                            () => {
                                console.log('Selection stopped');
                            },
                            true // continuous mode
                        );
                    }
                }
            });
            
            updateUI(true);
            
        } catch (error) {
            console.error('Error starting selection:', error);
            status.textContent = 'Error: Could not start selection';
            status.className = 'status inactive';
        }
    });
    
    // Stop selection
    stopBtn.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    if (window.stopElementSelection) {
                        window.stopElementSelection();
                    }
                }
            });
            
            updateUI(false);
            
        } catch (error) {
            console.error('Error stopping selection:', error);
        }
    });
    
    // Initialize UI
    updateUI(false);
});
