import { useAccount } from 'wagmi';
import { useInfoTradeRead, useInfoBasicDetails, useInfoContent } from '../hooks/useInfoTrade';
import { useState, useEffect } from 'react';

export function MyPurchases() {
  const { address } = useAccount();
  const { userPurchases, refetch } = useInfoTradeRead();
  const [refreshKey, setRefreshKey] = useState(0);

  const forceRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
  };

  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 10000);

    return () => clearInterval(interval);
  }, [refetch]);

  if (!userPurchases || userPurchases.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '4rem 0',
        color: '#6b7280'
      }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>您还没有购买任何信息</h2>
        <p>去信息市场看看，购买一些有价值的信息吧！</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937' }}>
          我的购买 ({userPurchases.length})
        </h1>
        <button
          onClick={forceRefresh}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer',
          }}
        >
          刷新
        </button>
      </div>

      <div style={{
        display: 'grid',
        gap: '1.5rem',
        gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))'
      }}>
        {userPurchases.map(infoId => (
          <PurchaseItem
            key={`${Number(infoId)}-${refreshKey}`}
            infoId={Number(infoId)}
            userAddress={address}
          />
        ))}
      </div>
    </div>
  );
}

interface PurchaseItemProps {
  infoId: number;
  userAddress?: string;
}

function PurchaseItem({ infoId, userAddress }: PurchaseItemProps) {
  const { data: basicDetails, refetch } = useInfoBasicDetails(infoId);
  const { content, refetch: refetchContent } = useInfoContent(infoId);

  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
      refetchContent();
    }, 15000);

    return () => clearInterval(interval);
  }, [refetch, refetchContent]);

  if (!basicDetails) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        padding: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px'
      }}>
        <div style={{ color: '#9ca3af' }}>加载中...</div>
      </div>
    );
  }

  const formatDate = (timestamp: bigint) => {
    return new Date(Number(timestamp) * 1000).toLocaleString('zh-CN');
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '0.5rem',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      padding: '1.5rem',
      border: basicDetails.hasAccess ? '2px solid #10b981' : '2px solid #f59e0b'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '1rem'
      }}>
        <div>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: '0.5rem'
          }}>
            {basicDetails.title}
          </h3>
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
            fontSize: '0.875rem',
            color: '#6b7280'
          }}>
            <span>ID: #{infoId}</span>
            <span>•</span>
            <span>卖家: {formatAddress(basicDetails.owner)}</span>
          </div>
        </div>
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'center',
          flexDirection: 'column'
        }}>
          <span style={{
            backgroundColor: '#dbeafe',
            color: '#1d4ed8',
            padding: '0.25rem 0.5rem',
            borderRadius: '0.25rem',
            fontSize: '0.75rem',
            fontWeight: '500'
          }}>
            已购买
          </span>
          <span style={{
            backgroundColor: basicDetails.hasAccess ? '#dcfce7' : '#fef3c7',
            color: basicDetails.hasAccess ? '#166534' : '#92400e',
            padding: '0.25rem 0.5rem',
            borderRadius: '0.25rem',
            fontSize: '0.75rem',
            fontWeight: '500'
          }}>
            {basicDetails.hasAccess ? '已授权' : '待授权'}
          </span>
        </div>
      </div>

      {/* Status Message */}
      {!basicDetails.hasAccess && (
        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #fbbf24',
          borderRadius: '0.375rem',
          padding: '1rem',
          marginBottom: '1rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            color: '#92400e'
          }}>
            <span style={{ fontSize: '1.2rem' }}>⏳</span>
            <span>购买成功！等待卖家授权访问...</span>
          </div>
        </div>
      )}

      {/* Content */}
      {basicDetails.hasAccess && content && (
        <div style={{
          backgroundColor: '#f0f9ff',
          border: '1px solid #7dd3fc',
          borderRadius: '0.375rem',
          padding: '1rem',
          marginBottom: '1rem'
        }}>
          <h4 style={{
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#0c4a6e',
            marginBottom: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ fontSize: '1.2rem' }}>🔓</span>
            信息内容已解锁:
          </h4>
          <p style={{
            color: '#1f2937',
            lineHeight: '1.5',
            whiteSpace: 'pre-wrap',
            backgroundColor: 'white',
            padding: '0.75rem',
            borderRadius: '0.25rem',
            border: '1px solid #e0f2fe'
          }}>
            {content}
          </p>
        </div>
      )}

      {basicDetails.hasAccess && !content && (
        <div style={{
          backgroundColor: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '0.375rem',
          padding: '1rem',
          marginBottom: '1rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            color: '#dc2626'
          }}>
            <span style={{ fontSize: '1.2rem' }}>❌</span>
            <span>无法加载信息内容，请稍后重试</span>
          </div>
        </div>
      )}

      {/* Activity Status */}
      {!basicDetails.isActive && (
        <div style={{
          backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '0.375rem',
          padding: '0.75rem',
          marginBottom: '1rem'
        }}>
          <div style={{
            fontSize: '0.75rem',
            color: '#6b7280',
            textAlign: 'center'
          }}>
            ℹ️ 此信息已被卖家停用
          </div>
        </div>
      )}

      {/* Footer */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '1rem',
        paddingTop: '1rem',
        borderTop: '1px solid #e5e7eb',
        fontSize: '0.75rem',
        color: '#9ca3af'
      }}>
        <span>购买时间: {formatDate(basicDetails.createdAt)}</span>
        {basicDetails.hasAccess && (
          <span style={{ color: '#10b981', fontWeight: '500' }}>✅ 可访问</span>
        )}
      </div>
    </div>
  );
}