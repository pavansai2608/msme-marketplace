import { useState, useEffect } from 'react';
import { FaDownload, FaTimes } from 'react-icons/fa';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setIsVisible(true);
    });

    window.addEventListener('appinstalled', (evt) => {
      // Log install to analytics
      console.log('INSTALL: Success');
      setIsVisible(false);
    });
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    // Optionally, send analytics event with outcome of user choice
    console.log(`User response to the install prompt: ${outcome}`);
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 10000,
      width: 'calc(100% - 48px)',
      maxWidth: '500px'
    }}>
      <div className="glass-card" style={{
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--text-main)',
        color: 'white',
        border: 'none',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '12px' }}>
            <FaDownload />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>Install MSMEMarket App</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>Access your marketplace faster from home screen.</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button className="btn-primary" onClick={handleInstallClick} style={{ background: 'white', color: 'var(--text-main)', padding: '8px 20px', fontSize: '0.85rem' }}>Install</button>
          <div onClick={() => setIsVisible(false)} style={{ cursor: 'pointer', opacity: 0.6 }}><FaTimes /></div>
        </div>
      </div>
    </div>
  );
}
