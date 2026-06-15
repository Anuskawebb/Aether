// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// ─────────────────────────────────────────────────────────────────────────────
//  MockMETH — test volatile asset (stands in for mETH) on Mantle Sepolia
//
//  18 decimals, openly mintable on testnet so we can seed the MultiPairAMM pool.
// ─────────────────────────────────────────────────────────────────────────────
contract MockMETH is ERC20 {
    address public owner;

    constructor() ERC20("Mock mETH", "mmETH") {
        owner = msg.sender;
    }

    /// @notice Open mint on testnet (anyone) — purely for seeding pools / demos.
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
