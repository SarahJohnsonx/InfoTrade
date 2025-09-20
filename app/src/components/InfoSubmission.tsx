import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Contract } from 'ethers';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contracts';
import '../styles/InfoSubmission.css';

// Generate a random Ethereum address
function generateRandomAddress(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Simple encryption function using a key address
function encryptByKey(data: string, keyAddress: string): string {
  const keyBytes = keyAddress.slice(2); // Remove 0x prefix
  let encrypted = '';

  for (let i = 0; i < data.length; i++) {
    const dataChar = data.charCodeAt(i);
    const keyChar = parseInt(keyBytes[(i * 2) % keyBytes.length] + keyBytes[(i * 2 + 1) % keyBytes.length], 16);
    encrypted += String.fromCharCode(dataChar ^ keyChar);
  }

  return btoa(encrypted); // Base64 encode the result
}

export function InfoSubmission() {
  const { address } = useAccount();
  const { instance, isLoading: zamaLoading, error: zamaError } = useZamaInstance();
  const signerPromise = useEthersSigner();

  const [formData, setFormData] = useState({
    name: '',
    info: '',
    targetAddress: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear status when user starts typing
    if (submitStatus.type) {
      setSubmitStatus({ type: null, message: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signerPromise || !instance || !address) {
      setSubmitStatus({
        type: 'error',
        message: 'Please ensure wallet is connected and encryption service is ready'
      });
      return;
    }

    const signer = await signerPromise;
    if (!signer) {
      setSubmitStatus({
        type: 'error',
        message: 'Failed to get wallet signer'
      });
      return;
    }

    if (!formData.name.trim() || !formData.info.trim() || !formData.targetAddress.trim()) {
      setSubmitStatus({
        type: 'error',
        message: 'Please fill in all fields'
      });
      return;
    }

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(formData.targetAddress)) {
      setSubmitStatus({
        type: 'error',
        message: 'Invalid Ethereum address format'
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: '' });

    try {
      // Create encrypted input for the target address
      const input = instance.createEncryptedInput(CONTRACT_ADDRESS, address);
      let sAddress = generateRandomAddress();
      input.addAddress(sAddress);
      const encryptedInput = await input.encrypt();

      // Create contract instance
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      let encryptInfo = encryptByKey(formData.info.trim(), sAddress);
      // Call storeInfo function
      const tx = await contract.storeInfo(
        formData.name.trim(),
        encryptInfo,
        encryptedInput.handles[0], // encrypted address handle
        encryptedInput.inputProof
      );

      setSubmitStatus({
        type: 'success',
        message: 'Transaction submitted! Waiting for confirmation...'
      });

      // Wait for transaction confirmation
      const receipt = await tx.wait();

      setSubmitStatus({
        type: 'success',
        message: `Information stored successfully! Transaction hash: ${receipt.hash}`
      });

      // Reset form
      setFormData({
        name: '',
        info: '',
        targetAddress: ''
      });

    } catch (error: any) {
      console.error('Error storing info:', error);
      setSubmitStatus({
        type: 'error',
        message: error.message || 'Failed to store information. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (zamaLoading) {
    return (
      <div className="info-submission">
        <div className="loading-container">
          <div className="loading-text">Initializing encryption service...</div>
        </div>
      </div>
    );
  }

  if (zamaError) {
    return (
      <div className="info-submission">
        <div className="error-container">
          <div className="error-message">
            Error: {zamaError}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="info-submission">
      <div className="form-container">
        <div className="form-header">
          <h2 className="form-title">Store Encrypted Information</h2>
          <p className="form-description">
            Store your information on-chain with encrypted addresses. Others can request access for 0.001 ETH.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="info-form">
          <div className="form-group">
            <label htmlFor="name" className="form-label">
              Information Name
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Enter a name for your information"
              className="form-input"
              maxLength={100}
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="info" className="form-label">
              Information Content
            </label>
            <textarea
              id="info"
              value={formData.info}
              onChange={(e) => handleInputChange('info', e.target.value)}
              placeholder="Enter the information you want to store"
              className="form-textarea"
              rows={4}
              maxLength={1000}
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="targetAddress" className="form-label">
              Target Address (Encrypted)
            </label>
            <input
              type="text"
              id="targetAddress"
              value={formData.targetAddress}
              onChange={(e) => handleInputChange('targetAddress', e.target.value)}
              placeholder="0x... (This address will be encrypted)"
              className="form-input"
              disabled={isSubmitting}
            />
            <p className="field-description">
              This address will be encrypted and only accessible to those who purchase access.
            </p>
          </div>

          {submitStatus.type && (
            <div className={`status-message ${submitStatus.type}`}>
              {submitStatus.message}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !instance || !signerPromise}
            className="submit-button"
          >
            {isSubmitting ? 'Storing Information...' : 'Store Information'}
          </button>
        </form>
      </div>
    </div>
  );
}