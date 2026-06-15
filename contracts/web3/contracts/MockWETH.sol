// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// ─────────────────────────────────────────────────────────────────────────────
//  MockWETH — test volatile asset (stands in for WETH) on Mantle Sepolia
//
//  18 decimals, openly mintable on testnet so we can seed the MultiPairAMM pool.
// ─────────────────────────────────────────────────────────────────────────────
contract MockWETH is ERC20 {
    address public owner;

    constructor() ERC20("Mock Wrapped ETH", "mWETH") {
        owner = msg.sender;
    }

    /// @notice Open mint on testnet (anyone) — purely for seeding pools / demos.
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
