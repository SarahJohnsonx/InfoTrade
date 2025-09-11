// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, eaddress, externalEaddress, euint64, externalEuint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title InfoTrade - Encrypted Information Trading Platform
/// @notice A decentralized platform for buying and selling encrypted information using FHEVM
contract InfoTrade is SepoliaConfig {
    struct InfoItem {
        eaddress encryptedInfo;    // Encrypted information (string converted to address)
        address seller;            // Information seller
        uint256 price;            // Price in wei
        bool isActive;            // Whether the item is available for sale
        uint256 createdAt;        // Timestamp when created
    }
    
    struct PurchaseRequest {
        uint256 infoId;           // ID of the information item
        address buyer;            // Address of the buyer
        uint256 timestamp;        // When the request was made
        bool isPending;           // Whether approval is pending
        bool isApproved;          // Whether access was granted
    }
    
    // State variables
    mapping(uint256 => InfoItem) public infoItems;
    mapping(uint256 => mapping(address => PurchaseRequest)) public purchaseRequests;
    mapping(uint256 => address[]) public purchaseRequestsList; // List of buyers for each info item
    mapping(address => uint256[]) public sellerInfos; // Info IDs owned by each seller
    mapping(address => uint256[]) public buyerRequests; // Request IDs for each buyer
    
    uint256 public nextInfoId;
    uint256 private constant PLATFORM_FEE_PERCENT = 2; // 2% platform fee
    address public owner;
    uint256 public platformBalance;
    
    // Events
    event InfoUploaded(uint256 indexed infoId, address indexed seller, uint256 price);
    event PurchaseRequested(uint256 indexed infoId, address indexed buyer);
    event AccessGranted(uint256 indexed infoId, address indexed buyer, address indexed seller);
    event AccessDenied(uint256 indexed infoId, address indexed buyer, address indexed seller);
    event InfoDeactivated(uint256 indexed infoId, address indexed seller);
    event PlatformFeeWithdrawn(address indexed owner, uint256 amount);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    modifier onlyInfoSeller(uint256 _infoId) {
        require(infoItems[_infoId].seller == msg.sender, "Only info seller can call this function");
        _;
    }
    
    modifier infoExists(uint256 _infoId) {
        require(_infoId < nextInfoId && infoItems[_infoId].seller != address(0), "Info does not exist");
        _;
    }
    
    modifier infoActive(uint256 _infoId) {
        require(infoItems[_infoId].isActive, "Info is not active");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        nextInfoId = 1; // Start from 1 to avoid confusion with default values
    }
    
    /// @notice Upload encrypted information for sale
    /// @param encryptedInfo The encrypted information (external input)
    /// @param inputProof Proof for the encrypted input
    /// @param price Price in wei for accessing this information
    function uploadInfo(
        externalEaddress encryptedInfo, 
        bytes calldata inputProof,
        uint256 price
    ) external {
        require(price > 0, "Price must be greater than 0");
        
        // Convert external encrypted input to internal format
        eaddress info = FHE.fromExternal(encryptedInfo, inputProof);
        
        uint256 infoId = nextInfoId++;
        
        // Store the info item
        infoItems[infoId] = InfoItem({
            encryptedInfo: info,
            seller: msg.sender,
            price: price,
            isActive: true,
            createdAt: block.timestamp
        });
        
        // Set up access control - only seller can initially access
        FHE.allowThis(info);
        FHE.allow(info, msg.sender);
        
        // Add to seller's list
        sellerInfos[msg.sender].push(infoId);
        
        emit InfoUploaded(infoId, msg.sender, price);
    }
    
    /// @notice Request to purchase access to encrypted information
    /// @param infoId ID of the information to purchase
    function requestPurchase(uint256 infoId) 
        external 
        payable 
        infoExists(infoId) 
        infoActive(infoId)
    {
        InfoItem storage item = infoItems[infoId];
        require(msg.sender != item.seller, "Cannot purchase own info");
        require(msg.value >= item.price, "Insufficient payment");
        require(!purchaseRequests[infoId][msg.sender].isPending, "Purchase already pending");
        require(!purchaseRequests[infoId][msg.sender].isApproved, "Already have access");
        
        // Create purchase request
        purchaseRequests[infoId][msg.sender] = PurchaseRequest({
            infoId: infoId,
            buyer: msg.sender,
            timestamp: block.timestamp,
            isPending: true,
            isApproved: false
        });
        
        // Add to lists for tracking
        purchaseRequestsList[infoId].push(msg.sender);
        buyerRequests[msg.sender].push(infoId);
        
        // Funds are held in contract until approval/denial
        
        emit PurchaseRequested(infoId, msg.sender);
    }
    
    /// @notice Approve access to information for a buyer
    /// @param infoId ID of the information
    /// @param buyer Address of the buyer
    function grantAccess(uint256 infoId, address buyer) 
        external 
        onlyInfoSeller(infoId) 
        infoExists(infoId)
    {
        PurchaseRequest storage request = purchaseRequests[infoId][buyer];
        require(request.isPending, "No pending request from this buyer");
        
        InfoItem storage item = infoItems[infoId];
        
        // Calculate platform fee
        uint256 fee = (item.price * PLATFORM_FEE_PERCENT) / 100;
        uint256 sellerAmount = item.price - fee;
        
        // Update request status
        request.isPending = false;
        request.isApproved = true;
        
        // Grant access to encrypted information
        FHE.allow(item.encryptedInfo, buyer);
        
        // Transfer payments
        platformBalance += fee;
        payable(msg.sender).transfer(sellerAmount);
        
        emit AccessGranted(infoId, buyer, msg.sender);
    }
    
    /// @notice Deny access to information for a buyer (refund payment)
    /// @param infoId ID of the information
    /// @param buyer Address of the buyer
    function denyAccess(uint256 infoId, address buyer) 
        external 
        onlyInfoSeller(infoId) 
        infoExists(infoId)
    {
        PurchaseRequest storage request = purchaseRequests[infoId][buyer];
        require(request.isPending, "No pending request from this buyer");
        
        InfoItem storage item = infoItems[infoId];
        
        // Update request status
        request.isPending = false;
        request.isApproved = false;
        
        // Refund the buyer
        payable(buyer).transfer(item.price);
        
        emit AccessDenied(infoId, buyer, msg.sender);
    }
    
    /// @notice Deactivate an information item (no longer for sale)
    /// @param infoId ID of the information to deactivate
    function deactivateInfo(uint256 infoId) 
        external 
        onlyInfoSeller(infoId) 
        infoExists(infoId)
    {
        infoItems[infoId].isActive = false;
        emit InfoDeactivated(infoId, msg.sender);
    }
    
    /// @notice Get encrypted information (only accessible by authorized users)
    /// @param infoId ID of the information
    /// @return The encrypted information
    function getEncryptedInfo(uint256 infoId) 
        external 
        view 
        infoExists(infoId) 
        returns (eaddress) 
    {
        return infoItems[infoId].encryptedInfo;
    }
    
    /// @notice Get basic info about an information item
    /// @param infoId ID of the information
    /// @return seller, price, isActive, createdAt
    function getInfoBasics(uint256 infoId) 
        external 
        view 
        infoExists(infoId) 
        returns (address, uint256, bool, uint256) 
    {
        InfoItem storage item = infoItems[infoId];
        return (item.seller, item.price, item.isActive, item.createdAt);
    }
    
    /// @notice Get purchase request status
    /// @param infoId ID of the information
    /// @param buyer Address of the buyer
    /// @return isPending, isApproved, timestamp
    function getPurchaseRequestStatus(uint256 infoId, address buyer)
        external
        view
        returns (bool, bool, uint256)
    {
        PurchaseRequest storage request = purchaseRequests[infoId][buyer];
        return (request.isPending, request.isApproved, request.timestamp);
    }
    
    /// @notice Get all info IDs owned by a seller
    /// @param seller Address of the seller
    /// @return Array of info IDs
    function getSellerInfos(address seller) external view returns (uint256[] memory) {
        return sellerInfos[seller];
    }
    
    /// @notice Get all pending purchase requests for an info item
    /// @param infoId ID of the information
    /// @return Array of buyer addresses with pending requests
    function getPendingRequests(uint256 infoId) 
        external 
        view 
        onlyInfoSeller(infoId)
        returns (address[] memory) 
    {
        address[] storage allBuyers = purchaseRequestsList[infoId];
        
        // Count pending requests
        uint256 pendingCount = 0;
        for (uint256 i = 0; i < allBuyers.length; i++) {
            if (purchaseRequests[infoId][allBuyers[i]].isPending) {
                pendingCount++;
            }
        }
        
        // Create array of pending buyers
        address[] memory pendingBuyers = new address[](pendingCount);
        uint256 index = 0;
        for (uint256 i = 0; i < allBuyers.length; i++) {
            if (purchaseRequests[infoId][allBuyers[i]].isPending) {
                pendingBuyers[index] = allBuyers[i];
                index++;
            }
        }
        
        return pendingBuyers;
    }
    
    /// @notice Withdraw platform fees (only owner)
    function withdrawPlatformFees() external onlyOwner {
        require(platformBalance > 0, "No fees to withdraw");
        uint256 amount = platformBalance;
        platformBalance = 0;
        payable(owner).transfer(amount);
        emit PlatformFeeWithdrawn(owner, amount);
    }
    
    /// @notice Get platform statistics
    /// @return nextInfoId, platformBalance
    function getPlatformStats() external view returns (uint256, uint256) {
        return (nextInfoId, platformBalance);
    }
}