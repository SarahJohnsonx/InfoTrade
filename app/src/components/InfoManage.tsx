import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Contract } from 'ethers';
import { formatEther } from 'viem';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contracts';
import '../styles/InfoManage.css';

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

interface AccessRequest {
  id: string;
  infoId: string;
  infoName: string;
  requester: string;
  amount: string;
  isPending: boolean;
  isApproved: boolean;
  createdAt: string;
}

interface UserInfo {
  id: string;
  name: string;
  info: string;
  encryptedAddress: string;
  createdAt: string;
  isDecrypted?: boolean;
  decryptedInfo?: string;
}

export function InfoManage() {
  const { address } = useAccount();
  const signerPromise = useEthersSigner();
  const { instance } = useZamaInstance();

  const [pendingRequests, setPendingRequests] = useState<AccessRequest[]>([]);
  const [userInfoItems, setUserInfoItems] = useState<UserInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [decryptingItem, setDecryptingItem] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const loadData = async () => {
    if (!signerPromise || !address) return;

    try {
      setIsLoading(true);
      const signer = await signerPromise;
      if (!signer) return;

      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      // Load pending requests for user's info items
      const requestIds = await contract.getPendingRequests(address);
      console.log("getOwnerPendingRequests:",requestIds.length,address);

      const requestId = await contract.getRequestId();
      console.log("getOwnerPendinggetRequestIdequests:",requestId);
      
      const requests: AccessRequest[] = [];

      for (const requestId of requestIds) {
        try {
          const request = await contract.accessRequests(requestId);
          const infoData = await contract.getInfo(request.infoId);

          requests.push({
            id: requestId.toString(),
            infoId: request.infoId.toString(),
            infoName: infoData.name,
            requester: request.requester,
            amount: formatEther(request.amount),
            isPending: request.isPending,
            isApproved: request.isApproved,
            createdAt: new Date(Number(request.createdAt) * 1000).toLocaleDateString()
          });
        } catch (error) {
          console.error(`Error loading request ${requestId}:`, error);
        }
      }

      setPendingRequests(requests);

      // Load user's info items
      const userInfoIds = await contract.getUserInfoItems(address);
      const infoItems: UserInfo[] = [];

      for (const infoId of userInfoIds) {
        try {
          const info = await contract.getInfo(infoId);
          infoItems.push({
            id: infoId.toString(),
            name: info.name,
            info: '***', // Always show *** initially
            encryptedAddress: info.encryptedAddress,
            createdAt: new Date(Number(info.createdAt) * 1000).toLocaleDateString(),
            isDecrypted: false
          });
        } catch (error) {
          console.error(`Error loading info ${infoId}:`, error);
        }
      }

      setUserInfoItems(infoItems);

    } catch (error) {
      console.error('Error loading data:', error);
      setStatusMessage({
        type: 'error',
        message: 'Failed to load data'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequest = async (requestId: string, approve: boolean) => {
    if (!signerPromise) return;

    setProcessingRequest(requestId);
    setStatusMessage({ type: null, message: '' });

    try {
      const signer = await signerPromise;
      if (!signer) return;

      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const tx = approve
        ? await contract.approveAccess(requestId)
        : await contract.denyAccess(requestId);

      setStatusMessage({
        type: 'success',
        message: `Request ${approve ? 'approved' : 'denied'}! Waiting for confirmation...`
      });

      await tx.wait();

      setStatusMessage({
        type: 'success',
        message: `Request ${approve ? 'approved' : 'denied'} successfully!`
      });

      // Reload data
      await loadData();

    } catch (error: any) {
      console.error('Error processing request:', error);
      setStatusMessage({
        type: 'error',
        message: error.message || `Failed to ${approve ? 'approve' : 'deny'} request`
      });
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleDecrypt = async (itemId: string) => {
    if (!signerPromise || !instance || !address) return;

    setDecryptingItem(itemId);
    setStatusMessage({ type: null, message: '' });

    try {
      const signer = await signerPromise;
      if (!signer) return;

      const item = userInfoItems.find(item => item.id === itemId);
      if (!item) return;

      // Get the actual encrypted info from contract
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const infoData = await contract.getInfo(itemId);

      // Decrypt the encrypted address using Zama
      const keypair = instance.generateKeypair();
      const handleContractPairs = [
        {
          handle: item.encryptedAddress,
          contractAddress: CONTRACT_ADDRESS,
        },
      ];
      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = "10";
      const contractAddresses = [CONTRACT_ADDRESS];

      const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays);

      const signature = await signer.signTypedData(
        eip712.domain,
        {
          UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification,
        },
        eip712.message,
      );

      const result = await instance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace("0x", ""),
        contractAddresses,
        signer.address,
        startTimeStamp,
        durationDays,
      );

      const decryptedAddress = result[item.encryptedAddress];

      // Now decrypt the info using the decrypted address
      const decryptedInfo = decryptByKey(infoData.info, decryptedAddress);

      // Update the item in state
      setUserInfoItems(prevItems =>
        prevItems.map(prevItem =>
          prevItem.id === itemId
            ? {
                ...prevItem,
                isDecrypted: true,
                decryptedInfo: decryptedInfo,
                info: decryptedInfo
              }
            : prevItem
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
        message: error.message || 'Failed to decrypt information'
      });
    } finally {
      setDecryptingItem(null);
    }
  };

  useEffect(() => {
    if (address && signerPromise) {
      loadData();
    }
  }, [address, signerPromise]);

  if (isLoading) {
    return (
      <div className="info-manage">
        <div className="loading-container">
          <div className="loading-text">Loading your data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="info-manage">
      <div className="manage-header">
        <h2 className="manage-title">Manage Requests</h2>
        <p className="manage-description">
          Review and approve/deny access requests for your information.
        </p>
      </div>

      {statusMessage.type && (
        <div className={`status-message ${statusMessage.type}`}>
          {statusMessage.message}
        </div>
      )}

      <div className="manage-sections">
        {/* Pending Requests Section */}
        <div className="section">
          <h3 className="section-title">Pending Access Requests</h3>

          {pendingRequests.filter(req => req.isPending).length === 0 ? (
            <div className="empty-state">
              <p>No pending requests</p>
            </div>
          ) : (
            <div className="requests-grid">
              {pendingRequests
                .filter(req => req.isPending)
                .map((request) => (
                  <div key={request.id} className="request-card">
                    <div className="request-header">
                      <h4 className="request-title">{request.infoName}</h4>
                      <span className="request-amount">{request.amount} ETH</span>
                    </div>

                    <div className="request-details">
                      <div className="request-field">
                        <span className="request-label">Requester:</span>
                        <span className="request-value address">
                          {request.requester.slice(0, 6)}...{request.requester.slice(-4)}
                        </span>
                      </div>

                      <div className="request-field">
                        <span className="request-label">Requested:</span>
                        <span className="request-value">{request.createdAt}</span>
                      </div>
                    </div>

                    <div className="request-actions">
                      <button
                        onClick={() => handleRequest(request.id, true)}
                        disabled={processingRequest === request.id}
                        className="approve-button"
                      >
                        {processingRequest === request.id ? 'Processing...' : 'Approve'}
                      </button>

                      <button
                        onClick={() => handleRequest(request.id, false)}
                        disabled={processingRequest === request.id}
                        className="deny-button"
                      >
                        {processingRequest === request.id ? 'Processing...' : 'Deny'}
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Your Info Items Section */}
        <div className="section">
          <h3 className="section-title">Your Information Items</h3>

          {userInfoItems.length === 0 ? (
            <div className="empty-state">
              <p>You haven't stored any information yet</p>
            </div>
          ) : (
            <div className="info-items-grid">
              {userInfoItems.map((item) => (
                <div key={item.id} className="info-item-card">
                  <h4 className="info-item-title">{item.name}</h4>
                  <p className="info-item-content">{item.info}</p>
                  <div className="info-item-meta">
                    <span className="info-item-date">Created: {item.createdAt}</span>
                  </div>
                  <div className="info-item-actions">
                    {!item.isDecrypted ? (
                      <button
                        onClick={() => handleDecrypt(item.id)}
                        disabled={decryptingItem === item.id || !instance}
                        className="decrypt-button"
                      >
                        {decryptingItem === item.id ? 'Decrypting...' : 'Decrypt'}
                      </button>
                    ) : (
                      <span className="decrypted-status">✓ Decrypted</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="refresh-section">
        <button
          onClick={loadData}
          disabled={isLoading}
          className="refresh-button"
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
    </div>
  );
}