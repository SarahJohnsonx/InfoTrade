import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { Header } from './Header';
import { InfoSubmission } from './InfoSubmission';
import { InfoBrowse } from './InfoBrowse';
import { InfoManage } from './InfoManage';
import '../styles/InfoTradeApp.css';

export function InfoTradeApp() {
  const { isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'browse' | 'submit' | 'manage'>('browse');

  return (
    <div className="infotrade-app">
      <Header />

      <main className="main-content">
        {!isConnected ? (
          <div className="connect-wallet-container">
            <h2 className="connect-wallet-title">
              Connect Your Wallet
            </h2>
            <p className="connect-wallet-description">
              Please connect your wallet to access InfoTrade
            </p>
            <ConnectButton />
          </div>
        ) : (
          <div>
            <div className="tab-navigation">
              <nav className="tab-nav">
                <button
                  onClick={() => setActiveTab('browse')}
                  className={`tab-button ${activeTab === 'browse' ? 'active' : 'inactive'}`}
                >
                  Browse Info
                </button>
                <button
                  onClick={() => setActiveTab('submit')}
                  className={`tab-button ${activeTab === 'submit' ? 'active' : 'inactive'}`}
                >
                  Store Info
                </button>
                <button
                  onClick={() => setActiveTab('manage')}
                  className={`tab-button ${activeTab === 'manage' ? 'active' : 'inactive'}`}
                >
                  Manage Requests
                </button>
              </nav>
            </div>

            {activeTab === 'browse' && <InfoBrowse />}
            {activeTab === 'submit' && <InfoSubmission />}
            {activeTab === 'manage' && <InfoManage />}
          </div>
        )}
      </main>
    </div>
  );
}