document.addEventListener('DOMContentLoaded', function() {
    const startBtn = document.getElementById('startSelection');
    const stopBtn = document.getElementById('stopSelection');
    const status = document.getElementById('status');
    
    let isSelecting = false;
    let selectedCount = 0;
    
    // Update UI state
    function updateUI(selecting) {
        isSelecting = selecting;
        startBtn.disabled = selecting;
        stopBtn.disabled = !selecting;
        
        if (selecting) {
            status.textContent = `Selection mode active - ${selectedCount} elements selected`;
            status.className = 'status active';
        } else {
            status.textContent = `Ready to select elements - ${selectedCount} elements selected`;
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
                            script.onerror = () => {
                                console.warn('html2canvas failed to load, screenshots will be disabled');
                                resolve(null);
                            };
                            document.head.appendChild(script);
                        });
                    }

                    window.selectElement = async function(onElementSelected = null, onSelectionStopped = null, continuousMode = true) {
                        const html2canvas = await loadHtml2Canvas();
                        
                        return new Promise((resolve) => {
                            let isSelecting = true;
                            let selectedElements = [];
                            
                            // Create highlight overlay
                            const highlight = document.createElement("div");
                            highlight.style.cssText = `
                                position: fixed;
                                border: 3px solid #4facfe;
                                background: rgba(79, 172, 254, 0.1);
                                pointer-events: none;
                                z-index: 2147483647;
                                display: none;
                                border-radius: 4px;
                                box-shadow: 0 0 0 1px rgba(79, 172, 254, 0.3);
                                transition: all 0.3s ease;
                            `;
                            
                            // Create element counter
                            const counter = document.createElement("div");
                            counter.style.cssText = `
                                position: fixed;
                                top: 70px;
                                left: 50%;
                                transform: translateX(-50%);
                                z-index: 2147483647;
                                padding: 8px 16px;
                                background: #fa01b3;
                                color: white;
                                border-radius: 20px;
                                font-size: 14px;
                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                                font-weight: 600;
                                box-shadow: 0 4px 12px rgba(250, 1, 179, 0.3);
                            `;
                            
                            // Create cancel button
                            const cancelBtn = document.createElement("button");
                            cancelBtn.textContent = "✕ Stop Selection";
                            cancelBtn.style.cssText = `
                                position: fixed;
                                top: 20px;
                                right: 20px;
                                z-index: 2147483647;
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
                                    <span>${continuousMode ? 'Click elements to select them continuously (Shadow DOM supported)' : 'Click any element to select it (Shadow DOM supported)'}</span>
                                </div>
                            `;
                            banner.style.cssText = `
                                position: fixed;
                                top: 20px;
                                left: 50%;
                                transform: translateX(-50%);
                                z-index: 2147483647;
                                padding: 12px 24px;
                                background: white;
                                color: #1E293B;
                                border-radius: 12px;
                                font-size: 14px;
                                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
                            `;
                            
                            // Function to create persistent selection squares
                            const createSelectionSquare = (element, selector, id) => {
                                const rect = element.getBoundingClientRect();
                                const square = document.createElement('div');
                                square.className = 'element-selector-square';
                                square.dataset.selectionId = id;
                                square.style.cssText = `
                                    position: fixed;
                                    left: ${rect.left}px;
                                    top: ${rect.top}px;
                                    width: ${rect.width}px;
                                    height: ${rect.height}px;
                                    border: 3px solid #fa01b3;
                                    background: rgba(250, 1, 179, 0.1);
                                    pointer-events: auto;
                                    z-index: 2147483646;
                                    border-radius: 4px;
                                    box-shadow: 0 0 0 1px rgba(250, 1, 179, 0.3);
                                    cursor: pointer;
                                    transition: all 0.2s ease;
                                `;
                                
                                // Add click handler for deselection
                                square.addEventListener('click', (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDeselectElement(id);
                                });

                                // Add hover effects
                                square.addEventListener('mouseenter', () => {
                                    square.style.background = 'rgba(250, 1, 179, 0.2)';
                                    square.style.borderColor = '#ff1493';
                                });

                                square.addEventListener('mouseleave', () => {
                                    square.style.background = 'rgba(250, 1, 179, 0.1)';
                                    square.style.borderColor = '#fa01b3';
                                });

                                document.body.appendChild(square);
                                return square;
                            };
                            
                            // Function to remove selection square
                            const removeSelectionSquare = (id) => {
                                const square = document.querySelector(`[data-selection-id="${id}"]`);
                                if (square) {
                                    square.remove();
                                }
                            };
                            
                            // Function to handle deselection
                            const handleDeselectElement = (id) => {
                                selectedElements = selectedElements.filter(el => el.id !== id);
                                removeSelectionSquare(id);
                                updateCounter();
                                console.log('Element deselected, remaining:', selectedElements.length);
                            };
                            
                            // Function to update counter
                            const updateCounter = () => {
                                counter.textContent = `${selectedElements.length} Element${selectedElements.length !== 1 ? 's' : ''} Selected`;
                                
                                // Send count to popup
                                if (window.chrome && window.chrome.runtime) {
                                    try {
                                        chrome.runtime.sendMessage({
                                            action: 'updateCount',
                                            count: selectedElements.length
                                        });
                                    } catch (e) {
                                        // Ignore errors if popup is closed
                                    }
                                }
                            };
                            
                            // Function to update square positions on scroll/resize
                            const updateSquarePositions = () => {
                                selectedElements.forEach(element => {
                                    const square = document.querySelector(`[data-selection-id="${element.id}"]`);
                                    if (square && element.domElement) {
                                        const rect = element.domElement.getBoundingClientRect();
                                        square.style.left = `${rect.left}px`;
                                        square.style.top = `${rect.top}px`;
                                        square.style.width = `${rect.width}px`;
                                        square.style.height = `${rect.height}px`;
                                    }
                                });
                            };
                            
                            // Add scroll and resize listeners
                            window.addEventListener('scroll', updateSquarePositions);
                            window.addEventListener('resize', updateSquarePositions);
                            
                            const getTargetInShadowDOM = (rootElement, mouseX, mouseY) => {
                                const shadowRootElems = [];
                                let currentElement = rootElement;
                                
                                while (currentElement?.shadowRoot) {
                                    shadowRootElems.push(currentElement);
                                    const shadowTarget = currentElement.shadowRoot.elementFromPoint(mouseX, mouseY);
                                    if (!shadowTarget) break;
                                    currentElement = shadowTarget;
                                }
                                
                                return { shadowRootElems, target: currentElement };
                            };
                            
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
                                        const classes = current.className.split(/\s+/).filter(c => c && !c.startsWith('element-selector'));
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
                            
                            const getRealTarget = (e) => {
                                const composedPath = e.composedPath();
                                return composedPath[0];
                            };
                            
                            const handleMouseMove = (e) => {
                                if (!isSelecting) return;
                                
                                const target = getRealTarget(e);
                                
                                // Don't highlight UI elements or selection squares
                                if (target === cancelBtn || target === banner || target === counter || 
                                    banner.contains(target) || target.classList.contains('element-selector-square')) {
                                    highlight.style.display = "none";
                                    return;
                                }
                                
                                const rect = target.getBoundingClientRect();
                                highlight.style.left = `${rect.left}px`;
                                highlight.style.top = `${rect.top}px`;
                                highlight.style.width = `${rect.width}px`;
                                highlight.style.height = `${rect.height}px`;
                                highlight.style.display = "block";
                            };
                            
                            const generateCombinedSelector = (target, mouseX, mouseY) => {
                                let currentElement = target;
                                const shadowPath = [];
                                
                                while (currentElement) {
                                    const parent = currentElement.parentNode;
                                    
                                    if (parent instanceof ShadowRoot) {
                                        const host = parent.host;
                                        shadowPath.unshift(generateSelector(host));
                                        currentElement = host;
                                    } else if (parent instanceof HTMLElement) {
                                        currentElement = parent;
                                    } else {
                                        break;
                                    }
                                }
                                
                                if (shadowPath.length > 0) {
                                    const rootShadowHost = document.elementFromPoint(mouseX, mouseY);
                                    
                                    if (rootShadowHost?.shadowRoot) {
                                        const { shadowRootElems, target: shadowTarget } = getTargetInShadowDOM(
                                            rootShadowHost,
                                            mouseX,
                                            mouseY,
                                        );
                                        
                                        const rootContainerSelectors = shadowRootElems
                                            .map((el) => generateSelector(el))
                                            .join("|");
                                        
                                        const targetSelector =
                                            shadowTarget === shadowRootElems[shadowRootElems.length - 1]
                                                ? "self"
                                                : generateSelector(shadowTarget);
                                        
                                        return rootContainerSelectors + "|" + targetSelector;
                                    }
                                }
                                
                                return generateSelector(target);
                            };
                            
                            const handleClick = async (e) => {
                                if (!isSelecting) return;
                                
                                const target = getRealTarget(e);
                                
                                // Ignore clicks on UI elements or selection squares
                                if (target === cancelBtn || target === banner || target === counter || 
                                    banner.contains(target) || target.classList.contains('element-selector-square')) {
                                    return;
                                }
                                
                                e.preventDefault();
                                e.stopPropagation();
                                
                                const selector = generateCombinedSelector(target, e.clientX, e.clientY);
                                
                                // Check if element is already selected
                                const existingElement = selectedElements.find(el => el.selector === selector);
                                if (existingElement) {
                                    handleDeselectElement(existingElement.id);
                                    return;
                                }
                                
                                // Add new element
                                const newElement = {
                                    selector,
                                    id: Date.now(),
                                    timestamp: new Date().toLocaleTimeString(),
                                    domElement: target
                                };
                                
                                selectedElements.push(newElement);
                                createSelectionSquare(target, selector, newElement.id);
                                updateCounter();
                                
                                console.log('Element selected:', { selector, total: selectedElements.length });
                                if (onElementSelected) onElementSelected({ selector });
                            };
                            
                            const cleanup = () => {
                                isSelecting = false;
                                document.removeEventListener("mousemove", handleMouseMove);
                                document.removeEventListener("click", handleClick, true);
                                window.removeEventListener('scroll', updateSquarePositions);
                                window.removeEventListener('resize', updateSquarePositions);
                                
                                // Remove all UI elements
                                if (highlight.parentNode) highlight.remove();
                                if (cancelBtn.parentNode) cancelBtn.remove();
                                if (banner.parentNode) banner.remove();
                                if (counter.parentNode) counter.remove();
                                
                                // Remove all selection squares
                                selectedElements.forEach(element => {
                                    removeSelectionSquare(element.id);
                                });
                                
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
                            document.body.appendChild(counter);
                            
                            // Initialize counter
                            updateCounter();
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
    
    // Listen for count updates from content script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'updateCount') {
            selectedCount = request.count;
            updateUI(isSelecting);
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
            
            selectedCount = 0;
            updateUI(false);
            
        } catch (error) {
            console.error('Error stopping selection:', error);
        }
    });
    
    // Initialize UI
    updateUI(false);
});
