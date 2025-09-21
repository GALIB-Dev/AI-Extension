# Gemini Integration

## Overview

The extension integrates with Google's Gemini API to provide AI-powered financial text explanations as part of its multi-provider fallback system.

## Configuration

### API Key Setup

1. Visit [Google AI Studio](https://ai.google.dev/)
2. Sign in and create an API key
3. Open the extension settings
4. Enter your Gemini API key (starts with `AIza...`)

### Limits

- 60 requests per minute (free tier)
- 1500 requests per day (free tier)

## Technical Details

### Provider Priority

The extension uses this fallback order:
1. Chrome Built-in AI
2. OpenAI
3. Claude  
4. Gemini
5. Local Analysis

### API Configuration

- **Model**: `gemini-pro`
- **Temperature**: 0.3 (for consistent responses)
- **Max Tokens**: 200
- **Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent`

## Security

- API keys stored securely in Chrome extension storage
- No data persistence on Google's servers
- HTTPS encrypted communications
- Local processing for sensitive data

## Status

- ✅ Fully integrated
- ✅ Production ready
- ✅ Cross-browser compatible