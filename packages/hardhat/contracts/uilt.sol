// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

contract uilt {
    // 将字符串转换为bytes32
    function stringToBytes32(string memory source) 
        internal
        pure
        returns (bytes32 result)
    {
        assembly {
            result := mload(add(source, 32))
        }
    }

    // 将bytes32转换为字符串
    function bytes32ToString(bytes32 x) 
        internal 
        pure 
        returns (string memory) 
    {
        bytes memory bytesString = new bytes(32);
        uint256 charCount = 0;
        
        for (uint256 j = 0; j < 32; j++) {
            bytes1 char = bytes1(bytes32(uint256(x) * 2**(8 * j)));
            if (char != 0) {
                bytesString[charCount] = char;
                charCount++;
            }
        }
        
        bytes memory bytesStringTrimmed = new bytes(charCount);
        for (uint256 j = 0; j < charCount; j++) {
            bytesStringTrimmed[j] = bytesString[j];
        }
        return string(bytesStringTrimmed);
    }

    // 比较两个字符串是否相等
    function compareStrings(string memory a, string memory b)
        internal
        pure
        returns (bool)
    {
        return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
    }

    // 比较两个bytes32是否相等
    function compareBytes32Strings(bytes32 a, bytes32 b) 
        internal 
        pure 
        returns (bool) 
    {
        return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
    }
}