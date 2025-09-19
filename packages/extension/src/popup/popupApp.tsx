import React, { useState, useEffect } from "react";

interface Stats {
  termsAnalyzed: number;
  sessionsActive: number;
  lastUsed: string;
}

export const PopupApp: React.FC = () => {
  const [stats, setStats] = useState<Stats>({
    termsAnalyzed: 0,
    sessionsActive: 1,
    lastUsed: 'Never'
  });
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    // Load stats from chrome storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['eonMentorStats'], (result) => {
        if (result.eonMentorStats) {
          setStats(result.eonMentorStats);
        }
      });
    } else {
      // Development mode - use mock data
      setStats({
        termsAnalyzed: 127,
        sessionsActive: 3,
        lastUsed: '2 minutes ago'
      });
    }
  }, []);

  const handleToggleActive = () => {
    setIsActive(!isActive);
    // In a real implementation, this would disable/enable the content script
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ eonMentorActive: !isActive });
    } else {
      console.log('Toggle active:', !isActive);
    }
  };

  const handleOpenOptions = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.openOptionsPage();
    } else {
      console.log('Open options page');
      alert('Options page would open in Chrome extension');
    }
  };

  return (
    <div style={{ 
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', system-ui, sans-serif", 
      padding: 20, 
      width: 320,
      background: 'linear-gradient(135deg, #E6F3FF 0%, #F8FBFF 50%, #FFFFFF 100%)',
      color: '#2D3748',
      borderRadius: 0,
      boxShadow: '0 4px 20px rgba(135, 206, 235, 0.15)',
      border: '1px solid rgba(135, 206, 235, 0.2)'
    }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ 
          margin: '0 0 8px 0', 
          fontSize: 20, 
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: '#1A365D'
        }}>
          🧠 EonMentor AI
        </h2>
        <p style={{ 
          margin: 0, 
          fontSize: 13, 
          color: '#4A5568',
          fontWeight: 500,
          lineHeight: 1.4 
        }}>
          Professional financial literacy assistant
        </p>
      </div>

      <div style={{ 
        background: 'rgba(255, 255, 255, 0.7)', 
        borderRadius: 8, 
        padding: 16,
        marginBottom: 16,
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(135, 206, 235, 0.3)',
        boxShadow: '0 2px 10px rgba(135, 206, 235, 0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: '#4A5568', fontWeight: 500 }}>Status</span>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            color: isActive ? '#2B6CB0' : '#718096'
          }}>
            <div style={{ 
              width: 8, 
              height: 8, 
              borderRadius: '50%', 
              background: isActive ? '#87CEEB' : '#A0AEC0' 
            }} />
            {isActive ? 'Active' : 'Disabled'}
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: '#4A5568', fontWeight: 500 }}>Terms Analyzed</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#2D3748' }}>{stats.termsAnalyzed}</span>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, color: '#4A5568', fontWeight: 500 }}>Last Used</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#2D3748' }}>{stats.lastUsed}</span>
        </div>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: 8,
        marginBottom: 16
      }}>
        <button
          onClick={handleToggleActive}
          style={{
            padding: '10px 16px',
            fontSize: 13,
            fontWeight: 600,
            background: isActive ? '#E53E3E' : '#87CEEB',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}
        >
          {isActive ? '⏸️ Disable' : '▶️ Enable'}
        </button>
        
        <button
          onClick={handleOpenOptions}
          style={{
            padding: '10px 16px',
            fontSize: 13,
            fontWeight: 600,
            background: 'rgba(255, 255, 255, 0.8)',
            color: '#2B6CB0',
            border: '1px solid rgba(135, 206, 235, 0.4)',
            borderRadius: 6,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}
        >
          ⚙️ Settings
        </button>
      </div>

      <div style={{ 
        textAlign: 'center',
        fontSize: 12,
        color: '#4A5568',
        borderTop: '1px solid rgba(135, 206, 235, 0.3)',
        paddingTop: 12,
        fontWeight: 500
      }}>
        💡 Highlight financial text on any webpage to get instant explanations
      </div>
    </div>
  );
};
