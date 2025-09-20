import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Contract } from 'ethers';
import { formatEther } from 'viem';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contracts';
import '../styles/InfoManage.css';

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
  createdAt: string;
}

export function InfoManage() {
  const { address } = useAccount();
  const signerPromise = useEthersSigner();

  const [pendingRequests, setPendingRequests] = useState<AccessRequest[]>([]);
  const [userInfoItems, setUserInfoItems] = useState<UserInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
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
      const requestIds = await contract.getOwnerPendingRequests(address);
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
            info: info.info,
            createdAt: new Date(Number(info.createdAt) * 1000).toLocaleDateString()
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