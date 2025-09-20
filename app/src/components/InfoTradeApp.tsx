import { useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Header } from './Header';
import { InfoList } from './InfoList';
import { CreateInfo } from './CreateInfo';
import { MyInfos } from './MyInfos';
import { MyPurchases } from './MyPurchases';

type TabType = 'marketplace' | 'create' | 'my-infos' | 'my-purchases';

export function InfoTradeApp() {
  const { isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<TabType>('marketplace');

  if (!isConnected) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '2rem',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 'bold', color: '#1f2937' }}>
          InfoTrade
        </h1>
        <p style={{ fontSize: '1.25rem', color: '#6b7280', maxWidth: '600px' }}>
          直接在链上买卖加密信息。保护您的隐私，通过FHEVM技术确保信息安全。
        </p>
        <ConnectButton />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Header />

      {/* Navigation Tabs */}
      <div style={{
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: 'white',
        position: 'sticky',
        top: 0,
        zIndex: 10
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 1rem'
        }}>
          <nav style={{ display: 'flex', gap: '2rem' }}>
            {[
              { id: 'marketplace', label: '信息市场' },
              { id: 'create', label: '创建信息' },
              { id: 'my-infos', label: '我的信息' },
              { id: 'my-purchases', label: '我的购买' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                style={{
                  padding: '1rem 0',
                  fontSize: '1rem',
                  fontWeight: '500',
                  color: activeTab === tab.id ? '#3b82f6' : '#6b7280',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.color = '#374151';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.color = '#6b7280';
                  }
                }}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2rem 1rem'
      }}>
        {activeTab === 'marketplace' && <InfoList />}
        {activeTab === 'create' && <CreateInfo />}
        {activeTab === 'my-infos' && <MyInfos />}
        {activeTab === 'my-purchases' && <MyPurchases />}
      </main>
    </div>
  );
}