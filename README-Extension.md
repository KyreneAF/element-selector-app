# Element Selector Chrome Extension

This Chrome extension allows you to select elements on **any website** with visual feedback and automatic CSS selector generation.

## 🚀 Installation

### Method 1: Load as Unpacked Extension (Development)

1. **Prepare the extension files:**

   - Make sure you have these files in your project directory:
     - `manifest.json`
     - `popup.html`
     - `popup.js`
     - `elementSelector.js`
     - `content.js`

2. **Open Chrome Extensions page:**

   - Go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)

3. **Load the extension:**

   - Click "Load unpacked"
   - Select your project folder (`/Users/kyreneflores/element-selector-app`)
   - The extension should now appear in your extensions list

4. **Pin the extension:**
   - Click the puzzle piece icon in Chrome toolbar
   - Find "Element Selector" and click the pin icon

## 🎯 Usage

### Basic Usage

1. **Navigate to any website** (e.g., google.com, github.com, etc.)
2. **Click the Element Selector extension icon** in your toolbar
3. **Click "Start Selection"** in the popup
4. **Hover over elements** on the webpage - they'll be highlighted in blue
5. **Click elements** to select them - you'll see the CSS selector in the console
6. **Click "Stop Selection"** or the red "✕ Stop Selection" button on the page

### Features

- ✅ **Works on any website** - not just your React app
- ✅ **Visual feedback** - blue highlight on hover
- ✅ **Shadow DOM support** - can select elements inside Shadow DOM
- ✅ **CSS selector generation** - automatically generates selectors
- ✅ **Screenshot capture** - takes screenshots of selected elements
- ✅ **Continuous mode** - select multiple elements in sequence

### What You'll See

- **Blue highlight** when hovering over elements
- **Instruction banner** at the top of the page
- **Stop button** in the top-right corner
- **Console logs** with selector and screenshot data

## 🔧 Development

### File Structure

```
element-selector-app/
├── manifest.json          # Extension manifest
├── popup.html            # Extension popup UI
├── popup.js              # Popup functionality
├── elementSelector.js    # Main selection logic (injectable)
├── content.js           # Content script for communication
└── README-Extension.md  # This file
```

### Key Components

1. **`elementSelector.js`** - The core selection functionality that gets injected into any webpage
2. **`popup.js`** - Handles the extension popup and communication with tabs
3. **`content.js`** - Content script for advanced communication (optional)
4. **`manifest.json`** - Extension configuration and permissions

### Permissions Explained

- `activeTab` - Access to the currently active tab
- `scripting` - Ability to inject scripts into webpages
- `<all_urls>` - Works on all websites

## 🐛 Troubleshooting

### Extension not working?

1. Check that Developer mode is enabled
2. Reload the extension after making changes
3. Check the browser console for errors
4. Ensure the website allows script injection

### Can't see the extension icon?

1. Click the puzzle piece icon in Chrome toolbar
2. Pin the "Element Selector" extension

### Selection not starting?

1. Make sure you clicked "Start Selection" in the popup
2. Check if the website has strict Content Security Policy
3. Look for error messages in the browser console

## 🌟 Advanced Usage

### Accessing Selection Data

Selected elements data is logged to the browser console with:

- `selector` - CSS selector string
- `screenshot` - Base64 encoded image of the element

### Integration with Other Tools

You can modify `popup.js` to send selection data to:

- External APIs
- Local storage
- Other browser extensions
- Web applications

## 📝 Notes

- This extension works independently of your React app
- It can be used on any website without restrictions
- The selection logic is completely self-contained
- Screenshots are generated using html2canvas library loaded from CDN
