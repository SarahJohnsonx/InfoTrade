import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia, localhost } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'InfoTrade',
  projectId: '2f87416ad9fa5d11e53f41dc6ab35a4f', // WalletConnect project ID
  chains: [localhost, sepolia],
  ssr: false,
});