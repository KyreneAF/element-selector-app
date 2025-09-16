import React, { useState, useEffect } from 'react';
import './App.css';
import { selectElement } from './utils/elementSelector';

function App() {
  const [selectedElements, setSelectedElements] = useState([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Function to create persistent selection squares
  const createSelectionSquare = (element, selector, id) => {
    const rect = element.getBoundingClientRect();
    const square = document.createElement('div');
    square.className = 'selection-square';
    square.dataset.selectionId = id;
    square.style.cssText = `
      position: absolute;
      left: ${rect.left + window.scrollX}px;
      top: ${rect.top + window.scrollY}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      border: 3px solid #fa01b3;
      background: rgba(250, 1, 179, 0.1);
      pointer-events: auto;
      z-index: 999998;
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

  // Function to handle deselection from clicking squares
  const handleDeselectElement = (id) => {
    setSelectedElements(prev => prev.filter(el => el.id !== id));
    removeSelectionSquare(id);
  };

  // Update squares when window is resized or scrolled
  const updateSquarePositions = () => {
    selectedElements.forEach(element => {
      const square = document.querySelector(`[data-selection-id="${element.id}"]`);
      if (square && element.domElement) {
        const rect = element.domElement.getBoundingClientRect();
        square.style.left = `${rect.left + window.scrollX}px`;
        square.style.top = `${rect.top + window.scrollY}px`;
        square.style.width = `${rect.width}px`;
        square.style.height = `${rect.height}px`;
      }
    });
  };

  // Add event listeners for window resize and scroll
  useEffect(() => {
    window.addEventListener('resize', updateSquarePositions);
    window.addEventListener('scroll', updateSquarePositions);
    
    return () => {
      window.removeEventListener('resize', updateSquarePositions);
      window.removeEventListener('scroll', updateSquarePositions);
    };
  }, [selectedElements]);

  // Handle element selection in continuous mode
  const handleElementSelected = (result) => {
    // Find the actual DOM element that was selected
    const domElement = document.querySelector(result.selector.split('|')[0]);
    
    const newElement = {
      ...result,
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      domElement: domElement
    };

    // Add the new element to the array
    setSelectedElements(prev => [...prev, newElement]);
    
    // Create persistent selection square
    if (domElement) {
      createSelectionSquare(domElement, result.selector, newElement.id);
    }
    
    console.log('Selected element:', result);
  };

  // Handle stopping selection mode
  const handleSelectionStopped = () => {
    setIsSelecting(false);
  };

  const toggleSelection = async () => {
    if (isSelecting) {
      // Stop selection mode
      if (window.stopElementSelection) {
        window.stopElementSelection();
      }
      setIsSelecting(false);
    } else {
      // Start continuous selection mode
      setIsSelecting(true);
      try {
        await selectElement(handleElementSelected, handleSelectionStopped);
      } catch (error) {
        console.error('Error during element selection:', error);
      } finally {
        setIsSelecting(false);
      }
    }
  };

  const clearAllSelections = () => {
    // Stop selection mode if active
    if (isSelecting && window.stopElementSelection) {
      window.stopElementSelection();
    }
    
    // Remove all selection squares
    selectedElements.forEach(element => {
      removeSelectionSquare(element.id);
    });
    
    setSelectedElements([]);
    setIsDropdownOpen(false);
    setIsSelecting(false);
  };

  const removeElement = (id) => {
    removeSelectionSquare(id);
    setSelectedElements(prev => prev.filter(el => el.id !== id));
  };

  const toggleMainDropdown = () => {
    setIsDropdownOpen(prev => !prev);
  };

  return (
    <div className="App">
      <header className="App-header">
        {/* Counter at the top */}
        <div className="element-counter">
          <span className="counter-badge">
            {selectedElements.length} Element{selectedElements.length !== 1 ? 's' : ''} Selected
          </span>
        </div>

        <h1>Element Selector Demo</h1>
        <p>This app demonstrates the element selector functionality that can be injected via Chrome extensions.</p>
        <p className="instruction-text">
          {isSelecting 
            ? 'Selection mode active! Click elements to select them. Click the button again to stop.'
            : 'Selected elements will have pink squares around them. Click the squares to deselect.'
          }
        </p>
        
        <div className="demo-section">
          <div className="button-group">
            <button 
              onClick={toggleSelection}
              className={`select-button ${isSelecting ? 'selecting' : ''}`}
            >
              Start Selection
            </button>
            
            {selectedElements.length > 0 && (
              <button onClick={clearAllSelections} className="clear-all-button">
                Clear All ({selectedElements.length})
              </button>
            )}
          </div>
          
          {selectedElements.length > 0 && (
            <div className="main-dropdown-container">
              <button 
                onClick={toggleMainDropdown}
                className="main-dropdown-toggle"
              >
                <span>View Selected Elements ({selectedElements.length})</span>
                <span className={`dropdown-arrow ${isDropdownOpen ? 'expanded' : ''}`}>
                  ▼
                </span>
              </button>
              
              {isDropdownOpen && (
                <div className="main-dropdown-content">
                  <div className="results-grid">
                    {selectedElements.map((element, index) => (
                      <div key={element.id} className="result-card">
                        <div className="result-header">
                          <span className="element-number">#{index + 1}</span>
                          <span className="timestamp">{element.timestamp}</span>
                          <button 
                            onClick={() => removeElement(element.id)}
                            className="remove-button"
                            title="Remove this element"
                          >
                            ×
                          </button>
                        </div>
                        
                        {element.screenshot && (
                          <div className="screenshot-container">
                            <img 
                              src={element.screenshot} 
                              alt={`Selected element ${index + 1} screenshot`}
                              className="screenshot"
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="test-elements">
          <h3>Test Elements</h3>
          <p>Try selecting these different elements to test the functionality:</p>
          
          <div className="test-grid">
            <button className="test-btn primary">Primary Button</button>
            <button className="test-btn secondary">Secondary Button</button>
            <div className="test-card">
              <h4>Card Title</h4>
              <p>This is a test card with some content.</p>
              <span className="badge">Badge</span>
            </div>
            <input type="text" placeholder="Test input field" className="test-input" />
            <div className="nested-container">
              <div className="nested-item">Nested Item 1</div>
              <div className="nested-item">Nested Item 2</div>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}

export default App;
