import React, { useState, useEffect } from 'react';
import { aiService, AIProvider } from '@eonmentor/shared/src/ai-service';

interface ApiKeySettings {
  openaiKey: string;
  claudeKey: string;
  preferredProvider: string;
}

export const SettingsPanel: React.FC = () => {
  const [settings, setSettings] = useState<ApiKeySettings>({
    openaiKey: '',
    claudeKey: '',
    preferredProvider: 'chrome-ai'
  });
  
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSettings();
    loadProviders();
  }, []);

  const loadSettings = async () => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.local.get([
        'openai_api_key', 
        'claude_api_key', 
        'preferred_provider'
      ]);
      
      setSettings({
        openaiKey: result.openai_api_key || '',
        claudeKey: result.claude_api_key || '',
        preferredProvider: result.preferred_provider || 'chrome-ai'
      });
    }
  };

  const loadProviders = async () => {
    await aiService.loadApiKeys();
    setProviders(aiService.getAvailableProviders());
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      // Save API keys
      if (settings.openaiKey) {
        await aiService.setApiKey('openai', settings.openaiKey);
      }
      
      if (settings.claudeKey) {
        await aiService.setApiKey('claude', settings.claudeKey);
      }

      // Save preferred provider
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({
          preferred_provider: settings.preferredProvider
        });
      }

      // Refresh provider status
      await loadProviders();
      
      setMessage('✅ Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
      
    } catch (error) {
      setMessage(`❌ Error saving settings: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestProvider = async (providerName: string) => {
    setIsLoading(true);
    setMessage(`Testing ${providerName}...`);
    
    try {
      const result = await aiService.explainFinancialText(
        'What is compound interest?',
        'Testing API connection'
      );
      
      if (result.source === providerName) {
        setMessage(`✅ ${providerName} is working! Response: "${result.text.slice(0, 50)}..."`);
      } else {
        setMessage(`⚠️ ${providerName} failed, used ${result.source} instead`);
      }
    } catch (error) {
      setMessage(`❌ ${providerName} test failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', system-ui, sans-serif",
      padding: '20px',
      maxWidth: '500px',
      background: 'linear-gradient(135deg, #E6F3FF 0%, #F8FBFF 50%, #FFFFFF 100%)',
      color: '#2D3748',
      borderRadius: '8px',
      boxShadow: '0 8px 32px rgba(135, 206, 235, 0.15)',
      border: '1px solid rgba(135, 206, 235, 0.2)'
    }}>
      <h2 style={{ margin: '0 0 20px 0', fontSize: '24px', fontWeight: '700', color: '#1A365D' }}>
        🤖 AI Settings
      </h2>

      {/* Provider Status */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>Provider Status</h3>
        {providers.map(provider => (
          <div key={provider.name} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            marginBottom: '8px'
          }}>
            <span>
              {provider.available ? '✅' : '❌'} {provider.name}
              {provider.requiresApiKey && !provider.available && ' (API key needed)'}
            </span>
            {provider.available && (
              <button
                onClick={() => handleTestProvider(provider.name.toLowerCase().replace(/\s+/g, '-'))}
                disabled={isLoading}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Test
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Preferred Provider */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
          Preferred Provider:
        </label>
        <select
          value={settings.preferredProvider}
          onChange={(e) => setSettings({...settings, preferredProvider: e.target.value})}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '6px',
            border: 'none',
            background: 'rgba(255, 255, 255, 0.9)',
            color: '#333'
          }}
        >
          <option value="chrome-ai">Chrome Built-in AI (No API key)</option>
          <option value="openai">OpenAI GPT-4</option>
          <option value="claude">Anthropic Claude</option>
          <option value="local">Local Analysis</option>
        </select>
      </div>

      {/* API Keys */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '18px' }}>API Keys</h3>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
            OpenAI API Key:
          </label>
          <input
            type="password"
            value={settings.openaiKey}
            onChange={(e) => setSettings({...settings, openaiKey: e.target.value})}
            placeholder="sk-..."
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: 'none',
              background: 'rgba(255, 255, 255, 0.9)',
              color: '#333',
              boxSizing: 'border-box'
            }}
          />
          <div style={{ fontSize: '12px', opacity: '0.8', marginTop: '4px' }}>
            Get your key at: <a href="https://platform.openai.com/api-keys" target="_blank" style={{ color: '#fff' }}>platform.openai.com</a>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>
            Claude API Key:
          </label>
          <input
            type="password"
            value={settings.claudeKey}
            onChange={(e) => setSettings({...settings, claudeKey: e.target.value})}
            placeholder="sk-ant-..."
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: 'none',
              background: 'rgba(255, 255, 255, 0.9)',
              color: '#333',
              boxSizing: 'border-box'
            }}
          />
          <div style={{ fontSize: '12px', opacity: '0.8', marginTop: '4px' }}>
            Get your key at: <a href="https://console.anthropic.com/" target="_blank" style={{ color: '#fff' }}>console.anthropic.com</a>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <button
          onClick={handleSaveSettings}
          disabled={isLoading}
          style={{
            flex: 1,
            background: 'rgba(255, 255, 255, 0.2)',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            transition: 'all 0.2s ease'
          }}
        >
          {isLoading ? '⏳ Saving...' : '💾 Save Settings'}
        </button>
      </div>

      {/* Status Message */}
      {message && (
        <div style={{
          padding: '12px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          fontSize: '14px',
          wordBreak: 'break-word'
        }}>
          {message}
        </div>
      )}

      {/* Info */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        padding: '16px',
        borderRadius: '8px',
        fontSize: '14px',
        lineHeight: '1.4'
      }}>
        <strong>💡 Smart Fallback System:</strong><br/>
        The extension will automatically try providers in order: Chrome AI → Your preferred provider → Local analysis.
        This ensures you always get explanations even without API keys!
      </div>
    </div>
  );
};