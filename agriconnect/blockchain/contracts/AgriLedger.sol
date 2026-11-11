// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AgriLedger - Decentralized Agricultural Record & Integrity Registry
 * @author AgriConnect Team - DIDT3110 Digital Strategy
 * @notice Part B: Blockchain Technology (20 Marks)
 * @dev Stores crop records, verifies data integrity, and enables transparent distributed tracking.
 */
contract AgriLedger {
    address public owner;
    uint256 public totalListingsCount;
    uint256 public totalTransactionsCount;

    struct ListingRecord {
        uint256 listingId;
        string cropName;
        string category;
        uint256 quantityKg;
        uint256 pricePerUnitLsl; // In Maloti cents (e.g. 1250 = M 12.50)
        string location;
        uint256 sellerId;
        address recorderAddress;
        uint256 timestamp;
        bytes32 recordHash;
        bool exists;
    }

    struct SalesTransaction {
        uint256 transactionId;
        uint256 listingId;
        uint256 buyerId;
        uint256 sellerId;
        uint256 quantityKg;
        uint256 totalAmountLsl;
        uint256 timestamp;
        bytes32 transactionHash;
    }

    // Mappings for O(1) state lookup
    mapping(uint256 => ListingRecord) public listings;
    mapping(uint256 => SalesTransaction) public transactions;
    uint256[] public allListingIds;

    // Events for distributed peer notification
    event ListingRecorded(
        uint256 indexed listingId,
        string cropName,
        uint256 pricePerUnitLsl,
        uint256 indexed sellerId,
        bytes32 recordHash,
        uint256 timestamp
    );

    event TransactionRecorded(
        uint256 indexed transactionId,
        uint256 indexed listingId,
        uint256 indexed buyerId,
        uint256 sellerId,
        uint256 totalAmountLsl,
        bytes32 transactionHash,
        uint256 timestamp
    );

    event IntegrityVerified(
        uint256 indexed listingId,
        bool isTamperFree,
        bytes32 expectedHash,
        bytes32 actualHash,
        uint256 verifiedAt
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "AgriLedger: Caller is not authorized owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        totalListingsCount = 0;
        totalTransactionsCount = 0;
    }

    /**
     * @notice Records an agricultural crop listing on-chain
     * @dev Implements transparency and cryptographic hashing for integrity
     */
    function recordListing(
        uint256 _listingId,
        string memory _cropName,
        string memory _category,
        uint256 _quantityKg,
        uint256 _pricePerUnitLsl,
        string memory _location,
        uint256 _sellerId
    ) public returns (bytes32) {
        require(_listingId > 0, "Invalid listing ID");
        require(bytes(_cropName).length > 0, "Crop name cannot be empty");
        require(_pricePerUnitLsl > 0, "Price must be positive");

        // Compute cryptographic proof of record integrity
        bytes32 recordHash = keccak256(
            abi.encodePacked(
                _listingId,
                _cropName,
                _category,
                _quantityKg,
                _pricePerUnitLsl,
                _location,
                _sellerId,
                block.timestamp,
                msg.sender
            )
        );

        listings[_listingId] = ListingRecord({
            listingId: _listingId,
            cropName: _cropName,
            category: _category,
            quantityKg: _quantityKg,
            pricePerUnitLsl: _pricePerUnitLsl,
            location: _location,
            sellerId: _sellerId,
            recorderAddress: msg.sender,
            timestamp: block.timestamp,
            recordHash: recordHash,
            exists: true
        });

        allListingIds.push(_listingId);
        totalListingsCount++;

        emit ListingRecorded(
            _listingId,
            _cropName,
            _pricePerUnitLsl,
            _sellerId,
            recordHash,
            block.timestamp
        );

        return recordHash;
    }

    /**
     * @notice Records a finalized sale / buyer-seller escrow settlement
     */
    function recordSale(
        uint256 _transactionId,
        uint256 _listingId,
        uint256 _buyerId,
        uint256 _sellerId,
        uint256 _quantityKg,
        uint256 _totalAmountLsl
    ) public returns (bytes32) {
        require(_transactionId > 0, "Invalid transaction ID");
        require(listings[_listingId].exists, "Referenced listing does not exist on-chain");

        bytes32 txHash = keccak256(
            abi.encodePacked(
                _transactionId,
                _listingId,
                _buyerId,
                _sellerId,
                _quantityKg,
                _totalAmountLsl,
                block.timestamp
            )
        );

        transactions[_transactionId] = SalesTransaction({
            transactionId: _transactionId,
            listingId: _listingId,
            buyerId: _buyerId,
            sellerId: _sellerId,
            quantityKg: _quantityKg,
            totalAmountLsl: _totalAmountLsl,
            timestamp: block.timestamp,
            transactionHash: txHash
        });

        totalTransactionsCount++;

        emit TransactionRecorded(
            _transactionId,
            _listingId,
            _buyerId,
            _sellerId,
            _totalAmountLsl,
            txHash,
            block.timestamp
        );

        return txHash;
    }

    /**
     * @notice Verifies data integrity of a crop listing against its immutable hash
     * @dev Core requirement for Part B (Integrity Verification)
     */
    function verifyListingIntegrity(
        uint256 _listingId,
        string memory _cropName,
        string memory _category,
        uint256 _quantityKg,
        uint256 _pricePerUnitLsl,
        string memory _location,
        uint256 _sellerId
    ) public view returns (bool isValid, bytes32 storedHash, bytes32 recalculatedHash) {
        require(listings[_listingId].exists, "Listing record not found on blockchain");

        ListingRecord memory record = listings[_listingId];
        bytes32 stored = record.recordHash;

        bytes32 recalculated = keccak256(
            abi.encodePacked(
                _listingId,
                _cropName,
                _category,
                _quantityKg,
                _pricePerUnitLsl,
                _location,
                _sellerId,
                record.timestamp,
                record.recorderAddress
            )
        );

        bool matches = (stored == recalculated);
        return (matches, stored, recalculated);
    }

    /**
     * @notice Returns listing details by listing ID
     */
    function getListing(uint256 _listingId) external view returns (ListingRecord memory) {
        require(listings[_listingId].exists, "Listing record not found");
        return listings[_listingId];
    }

    /**
     * @notice Returns total number of recorded listings
     */
    function getListingCount() external view returns (uint256) {
        return totalListingsCount;
    }
}

