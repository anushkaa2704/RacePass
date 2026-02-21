// SPDX-License-Identifier: MIT
// This tells people how they can use this code (MIT = very open)

// Solidity version - we're using 0.8.19
pragma solidity ^0.8.19;

/**
 * @title RacePass - Privacy-Preserving Identity Verification
 * @author RacePass Team
 * @notice This contract stores fingerprints (hashes) of verified users
 * @dev Only fingerprints are stored, NEVER personal data!
 * 
 * ============================================
 * HOW THIS CONTRACT WORKS (Plain English)
 * ============================================
 * 
 * 1. A user completes KYC on our website
 * 2. Our backend creates a "fingerprint" (hash) of their credential
 * 3. This fingerprint is stored on blockchain
 * 4. Anyone can check if a wallet has a fingerprint (is verified)
 * 5. But NOBODY can see the user's personal data!
 * 
 * Think of it like a stamp of approval:
 * - You can see someone has the stamp
 * - But you can't see why they got it
 */
contract RacePass {
    // ============================================
    // STATE VARIABLES
    // ============================================
    
    // Owner of the contract (can add authorized issuers)
    address public owner;
    
    // Mapping: wallet address => fingerprint (bytes32)
    // This is like a dictionary: address => hash
    mapping(address => bytes32) private fingerprints;
    
    // Mapping: wallet address => is authorized to store fingerprints
    mapping(address => bool) public authorizedIssuers;
    
    // ============================================
    // EVENTS
    // ============================================
    
    // Events are like notifications that get logged on blockchain
    // Anyone watching can see when these happen
    
    // Emitted when a fingerprint is stored
    event FingerprintStored(
        address indexed user,    // "indexed" makes it searchable
        bytes32 fingerprint,
        uint256 timestamp
    );
    
    // Emitted when an issuer is authorized
    event IssuerAuthorized(address indexed issuer);
    
    // Emitted when an issuer is revoked
    event IssuerRevoked(address indexed issuer);
    
    // ============================================
    // MODIFIERS
    // ============================================
    
    // Modifiers are like security checks that run before a function
    
    // Only the contract owner can call this function
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;  // Continue with the function
    }
    
    // Only authorized issuers can call this function
    modifier onlyAuthorized() {
        require(
            authorizedIssuers[msg.sender] || msg.sender == owner,
            "Not authorized to issue credentials"
        );
        _;
    }
    
    // ============================================
    // CONSTRUCTOR
    // ============================================
    
    // Constructor runs ONCE when the contract is deployed
    constructor() {
        // The person who deploys the contract becomes the owner
        owner = msg.sender;
        
        // Owner is automatically authorized
        authorizedIssuers[msg.sender] = true;
        
        emit IssuerAuthorized(msg.sender);
    }
    
    // ============================================
    // ADMIN FUNCTIONS
    // ============================================
    
    /**
     * @notice Authorize an address to store fingerprints
     * @param _issuer The address to authorize
     */
    function authorizeIssuer(address _issuer) external onlyOwner {
        authorizedIssuers[_issuer] = true;
        emit IssuerAuthorized(_issuer);
    }
    
    /**
     * @notice Revoke authorization from an address
     * @param _issuer The address to revoke
     */
    function revokeIssuer(address _issuer) external onlyOwner {
        authorizedIssuers[_issuer] = false;
        emit IssuerRevoked(_issuer);
    }
    
    // ============================================
    // MAIN FUNCTIONS
    // ============================================
    
    /**
     * @notice Store your own fingerprint
     * @param _fingerprint The bytes32 fingerprint (hash)
     * 
     * Example:
     * - User has wallet 0x123...
     * - User calls: storeFingerprint(0xabc...)
     * - Now 0x123 => 0xabc is stored
     */
    function storeFingerprint(bytes32 _fingerprint) external {
        // Can't store empty fingerprint
        require(_fingerprint != bytes32(0), "Fingerprint cannot be empty");
        
        // Store the fingerprint for msg.sender (the caller)
        fingerprints[msg.sender] = _fingerprint;
        
        // Emit event
        emit FingerprintStored(msg.sender, _fingerprint, block.timestamp);
    }
    
    /**
     * @notice Store fingerprint for another user (only authorized)
     * @param _user The user's wallet address
     * @param _fingerprint The bytes32 fingerprint (hash)
     * 
     * This is called by our backend after KYC verification.
     * Only authorized issuers (like our backend) can call this.
     */
    function storeFingerprintFor(address _user, bytes32 _fingerprint) external onlyAuthorized {
        // Validate inputs
        require(_user != address(0), "Invalid user address");
        require(_fingerprint != bytes32(0), "Fingerprint cannot be empty");
        
        // Store the fingerprint
        fingerprints[_user] = _fingerprint;
        
        // Emit event
        emit FingerprintStored(_user, _fingerprint, block.timestamp);
    }
    
    // ============================================
    // VIEW FUNCTIONS (Read-only, no gas cost)
    // ============================================
    
    /**
     * @notice Check if an address has a verified fingerprint
     * @param _user The address to check
     * @return bool True if verified, false otherwise
     * 
     * This is what third-party websites call to verify users!
     */
    function isVerified(address _user) external view returns (bool) {
        // If fingerprint is not zero, user is verified
        return fingerprints[_user] != bytes32(0);
    }
    
    /**
     * @notice Get the fingerprint for an address
     * @param _user The address to check
     * @return bytes32 The stored fingerprint (or 0x0 if none)
     */
    function getFingerprint(address _user) external view returns (bytes32) {
        return fingerprints[_user];
    }
    
    /**
     * @notice Check if an address is an authorized issuer
     * @param _issuer The address to check
     * @return bool True if authorized
     */
    function isAuthorizedIssuer(address _issuer) external view returns (bool) {
        return authorizedIssuers[_issuer] || _issuer == owner;
    }
}
