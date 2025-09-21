# Installation Guide

## Prerequisites

- Node.js 16+ and npm
- Google Chrome browser
- Git (for cloning the repository)

## Setup

1. **Clone and build the project**
   ```bash
   git clone https://github.com/GALIB-Dev/AI-Extension.git
   cd AI-Extension
   npm install
   npm run build
   ```

2. **Load extension in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select `packages/extension/dist` folder

3. **Configure API keys (optional)**
   - Click the extension icon
   - Go to Options
   - Add your OpenAI, Claude, or Gemini API keys

## Usage

1. Visit any webpage with financial content
2. Highlight text containing financial terms
3. Click the "Explain" button that appears
4. View the AI-generated explanation

## Troubleshooting

**Extension not loading:**
- Ensure you selected the `dist` folder, not the parent directory
- Try rebuilding with `npm run build`

**Explain button not appearing:**
- Refresh the webpage
- Ensure the extension is enabled in Chrome
- Check that you're not on a restricted page (chrome:// URLs)

**API errors:**
- Verify your API keys are correct
- Check your internet connection
- The extension will fall back to local analysis if APIs are unavailable