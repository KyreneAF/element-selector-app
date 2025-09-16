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
            
            // Inject the element selector script directly as a function
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    // Prevent multiple injections
                    if (window.elementSelectorInjected) {
                        return;
                    }
                    window.elementSelectorInjected = true;

                    // Import html2canvas dynamically
                    function loadHtml2Canvas() {
                        return new Promise((resolve, reject) => {
                            if (window.html2canvas) {
                                resolve(window.html2canvas);
                                return;
                            }
                            
                            const script = document.createElement('script');
                            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
                            script.onload = () => resolve(window.html2canvas);
                            script.onerror = reject;
                            document.head.appendChild(script);
                        });
                    }

                    window.selectElement = async function(onElementSelected = null, onSelectionStopped = null, continuousMode = true) {
                        const html2canvas = await loadHtml2Canvas();
                        
                        return new Promise((resolve) => {
                            let isSelecting = true;
                            
                            // Create highlight overlay
                            const highlight = document.createElement("div");
                            highlight.style.cssText = `
                                position: absolute;
                                border: 3px solid #4facfe;
                                background: rgba(79, 172, 254, 0.1);
                                pointer-events: none;
                                z-index: 1000000;
                                display: none;
                                border-radius: 4px;
                                box-shadow: 0 0 0 1px rgba(79, 172, 254, 0.3);
                                transition: all 0.3s ease;
                            `;
                            
                            // Create cancel button
                            const cancelBtn = document.createElement("button");
                            cancelBtn.textContent = "✕ Stop Selection";
                            cancelBtn.style.cssText = `
                                position: fixed;
                                top: 20px;
                                right: 20px;
                                z-index: 1000001;
                                padding: 12px 20px;
                                background: #ff4757;
                                color: white;
                                border: none;
                                border-radius: 8px;
                                cursor: pointer;
                                font-size: 14px;
                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                                font-weight: 600;
                                box-shadow: 0 4px 12px rgba(255, 71, 87, 0.3);
                                transition: all 0.3s ease;
                            `;
                            
                            // Create instruction banner
                            const banner = document.createElement("div");
                            banner.innerHTML = `
                                <div style="display: flex; align-items: center; gap: 12px;">
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="2"/>
                                        <path d="M10 6V10M10 14H10.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                    </svg>
                                    <span>Click elements to select them continuously (Shadow DOM supported)</span>
                                </div>
                            `;
                            banner.style.cssText = `
                                position: fixed;
                                top: 20px;
                                left: 50%;
                                transform: translateX(-50%);
                                z-index: 1000001;
                                padding: 12px 24px;
                                background: white;
                                color: #1E293B;
                                border-radius: 12px;
                                font-size: 14px;
                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
                            `;
                            
                            const generateSelector = (element) => {
                                if (!element || element === document.body) return "body";
                                
                                const path = [];
                                let current = element;
                                
                                while (current && current !== document.body) {
                                    let selector = current.tagName.toLowerCase();
                                    
                                    if (current.id) {
                                        selector += `#${current.id}`;
                                        path.unshift(selector);
                                        break;
                                    }
                                    
                                    if (current.className) {
                                        const classes = current.className.split(/\s+/).filter(c => c);
                                        if (classes.length > 0) {
                                            selector += `.${classes.join('.')}`;
                                        }
                                    }
                                    
                                    const parent = current.parentElement;
                                    if (parent) {
                                        const siblings = Array.from(parent.children);
                                        const index = siblings.indexOf(current);
                                        if (siblings.filter((s) => s.tagName === current.tagName).length > 1) {
                                            selector += `:nth-child(${index + 1})`;
                                        }
                                    }
                                    
                                    path.unshift(selector);
                                    current = current.parentElement;
                                }
                                
                                return path.join(" > ");
                            };
                            
                            const handleMouseMove = (e) => {
                                if (!isSelecting) return;
                                
                                const target = e.target;
                                
                                // Don't highlight UI elements
                                if (target === cancelBtn || target === banner || banner.contains(target)) {
                                    highlight.style.display = "none";
                                    return;
                                }
                                
                                const rect = target.getBoundingClientRect();
                                highlight.style.left = `${rect.left + window.scrollX}px`;
                                highlight.style.top = `${rect.top + window.scrollY}px`;
                                highlight.style.width = `${rect.width}px`;
                                highlight.style.height = `${rect.height}px`;
                                highlight.style.display = "block";
                            };
                            
                            const handleClick = async (e) => {
                                if (!isSelecting) return;
                                
                                const target = e.target;
                                
                                // Ignore clicks on UI elements
                                if (target === cancelBtn || target === banner || banner.contains(target)) {
                                    return;
                                }
                                
                                e.preventDefault();
                                e.stopPropagation();
                                
                                const selector = generateSelector(target);
                                
                                try {
                                    const screenshot = await html2canvas(target, {
                                        allowTaint: true,
                                    });
                                    
                                    const result = { selector, screenshot: screenshot.toDataURL() };
                                    console.log('Element selected:', result);
                                    
                                    if (onElementSelected) onElementSelected(result);
                                } catch (error) {
                                    console.log('Element selected (screenshot failed):', { selector });
                                    if (onElementSelected) onElementSelected({ selector });
                                }
                            };
                            
                            const cleanup = () => {
                                isSelecting = false;
                                document.removeEventListener("mousemove", handleMouseMove);
                                document.removeEventListener("click", handleClick, true);
                                
                                if (highlight.parentNode) highlight.remove();
                                if (cancelBtn.parentNode) cancelBtn.remove();
                                if (banner.parentNode) banner.remove();
                                
                                if (onSelectionStopped) onSelectionStopped();
                            };
                            
                            // Set up stop function
                            window.stopElementSelection = cleanup;
                            
                            // Event listeners
                            document.addEventListener("mousemove", handleMouseMove);
                            document.addEventListener("click", handleClick, true);
                            
                            cancelBtn.addEventListener("click", (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                cleanup();
                                if (!continuousMode) resolve(null);
                            });
                            
                            // Add elements to DOM
                            document.body.appendChild(highlight);
                            document.body.appendChild(cancelBtn);
                            document.body.appendChild(banner);
                        });
                    };
                }
            });
            
            // Start selection mode
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    if (window.selectElement) {
                        window.selectElement(
                            (result) => {
                                console.log('Element selected:', result);
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
            status.textContent = 'Error: Could not start selection - check console';
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
