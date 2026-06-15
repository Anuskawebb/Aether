// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20Min {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

// ─────────────────────────────────────────────────────────────────────────────
//  MultiPairAMM — minimal constant-product (x·y=k) DEX, aUSD <-> N tokens
//
//  Same role as SimpleAMM (a real on-chain swap venue for Mantle Sepolia so
//  VaultManager copy trades move real tokens with real, swap-derived P&L) but
//  supports multiple aUSD <-> token pairs (one per copyable asset) instead of
//  a single hardcoded pair. Each pair is keyed by its non-aUSD token address.
//
//  0.30% fee, same constant-product math as Uniswap v2. Router-compatible
//  `getAmountsOut`/`swapExactTokensForTokens` interface — only 2-token paths
//  where one side is aUSD are supported.
// ─────────────────────────────────────────────────────────────────────────────
contract MultiPairAMM {
    address public immutable AUSD; // aUSD (6 decimals)

    uint16 public constant FEE_BPS = 30; // 0.30%

    struct Reserves {
        uint256 ausd;
        uint256 token;
    }

    /// @notice token address → reserves for the aUSD<->token pair
    mapping(address => Reserves) public reserves;

    event LiquidityAdded(address indexed token, uint256 ausdAmount, uint256 tokenAmount);
    event Swapped(address indexed tokenIn, uint256 amountIn, uint256 amountOut, address indexed to);

    constructor(address _ausd) {
        require(_ausd != address(0), "AMM: zero aUSD");
        AUSD = _ausd;
    }

    /// @notice Seed / top-up a pair's liquidity. Caller must pre-approve both tokens.
    function addLiquidity(address token, uint256 ausdAmount, uint256 tokenAmount) external {
        require(token != address(0) && token != AUSD, "AMM: bad token");
        require(ausdAmount > 0 && tokenAmount > 0, "AMM: zero liquidity");
        require(IERC20Min(AUSD).transferFrom(msg.sender, address(this), ausdAmount), "AMM: aUSD in failed");
        require(IERC20Min(token).transferFrom(msg.sender, address(this), tokenAmount), "AMM: token in failed");

        Reserves storage r = reserves[token];
        r.ausd  += ausdAmount;
        r.token += tokenAmount;
        emit LiquidityAdded(token, ausdAmount, tokenAmount);
    }

    /// @notice Constant-product quote with 0.30% fee.
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        public pure returns (uint256)
    {
        require(amountIn > 0 && reserveIn > 0 && reserveOut > 0, "AMM: insufficient");
        uint256 amountInWithFee = amountIn * (10000 - FEE_BPS);
        return (amountInWithFee * reserveOut) / (reserveIn * 10000 + amountInWithFee);
    }

    // ── UniswapV2 / FusionX router-compatible interface ───────────────────────
    // VaultManager talks to the DEX via this standard interface. Only 2-token
    // paths where one side is aUSD are supported: [AUSD, token] or [token, AUSD].

    /// @notice V2-style quote — amounts[0]=amountIn, amounts[1]=amountOut.
    function getAmountsOut(uint256 amountIn, address[] calldata path)
        external view returns (uint256[] memory amounts)
    {
        require(path.length == 2, "AMM: 2-token path only");
        (uint256 rIn, uint256 rOut) = _reservesFor(path[0], path[1]);
        amounts = new uint256[](2);
        amounts[0] = amountIn;
        amounts[1] = getAmountOut(amountIn, rIn, rOut);
    }

    /// @notice V2-style swap — caller pre-approves `amountIn` of path[0].
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 /* deadline */
    ) external returns (uint256[] memory amounts) {
        require(path.length == 2, "AMM: 2-token path only");
        uint256 out = _swap(path[0], path[1], amountIn, amountOutMin, to);
        amounts = new uint256[](2);
        amounts[0] = amountIn;
        amounts[1] = out;
    }

    /// @dev Resolve (reserveIn, reserveOut) for a [tokenIn, tokenOut] pair where
    ///      exactly one of tokenIn/tokenOut is aUSD and the other is a registered token.
    function _reservesFor(address tokenIn, address tokenOut) internal view returns (uint256 rIn, uint256 rOut) {
        if (tokenIn == AUSD) {
            require(tokenOut != AUSD, "AMM: bad path");
            Reserves storage r = reserves[tokenOut];
            require(r.ausd > 0 && r.token > 0, "AMM: no liquidity");
            return (r.ausd, r.token);
        } else if (tokenOut == AUSD) {
            Reserves storage r = reserves[tokenIn];
            require(r.ausd > 0 && r.token > 0, "AMM: no liquidity");
            return (r.token, r.ausd);
        }
        revert("AMM: bad token");
    }

    function _swap(address tokenIn, address tokenOut, uint256 amountIn, uint256 minOut, address to)
        internal returns (uint256 amountOut)
    {
        require(amountIn > 0, "AMM: zero in");
        (uint256 rIn, uint256 rOut) = _reservesFor(tokenIn, tokenOut);
        amountOut = getAmountOut(amountIn, rIn, rOut);
        require(amountOut >= minOut, "AMM: slippage");

        require(IERC20Min(tokenIn).transferFrom(msg.sender, address(this), amountIn), "AMM: in failed");
        require(IERC20Min(tokenOut).transfer(to, amountOut), "AMM: out failed");

        if (tokenIn == AUSD) {
            Reserves storage r = reserves[tokenOut];
            r.ausd  += amountIn;
            r.token -= amountOut;
        } else {
            Reserves storage r = reserves[tokenIn];
            r.token += amountIn;
            r.ausd  -= amountOut;
        }

        emit Swapped(tokenIn, amountIn, amountOut, to);
    }
}
