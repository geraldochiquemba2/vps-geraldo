import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Shield, Zap, Globe, Copy, Check, ExternalLink, RefreshCw } from 'lucide-react';
import { OPERATORS, generateVLESSUri, getDeepLink } from './utils/vless';

function App() {
  const [selectedOperator, setSelectedOperator] = useState('UNITEL');
  const [vlessUri, setVlessUri] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Gerar config inicial
  useEffect(() => {
    handleGenerate();
  }, [selectedOperator]);

  const handleGenerate = () => {
    setLoading(true);
    // Simular um pequeno delay para efeito de "calculando túnel"
    setTimeout(() => {
      const uri = generateVLESSUri(selectedOperator);
      setVlessUri(uri);
      setLoading(false);
    }, 600);
  };

  const handleConnect = () => {
    const deepLink = getDeepLink(vlessUri);
    window.location.href = deepLink;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(vlessUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="app-container">
      <div className="animated-bg"></div>

      <header className="hero">
        <span className="badge">Projecto VPN Angola</span>
        <h1>Internet sem Limites</h1>
        <p style={{ color: 'var(--text-muted)' }}>Conecte-se em 1-clique com túneis VLESS</p>
      </header>

      <main className="glass-card">
        <div className="status-indicator">
          <div className="status-dot"></div>
          Servidores Online: 12ms latência
        </div>

        <p style={{ marginBottom: '1.5rem', fontWeight: '500' }}>Escolha a sua Operadora:</p>
        
        <div className="operator-grid">
          {Object.entries(OPERATORS).map(([key, op]) => (
            <button
              key={key}
              className={`operator-btn ${selectedOperator === key ? 'selected' : ''}`}
              style={{ '--accent-color': op.color, '--accent-rgb': key === 'UNITEL' ? '255, 102, 0' : '0, 173, 239' }}
              onClick={() => setSelectedOperator(key)}
            >
              <Zap size={24} color={op.color} />
              <span>{op.name}</span>
            </button>
          ))}
        </div>

        <button 
          className="btn-primary" 
          onClick={handleConnect}
          disabled={loading}
        >
          {loading ? (
            <RefreshCw className="animate-spin" size={20} />
          ) : (
            <Zap size={20} fill="currentColor" />
          )}
          {loading ? 'Gerando Túnel...' : 'CONECTAR AGORA'}
        </button>

        <div style={{ marginTop: '2rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
          <p style={{ fontSize: '0.875rem', marginBottom: '1rem', textAlign: 'center', color: '#fbbf24' }}>
            Não tem a App de VPN? <button onClick={() => setShowModal(true)} style={{ background: 'none', border: 'none', color: '#fbbf24', textDecoration: 'underline', cursor: 'pointer', fontWeight: 'bold' }}>Baixar Aqui</button>
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Configuração VLESS</span>
            <button 
              onClick={handleCopy}
              style={{ background: 'none', border: 'none', color: copied ? '#10b981' : 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.875rem' }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>

          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Ou digitalize o QR Code no seu App (NapsternetV / v2rayNG)
            </p>
            {vlessUri && (
              <div className="qr-container">
                <QRCodeSVG value={vlessUri} size={180} level="M" />
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="footer">
        <p>&copy; 2024 Portal VPN Angola. Desenvolvido para liberdade.</p>
        <p style={{ fontSize: '0.7rem', marginTop: '0.5rem', opacity: 0.5 }}>
          Aviso: O Bug Host depende da operadora. Se parar de funcionar, troque de servidor no painel.
        </p>
      </footer>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1rem' }}>Configuração Necessária</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Para a internet funcionar no telefone todo, precisas de uma App que suporte o protocolo VLESS. Escolhe uma abaixo:
            </p>

            <div className="download-grid">
              <a href="https://play.google.com/store/apps/details?id=com.v2ray.ang" target="_blank" className="download-item">
                <Globe size={20} />
                <div style={{ textAlign: 'left' }}>
                  <strong>v2rayNG</strong>
                  <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>Recomendado (Android)</div>
                </div>
              </a>
              
              <a href="https://play.google.com/store/apps/details?id=com.napsternetlabs.napsternetv" target="_blank" className="download-item">
                <Zap size={20} />
                <div style={{ textAlign: 'left' }}>
                  <strong>NapsternetV</strong>
                  <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>Android & iOS</div>
                </div>
              </a>
            </div>

            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.75rem', fontSize: '0.875rem' }}>
              <strong>Passos:</strong>
              <ol style={{ paddingLeft: '1.2rem', marginTop: '0.5rem' }}>
                <li>Instala uma das Apps acima.</li>
                <li>Volta ao site e clica em <b>CONECTAR AGORA</b>.</li>
                <li>Na App, clica no botão <b>PLAY / START</b>.</li>
              </ol>
            </div>

            <button className="btn-primary" style={{ marginTop: '1.5rem' }} onClick={() => setShowModal(false)}>
              ENTENDI
            </button>
          </div>
        </div>
      )}

      {/* Tailwind-like animation utility for the spin */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}

export default App;
