import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Contract } from 'ethers';
import { formatEther } from 'viem';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contracts';
import '../styles/InfoBrowse.css';

// Decrypt function using the same key address
function decryptByKey(encryptedData: string, keyAddress: string): string {
  try {
    const encrypted = atob(encryptedData); // Base64 decode
    const keyBytes = keyAddress.slice(2); // Remove 0x prefix
    let decrypted = '';

    for (let i = 0; i < encrypted.length; i++) {
      const encryptedChar = encrypted.charCodeAt(i);
      const keyChar = parseInt(keyBytes[(i * 2) % keyBytes.length] + keyBytes[(i * 2 + 1) % keyBytes.length], 16);
      decrypted += String.fromCharCode(encryptedChar ^ keyChar);
    }

    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return '';
  }
}

interface InfoItem {
  id: string;
  name: string;
  info: string;
  owner: string;
  price: string;
  createdAt: string;
  hasAccess: boolean;
  decryptedAddress?: string;
  decryptedInfo?: string;
  isInfoDecrypted?: boolean;
}

export function InfoBrowse() {
  const { address } = useAccount();
  const signerPromise = useEthersSigner();
  const { instance: zamaInstance } = useZamaInstance();

  const [infoItems, setInfoItems] = useState<InfoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [requestingAccess, setRequestingAccess] = useState<string | null>(null);
  const [accessPrice, setAccessPrice] = useState<string>('0');
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });
  const [decryptingItems, setDecryptingItems] = useState<Set<string>>(new Set());

  const loadInfoItems = async () => {
    if (!signerPromise || !address) return;

    try {
      setIsLoading(true);
      const signer = await signerPromise;
      if (!signer) return;

      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      // Get access price
      const priceWei = await contract.ACCESS_PRICE();
      setAccessPrice(formatEther(priceWei));

      // Get all info IDs
      const infoIds = await contract.getAllInfos();
      console.log("getAllInfos:",infoIds.length);
      
      // Get detailed info for each ID
      const items: InfoItem[] = [];
      for (const id of infoIds) {
        try {
          const info = await contract.getInfo(id);
          const hasAccess = await contract.hasAccessToInfo(id, address);

          // Decryption will be handled by manual action

          items.push({
            id: id.toString(),
            name: info.name,
            info: '***', // Always show *** for security
            owner: info.owner,
            price: formatEther(info.price),
            createdAt: new Date(Number(info.createdAt) * 1000).toLocaleDateString(),
            hasAccess
          });
        } catch (error) {
          console.error(`Error loading info ${id}:`, error);
        }
      }

      setInfoItems(items);
    } catch (error) {
      console.error('Error loading info items:', error);
      setStatusMessage({
        type: 'error',
        message: 'Failed to load information items'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const requestAccess = async (infoId: string) => {
    if (!signerPromise || !address) return;

    setRequestingAccess(infoId);
    setStatusMessage({ type: null, message: '' });

    try {
      const signer = await signerPromise;
      if (!signer) return;

      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const priceWei = await contract.ACCESS_PRICE();

      const tx = await contract.requestAccess(infoId, {
        value: priceWei
      });

      setStatusMessage({
        type: 'success',
        message: 'Access request submitted! Waiting for confirmation...'
      });

      await tx.wait();

      setStatusMessage({
        type: 'success',
        message: 'Access requested successfully! The owner will review your request.'
      });

      // Reload items to update access status
      await loadInfoItems();

    } catch (error: any) {
      console.error('Error requesting access:', error);
      setStatusMessage({
        type: 'error',
        message: error.message || 'Failed to request access. Please try again.'
      });
    } finally {
      setRequestingAccess(null);
    }
  };


  const decryptInfo = async (infoId: string) => {
    if (!signerPromise || !address || !zamaInstance) return;

    const item = infoItems.find(item => item.id === infoId);
    if (!item || !item.hasAccess) return;

    setDecryptingItems(prev => new Set(prev).add(infoId));

    try {
      const signer = await signerPromise;
      if (!signer) return;

      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const infoData = await contract.getInfo(infoId);

      // First decrypt the address if not already done
      let decryptedAddress = item.decryptedAddress;
      if (!decryptedAddress) {
        const encryptedAddressHandle = infoData.encryptedAddress;

        const keypair = zamaInstance.generateKeypair();
        const handleContractPairs = [{
          handle: encryptedAddressHandle,
          contractAddress: CONTRACT_ADDRESS
        }];

        const startTimeStamp = Math.floor(Date.now() / 1000).toString();
        const durationDays = "10";
        const contractAddresses = [CONTRACT_ADDRESS];

        const eip712 = zamaInstance.createEIP712(
          keypair.publicKey,
          contractAddresses,
          startTimeStamp,
          durationDays
        );

        const signature = await signer.signTypedData(
          eip712.domain,
          { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
          eip712.message
        );

        const result = await zamaInstance.userDecrypt(
          handleContractPairs,
          keypair.privateKey,
          keypair.publicKey,
          signature.replace("0x", ""),
          contractAddresses,
          address,
          startTimeStamp,
          durationDays
        );

        decryptedAddress = result[encryptedAddressHandle];
      }

      // Now decrypt the info using the decrypted address
      if (!decryptedAddress) {
        throw new Error('Failed to decrypt address');
      }
      const decryptedInfo = decryptByKey(infoData.info, decryptedAddress);

      // Update the item with both decrypted address and info
      setInfoItems(prevItems =>
        prevItems.map(item =>
          item.id === infoId
            ? {
                ...item,
                decryptedAddress,
                decryptedInfo,
                isInfoDecrypted: true
                // Keep original info as ***
              }
            : item
        )
      );

      setStatusMessage({
        type: 'success',
        message: 'Information decrypted successfully!'
      });

    } catch (error: any) {
      console.error('Error decrypting info:', error);
      setStatusMessage({
        type: 'error',
        message: 'Failed to decrypt information. Please try again.'
      });
    } finally {
      setDecryptingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(infoId);
        return newSet;
      });
    }
  };

  useEffect(() => {
    if (address && signerPromise && zamaInstance) {
      loadInfoItems();
    }
  }, [address, signerPromise, zamaInstance]);

  if (isLoading) {
    return (
      <div className="info-browse">
        <div className="loading-container">
          <div className="loading-text">Loading information items...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="info-browse">
      <div className="browse-header">
        <h2 className="browse-title">Browse Information</h2>
        <p className="browse-description">
          Request access to encrypted information for {accessPrice} ETH per item.
        </p>
      </div>

      {statusMessage.type && (
        <div className={`status-message ${statusMessage.type}`}>
          {statusMessage.message}
        </div>
      )}

      {infoItems.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-content">
            <h3>No Information Available</h3>
            <p>Be the first to store some information!</p>
          </div>
        </div>
      ) : (
        <div className="info-grid">
          {infoItems.map((item) => (
            <div key={item.id} className="info-card">
              <div className="info-card-header">
                <h3 className="info-card-title">{item.name}</h3>
                <span className="info-card-price">{accessPrice} ETH</span>
              </div>

              <div className="info-card-content">
                <div className="info-field">
                  <span className="info-label">Information:</span>
                  <span className="info-value">{item.info}</span>
                </div>

                <div className="info-field">
                  <span className="info-label">Owner:</span>
                  <span className="info-value address">
                    {item.owner.slice(0, 6)}...{item.owner.slice(-4)}
                  </span>
                </div>

                <div className="info-field">
                  <span className="info-label">Created:</span>
                  <span className="info-value">{item.createdAt}</span>
                </div>

                {item.hasAccess && item.isInfoDecrypted && item.decryptedInfo && (
                  <div className="info-field encrypted-address">
                    <span className="info-label">Info:</span>
                    <span className="info-value decrypted">
                      {item.decryptedInfo}
                    </span>
                  </div>
                )}

                {item.hasAccess && item.decryptedAddress && !item.isInfoDecrypted && (
                  <div className="info-field encrypted-address">
                    <span className="info-label">Target Address:</span>
                    <span className="info-value address decrypted">
                      {item.decryptedAddress}
                    </span>
                  </div>
                )}
              </div>

              <div className="info-card-actions">
                {item.owner.toLowerCase() === address?.toLowerCase() ? (
                  <span className="owner-badge">You own this</span>
                ) : item.hasAccess ? (
                  <div className="access-granted">
                    <span className="access-badge">Access Granted</span>
                    <div className="decrypt-actions">
                      
                      {!item.isInfoDecrypted ? (
                        <button
                          onClick={() => decryptInfo(item.id)}
                          disabled={decryptingItems.has(item.id)}
                          className="decrypt-button"
                        >
                          {decryptingItems.has(item.id)
                            ? 'Decrypting...'
                            : 'Decrypt Info'
                          }
                        </button>
                      ) : (
                        <span className="decrypted-status">✓ Info Decrypted</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => requestAccess(item.id)}
                    disabled={requestingAccess === item.id}
                    className="request-button"
                  >
                    {requestingAccess === item.id
                      ? 'Requesting...'
                      : `Request Access (${accessPrice} ETH)`
                    }
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="refresh-section">
        <button
          onClick={loadInfoItems}
          disabled={isLoading}
          className="refresh-button"
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
    </div>
  );
}