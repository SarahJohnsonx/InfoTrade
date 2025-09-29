# InfoTrade

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.26.0-orange.svg)](https://hardhat.org/)
[![React](https://img.shields.io/badge/React-19.1.1-blue.svg)](https://reactjs.org/)

> A decentralized marketplace for trading encrypted information using Fully Homomorphic Encryption (FHE) on Ethereum

## 🚀 Overview

InfoTrade is a revolutionary blockchain-based platform that enables users to securely buy and sell encrypted information directly on-chain. By leveraging Zama's Fully Homomorphic Encryption (FHE) technology, InfoTrade ensures that sensitive information remains encrypted throughout the entire transaction process, providing unprecedented privacy and security for digital information exchange.

### 🌟 Key Features

- **🔐 End-to-End Encryption**: Information remains encrypted on-chain using Zama FHE technology
- **💰 Decentralized Trading**: Direct peer-to-peer information trading without intermediaries
- **🛡️ Privacy-First**: Zero-knowledge access to encrypted content until permission is granted
- **⚡ Automated Payments**: Smart contract-managed payments with automatic fund distribution
- **🎯 Granular Access Control**: Owner-controlled access permissions for each information item
- **📱 User-Friendly Interface**: Intuitive React-based frontend with wallet integration

## 🏗️ Architecture

### Smart Contract Layer
- **InfoTrade.sol**: Core contract managing information storage, access requests, and payments
- **FHE Integration**: Zama FHEVM for encrypted address storage and access control
- **Access Control Lists (ACL)**: Granular permission management for encrypted data

### Frontend Layer
- **React + TypeScript**: Modern, type-safe frontend development
- **Vite**: Fast development and build tooling
- **RainbowKit + Wagmi**: Seamless wallet connection and Web3 integration
- **Zama Relayer SDK**: Client-side encryption and decryption capabilities

### Encryption Layer
- **Zama FHE**: Fully homomorphic encryption for on-chain privacy
- **Encrypted Addresses**: Target addresses encrypted and stored on-chain
- **Client-Side Decryption**: User-controlled decryption with private keys

## 🛠️ Technology Stack

### Blockchain & Smart Contracts
- **Ethereum**: Primary blockchain network (Sepolia testnet supported)
- **Solidity ^0.8.24**: Smart contract development language
- **Hardhat**: Development environment and testing framework
- **Zama FHEVM**: Fully homomorphic encryption virtual machine
- **OpenZeppelin**: Secure smart contract libraries

### Frontend Development
- **React 19.1.1**: User interface library
- **TypeScript**: Type-safe JavaScript development
- **Vite**: Next-generation frontend tooling
- **Ethers.js 6.15.0**: Ethereum library for blockchain interaction
- **Viem**: TypeScript-first Ethereum library
- **RainbowKit**: Wallet connection interface
- **Wagmi**: React hooks for Ethereum

### Encryption & Privacy
- **Zama FHE**: Fully homomorphic encryption technology
- **@zama-fhe/relayer-sdk**: Client-side encryption SDK
- **Custom XOR Encryption**: Additional layer for information protection

### Development Tools
- **npm**: Package management
- **ESLint**: Code linting and quality assurance
- **Prettier**: Code formatting
- **TypeChain**: TypeScript bindings for smart contracts

## 🔧 Installation & Setup

### Prerequisites

- **Node.js 20+**: Required for development environment
- **npm 7.0.0+**: Package manager
- **MetaMask**: Browser wallet extension
- **Git**: Version control system

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/InfoTrade.git
cd InfoTrade
```

### 2. Install Dependencies

```bash
# Install contract dependencies
npm install

# Install frontend dependencies
cd app
npm install
cd ..
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
# Ethereum Network Configuration
PRIVATE_KEY=your_private_key_here
INFURA_API_KEY=your_infura_api_key
ETHERSCAN_API_KEY=your_etherscan_api_key

# Contract Deployment
DEPLOYER_PRIVATE_KEY=your_deployer_private_key

# Network URLs
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
```

### 4. Compile Smart Contracts

```bash
npm run compile
```

### 5. Run Tests

```bash
# Local tests
npm test

# Sepolia testnet tests
npm run test:sepolia
```

### 6. Deploy Contracts

```bash
# Deploy to Sepolia testnet
npx hardhat deploy --network sepolia

# Deploy to local network
npx hardhat deploy --network localhost
```

### 7. Start Frontend Development Server

```bash
cd app
npm run dev
```

The application will be available at `http://localhost:5173`

## 📋 Usage Guide

### For Information Sellers

1. **Connect Wallet**: Use MetaMask or compatible wallet to connect
2. **Store Information**:
   - Enter information name and content
   - Provide target address for encrypted storage
   - Submit transaction (information gets encrypted on-chain)
3. **Manage Requests**:
   - Review access requests from buyers
   - Approve or deny requests
   - Receive payments automatically upon approval

### For Information Buyers

1. **Browse Marketplace**: View available encrypted information items
2. **Request Access**:
   - Pay 0.001 ETH per access request
   - Submit request to information owner
3. **Access Information**:
   - Wait for owner approval
   - Decrypt information using Zama FHE technology
   - View decrypted content securely

### Key Workflows

#### Information Storage Workflow
```
User Input → Frontend Encryption → Smart Contract Storage → On-chain Encrypted Data
```

#### Access Request Workflow
```
Payment → Request Submission → Owner Review → Approval/Denial → Fund Distribution
```

#### Information Decryption Workflow
```
Access Granted → Zama FHE Decryption → Client-side Processing → Content Display
```

## 🎯 Core Functionality

### Information Management
- **Encrypted Storage**: All information stored with FHE encryption
- **Ownership Tracking**: Clear ownership records for each information item
- **Access Control**: Granular permissions managed by smart contracts

### Payment System
- **Fixed Pricing**: 0.001 ETH per access request
- **Automatic Distribution**: Smart contract handles all payments
- **Refund Mechanism**: Automatic refunds for denied requests

### Privacy Features
- **Zero-Knowledge Browsing**: View metadata without accessing content
- **Encrypted Addresses**: Target addresses encrypted using FHE
- **Client-Side Decryption**: User-controlled decryption process

## 🔒 Security Features

### Smart Contract Security
- **Access Modifiers**: Proper function access controls
- **Input Validation**: Comprehensive parameter validation
- **Reentrancy Protection**: Secure fund transfer mechanisms
- **Event Logging**: Comprehensive audit trail

### Encryption Security
- **FHE Technology**: Quantum-resistant encryption
- **Key Management**: Secure key generation and storage
- **Access Control Lists**: Blockchain-enforced permissions

### Frontend Security
- **Type Safety**: TypeScript for compile-time error checking
- **Wallet Integration**: Secure wallet connection protocols
- **Input Sanitization**: Protection against malicious inputs

## 🚀 Advantages & Benefits

### For Users
- **Privacy**: Information remains encrypted until explicitly accessed
- **Security**: Blockchain-based security with smart contract automation
- **Transparency**: All transactions and permissions recorded on-chain
- **Decentralization**: No central authority controlling information access

### For Developers
- **Modern Stack**: Latest React, TypeScript, and Ethereum technologies
- **FHE Integration**: Cutting-edge privacy technology implementation
- **Extensible**: Modular architecture for easy feature additions
- **Well-Documented**: Comprehensive documentation and code comments

### For the Ecosystem
- **Innovation**: Pioneer in FHE-based information markets
- **Open Source**: Fully open-source for community development
- **Standards**: Following best practices for DeFi and privacy

## 🏭 Production Deployment

### Contract Deployment

1. **Prepare Environment**:
   ```bash
   npm run compile
   npm run typechain
   ```

2. **Deploy to Mainnet**:
   ```bash
   npx hardhat deploy --network mainnet
   ```

3. **Verify Contracts**:
   ```bash
   npx hardhat verify --network mainnet DEPLOYED_CONTRACT_ADDRESS
   ```

### Frontend Deployment

1. **Build Production**:
   ```bash
   cd app
   npm run build
   ```

2. **Deploy to CDN/Hosting**:
   - Upload `dist/` folder to your hosting provider
   - Configure environment variables for production
   - Set up custom domain and SSL certificates

### Infrastructure Requirements

- **CDN**: For fast global content delivery
- **IPFS**: Optional decentralized file storage
- **Monitoring**: Application performance monitoring
- **Analytics**: User behavior tracking (privacy-compliant)

## 🧪 Testing Strategy

### Unit Tests
- Smart contract function testing
- Frontend component testing
- Encryption/decryption testing

### Integration Tests
- End-to-end user workflows
- Smart contract interaction testing
- FHE integration testing

### Security Testing
- Smart contract audits
- Penetration testing
- Vulnerability assessments

## 🔄 Development Workflow

### Branch Strategy
- `main`: Production-ready code
- `develop`: Development integration branch
- `feature/*`: Feature development branches
- `hotfix/*`: Critical bug fixes

### Code Quality
- **ESLint**: JavaScript/TypeScript linting
- **Prettier**: Code formatting
- **Husky**: Git hooks for quality checks
- **SonarQube**: Code quality analysis

### Continuous Integration
- Automated testing on pull requests
- Smart contract compilation verification
- Frontend build testing
- Security scanning

## 🌍 Future Roadmap

### Phase 1: Core Platform (Current)
- ✅ Basic information trading functionality
- ✅ FHE integration for privacy
- ✅ Web3 wallet integration
- ✅ Sepolia testnet deployment

### Phase 2: Enhanced Features (Q2 2024)
- 🔄 Multi-token payment support
- 🔄 Bulk information packages
- 🔄 Reputation system for sellers
- 🔄 Advanced search and filtering

### Phase 3: Scaling & Optimization (Q3 2024)
- 📋 Layer 2 integration (Polygon, Arbitrum)
- 📋 IPFS integration for large files
- 📋 Mobile application development
- 📋 API for third-party integrations

### Phase 4: Advanced Privacy (Q4 2024)
- 📋 Zero-knowledge proof integration
- 📋 Anonymous bidding mechanisms
- 📋 Cross-chain compatibility
- 📋 Advanced FHE features

### Phase 5: Enterprise Features (2025)
- 📋 B2B marketplace features
- 📋 Enterprise access controls
- 📋 Compliance tools and reporting
- 📋 White-label solutions

## 🤝 Contributing

We welcome contributions from the community! Please read our contributing guidelines:

### Getting Started
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

### Development Guidelines
- Follow TypeScript/Solidity best practices
- Write comprehensive tests
- Update documentation
- Follow commit message conventions

### Code Review Process
- All PRs require review
- Automated tests must pass
- Security review for smart contract changes
- Documentation updates required

## 📚 Resources & Documentation

### Official Documentation
- [Zama FHEVM Documentation](https://docs.zama.ai/fhevm)
- [Hardhat Documentation](https://hardhat.org/docs)
- [React Documentation](https://react.dev/)
- [Ethereum Development](https://ethereum.org/developers)

### Community Resources
- [Discord Server](https://discord.gg/infotrade)
- [Telegram Group](https://t.me/infotrade)
- [Twitter](https://twitter.com/infotrade)
- [Medium Blog](https://medium.com/@infotrade)

### Educational Content
- FHE Technology Explainer
- Smart Contract Security Best Practices
- Web3 Development Tutorials
- Privacy-First dApp Development

## 📞 Support & Community

### Getting Help
- **GitHub Issues**: Bug reports and feature requests
- **Discord**: Real-time community support
- **Documentation**: Comprehensive guides and tutorials
- **Email**: support@infotrade.com

### Community Channels
- **Developer Forum**: Technical discussions
- **User Community**: General support and feedback
- **Contributor Chat**: Development coordination

## 📁 Project Structure

```
InfoTrade/
├── contracts/               # Smart contract source files
│   └── InfoTrade.sol       # Main InfoTrade contract
├── deploy/                 # Deployment scripts
├── tasks/                  # Hardhat custom tasks
├── test/                   # Test files
├── app/                    # Frontend React application
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── config/         # Configuration files
│   │   └── styles/         # CSS styles
│   └── package.json        # Frontend dependencies
├── docs/                   # Documentation
├── hardhat.config.ts       # Hardhat configuration
└── package.json            # Backend dependencies and scripts
```

## 📜 Available Scripts

### Backend (Root Directory)

| Script             | Description                          |
| ------------------ | ------------------------------------ |
| `npm run compile`  | Compile all smart contracts          |
| `npm run test`     | Run smart contract tests             |
| `npm run test:sepolia` | Run tests on Sepolia testnet     |
| `npm run coverage` | Generate test coverage report        |
| `npm run lint`     | Run linting checks                   |
| `npm run clean`    | Clean build artifacts                |

### Frontend (app/ Directory)

| Script             | Description                          |
| ------------------ | ------------------------------------ |
| `npm run dev`      | Start development server             |
| `npm run build`    | Build for production                 |
| `npm run preview`  | Preview production build             |
| `npm run lint`     | Run ESLint checks                    |

## 🌟 Problem Solved

InfoTrade addresses several critical issues in the current digital information landscape:

### 1. **Information Privacy Crisis**
- **Problem**: Traditional platforms expose sensitive information during transactions
- **Solution**: FHE ensures information remains encrypted throughout the entire process

### 2. **Centralized Control**
- **Problem**: Central authorities control access and pricing of information
- **Solution**: Decentralized smart contract-based marketplace with user-controlled access

### 3. **Payment Security**
- **Problem**: Risk of payment fraud and disputes in information trading
- **Solution**: Automated smart contract payments with built-in escrow and refund mechanisms

### 4. **Verification Challenges**
- **Problem**: Difficulty verifying information authenticity before purchase
- **Solution**: Blockchain-based ownership records and cryptographic proof of content

### 5. **Access Control Complexity**
- **Problem**: Complex permission systems for different users and use cases
- **Solution**: Granular FHE-based access control with easy-to-use interface

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Zama Team**: For the revolutionary FHE technology
- **OpenZeppelin**: For secure smart contract standards
- **Ethereum Foundation**: For the blockchain infrastructure
- **React Team**: For the frontend framework
- **Hardhat Team**: For the development environment

## 🔗 Links

- **Website**: [https://infotrade.io](https://infotrade.io)
- **Documentation**: [https://docs.infotrade.io](https://docs.infotrade.io)
- **GitHub**: [https://github.com/infotrade/infotrade](https://github.com/infotrade/infotrade)
- **Demo**: [https://demo.infotrade.io](https://demo.infotrade.io)

---

**InfoTrade** - Democratizing information exchange through blockchain technology and advanced cryptography.

*Built with ❤️ by the InfoTrade team*
