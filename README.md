# AI Financial Literacy Extension

A Chrome extension that provides AI-powered explanations for financial terminology and concepts using multiple AI providers with intelligent fallback.

## Overview

This extension helps users understand complex financial text by providing instant explanations when text is highlighted. It integrates with multiple AI services to ensure reliable responses and includes local analysis as a fallback option.

### Key Features

- **Multi-AI Integration**: Supports Chrome Built-in AI, OpenAI, Claude, Gemini, and local analysis
- **Intelligent Fallback**: Automatically tries different AI providers if one is unavailable
- **Financial Term Detection**: Identifies and explains key financial terminology
- **Text Summarization**: Provides concise summaries of financial content
- **Real-time Analysis**: Instant explanations via floating button interface

## Architecture

```
packages/
├── extension/     # Chrome extension implementation
├── shared/        # Common utilities and AI services  
└── backend/       # Future API server (placeholder)
```

### Components

- **Content Script**: Handles text selection and displays explanation interface
- **Service Worker**: Manages AI provider communication and response processing
- **Shared Services**: AI orchestration, term detection, and summarization utilities
- **Settings Interface**: Configuration for API keys and provider preferences
- Finds all the important finance words and explains them too
- Makes short summaries so you don't have to read EVERYTHING
- Works even when the internet is being weird
- I made sure it doesn't crash when things go wrong (learned that the hard way!)

## How to get it running

**Super easy setup** (I promise it's not scary!):

## AI Provider Chain

The extension uses an intelligent fallback system:

1. **Chrome Built-in AI** (free, Chrome-native)
2. **OpenAI** (ChatGPT API)
3. **Claude** (Anthropic API)
4. **Google Gemini** (Google AI API)
5. **Local Analysis** (offline fallback)

## Installation

### Prerequisites
- Node.js 16+ and npm
- Google Chrome browser

### Setup

1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/GALIB-Dev/AI-Extension.git
   cd AI-Extension
   npm install
   ```

2. **Build the project:**
   ```bash
   npm run build -w @eonmentor/shared
   npm run dev:ext
   ```

3. **Load in Chrome:**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select `packages/extension/dist` folder

### Production Build
```bash
npm run build
```

## Configuration

### API Keys (Optional)

Access the extension options to configure:
- `openai_api_key` - OpenAI API access
- `claude_api_key` - Anthropic Claude API access  
- `gemini_api_key` - Google Gemini API access
- `enable_cloud_ai` - Toggle cloud AI services

The extension functions without API keys using Chrome's built-in AI and local analysis.

## Core Features

- **Robust Fallback System**: Multiple AI providers ensure reliable service
- **Offline Capability**: Local analysis works without internet connection
- **Error Resilience**: Graceful handling of API failures and rate limits
- **Cross-browser Messaging**: Reliable communication between extension components
- **Financial Domain Focus**: Specialized for financial terminology and concepts

## Key Files

| File | Purpose |
|------|---------|
| `content-script.ts` | Text selection handling and UI display |
| `service-worker.ts` | AI provider coordination and response processing |
| `ai-service.ts` | Multi-provider AI orchestration |
| `summarizer.ts` | Text summarization utilities |
| `finance-terms.en.json` | Financial terminology database |

## Usage

1. Navigate to any webpage with financial content
2. Highlight text containing financial terms or concepts  
3. Click the "Explain" button that appears
4. View AI-generated explanation in the tooltip

## Development Roadmap

- [ ] Multi-language support
- [ ] Enhanced UI/UX improvements
- [ ] Additional AI provider integrations
- [ ] User explanation history
- [ ] Website compatibility expansion
- [ ] Comprehensive testing suite
- [ ] Performance optimizations
- [ ] Dark mode theme

## Known Issues

- Code duplication in service worker implementations
- Basic summarization heuristics could be improved
- Error handling could be more granular
- Rate limiting not implemented for API calls
- Local analyzer uses simple keyword matching

## Contributing

Before submitting pull requests:
- Run linting: `eslint .`
- Check types: `tsc -b`
- Verify build: `npm run build`

## License

```
MIT License
Copyright (c) 2025 GALIB-Dev
```

## Internationalization

The extension is designed for easy localization. The financial terms database supports multiple languages through separate JSON files.

## Support

For detailed setup instructions, troubleshooting, and technical documentation, refer to:
- `INSTALLATION.md` - Setup guide
- `GEMINI_INTEGRATION.md` - Google AI integration details
- `SERVICE_WORKER_FIX.md` - Technical troubleshooting

---

*An AI-powered financial literacy tool designed to make complex financial concepts accessible through intelligent explanation and multi-provider AI integration.*