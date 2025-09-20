import { useReadContracts, useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { useState, useCallback } from 'react';
import { INFO_TRADE_ADDRESS, INFO_TRADE_ABI } from '../contracts/InfoTrade';

// Types
export interface InfoBasicDetails {
  title: string;
  owner: string;
  isActive: boolean;
  createdAt: bigint;
  hasPurchased: boolean;
  hasAccess: boolean;
}

export interface InfoItem extends InfoBasicDetails {
  id: number;
  content?: string;
}

// Read hooks using viem (via wagmi)
export function useInfoTradeRead() {
  const { address } = useAccount();

  // Read total info count
  const { data: totalCount, refetch: refetchTotalCount } = useReadContracts({
    contracts: [
      {
        address: INFO_TRADE_ADDRESS,
        abi: INFO_TRADE_ABI,
        functionName: 'getTotalInfoCount',
      }
    ],
  });

  // Read user info items
  const { data: userInfoItems, refetch: refetchUserInfoItems } = useReadContracts({
    contracts: address ? [
      {
        address: INFO_TRADE_ADDRESS,
        abi: INFO_TRADE_ABI,
        functionName: 'getUserInfoItems',
        args: [address],
      }
    ] : [],
  });

  // Read user purchases
  const { data: userPurchases, refetch: refetchUserPurchases } = useReadContracts({
    contracts: address ? [
      {
        address: INFO_TRADE_ADDRESS,
        abi: INFO_TRADE_ABI,
        functionName: 'getUserPurchases',
        args: [address],
      }
    ] : [],
  });

  const refetchAll = useCallback(() => {
    refetchTotalCount();
    refetchUserInfoItems();
    refetchUserPurchases();
  }, [refetchTotalCount, refetchUserInfoItems, refetchUserPurchases]);

  return {
    totalCount: totalCount?.[0]?.result as bigint | undefined,
    userInfoItems: userInfoItems?.[0]?.result as bigint[] | undefined,
    userPurchases: userPurchases?.[0]?.result as bigint[] | undefined,
    refetch: refetchAll,
  };
}

// Get info basic details
export function useInfoBasicDetails(infoId: number) {
  const { address } = useAccount();

  const { data, refetch } = useReadContracts({
    contracts: infoId > 0 ? [
      {
        address: INFO_TRADE_ADDRESS,
        abi: INFO_TRADE_ABI,
        functionName: 'getInfoBasicDetails',
        args: [BigInt(infoId)],
      }
    ] : [],
  });

  const result = data?.[0]?.result as [string, string, boolean, bigint, boolean, boolean] | undefined;

  return {
    data: result ? {
      title: result[0],
      owner: result[1],
      isActive: result[2],
      createdAt: result[3],
      hasPurchased: result[4],
      hasAccess: result[5],
    } as InfoBasicDetails : undefined,
    refetch,
  };
}

// Get info content
export function useInfoContent(infoId: number) {
  const { data, refetch } = useReadContracts({
    contracts: infoId > 0 ? [
      {
        address: INFO_TRADE_ADDRESS,
        abi: INFO_TRADE_ABI,
        functionName: 'getInfoContent',
        args: [BigInt(infoId)],
      }
    ] : [],
  });

  return {
    content: data?.[0]?.result as string | undefined,
    refetch,
  };
}

// Write hooks using ethers
export function useInfoTradeWrite() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeTransaction = useCallback(async (
    functionName: string,
    args: any[],
    value?: string
  ) => {
    try {
      setLoading(true);
      setError(null);

      // Connect to wallet
      if (!window.ethereum) {
        throw new Error('Please install MetaMask');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Create contract instance
      const contract = new ethers.Contract(INFO_TRADE_ADDRESS, INFO_TRADE_ABI, signer);

      // Execute transaction
      const tx = await contract[functionName](...args, value ? { value } : {});

      // Wait for confirmation
      const receipt = await tx.wait();

      return { tx, receipt };
    } catch (err: any) {
      const errorMessage = err.reason || err.message || 'Transaction failed';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const createInfo = useCallback(async (
    title: string,
    info: string,
    encryptedOwnerAddress: string,
    encryptedPrice: string,
    inputProof: string
  ) => {
    return executeTransaction('createInfo', [
      title,
      info,
      encryptedOwnerAddress,
      encryptedPrice,
      inputProof
    ]);
  }, [executeTransaction]);

  const purchaseInfo = useCallback(async (infoId: number) => {
    return executeTransaction('purchaseInfo', [BigInt(infoId)]);
  }, [executeTransaction]);

  const grantAccess = useCallback(async (infoId: number, buyer: string) => {
    return executeTransaction('grantAccess', [BigInt(infoId), buyer]);
  }, [executeTransaction]);

  const updatePrice = useCallback(async (
    infoId: number,
    newEncryptedPrice: string,
    inputProof: string
  ) => {
    return executeTransaction('updatePrice', [
      BigInt(infoId),
      newEncryptedPrice,
      inputProof
    ]);
  }, [executeTransaction]);

  const deactivateInfo = useCallback(async (infoId: number) => {
    return executeTransaction('deactivateInfo', [BigInt(infoId)]);
  }, [executeTransaction]);

  return {
    createInfo,
    purchaseInfo,
    grantAccess,
    updatePrice,
    deactivateInfo,
    loading,
    error,
  };
}