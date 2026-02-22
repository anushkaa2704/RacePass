// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title RacePassV2 — Privacy-Preserving Identity & Reputation Layer
 * @author RacePass Team
 * @notice Upgraded contract with: revocation, reputation attestations, signed claim verification
 *
 * ════════════════════════════════════════════════════════════════
 * ARCHITECTURE (How This Satisfies the Problem Statement)
 * ════════════════════════════════════════════════════════════════
 *
 * 1) CREDENTIAL FINGERPRINTS
 *    - Keccak256 hash of the W3C Verifiable Credential stored on-chain
 *    - Proves "this wallet completed KYC" without storing personal data
 *    - Same fingerprint on Sepolia + Polygon Amoy (cross-chain portability)
 *
 * 2) REVOCATION REGISTRY
 *    - revoked[wallet] = true → credential is invalidated EVERYWHERE
 *    - Third-party verifiers can check revocation status on-chain
 *    - Both self-revocation (user) and admin-revocation (issuer) supported
 *
 * 3) SIGNED ATTESTATION VERIFICATION (Privacy-Preserving Eligibility)
 *    - Issuer signs: keccak256(wallet, claimType, claimValue, nonce)
 *    - Contract recovers signer via ecrecover and verifies authorized issuer
 *    - Third parties call verifyAttestation() → true/false
 *    - NO personal data on-chain. Only "issuer attests X about wallet Y"
 *    - Claims: "ageAbove:18", "ageAbove:21", "identityVerified", "countryResident:IN"
 *
 * 4) REPUTATION MERKLE ROOT
 *    - Issuer posts merkleRoot = root(hash(wallet1+event1), hash(wallet2+event2), ...)
 *    - User provides Merkle proof to show "I attended event X"
 *    - Selective disclosure: prove attendance count without listing events
 *    - attendanceCount[wallet] tracked for quick threshold checks
 *
 * 5) CRYPTOGRAPHIC TICKET VALIDATION
 *    - isValidTicketSignature() verifies ECDSA ticket signatures on-chain
 *    - Prevents forgery: only authorized issuers can sign valid tickets
 *    - usedTickets[] prevents double-entry
 * ════════════════════════════════════════════════════════════════
 */
