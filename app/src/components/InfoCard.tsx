import { useState } from 'react';
import { useInfoContent, useInfoPrice } from '../hooks/useInfoTrade';
import { ethers } from 'ethers';
import type { InfoBasicDetails } from '../hooks/useInfoTrade';

interface InfoCardProps {
  infoId: number;
  basicDetails: InfoBasicDetails;
  isOwner: boolean;
  canPurchase: boolean;
  canGrantAccess: boolean;
  onPurchase: () => void;
  onGrantAccess: (buyer: string) => void;
}

export function InfoCard({
  infoId,
  basicDetails,
  isOwner,
  canPurchase,
  canGrantAccess,
  onPurchase,
  onGrantAccess
}: InfoCardProps) {
  const { content } = useInfoContent(infoId);
  const { price } = useInfoPrice(infoId);
  const [showGrantForm, setShowGrantForm] = useState(false);
  const [buyerAddress, setBuyerAddress] = useState('');

  const handleGrantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (buyerAddress.trim()) {
      onGrantAccess(buyerAddress.trim());
      setShowGrantForm(false);
      setBuyerAddress('');
    }
  };

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
      border: !basicDetails.isActive ? '2px solid #fbbf24' : '1px solid #e5e7eb'
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
            <span>所有者: {formatAddress(basicDetails.owner)}</span>
          </div>
        </div>
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'center'
        }}>
          {isOwner && (
            <span style={{
              backgroundColor: '#dbeafe',
              color: '#1d4ed8',
              padding: '0.25rem 0.5rem',
              borderRadius: '0.25rem',
              fontSize: '0.75rem',
              fontWeight: '500'
            }}>
              我的
            </span>
          )}
          <span style={{
            backgroundColor: basicDetails.isActive ? '#dcfce7' : '#fef3c7',
            color: basicDetails.isActive ? '#166534' : '#92400e',
            padding: '0.25rem 0.5rem',
            borderRadius: '0.25rem',
            fontSize: '0.75rem',
            fontWeight: '500'
          }}>
            {basicDetails.isActive ? '活跃' : '已停用'}
          </span>
        </div>
      </div>

      {/* Status and Price */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '1rem',
        fontSize: '0.875rem',
        flexWrap: 'wrap'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          color: basicDetails.hasPurchased ? '#059669' : '#6b7280'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: basicDetails.hasPurchased ? '#10b981' : '#d1d5db'
          }} />
          {basicDetails.hasPurchased ? '已购买' : '未购买'}
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          color: basicDetails.hasAccess ? '#059669' : '#6b7280'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: basicDetails.hasAccess ? '#10b981' : '#d1d5db'
          }} />
          {basicDetails.hasAccess ? '可访问' : '无权限'}
        </div>
        {price && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            color: '#7c3aed',
            fontWeight: '600'
          }}>
            💰 {ethers.formatEther(price)} ETH
          </div>
        )}
      </div>

      {/* Content */}
      {basicDetails.hasAccess && content && (
        <div style={{
          backgroundColor: '#f9fafb',
          padding: '1rem',
          borderRadius: '0.375rem',
          marginBottom: '1rem',
          border: '1px solid #e5e7eb'
        }}>
          <h4 style={{
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '0.5rem'
          }}>
            信息内容:
          </h4>
          <p style={{
            color: '#1f2937',
            lineHeight: '1.5',
            whiteSpace: 'pre-wrap'
          }}>
            {content}
          </p>
        </div>
      )}

      {/* Actions */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        flexWrap: 'wrap'
      }}>
        {canPurchase && (
          <button
            onClick={onPurchase}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            购买信息
          </button>
        )}

        {canGrantAccess && !showGrantForm && (
          <button
            onClick={() => setShowGrantForm(true)}
            style={{
              backgroundColor: '#10b981',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            授权访问
          </button>
        )}

        {showGrantForm && (
          <form onSubmit={handleGrantSubmit} style={{
            display: 'flex',
            gap: '0.5rem',
            width: '100%'
          }}>
            <input
              type="text"
              placeholder="输入买家地址"
              value={buyerAddress}
              onChange={(e) => setBuyerAddress(e.target.value)}
              style={{
                flex: 1,
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            />
            <button
              type="submit"
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.375rem',
                border: 'none',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              确认
            </button>
            <button
              type="button"
              onClick={() => {
                setShowGrantForm(false);
                setBuyerAddress('');
              }}
              style={{
                backgroundColor: '#6b7280',
                color: 'white',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.375rem',
                border: 'none',
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              取消
            </button>
          </form>
        )}
      </div>

      {/* Footer */}
      <div style={{
        marginTop: '1rem',
        paddingTop: '1rem',
        borderTop: '1px solid #e5e7eb',
        fontSize: '0.75rem',
        color: '#9ca3af'
      }}>
        创建时间: {formatDate(basicDetails.createdAt)}
      </div>
    </div>
  );
}