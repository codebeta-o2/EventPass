import { useState, useEffect } from 'react';
import './App.css';
import { QRCodeSVG } from 'qrcode.react';
import { requestAccess, setAllowed, signTransaction } from '@stellar/freighter-api';
import { Client, networks } from 'event_pass';
import { api } from './api';

type WalletMode = 'manual' | 'automatic' | null;

// Initialize the Soroban contract client
const contract = new Client({
  ...networks.testnet,
  contractId: import.meta.env.VITE_CONTRACT_ID as string,
  rpcUrl: import.meta.env.VITE_STELLAR_RPC_URL as string,
});

function App() {
  const [mode, setMode] = useState<WalletMode>(null);
  const [publicKey, setPublicKey] = useState<string>('');
  const [manualKeyInput, setManualKeyInput] = useState('');
  
  // App states
  const [activeTab, setActiveTab] = useState<'claim' | 'organizer' | 'verify'>('claim');
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  
  // Claim state
  const [ticketId, setTicketId] = useState<number | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);

  // Organizer state
  const [isInitializing, setIsInitializing] = useState(false);
  const [initName, setInitName] = useState('HackTropica 2027');
  const [initMax, setInitMax] = useState<number>(1000);
  const [initPrice, setInitPrice] = useState<number>(10);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Check initialization on mount
  useEffect(() => {
    async function checkInit() {
      try {
        const { result } = await contract.is_initialized();
        setHasInitialized(result);
        if (result) {
            try {
                const events = await api.getEvents();
                if (events.length > 0) {
                    setCurrentEvent(events[0]);
                    setInitName(events[0].name);
                    setInitMax(events[0].max_tickets);
                    setInitPrice(events[0].price_stroops / 10000000);
                }
            } catch (backendErr) {
                console.error("Failed to fetch event from backend:", backendErr);
            }
        }
      } catch (err) {
        console.error("Failed to check initialization status:", err);
      }
    }
    checkInit();
  }, []);

  // Verify state
  const [verifyId, setVerifyId] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);

  const connectFreighter = async () => {
    try {
      await setAllowed();
      const access = await requestAccess();
      if (access.error) {
        alert(access.error);
        return;
      }
      setPublicKey(access.address);
    } catch (e) {
      console.error(e);
      alert('Error connecting to Freighter');
    }
  };

  const connectManual = () => {
    if (manualKeyInput.length === 56) {
      setPublicKey(manualKeyInput);
    } else {
      alert("Invalid public key length");
    }
  };

  const handleClaim = async () => {
    if (!publicKey) return;
    if (mode === 'manual') {
      alert("Manual mode is read-only. Please use Freighter to claim a ticket.");
      return;
    }
    
    setIsClaiming(true);
    try {
      // Create and simulate transaction
      const tx = await contract.claim_ticket({ user: publicKey }, { publicKey });
      
      // Sign and submit using Freighter
      const result = await tx.signAndSend({
        signTransaction: async (xdr: string) => {
          const signed = await signTransaction(xdr, { networkPassphrase: networks.testnet.networkPassphrase });
          if (signed.error) throw new Error(signed.error);
          return signed;
        }
      });
      
      setTicketId(result.result);
      if (currentEvent) {
          try {
              await api.syncTicket(result.result, currentEvent.id, publicKey);
          } catch (syncErr) {
              console.error("Failed to sync ticket with backend:", syncErr);
          }
      }
      alert('Ticket claimed successfully!');
    } catch (err: any) {
      console.error(err);
      alert(`Claim failed: ${err.message || err}`);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleInitialize = async () => {
    if (!publicKey) return;
    if (mode === 'manual') {
      alert("Manual mode is read-only. Please use Freighter to initialize.");
      return;
    }

    setIsInitializing(true);
    try {
      // 1 XLM = 10,000,000 stroops
      const priceInStroops = BigInt(initPrice * 10000000);
      
      // Use Testnet Native XLM asset
      const asset = import.meta.env.VITE_PAYMENT_ASSET_ID as string;
      
      const tx = await contract.initialize({
        admin: publicKey,
        event_name: initName,
        max_tickets: initMax,
        price: priceInStroops,
        asset,
      }, { publicKey });

      await tx.signAndSend({
        signTransaction: async (xdr: string) => {
          const signed = await signTransaction(xdr, { networkPassphrase: networks.testnet.networkPassphrase });
          if (signed.error) throw new Error(signed.error);
          return signed;
        }
      });

      try {
          const newEvent = await api.createEvent({
              name: initName,
              max_tickets: initMax,
              price_stroops: Number(priceInStroops),
              admin_public_key: publicKey
          });
          setCurrentEvent(newEvent);
      } catch (backendErr) {
          console.error("Failed to save event to backend:", backendErr);
      }

      alert('Event initialized successfully on blockchain!');
      setHasInitialized(true);
    } catch (err: any) {
      console.error(err);
      alert(`Initialization failed: ${err.message || err}`);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleVerify = async () => {
    if (!verifyId) return;
    setIsVerifying(true);
    setVerifyResult(null);
    try {
      const id = parseInt(verifyId, 10);
      if (isNaN(id)) throw new Error('Invalid Ticket ID');

      // Try backend first
      try {
          const backendTicket = await api.verifyTicket(id);
          setVerifyResult(backendTicket.state.toUpperCase());
          setIsVerifying(false);
          return;
      } catch (backendErr) {
          console.log("Backend verification failed or not synced, falling back to blockchain");
      }

      const tx = await contract.verify_ticket({ ticket_id: id }, publicKey ? { publicKey } : undefined);
      
      if (tx.result?.tag === 'Valid') {
        setVerifyResult('VALID');
      } else if (tx.result?.tag === 'Used') {
        setVerifyResult('USED');
      } else {
        setVerifyResult('UNKNOWN');
      }
    } catch (err: any) {
      console.error(err);
      setVerifyResult('NOT_FOUND');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleUseTicket = async () => {
    if (!publicKey) return;
    if (mode === 'manual') {
      alert("Manual mode is read-only. Please use Freighter to use a ticket.");
      return;
    }
    if (!verifyId) return;

    try {
      const id = parseInt(verifyId, 10);
      const tx = await contract.use_ticket({ admin: publicKey, ticket_id: id }, { publicKey });
      
      await tx.signAndSend({
        signTransaction: async (xdr: string) => {
          const signed = await signTransaction(xdr, { networkPassphrase: networks.testnet.networkPassphrase });
          if (signed.error) throw new Error(signed.error);
          return signed;
        }
      });

      try {
          await api.useTicket(id, publicKey);
      } catch (backendErr) {
          console.error("Failed to sync used status with backend:", backendErr);
      }

      alert('Ticket marked as used!');
      setVerifyResult('USED');
    } catch (err: any) {
      console.error(err);
      alert(`Use ticket failed: ${err.message || err}`);
    }
  };

  return (
    <div className="app-container dark-mode">
      <nav className="navbar glass">
        <h1>EventPass</h1>
        <div className="wallet-section">
          {!publicKey ? (
            <div className="connect-options">
              <select 
                value={mode || ''} 
                onChange={(e) => setMode(e.target.value as WalletMode)}
                className="mode-select glass-input"
              >
                <option value="" disabled>Select your mode</option>
                <option value="automatic">Automatic (Freighter)</option>
                <option value="manual">Manual (Read-only)</option>
              </select>
              
              {mode === 'automatic' && (
                <button className="btn-primary" onClick={connectFreighter}>Connect Wallet</button>
              )}
              
              {mode === 'manual' && (
                <div className="manual-connect">
                  <input 
                    type="text" 
                    placeholder="Enter Public Key (G...)" 
                    value={manualKeyInput}
                    onChange={(e) => setManualKeyInput(e.target.value)}
                    className="glass-input"
                  />
                  <button className="btn-primary" onClick={connectManual}>Connect</button>
                </div>
              )}
            </div>
          ) : (
            <div className="connected-status glass">
              <span>{publicKey.substring(0, 6)}...{publicKey.substring(50)}</span>
              <button className="btn-secondary" onClick={() => { setPublicKey(''); setTicketId(null); }}>Disconnect</button>
            </div>
          )}
        </div>
      </nav>

      <main className="main-content">
        <div className="tabs">
          <button className={`tab ${activeTab === 'claim' ? 'active' : ''}`} onClick={() => setActiveTab('claim')}>Claim Ticket</button>
          <button className={`tab ${activeTab === 'organizer' ? 'active' : ''}`} onClick={() => setActiveTab('organizer')}>Organizer</button>
          <button className={`tab ${activeTab === 'verify' ? 'active' : ''}`} onClick={() => setActiveTab('verify')}>Verify</button>
        </div>

        <div className="tab-content glass-panel">
          {activeTab === 'claim' && (
            <div className="claim-section">
              <h2>{currentEvent ? currentEvent.name : 'HackTropica 2027'}</h2>
              <p>Get your ticket now to participate in the ultimate Web3 hackathon!</p>
              <div className="ticket-card">
                {ticketId ? (
                  <div className="qr-container">
                    <h3>Your Ticket ID: #{ticketId}</h3>
                    <QRCodeSVG value={JSON.stringify({ ticketId, owner: publicKey })} size={200} />
                    <p className="status valid">VALID</p>
                  </div>
                ) : (
                  <button className="btn-glow" onClick={handleClaim} disabled={!publicKey || isClaiming || mode === 'manual'}>
                    {!publicKey ? 'Connect Wallet to Claim' : (isClaiming ? 'Claiming...' : `Claim Ticket (${currentEvent ? currentEvent.price_stroops / 10000000 : 10} XLM)`)}
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'organizer' && (
            <div className="organizer-section">
              <h2>Initialize Event</h2>
              <input type="text" placeholder="Event Name" className="glass-input full-width" value={initName} onChange={e => setInitName(e.target.value)} />
              <input type="number" placeholder="Max Tickets" className="glass-input full-width" value={initMax} onChange={e => setInitMax(parseInt(e.target.value) || 1000)} />
              <input type="number" placeholder="Price (XLM)" className="glass-input full-width" value={initPrice} onChange={e => setInitPrice(parseFloat(e.target.value) || 10)} />
              <button className="btn-primary full-width" onClick={handleInitialize} disabled={!publicKey || isInitializing || mode === 'manual' || hasInitialized}>
                {hasInitialized ? 'Already Initialized' : isInitializing ? 'Initializing...' : 'Initialize Contract'}
              </button>
            </div>
          )}

          {activeTab === 'verify' && (
            <div className="verify-section">
              <h2>Verify at Entry</h2>
              <p>Scan user's QR code or enter ticket ID below:</p>
              <input 
                type="number" 
                placeholder="Ticket ID" 
                className="glass-input full-width" 
                value={verifyId}
                onChange={e => setVerifyId(e.target.value)}
              />
              <div className="button-group">
                <button className="btn-primary" onClick={handleVerify} disabled={isVerifying || !verifyId}>
                  {isVerifying ? 'Checking...' : 'Check Status'}
                </button>
                <button className="btn-secondary" onClick={handleUseTicket} disabled={!publicKey || verifyResult !== 'VALID' || mode === 'manual'}>
                  Mark as Used
                </button>
              </div>
              
              {verifyResult && (
                <div className={`verify-result ${verifyResult.toLowerCase()}`}>
                  <h3>Status: {verifyResult}</h3>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
