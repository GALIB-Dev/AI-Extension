import React, { useState, useEffect } from 'react';
import { aiService, AIProvider } from '@eonmentor/shared/src/ai-service';

interface ApiKeySettings {
  openaiKey: string;
  claudeKey: string;
  geminiKey: string;
  preferredProvider: string;
  enableCloudAI: boolean;
}

export const SettingsPanelMinimal: React.FC = () => {
  const [settings, setSettings] = useState<ApiKeySettings>({
    openaiKey: '',
    claudeKey: '',
    geminiKey: '',
    preferredProvider: 'chrome-ai',
    enableCloudAI: false
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
        'gemini_api_key',
        'preferred_provider',
        'enable_cloud_ai'
      ]);
      
      setSettings({
        openaiKey: result.openai_api_key || '',
        claudeKey: result.claude_api_key || '',
        geminiKey: result.gemini_api_key || '',
        preferredProvider: result.preferred_provider || 'chrome-ai',
        enableCloudAI: result.enable_cloud_ai === true
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
      if (settings.openaiKey) {
        await aiService.setApiKey('openai', settings.openaiKey);
      }
      
      if (settings.claudeKey) {
        await aiService.setApiKey('claude', settings.claudeKey);
      }

      if (settings.geminiKey) {
        await aiService.setApiKey('gemini', settings.geminiKey);
      }

      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({
          preferred_provider: settings.preferredProvider,
          enable_cloud_ai: settings.enableCloudAI
        });
      }

      await loadProviders();
      setMessage('✅ Saved');
      setTimeout(() => setMessage(''), 2000);
      
    } catch (error) {
      setMessage(`❌ Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #87CEEB 0%, #F8FBFF 100%)',
      padding: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif'
    }}>
      <div style={{
        maxWidth: '500px',
        margin: '0 auto',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 8px 32px rgba(135, 206, 235, 0.25)',
        border: '1px solid rgba(255, 255, 255, 0.3)'
      }}>
        {/* Header */}
        <h1 style={{ margin: '0 0 20px 0', fontSize: '24px', color: '#1A365D' }}>
          🤖 AI Settings
        </h1>

        {/* Status */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '20px' }}>
          {providers.map(provider => (
            <div key={provider.name} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 12px',
              background: 'rgba(135, 206, 235, 0.1)',
              borderRadius: '6px',
              fontSize: '13px'
            }}>
              <span style={{ fontWeight: '500' }}>{provider.name}</span>
              <span>{provider.available ? '✅' : '❌'}</span>
            </div>
          ))}
        </div>

        {/* API Keys */}
        <div style={{
          marginBottom: '16px',
          padding: '12px 14px',
          background: 'rgba(135, 206, 235, 0.1)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <input
            id="enable-cloud-ai"
            type="checkbox"
            checked={settings.enableCloudAI}
            onChange={(e) => setSettings({...settings, enableCloudAI: e.target.checked})}
          />
          <label htmlFor="enable-cloud-ai" style={{ fontSize: '14px', color: '#1A365D', cursor: 'pointer' }}>
            Enable Cloud AI Providers (OpenAI / Claude / Gemini)
          </label>
        </div>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ marginBottom: '12px' }}>
            <input
              type="password"
              value={settings.openaiKey}
              onChange={(e) => setSettings({...settings, openaiKey: e.target.value})}
              placeholder="OpenAI API Key (sk-...)"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(135, 206, 235, 0.3)',
                fontSize: '14px',
                boxSizing: 'border-box',
                background: 'rgba(255, 255, 255, 0.9)'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <input
              type="password"
              value={settings.claudeKey}
              onChange={(e) => setSettings({...settings, claudeKey: e.target.value})}
              placeholder="Claude API Key (sk-ant-...)"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(135, 206, 235, 0.3)',
                fontSize: '14px',
                boxSizing: 'border-box',
                background: 'rgba(255, 255, 255, 0.9)'
              }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <input
              type="password"
              value={settings.geminiKey}
              onChange={(e) => setSettings({...settings, geminiKey: e.target.value})}
              placeholder="Gemini API Key (AIza...)"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(135, 206, 235, 0.3)',
                fontSize: '14px',
                boxSizing: 'border-box',
                background: 'rgba(255, 255, 255, 0.9)'
              }}
            />
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSaveSettings}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '12px',
            background: 'linear-gradient(135deg, #87CEEB 0%, #5A9FD4 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            opacity: isLoading ? 0.7 : 1,
            boxShadow: '0 4px 12px rgba(135, 206, 235, 0.3)'
          }}
        >
          {isLoading ? '⏳ Saving...' : '💾 Save Settings'}
        </button>

        {/* Message */}
        {message && (
          <div style={{
            marginTop: '12px',
            padding: '10px',
            background: 'rgba(135, 206, 235, 0.1)',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#1A365D',
            textAlign: 'center'
          }}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};