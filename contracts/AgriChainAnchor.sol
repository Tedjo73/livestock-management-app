// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AgriChainAnchor {
    struct AnchorRecord {
        bytes32 recordHash;
        string recordType;
        uint256 timestamp;
        address submitter;
    }

    AnchorRecord[] public anchors;
    mapping(bytes32 => bool) public isAnchored;

    event RecordAnchored(
        address indexed submitter,
        bytes32 indexed recordHash,
        string recordType,
        uint256 timestamp
    );

    function anchor(bytes32 recordHash, string calldata recordType) external returns (uint256) {
        require(recordHash != bytes32(0), "Invalid record hash");
        anchors.push(AnchorRecord({
            recordHash: recordHash,
            recordType: recordType,
            timestamp: block.timestamp,
            submitter: msg.sender
        }));
        isAnchored[recordHash] = true;

        emit RecordAnchored(msg.sender, recordHash, recordType, block.timestamp);
        return anchors.length - 1;
    }

    function totalAnchors() external view returns (uint256) {
        return anchors.length;
    }
}

