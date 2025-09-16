# Element Selector App

A React application that demonstrates an advanced element selector functionality with Shadow DOM support, perfect for Chrome extensions and web automation tools.

## Features

- **Interactive Element Selection**: Click any element on the page to select it
- **Screenshot Capture**: Automatically captures screenshots of selected elements using html2canvas
- **Shadow DOM Support**: Handles complex Shadow DOM traversal and selection
- **Modern UI**: Beautiful, responsive interface with hover effects and animations
- **Keyboard Support**: ESC key to cancel selection
- **Mobile Friendly**: Responsive design that works on all devices

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd element-selector-app
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm start
```

The app will open at `http://localhost:3000`.

## Usage

### In the Demo App

1. Click the "Start Element Selection" button
2. Move your mouse over any element on the page to see it highlighted
3. Click on an element to select it and capture its screenshot
4. View the generated CSS selector and screenshot in the results section
5. Use ESC key or the cancel button to exit selection mode

### Chrome Extension Integration

The `selectElement` function can be injected into any webpage via Chrome extensions:

```javascript
// In your Chrome extension content script or background script
chrome.scripting
  .executeScript({
    target: { tabId: someTabId },
    func: selectElement,
  })
  .then((results) => {
    const result = results[0].result;
    if (result) {
      console.log("Selected element:", result.selector);
      console.log("Screenshot:", result.screenshot);
    }
  });
```

### Direct Usage in Web Applications

```javascript
import { selectElement } from "./utils/elementSelector";

// Use in your React component or vanilla JavaScript
const handleElementSelection = async () => {
  try {
    const result = await selectElement();
    if (result) {
      console.log("Selector:", result.selector);
      console.log("Screenshot:", result.screenshot);
    } else {
      console.log("Selection cancelled");
    }
  } catch (error) {
    console.error("Selection error:", error);
  }
};
```

## API Reference

### `selectElement()`

Returns a Promise that resolves to either:

- `{ selector: string, screenshot: string }` - When an element is successfully selected
- `null` - When the selection is cancelled

#### Return Object Properties

- **selector** (string): CSS selector for the selected element
  - For regular DOM elements: Standard CSS selector (e.g., `div.container > button.primary`)
  - For Shadow DOM elements: Pipe-separated format (e.g., `custom-element|button.inner`)
- **screenshot** (string): Base64-encoded PNG image of the selected element

## Technical Details

### Shadow DOM Handling

The selector handles complex Shadow DOM scenarios:

1. **Regular DOM**: Generates standard CSS selectors
2. **Shadow DOM**: Uses pipe (`|`) separation to indicate shadow boundaries
3. **Nested Shadow DOM**: Supports multiple levels of shadow root traversal

### Selector Generation Strategy

- Uses element IDs when available for uniqueness
- Falls back to class-based selectors
- Adds `:nth-child()` pseudo-selectors when needed for disambiguation
- Filters out dynamic classes (containing `:`)

### UI Components

The selection interface includes:

- **Highlight overlay**: Blue semi-transparent highlight following the mouse
- **Cancel button**: Top-right positioned cancel button with gradient styling
- **Instruction banner**: Top-center banner with selection instructions
- **Keyboard support**: ESC key handling for cancellation

## Dependencies

- **React**: ^19.1.1 - UI framework
- **html2canvas**: ^1.4.1 - Screenshot capture functionality
- **@reduxjs/toolkit**: ^2.9.0 - State management (for demo)

## Browser Compatibility

- Chrome/Chromium: Full support including Shadow DOM
- Firefox: Full support including Shadow DOM
- Safari: Full support including Shadow DOM
- Edge: Full support including Shadow DOM

## Development

### Project Structure

```
src/
├── utils/
│   └── elementSelector.js    # Core element selection functionality
├── App.js                    # Main demo component
├── App.css                   # Styling for demo interface
└── index.js                  # App entry point
```

### Building for Production

```bash
npm run build
```

### Running Tests

```bash
npm test
```

## Use Cases

- **Chrome Extensions**: Inject into web pages for element selection
- **Web Scraping Tools**: Generate selectors for automation
- **Testing Frameworks**: Create robust element selectors for E2E tests
- **Design Tools**: Capture and analyze web page elements
- **Accessibility Tools**: Identify and analyze page elements

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions, please open an issue on the GitHub repository.
