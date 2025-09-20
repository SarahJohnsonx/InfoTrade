// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title StringAddressUtils - Utility library for string to address conversion
/// @notice Provides functions to convert strings to addresses and vice versa
/// @dev This is used for converting information strings to EVM addresses for encryption
library StringAddressUtils {
    
    /// @notice Convert a string to an address using keccak256 hash
    /// @param str The input string
    /// @return The resulting address
    function stringToAddress(string memory str) internal pure returns (address) {
        bytes32 hash = keccak256(abi.encodePacked(str));
        // Take the last 20 bytes of the hash to form an address
        return address(uint160(uint256(hash)));
    }
    
    /// @notice Convert an address back to its hash representation
    /// @param addr The input address
    /// @return The hash that was used to generate this address
    /// @dev Note: This cannot recover the original string, only the hash
    function addressToHash(address addr) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(addr)));
    }
    
    /// @notice Check if an address was generated from a specific string
    /// @param str The string to check
    /// @param addr The address to verify
    /// @return True if the address was generated from the string
    function verifyStringAddress(string memory str, address addr) internal pure returns (bool) {
        return stringToAddress(str) == addr;
    }
    
    /// @notice Convert bytes32 to address
    /// @param hash The input hash
    /// @return The resulting address
    function hashToAddress(bytes32 hash) internal pure returns (address) {
        return address(uint160(uint256(hash)));
    }
    
    /// @notice Generate a deterministic address from string and salt
    /// @param str The input string
    /// @param salt Additional entropy
    /// @return The resulting address
    function stringToAddressWithSalt(string memory str, bytes32 salt) internal pure returns (address) {
        bytes32 hash = keccak256(abi.encodePacked(str, salt));
        return address(uint160(uint256(hash)));
    }
}

/// @title InfoEncoder - Helper contract for encoding/decoding information
/// @notice Provides a contract interface for the StringAddressUtils library
contract InfoEncoder {
    using StringAddressUtils for string;
    
    event StringEncoded(string indexed originalString, address indexed encodedAddress);
    event AddressVerified(string indexed originalString, address indexed encodedAddress, bool isValid);
    
    /// @notice Encode a string to an address
    /// @param str The string to encode
    /// @return The encoded address
    function encodeString(string memory str) external pure returns (address) {
        return str.stringToAddress();
    }
    
    /// @notice Encode a string with salt to an address
    /// @param str The string to encode
    /// @param salt Additional entropy for encoding
    /// @return The encoded address
    function encodeStringWithSalt(string memory str, bytes32 salt) external pure returns (address) {
        return StringAddressUtils.stringToAddressWithSalt(str, salt);
    }
    
    /// @notice Verify if an address was encoded from a specific string
    /// @param str The original string
    /// @param addr The address to verify
    /// @return True if the address matches the string
    function verifyEncoding(string memory str, address addr) external pure returns (bool) {
        return str.verifyStringAddress(addr);
    }
    
    /// @notice Get the hash representation of an address
    /// @param addr The address
    /// @return The hash representation
    function getAddressHash(address addr) external pure returns (bytes32) {
        return StringAddressUtils.addressToHash(addr);
    }
    
    /// @notice Batch encode multiple strings
    /// @param strings Array of strings to encode
    /// @return Array of encoded addresses
    function batchEncodeStrings(string[] memory strings) external pure returns (address[] memory) {
        address[] memory addresses = new address[](strings.length);
        for (uint256 i = 0; i < strings.length; i++) {
            addresses[i] = strings[i].stringToAddress();
        }
        return addresses;
    }
    
    /// @notice Encode and emit event for tracking
    /// @param str The string to encode
    /// @return The encoded address
    function encodeAndLog(string memory str) external returns (address) {
        address encoded = str.stringToAddress();
        emit StringEncoded(str, encoded);
        return encoded;
    }
    
    /// @notice Verify and emit event for tracking
    /// @param str The original string
    /// @param addr The address to verify
    /// @return True if valid
    function verifyAndLog(string memory str, address addr) external returns (bool) {
        bool isValid = str.verifyStringAddress(addr);
        emit AddressVerified(str, addr, isValid);
        return isValid;
    }
}