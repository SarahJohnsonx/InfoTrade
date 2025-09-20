// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32, eaddress, externalEaddress} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract InfoTrade is SepoliaConfig {
    struct InfoItem {
        uint256 id;
        string name;
        string info;
        eaddress encryptedAddress;
        address owner;
        uint256 price;
        uint256 createdAt;
    }

    struct AccessRequest {
        uint256 infoId;
        address requester;
        uint256 amount;
        bool isPending;
        bool isApproved;
        uint256 createdAt;
    }

    mapping(uint256 => InfoItem) public infoItems;
    mapping(uint256 => AccessRequest) public accessRequests;
    mapping(uint256 => mapping(address => bool)) public hasAccess;
    mapping(address => uint256[]) public userInfoItems;
    mapping(address => uint256[]) public userRequests;
    mapping(address => uint256[]) public ownerPendingRequests;

    uint256 public nextInfoId = 1;
    uint256 public nextRequestId = 1;
    uint256 public constant ACCESS_PRICE = 0.001 ether;

    event InfoStored(uint256 indexed infoId, address indexed owner, string name, uint256 price);

    event AccessRequested(uint256 indexed requestId, uint256 indexed infoId, address indexed requester, uint256 amount);

    event AccessApproved(uint256 indexed requestId, uint256 indexed infoId, address indexed requester);

    event AccessDenied(uint256 indexed requestId, uint256 indexed infoId, address indexed requester);

    modifier onlyInfoOwner(uint256 infoId) {
        require(infoItems[infoId].owner == msg.sender, "Not info owner");
        _;
    }

    modifier infoExists(uint256 infoId) {
        require(infoItems[infoId].owner != address(0), "Info does not exist");
        _;
    }

    modifier requestExists(uint256 requestId) {
        require(accessRequests[requestId].requester != address(0), "Request does not exist");
        _;
    }

    function storeInfo(
        string calldata name,
        string calldata info,
        externalEaddress encryptedAddress,
        bytes calldata inputProof
    ) external {
        require(bytes(name).length > 0, "Name cannot be empty");
        require(bytes(info).length > 0, "Info cannot be empty");

        eaddress validatedEncryptedAddress = FHE.fromExternal(encryptedAddress, inputProof);

        uint256 infoId = nextInfoId++;

        infoItems[infoId] = InfoItem({
            id: infoId,
            name: name,
            info: info,
            encryptedAddress: validatedEncryptedAddress,
            owner: msg.sender,
            price: ACCESS_PRICE,
            createdAt: block.timestamp
        });

        userInfoItems[msg.sender].push(infoId);

        FHE.allowThis(validatedEncryptedAddress);
        FHE.allow(validatedEncryptedAddress, msg.sender);

        emit InfoStored(infoId, msg.sender, name, ACCESS_PRICE);
    }

    function requestAccess(uint256 infoId) external payable infoExists(infoId) {
        require(msg.value >= ACCESS_PRICE, "Insufficient payment");
        require(infoItems[infoId].owner != msg.sender, "Cannot request access to own info");
        require(!hasAccess[infoId][msg.sender], "Already has access");

        uint256 requestId = nextRequestId++;

        accessRequests[requestId] = AccessRequest({
            infoId: infoId,
            requester: msg.sender,
            amount: msg.value,
            isPending: true,
            isApproved: false,
            createdAt: block.timestamp
        });

        userRequests[msg.sender].push(requestId);
        ownerPendingRequests[infoItems[infoId].owner].push(requestId);

        emit AccessRequested(requestId, infoId, msg.sender, msg.value);
    }

    function approveAccess(uint256 requestId) external requestExists(requestId) {
        AccessRequest storage request = accessRequests[requestId];
        require(request.isPending, "Request is not pending");

        InfoItem storage item = infoItems[request.infoId];
        require(item.owner == msg.sender, "Not authorized to approve");

        request.isPending = false;
        request.isApproved = true;
        hasAccess[request.infoId][request.requester] = true;

        FHE.allow(item.encryptedAddress, request.requester);

        _removeFromArray(ownerPendingRequests[msg.sender], requestId);

        payable(msg.sender).transfer(request.amount);

        emit AccessApproved(requestId, request.infoId, request.requester);
    }

    function denyAccess(uint256 requestId) external requestExists(requestId) {
        AccessRequest storage request = accessRequests[requestId];
        require(request.isPending, "Request is not pending");

        InfoItem storage item = infoItems[request.infoId];
        require(item.owner == msg.sender, "Not authorized to deny");

        request.isPending = false;
        request.isApproved = false;

        _removeFromArray(ownerPendingRequests[msg.sender], requestId);

        payable(request.requester).transfer(request.amount);

        emit AccessDenied(requestId, request.infoId, request.requester);
    }

    function getInfo(uint256 infoId) external view infoExists(infoId) returns (InfoItem memory) {
        InfoItem storage item = infoItems[infoId];
        return item;
    }

    function getEncryptedAddress(uint256 infoId) external view infoExists(infoId) returns (eaddress) {
        require(
            hasAccess[infoId][msg.sender] || infoItems[infoId].owner == msg.sender,
            "No access to encrypted address"
        );
        return infoItems[infoId].encryptedAddress;
    }

    function getUserInfoItems(address user) external view returns (uint256[] memory) {
        return userInfoItems[user];
    }

    function getUserRequests(address user) external view returns (uint256[] memory) {
        return userRequests[user];
    }

    function getPendingRequests(address owner) external view returns (uint256[] memory) {
        return ownerPendingRequests[owner];
    }

    function hasAccessToInfo(uint256 infoId, address user) external view returns (bool) {
        return hasAccess[infoId][user] || infoItems[infoId].owner == user;
    }

    function getOwnerPendingRequests(address owner) external view returns (uint256[] memory) {
        return ownerPendingRequests[owner];
    }

    function _removeFromArray(uint256[] storage array, uint256 value) internal {
        for (uint256 i = 0; i < array.length; i++) {
            if (array[i] == value) {
                array[i] = array[array.length - 1];
                array.pop();
                break;
            }
        }
    }

    function getAllInfos() external view returns (uint256[] memory) {
        uint256[] memory allInfos = new uint256[](nextInfoId - 1);
        uint256 count = 0;

        for (uint256 i = 1; i < nextInfoId; i++) {
            if (infoItems[i].owner != address(0)) {
                allInfos[count] = i;
                count++;
            }
        }

        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = allInfos[i];
        }

        return result;
    }
}