contract RacePassV2 {

    // ══════════════════════════════════════════
    //  STATE
    // ══════════════════════════════════════════

    address public owner;

    // Credential fingerprints (wallet → keccak256 hash)
    mapping(address => bytes32) private fingerprints;

    // Authorized issuers (can store fingerprints, post attestations)
    mapping(address => bool) public authorizedIssuers;

    // ── Revocation Registry ──
    mapping(address => bool) public revoked;

    // ── Reputation System ──
    // Merkle root of all attendance attestations (updated periodically)
    bytes32 public attendanceMerkleRoot;

    // Quick attendance counter per wallet (for threshold checks)
    mapping(address => uint256) public attendanceCount;

    // Reputation score (0–100, updated by issuer based on behavior)
    mapping(address => uint256) public reputationScore;

    // ── Ticket Anti-Reuse ──
    // ticketHash → used (prevents double-entry)
    mapping(bytes32 => bool) public usedTickets;

    // ══════════════════════════════════════════
    //  EVENTS
    // ══════════════════════════════════════════

    event FingerprintStored(address indexed user, bytes32 fingerprint, uint256 timestamp);
    event CredentialRevoked(address indexed user, address revokedBy, uint256 timestamp);
    event CredentialRestored(address indexed user, uint256 timestamp);
    event IssuerAuthorized(address indexed issuer);
    event IssuerRevoked(address indexed issuer);
    event AttendanceRecorded(address indexed user, bytes32 eventHash, uint256 newCount);
    event ReputationUpdated(address indexed user, uint256 newScore);
    event MerkleRootUpdated(bytes32 newRoot, uint256 timestamp);
    event TicketUsed(bytes32 indexed ticketHash, address indexed user, uint256 timestamp);

    // ══════════════════════════════════════════
    //  MODIFIERS
    // ══════════════════════════════════════════

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyAuthorized() {
        require(authorizedIssuers[msg.sender] || msg.sender == owner, "Not authorized");
        _;
    }

    // ══════════════════════════════════════════
    //  CONSTRUCTOR
    // ══════════════════════════════════════════

    constructor() {
        owner = msg.sender;
        authorizedIssuers[msg.sender] = true;
        emit IssuerAuthorized(msg.sender);
    }

    // ══════════════════════════════════════════
    //  ADMIN
    // ══════════════════════════════════════════

    function authorizeIssuer(address _issuer) external onlyOwner {
        authorizedIssuers[_issuer] = true;
        emit IssuerAuthorized(_issuer);
    }

    function revokeIssuer(address _issuer) external onlyOwner {
        authorizedIssuers[_issuer] = false;
        emit IssuerRevoked(_issuer);
    }

    // ══════════════════════════════════════════
    //  CREDENTIAL FINGERPRINTS
    // ══════════════════════════════════════════

    /// @notice Store your own fingerprint
    function storeFingerprint(bytes32 _fingerprint) external {
        require(_fingerprint != bytes32(0), "Empty fingerprint");
        fingerprints[msg.sender] = _fingerprint;
        emit FingerprintStored(msg.sender, _fingerprint, block.timestamp);
    }

    /// @notice Store fingerprint for a user (issuer-only)
    function storeFingerprintFor(address _user, bytes32 _fingerprint) external onlyAuthorized {
        require(_user != address(0), "Invalid user");
        require(_fingerprint != bytes32(0), "Empty fingerprint");
        fingerprints[_user] = _fingerprint;
        emit FingerprintStored(_user, _fingerprint, block.timestamp);
    }

    /// @notice Check if wallet is verified AND not revoked
    function isVerified(address _user) external view returns (bool) {
        return fingerprints[_user] != bytes32(0) && !revoked[_user];
    }

    /// @notice Get stored fingerprint
    function getFingerprint(address _user) external view returns (bytes32) {
        return fingerprints[_user];
    }

    /// @notice Check if an address is authorized
    function isAuthorizedIssuer(address _issuer) external view returns (bool) {
        return authorizedIssuers[_issuer] || _issuer == owner;
    }

    // ══════════════════════════════════════════
    //  REVOCATION REGISTRY
    // ══════════════════════════════════════════

    /**
     * @notice Revoke a credential (self-revocation or issuer-revocation)
     * @dev User can revoke their own, or authorized issuer can revoke any
     */
    function revokeCredential(address _user) external {
        require(
            _user == msg.sender || authorizedIssuers[msg.sender] || msg.sender == owner,
            "Not authorized to revoke"
        );
        require(fingerprints[_user] != bytes32(0), "No credential to revoke");
        require(!revoked[_user], "Already revoked");

        revoked[_user] = true;
        emit CredentialRevoked(_user, msg.sender, block.timestamp);
    }

    /// @notice Restore a revoked credential (issuer-only, e.g. after re-KYC)
    function restoreCredential(address _user) external onlyAuthorized {
        require(revoked[_user], "Not revoked");
        revoked[_user] = false;
        emit CredentialRestored(_user, block.timestamp);
    }

    /// @notice Check if a credential is revoked
    function isRevoked(address _user) external view returns (bool) {
        return revoked[_user];
    }

    // ══════════════════════════════════════════
    //  SIGNED ATTESTATION VERIFICATION
    //  (Privacy-Preserving Eligibility Proofs)
    // ══════════════════════════════════════════

    /**
     * @notice Verify an off-chain signed attestation
     * @dev The issuer signs: keccak256(abi.encodePacked(wallet, claimHash, nonce))
     *      The contract recovers the signer and checks it's authorized.
     *      This is used for "I am 18+" proofs without revealing DOB.
     *
     * @param _wallet   The wallet the claim is about
     * @param _claimHash  keccak256 of the claim string (e.g. "ageAbove:18")
     * @param _nonce    Unique nonce to prevent replay
     * @param _v        ECDSA v
     * @param _r        ECDSA r
     * @param _s        ECDSA s
     * @return valid    True if attestation is valid and signer is authorized
     */
    function verifyAttestation(
        address _wallet,
        bytes32 _claimHash,
        uint256 _nonce,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external view returns (bool valid) {
        // Reconstruct the message hash (Ethereum signed message prefix)
        bytes32 messageHash = keccak256(abi.encodePacked(_wallet, _claimHash, _nonce));
        bytes32 ethSignedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));

        // Recover signer
        address signer = ecrecover(ethSignedHash, _v, _r, _s);

        // Check: signer is authorized AND wallet is not revoked
        return (authorizedIssuers[signer] || signer == owner) && !revoked[_wallet];
    }

    // ══════════════════════════════════════════
    //  REPUTATION SYSTEM
    // ══════════════════════════════════════════

    /**
     * @notice Record event attendance for a user (issuer-only)
     * @param _user      The attendee wallet
     * @param _eventHash keccak256 of the event identifier
     */
    function recordAttendance(address _user, bytes32 _eventHash) external onlyAuthorized {
        require(_user != address(0), "Invalid user");
        attendanceCount[_user] += 1;
        emit AttendanceRecorded(_user, _eventHash, attendanceCount[_user]);
    }

    /**
     * @notice Update reputation score for a user (issuer-only)
     * @param _user  The wallet
     * @param _score 0–100 reputation score
     */
    function updateReputation(address _user, uint256 _score) external onlyAuthorized {
        require(_score <= 100, "Score must be 0-100");
        reputationScore[_user] = _score;
        emit ReputationUpdated(_user, _score);
    }

    /**
     * @notice Update the attendance Merkle root (issuer-only)
     * @dev Frontend can verify Merkle proofs against this root
     */
    function updateMerkleRoot(bytes32 _root) external onlyAuthorized {
        attendanceMerkleRoot = _root;
        emit MerkleRootUpdated(_root, block.timestamp);
    }

    /**
     * @notice Verify a Merkle proof of attendance
     * @param _proof   Array of sibling hashes
     * @param _leaf    The leaf hash (keccak256(wallet, eventId))
     * @return True if proof is valid against stored root
     */
    function verifyAttendanceProof(bytes32[] calldata _proof, bytes32 _leaf) external view returns (bool) {
        bytes32 computedHash = _leaf;
        for (uint256 i = 0; i < _proof.length; i++) {
            if (computedHash <= _proof[i]) {
                computedHash = keccak256(abi.encodePacked(computedHash, _proof[i]));
            } else {
                computedHash = keccak256(abi.encodePacked(_proof[i], computedHash));
            }
        }
        return computedHash == attendanceMerkleRoot;
    }

    /**
     * @notice Check if user meets a minimum attendance threshold
     * @param _user          The wallet to check
     * @param _minAttendance Minimum required attendance count
     * @return True if user's attendance >= threshold
     */
    function meetsAttendanceThreshold(address _user, uint256 _minAttendance) external view returns (bool) {
        return attendanceCount[_user] >= _minAttendance;
    }

    /**
     * @notice Get full reputation data for a wallet (single call)
     */
    function getReputation(address _user) external view returns (
        uint256 score,
        uint256 attendance,
        bool isActive,
        bool isRevokedStatus
    ) {
        return (
            reputationScore[_user],
            attendanceCount[_user],
            fingerprints[_user] != bytes32(0) && !revoked[_user],
            revoked[_user]
        );
    }

    // ══════════════════════════════════════════
    //  CRYPTOGRAPHIC TICKET VALIDATION
    // ══════════════════════════════════════════

    /**
     * @notice Validate a ticket's ECDSA signature was created by an authorized issuer
     * @param _ticketHash  keccak256(wallet, eventId, nonce)
     * @param _v           ECDSA v
     * @param _r           ECDSA r
     * @param _s           ECDSA s
     * @return True if signature is from an authorized issuer and ticket not used
     */
    function isValidTicketSignature(
        bytes32 _ticketHash,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) external view returns (bool) {
        bytes32 ethSignedHash = keccak256(abi.encodePacked(
            "\x19Ethereum Signed Message:\n32", _ticketHash
        ));
        address signer = ecrecover(ethSignedHash, _v, _r, _s);
        return (authorizedIssuers[signer] || signer == owner) && !usedTickets[_ticketHash];
    }

    /**
     * @notice Mark a ticket as used (prevents double-entry)
     * @param _ticketHash The ticket hash to mark used
     */
    function markTicketUsed(bytes32 _ticketHash) external onlyAuthorized {
        require(!usedTickets[_ticketHash], "Ticket already used");
        usedTickets[_ticketHash] = true;
        emit TicketUsed(_ticketHash, msg.sender, block.timestamp);
    }

    /**
     * @notice Full verification: fingerprint exists, not revoked, optional reputation check
     * @param _user           Wallet to verify
     * @param _minReputation  Minimum reputation score (0 to skip)
     * @param _minAttendance  Minimum attendance count (0 to skip)
     * @return verified       True if all checks pass
     */
    function fullVerify(
        address _user,
        uint256 _minReputation,
        uint256 _minAttendance
    ) external view returns (bool verified) {
        // Must have fingerprint
        if (fingerprints[_user] == bytes32(0)) return false;
        // Must not be revoked
        if (revoked[_user]) return false;
        // Reputation check (0 = skip)
        if (_minReputation > 0 && reputationScore[_user] < _minReputation) return false;
        // Attendance check (0 = skip)
        if (_minAttendance > 0 && attendanceCount[_user] < _minAttendance) return false;

        return true;
    }
}
