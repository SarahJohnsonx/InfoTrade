import { useState } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { useInfoTradeWrite } from '../hooks/useInfoTrade';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { INFO_TRADE_ADDRESS } from '../contracts/InfoTrade';

export function CreateInfo() {
  const { address } = useAccount();
  const { createInfo, loading, error } = useInfoTradeWrite();
  const { instance, isLoading: zamaLoading, error: zamaError } = useZamaInstance();

  const [formData, setFormData] = useState({
    title: '',
    info: '',
    price: ''
  });

  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('=== CreateInfo handleSubmit started ===');
    console.log('Form data:', formData);

    if (!formData.title.trim() || !formData.info.trim() || !formData.price.trim()) {
      console.log('Validation failed: missing fields');
      alert('请填写所有字段');
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      console.log('Validation failed: invalid price:', price);
      alert('请输入有效的价格');
      return;
    }

    try {
      setSuccess(false);
      console.log('Starting info creation...');

      if (!address) {
        throw new Error('Please connect your wallet');
      }

      if (zamaLoading) {
        throw new Error('Zama is still loading, please wait...');
      }

      if (zamaError) {
        throw new Error(`Zama error: ${zamaError}`);
      }

      if (!instance) {
        throw new Error('Zama instance not initialized');
      }

      console.log('Encrypting owner address with Zama...');
      const input = instance.createEncryptedInput(INFO_TRADE_ADDRESS, address);
      input.addAddress(address);
      const encryptedInput = await input.encrypt();

      const encryptedAddress = encryptedInput.handles[0];
      const inputProof = encryptedInput.inputProof;

      const priceInWei = ethers.parseEther(formData.price);

      console.log('Calling createInfo with params:', {
        title: formData.title,
        info: formData.info,
        encryptedAddress,
        priceInWei: priceInWei.toString(),
        inputProof
      });

      await createInfo(
        formData.title,
        formData.info,
        encryptedAddress,
        priceInWei.toString(),
        inputProof
      );

      console.log('Create info succeeded!');
      setSuccess(true);
      setFormData({ title: '', info: '', price: '' });

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(false), 5000);

    } catch (err) {
      console.error('Create info failed:', err);
      alert('创建失败：' + (err as Error).message);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      <h1 style={{
        fontSize: '2rem',
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: '2rem',
        textAlign: 'center'
      }}>
        创建新信息
      </h1>

      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        padding: '2rem'
      }}>
        {success && (
          <div style={{
            backgroundColor: '#dcfce7',
            border: '1px solid #bbf7d0',
            borderRadius: '0.375rem',
            padding: '1rem',
            marginBottom: '2rem',
            color: '#166534'
          }}>
            信息创建成功！您可以在"我的信息"中查看和管理。
          </div>
        )}

        {zamaLoading && (
          <div style={{
            backgroundColor: '#fef3c7',
            border: '1px solid #fde68a',
            borderRadius: '0.375rem',
            padding: '1rem',
            marginBottom: '2rem',
            color: '#d97706'
          }}>
            正在初始化Zama加密模块...
          </div>
        )}

        {zamaError && (
          <div style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '0.375rem',
            padding: '1rem',
            marginBottom: '2rem',
            color: '#dc2626'
          }}>
            Zama错误：{zamaError}
          </div>
        )}

        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '0.375rem',
            padding: '1rem',
            marginBottom: '2rem',
            color: '#dc2626'
          }}>
            创建失败：{error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              信息标题 *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="输入吸引人的标题"
              maxLength={100}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
            />
            <div style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              marginTop: '0.25rem'
            }}>
              {formData.title.length}/100 字符
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              信息内容 *
            </label>
            <textarea
              value={formData.info}
              onChange={(e) => handleInputChange('info', e.target.value)}
              placeholder="输入您要分享的有价值信息..."
              rows={6}
              maxLength={2000}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '1rem',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
            <div style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              marginTop: '0.25rem'
            }}>
              {formData.info.length}/2000 字符
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              价格 (ETH) *
            </label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => handleInputChange('price', e.target.value)}
              placeholder="0.001"
              step="0.001"
              min="0"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
            />
            <div style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              marginTop: '0.25rem'
            }}>
              设置合理的价格以吸引购买者
            </div>
          </div>

          <div style={{
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '0.375rem',
            padding: '1rem',
            marginBottom: '2rem'
          }}>
            <h3 style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              注意事项：
            </h3>
            <ul style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              paddingLeft: '1rem',
              margin: 0
            }}>
              <li>信息一旦创建不可修改内容，请仔细检查</li>
              <li>您的地址和价格将通过FHEVM加密存储</li>
              <li>买家购买后需要您手动授权才能查看内容</li>
              <li>您可以随时停用信息以停止新的购买</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={loading || zamaLoading || !formData.title.trim() || !formData.info.trim() || !formData.price.trim()}
            style={{
              width: '100%',
              backgroundColor: (loading || zamaLoading) ? '#9ca3af' : '#3b82f6',
              color: 'white',
              padding: '0.75rem',
              borderRadius: '0.375rem',
              border: 'none',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: (loading || zamaLoading) ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            {zamaLoading ? '初始化加密模块...' : loading ? '创建中...' : '创建信息'}
          </button>
        </form>

        <div style={{
          marginTop: '1.5rem',
          fontSize: '0.75rem',
          color: '#9ca3af',
          textAlign: 'center'
        }}>
          当前钱包: {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '未连接'}
        </div>
      </div>
    </div>
  );
}