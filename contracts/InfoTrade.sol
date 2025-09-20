// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint32, eaddress, externalEuint32, externalEaddress } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract InfoTrade is SepoliaConfig {
    struct InfoItem {
        string title;
        string info;
        eaddress encryptedOwner;
        uint256 price;
        bool isActive;
        address owner;
        uint256 createdAt;
        mapping(address => bool) hasPurchased;
        mapping(address => bool) hasAccess;
    }

    mapping(uint256 => InfoItem) public infoItems;
    uint256 public nextInfoId;

    mapping(address => uint256[]) public userInfoItems;
    mapping(address => uint256[]) public userPurchases;

    event InfoCreated(uint256 indexed infoId, address indexed owner, string title, uint256 timestamp);
    event InfoPurchased(uint256 indexed infoId, address indexed buyer, address indexed seller, uint256 timestamp);
    event AccessGranted(uint256 indexed infoId, address indexed buyer, uint256 timestamp);
    event InfoUpdated(uint256 indexed infoId, uint256 newPrice, uint256 timestamp);
    event InfoDeactivated(uint256 indexed infoId, uint256 timestamp);

    constructor() {
        nextInfoId = 1;
    }

    function createInfo(
        string memory title,
        string memory info,
        externalEaddress encryptedOwnerAddress,
        uint256 price,
        bytes calldata inputProof
    ) external {
        require(bytes(title).length > 0, "Title cannot be empty");
        require(bytes(info).length > 0, "Info cannot be empty");
        require(price > 0, "Price must be greater than 0");

        eaddress ownerAddress = FHE.fromExternal(encryptedOwnerAddress, inputProof);

        uint256 infoId = nextInfoId++;

        InfoItem storage newInfo = infoItems[infoId];
        newInfo.title = title;
        newInfo.info = info;
        newInfo.encryptedOwner = ownerAddress;
        newInfo.price = price;
        newInfo.isActive = true;
        newInfo.owner = msg.sender;
        newInfo.createdAt = block.timestamp;
        newInfo.hasAccess[msg.sender] = true;

        FHE.allowThis(ownerAddress);
        FHE.allow(ownerAddress, msg.sender);

        userInfoItems[msg.sender].push(infoId);

        emit InfoCreated(infoId, msg.sender, title, block.timestamp);
    }

    function purchaseInfo(uint256 infoId) external payable {
        require(infoId < nextInfoId && infoId > 0, "Invalid info ID");
        require(infoItems[infoId].isActive, "Info is not active");
        require(infoItems[infoId].owner != msg.sender, "Cannot purchase your own info");
        require(!infoItems[infoId].hasPurchased[msg.sender], "Already purchased");
        require(msg.value >= infoItems[infoId].price, "Insufficient payment");

        address seller = infoItems[infoId].owner;

        infoItems[infoId].hasPurchased[msg.sender] = true;
        userPurchases[msg.sender].push(infoId);

        // Transfer payment to seller
        (bool success, ) = payable(seller).call{value: msg.value}("");
        require(success, "Payment transfer failed");

        FHE.allow(infoItems[infoId].encryptedOwner, msg.sender);

        emit InfoPurchased(infoId, msg.sender, seller, block.timestamp);
    }

    function grantAccess(uint256 infoId, address buyer) external {
        require(infoId < nextInfoId && infoId > 0, "Invalid info ID");
        require(infoItems[infoId].owner == msg.sender, "Only owner can grant access");
        require(infoItems[infoId].hasPurchased[buyer], "Buyer has not purchased");
        require(!infoItems[infoId].hasAccess[buyer], "Access already granted");

        infoItems[infoId].hasAccess[buyer] = true;

        FHE.allow(infoItems[infoId].encryptedOwner, buyer);

        emit AccessGranted(infoId, buyer, block.timestamp);
    }

    function updatePrice(
        uint256 infoId,
        uint256 newPrice
    ) external {
        require(infoId < nextInfoId && infoId > 0, "Invalid info ID");
        require(infoItems[infoId].owner == msg.sender, "Only owner can update price");
        require(infoItems[infoId].isActive, "Info is not active");
        require(newPrice > 0, "Price must be greater than 0");

        infoItems[infoId].price = newPrice;

        emit InfoUpdated(infoId, newPrice, block.timestamp);
    }

    function deactivateInfo(uint256 infoId) external {
        require(infoId < nextInfoId && infoId > 0, "Invalid info ID");
        require(infoItems[infoId].owner == msg.sender, "Only owner can deactivate");
        require(infoItems[infoId].isActive, "Info already inactive");

        infoItems[infoId].isActive = false;

        emit InfoDeactivated(infoId, block.timestamp);
    }

    function getInfoBasicDetails(uint256 infoId) external view returns (
        string memory title,
        address owner,
        bool isActive,
        uint256 createdAt,
        bool hasPurchased,
        bool hasAccess
    ) {
        require(infoId < nextInfoId && infoId > 0, "Invalid info ID");

        InfoItem storage info = infoItems[infoId];
        return (
            info.title,
            info.owner,
            info.isActive,
            info.createdAt,
            info.hasPurchased[msg.sender],
            info.hasAccess[msg.sender]
        );
    }

    function getInfoContent(uint256 infoId) external view returns (string memory) {
        require(infoId < nextInfoId && infoId > 0, "Invalid info ID");
        require(infoItems[infoId].hasAccess[msg.sender], "No access to this info");

        return infoItems[infoId].info;
    }

    function getPrice(uint256 infoId) external view returns (uint256) {
        require(infoId < nextInfoId && infoId > 0, "Invalid info ID");
        return infoItems[infoId].price;
    }

    function getEncryptedOwner(uint256 infoId) external view returns (eaddress) {
        require(infoId < nextInfoId && infoId > 0, "Invalid info ID");
        return infoItems[infoId].encryptedOwner;
    }

    function getUserInfoItems(address user) external view returns (uint256[] memory) {
        return userInfoItems[user];
    }

    function getUserPurchases(address user) external view returns (uint256[] memory) {
        return userPurchases[user];
    }

    function getTotalInfoCount() external view returns (uint256) {
        return nextInfoId - 1;
    }

    function hasUserPurchased(uint256 infoId, address user) external view returns (bool) {
        require(infoId < nextInfoId && infoId > 0, "Invalid info ID");
        return infoItems[infoId].hasPurchased[user];
    }

    function hasUserAccess(uint256 infoId, address user) external view returns (bool) {
        require(infoId < nextInfoId && infoId > 0, "Invalid info ID");
        return infoItems[infoId].hasAccess[user];
    }
}