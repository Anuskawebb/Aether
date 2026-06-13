// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title FollowerRegistry
/// @notice On-chain registry for StellaAlpha paper copy-trading on Mantle Sepolia Testnet.
///         No real funds are held. virtualUsdc is an off-chain accounting unit stored
///         here for transparency only.
contract FollowerRegistry {

    // ── Structs ──────────────────────────────────────────────────────────────

    struct Vault {
        uint256 virtualUsdc;     // 6 decimals — mirrors USDC.e denomination
        uint256 startingCapital;
        bool    exists;
    }

    // ── Storage ──────────────────────────────────────────────────────────────

    mapping(address => Vault)                       public vaults;
    mapping(address => address[])                   public following;   // follower → leaders[]
    mapping(address => address[])                   public followers;   // leader   → followers[]
    mapping(address => mapping(address => bool))    public isFollowing;
    mapping(address => mapping(address => uint256)) public followIndex; // O(1) removal

    // ── Events ───────────────────────────────────────────────────────────────

    event VaultCreated(address indexed user, uint256 virtualUsdc);
    event VaultReset(address indexed user, uint256 virtualUsdc);
    event Followed(address indexed follower, address indexed leader);
    event Unfollowed(address indexed follower, address indexed leader);

    // ── Vault ────────────────────────────────────────────────────────────────

    /// @param virtualUsdc Starting paper capital in USDC.e units (6 decimals).
    ///                    Example: 1000 USDC.e = 1_000_000_000
    function createVault(uint256 virtualUsdc) external {
        require(!vaults[msg.sender].exists, "Vault already exists");
        require(virtualUsdc >= 1e6, "Minimum 1 USDC.e");
        vaults[msg.sender] = Vault({
            virtualUsdc:     virtualUsdc,
            startingCapital: virtualUsdc,
            exists:          true
        });
        emit VaultCreated(msg.sender, virtualUsdc);
    }

    /// @notice Reset vault to new starting capital (also clears all follows).
    function resetVault(uint256 virtualUsdc) external {
        require(vaults[msg.sender].exists, "No vault");
        require(virtualUsdc >= 1e6, "Minimum 1 USDC.e");

        address[] memory leaders = following[msg.sender];
        for (uint256 i = 0; i < leaders.length; i++) {
            _removeFollower(leaders[i], msg.sender);
            isFollowing[msg.sender][leaders[i]] = false;
        }
        delete following[msg.sender];

        vaults[msg.sender].virtualUsdc     = virtualUsdc;
        vaults[msg.sender].startingCapital = virtualUsdc;
        emit VaultReset(msg.sender, virtualUsdc);
    }

    // ── Follow / Unfollow ────────────────────────────────────────────────────

    function follow(address leader) external {
        require(vaults[msg.sender].exists,        "Create vault first");
        require(!isFollowing[msg.sender][leader],  "Already following");
        require(leader != msg.sender,              "Cannot follow yourself");
        require(leader != address(0),              "Invalid leader");

        followIndex[msg.sender][leader] = following[msg.sender].length;
        following[msg.sender].push(leader);
        followers[leader].push(msg.sender);
        isFollowing[msg.sender][leader] = true;

        emit Followed(msg.sender, leader);
    }

    function unfollow(address leader) external {
        require(isFollowing[msg.sender][leader], "Not following");

        isFollowing[msg.sender][leader] = false;

        // O(1) swap-and-pop from following[]
        uint256 idx  = followIndex[msg.sender][leader];
        address[] storage f = following[msg.sender];
        address last = f[f.length - 1];
        f[idx] = last;
        followIndex[msg.sender][last] = idx;
        f.pop();
        delete followIndex[msg.sender][leader];

        _removeFollower(leader, msg.sender);

        emit Unfollowed(msg.sender, leader);
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    function getFollowing(address user) external view returns (address[] memory) {
        return following[user];
    }

    function getFollowers(address leader) external view returns (address[] memory) {
        return followers[leader];
    }

    function getVault(address user)
        external view
        returns (uint256 virtualUsdc, uint256 startingCapital, bool exists)
    {
        Vault storage v = vaults[user];
        return (v.virtualUsdc, v.startingCapital, v.exists);
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    function _removeFollower(address leader, address follower) internal {
        address[] storage fl = followers[leader];
        for (uint256 i = 0; i < fl.length; i++) {
            if (fl[i] == follower) {
                fl[i] = fl[fl.length - 1];
                fl.pop();
                return;
            }
        }
    }
}
