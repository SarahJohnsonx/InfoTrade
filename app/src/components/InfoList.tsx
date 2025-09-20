import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useInfoTradeRead, useInfoBasicDetails, useInfoTradeWrite } from '../hooks/useInfoTrade';
import { InfoCard } from './InfoCard';

export function InfoList() {
  const { address } = useAccount();
  const { totalCount, refetch } = useInfoTradeRead();
  const { purchaseInfo, grantAccess, loading, error } = useInfoTradeWrite();
  const [refreshKey, setRefreshKey] = useState(0);

  const forceRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
  };

  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [refetch]);

  const handlePurchase = async (infoId: number) => {
    try {
      await purchaseInfo(infoId);
      forceRefresh();
      alert('购买成功！等待卖家确认后即可查看信息内容。');
    } catch (err) {
      console.error('Purchase failed:', err);
      alert('购买失败：' + (err as Error).message);
    }
  };

  const handleGrantAccess = async (infoId: number, buyer: string) => {
    try {
      await grantAccess(infoId, buyer);
      forceRefresh();
      alert('访问权限已授予！');
    } catch (err) {
      console.error('Grant access failed:', err);
      alert('授权失败：' + (err as Error).message);
    }
  };

  if (!totalCount) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '4rem 0',
        color: '#6b7280'
      }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>暂无信息</h2>
        <p>还没有人发布信息，成为第一个分享者吧！</p>
      </div>
    );
  }

  const infoIds = Array.from({ length: Number(totalCount) }, (_, i) => i + 1);

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937' }}>
          信息市场
        </h1>
        <button
          onClick={forceRefresh}
          disabled={loading}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? '刷新中...' : '刷新'}
        </button>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '0.375rem',
          padding: '1rem',
          marginBottom: '1rem',
          color: '#dc2626'
        }}>
          错误：{error}
        </div>
      )}

      <div style={{
        display: 'grid',
        gap: '1.5rem',
        gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))'
      }}>
        {infoIds.map(infoId => (
          <InfoListItem
            key={`${infoId}-${refreshKey}`}
            infoId={infoId}
            onPurchase={handlePurchase}
            onGrantAccess={handleGrantAccess}
            userAddress={address}
          />
        ))}
      </div>
    </div>
  );
}

interface InfoListItemProps {
  infoId: number;
  onPurchase: (infoId: number) => void;
  onGrantAccess: (infoId: number, buyer: string) => void;
  userAddress?: string;
}

function InfoListItem({ infoId, onPurchase, onGrantAccess, userAddress }: InfoListItemProps) {
  const { data: basicDetails, refetch } = useInfoBasicDetails(infoId);

  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 15000);

    return () => clearInterval(interval);
  }, [refetch]);

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

  const isOwner = userAddress?.toLowerCase() === basicDetails.owner.toLowerCase();
  const canPurchase = !isOwner && !basicDetails.hasPurchased && basicDetails.isActive;
  const canGrantAccess = isOwner && basicDetails.hasPurchased && !basicDetails.hasAccess;

  return (
    <InfoCard
      infoId={infoId}
      basicDetails={basicDetails}
      isOwner={isOwner}
      canPurchase={canPurchase}
      canGrantAccess={canGrantAccess}
      onPurchase={() => onPurchase(infoId)}
      onGrantAccess={(buyer) => onGrantAccess(infoId, buyer)}
    />
  );
}