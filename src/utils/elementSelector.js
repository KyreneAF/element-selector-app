import html2canvas from 'html2canvas';

export function selectElement(onElementSelected, onSelectionStopped) {
    return new Promise((resolve) => {
        let isSelecting = true;
        let continuousMode = typeof onElementSelected === 'function';
        
        // Create highlight element
        const highlight = document.createElement("div");
        highlight.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 999999;
      background: rgba(59, 130, 246, 0.2);
      border: 2px solid #fa01b3/*//#3B82F6*/;
      border-radius: 4px;
      transition: all 0.1s ease-out;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
      display: none;
    `;
        
        // Create cancel button
        const cancelBtn = document.createElement("button");
        cancelBtn.textContent = continuousMode ? "✕ Stop Selection" : "✕ Cancel Selection";
        cancelBtn.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000001;
      padding: 12px 24px;
      background: linear-gradient(135deg, #667EEA 0%, #764BA2 100%);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      cursor: pointer;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
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
      z-index: 1000001;
      padding: 12px 24px;
      background: white;
      color: #1E293B;
      border-radius: 12px;
      font-size: 14px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    `;
        
        const getTargetInShadowDOM = (
            shadowRootElem,
            mouseX,
            mouseY,
        ) => {
            if (!shadowRootElem.shadowRoot) {
                return {
                    shadowRootElems: [],
                    target: null,
                };
            }
            
            const roots = [shadowRootElem];
            let currentTarget = shadowRootElem.shadowRoot.elementFromPoint(mouseX, mouseY);
            
            // Current target can be another shadow root
            while (currentTarget?.shadowRoot) {
                const newRoot = currentTarget.shadowRoot.elementFromPoint(mouseX, mouseY);
                if (newRoot === currentTarget) {
                    break;
                }
                roots.push(currentTarget);
                currentTarget = newRoot;
            }
            
            return {
                shadowRootElems: roots,
                target: currentTarget,
            };
        };
        
        const generateSelector = (el) => {
            if (el.id) {
                return `#${el.id}`;
            }
            
            const path = [];
            let current = el;
            
            while (current && current !== document.body) {
                let selector = current.tagName.toLowerCase();
                
                if (current.className) {
                    const classes = Array.from(current.classList)
                        .filter((c) => c && !c.includes(":"))
                        .join(".");
                    if (classes) {
                        selector += `.${classes}`;
                    }
                }
                
                // Add nth-child if needed for uniqueness
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
            
            // Don't highlight our UI elements or elements inside the control panel
            if (target === cancelBtn || target === banner || banner.contains(target) ||
                target.closest('.App-header')) {
                highlight.style.display = "none";
                return;
            }
            
            // Show highlight on the hovered element
            const rect = target.getBoundingClientRect();
            highlight.style.left = `${rect.left}px`;
            highlight.style.top = `${rect.top}px`;
            highlight.style.width = `${rect.width}px`;
            highlight.style.height = `${rect.height}px`;
            highlight.style.display = "block";
        };
        
        const generateCombinedSelector = (target, mouseX, mouseY) => {
            // Check if we need to traverse Shadow DOM
            let currentElement = target;
            const shadowPath = [];
            
            // Walk up to find any shadow hosts
            while (currentElement) {
                const parent = currentElement.parentNode;
                
                if (parent instanceof ShadowRoot) {
                    // We're inside a shadow root, add the host to our path
                    const host = parent.host;
                    shadowPath.unshift(generateSelector(host));
                    currentElement = host;
                } else if (parent instanceof HTMLElement) {
                    currentElement = parent;
                } else {
                    break;
                }
            }
            
            // If we found shadow hosts, we need to handle this specially
            if (shadowPath.length > 0) {
                // Find the root shadow host that was clicked
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
            
            // Regular DOM element
            return generateSelector(target);
        };
        
        // Click handler
        const handleClick = async (e) => {
            if (!isSelecting) return;
            
            const target = getRealTarget(e);
            
            // Ignore clicks on our UI elements
            if (target === cancelBtn || target === banner || banner.contains(target)) {
                return;
            }
            
            e.preventDefault();
            e.stopPropagation();
            
            // Generate the combined selector (handles both regular DOM and Shadow DOM)
            const selector = generateCombinedSelector(target, e.clientX, e.clientY);
            
            const screenshot = await html2canvas(target, {
                allowTaint: true,
            });
            
            const result = { selector, screenshot: screenshot.toDataURL() };
            
            if (continuousMode) {
                // In continuous mode, call the callback but don't cleanup
                onElementSelected(result);
            } else {
                // In single mode, cleanup and resolve
                cleanup();
                resolve(result);
            }
        };
        
        // Cancel handler
        const handleCancel = () => {
            cleanup();
            if (continuousMode && onSelectionStopped) {
                onSelectionStopped();
            }
            resolve(null);
        };
        
        // Escape key handler
        const handleKeyDown = (e) => {
            if (e.key === "Escape") {
                handleCancel();
            }
        };
        
        // Cleanup function
        const cleanup = () => {
            isSelecting = false;
            document.removeEventListener("click", handleClick, true);
            document.removeEventListener("mousemove", handleMouseMove);
            cancelBtn.removeEventListener("click", handleCancel);
            document.removeEventListener("keydown", handleKeyDown);
            
            highlight.remove();
            cancelBtn.remove();
            banner.remove();
        };
        
        // Store cleanup function for external access
        window.stopElementSelection = cleanup;
        
        // Append elements to DOM
        document.body.appendChild(highlight);
        document.body.appendChild(cancelBtn);
        document.body.appendChild(banner);
        
        // Attach event listeners (using capture phase for click to intercept before other handlers)
        document.addEventListener("click", handleClick, true);
        document.addEventListener("mousemove", handleMouseMove);
        cancelBtn.addEventListener("click", handleCancel);
        document.addEventListener("keydown", handleKeyDown);
    });
}
