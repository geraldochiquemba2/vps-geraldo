import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Zap, Globe, Copy, Check, RefreshCw } from 'lucide-react';
import { SERVERS, generateVLESSUri } from './utils/vless';

function App() {
  const [selectedOperator, setSelectedOperator] = useState('UNITEL');
  const [selectedServer, setSelectedServer] = useState(null);
  const [copied, setCopied] = useState(null);
  const [showQR, setShowQR] = useState(null);

  const filteredServers = SERVERS.filter(s => s.operator === selectedOperator);

  const handleCopy = (server) => {
    const uri = generateVLESSUri(server);
    navigator.clipboard.writeText(uri);
    setCopied(server.id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="app-container">
      <div className="animated-bg"></div>

      <header className="hero">
        <span className="badge">Projecto VPN Angola</span>
        <h1>Internet sem Limites</h1>
        <p style={{ color: 'var(--text-muted)' }}>Servidores testados para Unitel & Africell</p>
      </header>

      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '0 1rem 4rem' }}>
        {/* Operator Selector */}
        <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontWeight: '600', marginBottom: '1rem', textAlign: 'center' }}>
            Escolha a sua Operadora:
          </p>
          <div className="operator-grid">
            {[
              { key: 'UNITEL', name: 'Unitel', color: '#ff6600', rgb: '255, 102, 0' },
              { key: 'AFRICELL', name: 'Africell', color: '#00adef', rgb: '0, 173, 239' }
            ].map(op => (
              <button
                key={op.key}
                className={`operator-btn ${selectedOperator === op.key ? 'selected' : ''}`}
                style={{ '--accent-color': op.color, '--accent-rgb': op.rgb }}
                onClick={() => { setSelectedOperator(op.key); setSelectedServer(null); setShowQR(null); }}
              >
                <Zap size={24} color={op.color} />
                <span>{op.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* How to use */}
        <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: '600' }}>
            📲 Como usar:
          </p>
          <ol style={{ paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.8' }}>
            <li>Escolhe a tua operadora acima.</li>
            <li>Clica em <b>Copiar</b> num servidor abaixo.</li>
            <li>Abre o <b>NapsternetV</b> → <b>+</b> → <b>Import from Clipboard</b>.</li>
            <li>Clica em <b>START</b>. Pronto! 🎉</li>
          </ol>
        </div>

        {/* Server List */}
        <p style={{ fontWeight: '600', marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          SERVIDORES DISPONÍVEIS ({filteredServers.length})
        </p>

        {filteredServers.map(server => {
          const uri = generateVLESSUri(server);
          const isCopied = copied === server.id;
          const isShowingQR = showQR === server.id;

          return (
            <div key={server.id} className="glass-card" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <p style={{ fontWeight: '700', fontSize: '1rem' }}>
                    {server.flag} {server.name}
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    📍 {server.location}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    background: 'rgba(16,185,129,0.15)',
                    color: '#10b981',
                    padding: '2px 8px',
                    borderRadius: '99px',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}>
                    ● ONLINE
                  </span>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {server.ping}
                  </p>
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem', background: 'rgba(255,255,255,0.04)', borderRadius: '0.5rem', padding: '0.5rem 0.75rem' }}>
                <span>Host: <b style={{ color: '#e2e8f0' }}>{server.host}</b></span>
                <span style={{ margin: '0 0.5rem' }}>•</span>
                <span>SNI: <b style={{ color: '#e2e8f0' }}>{server.sni}</b></span>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <a
                  href={uri}
                  className="btn-primary"
                  style={{ flex: 2, padding: '0.75rem', fontSize: '0.9rem', textDecoration: 'none' }}
                >
                  <Zap size={16} fill="currentColor" />
                  Conectar
                </a>
                <button
                  onClick={() => handleCopy(server)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '0.75rem',
                    border: '1px solid var(--glass-border)',
                    background: isCopied ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)',
                    color: isCopied ? '#10b981' : 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    transition: 'all 0.2s'
                  }}
                >
                  {isCopied ? <Check size={16} /> : <Copy size={16} />}
                  {isCopied ? 'Copiado!' : 'Copiar'}
                </button>
                <button
                  onClick={() => setShowQR(isShowingQR ? null : server.id)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '0.75rem',
                    border: '1px solid var(--glass-border)',
                    background: isShowingQR ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)',
                    color: isShowingQR ? 'var(--primary)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    transition: 'all 0.2s'
                  }}
                >
                  <Globe size={16} />
                  QR
                </button>
              </div>

              {isShowingQR && (
                <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                  <div className="qr-container">
                    <QRCodeSVG value={uri} size={160} level="M" />
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    Digitaliza com o NapsternetV ou v2rayNG
                  </p>
                </div>
              )}
            </div>
          );
        })}

        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2rem', opacity: 0.5 }}>
          © 2025 Portal VPN Angola. Se um servidor parar, tenta outro.
        </p>
      </main>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}

export default App;
