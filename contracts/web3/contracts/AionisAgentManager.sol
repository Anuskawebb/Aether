// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ─────────────────────────────────────────────────────────────────────────────
//  ███████╗████████╗███████╗██╗     ██╗      █████╗ ██╗     ██████╗ ██╗  ██╗ █████╗
//  ██╔════╝╚══██╔══╝██╔════╝██║     ██║     ██╔══██╗██║     ██╔══██╗██║  ██║██╔══██╗
//  ███████╗   ██║   █████╗  ██║     ██║     ███████║██║     ██████╔╝███████║███████║
//  ╚════██║   ██║   ██╔══╝  ██║     ██║     ██╔══██║██║     ██╔═══╝ ██╔══██║██╔══██║
//  ███████║   ██║   ███████╗███████╗███████╗██║  ██║███████╗██║     ██║  ██║██║  ██║
//
//  AionisAgentManager - Autonomous copy-trading via Somnia Agent Platform
//  Chain: Somnia Shannon Testnet (50312)
// ─────────────────────────────────────────────────────────────────────────────

// ── External interfaces ───────────────────────────────────────────────────────

/**
 * @notice Somnia Agent Platform interface.
 * @dev Deployed at 0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776 on Somnia testnet.
 *      createRequest dispatches work to the off-chain agent fleet.
 *      The platform calls callbackContract.callbackSelector(requestId, response)
 *      once the agent finishes.
 */
interface ISomniaAgentPlatform {
    /// @param agentId   1 = JSON API Agent, 2 = LLM Inference Agent
    /// @param data      ABI-encoded agent-specific payload (see encoding helpers below)
    /// @param cbContract Contract to receive the response
    /// @param cbSelector Function selector of the callback (4 bytes)
    /// @return requestId Unique bytes32 handle for this request
    function createRequest(
        uint256 agentId,
        bytes   calldata data,
        address cbContract,
        bytes4  cbSelector
    ) external payable returns (bytes32 requestId);
}

/// @notice Algebra V3 (QuickSwap on Somnia) swap router
interface IAlgebraRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 limitSqrtPrice;
    }
    function exactInputSingle(ExactInputSingleParams calldata params)
        external payable returns (uint256 amountOut);
}

/// @notice Minimal ERC-20 interface
interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @title  AionisAgentManager
 * @author Aionis Team
 * @notice Autonomous copy-trading protocol powered by Somnia's Agent Platform.
 *
 * @dev    Three-agent pipeline:
 *
 *         ┌─────────────────────────────────────────────────────────────────┐
 *         │  1. WATCHER (JSON API Agent, id=1)                              │
 *         │     Polls the Stellalpha off-chain API for the latest swap      │
 *         │     executed by a tracked leader wallet.                        │
 *         │                                                                 │
 *         │  2. STRATEGIST (LLM Inference Agent, id=2)                     │
 *         │     Receives the raw trade + follower risk profile and decides  │
 *         │     how much to copy: 0 (skip) … 100 (full allocation).        │
 *         │                                                                 │
 *         │  3. EXECUTOR (on-chain, this contract)                         │
 *         │     If decision > 0, swaps proportional USDC.e for WSOMI via   │
 *         │     QuickSwap and records the position.                         │
 *         └─────────────────────────────────────────────────────────────────┘
 *
 *         Full flow:
 *           startFollowing() ->> checkLeaderActivity() ->> onWatcherResponse()
 *           ->> onStrategistResponse() ->> executeCopyTrade() ->> emit events
 */
contract AionisAgentManager {

    // ── Constants ─────────────────────────────────────────────────────────────

    /// @notice Somnia Testnet Agent Platform
    address public constant AGENT_PLATFORM =
        0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776;

    uint256 public constant JSON_API_AGENT_ID = 1;   // Watcher
    uint256 public constant LLM_AGENT_ID      = 2;   // Strategist

    /// @notice QuickSwap (Algebra V3) router on Somnia Mainnet
    address public constant QUICKSWAP_ROUTER =
        0x1582f6f3D26658F7208A799Be46e34b1f366CE44;

    /// @notice WSOMI - token0, 18 decimals
    address public constant WSOMI =
        0x046EDe9564A72571df6F5e44d0405360c0f4dCab;

    /// @notice USDC.e (Stargate bridged) - token1, 6 decimals
    address public constant USDCE =
        0x28BEc7E30E6faee657a03e19Bf1128AaD7632A00;

    /// @notice Base URL of the Stellalpha off-chain API used by the Watcher Agent
    string public constant AIONIS_API =
        "https://api.aionis.xyz/v1/leader/";

    /// @dev Maximum age of a trade that the watcher may report (stale-signal guard)
    uint256 public constant MAX_TRADE_AGE = 30 seconds;

    /// @dev Minimum allocation decision (0-100). Below this, the trade is skipped.
    uint8 public constant MIN_EXECUTE_SCORE = 10;

    // ── Agent IDs as named aliases ─────────────────────────────────────────────

    // ── Storage types ─────────────────────────────────────────────────────────

    /// @notice Configuration a follower sets when calling startFollowing()
    struct FollowerProfile {
        address leader;
        /// @dev 1-10: 1 = ultra-conservative, 10 = max risk
        uint8   riskTolerance;
        /// @dev Maximum USDC.e (6 dec) to allocate per trade
        uint256 maxAllocationUsdc;
        /// @dev Cumulative USDC.e deposited by this follower
        uint256 depositedUsdc;
        bool    active;
        uint256 openPositionWsomi; // currently held WSOMI from copy trades
    }

    /// @notice Context stored per in-flight agent request
    struct PendingRequest {
        address follower;
        address leader;
        /// @dev Encoded trade data forwarded from Watcher ->> Strategist
        bytes   tradeData;
        RequestStage stage;
        uint256 createdAt;
    }

    enum RequestStage { NONE, WATCHING, ANALYZING, EXECUTING }

    // ── State ──────────────────────────────────────────────────────────────────

    /// @notice follower ->> FollowerProfile
    mapping(address => FollowerProfile)  public profiles;

    /// @notice requestId ->> PendingRequest
    mapping(bytes32 => PendingRequest)   public pendingRequests;

    /// @notice follower ->> requestId (latest active request)
    mapping(address => bytes32)          public activeRequest;

    // ── Events ─────────────────────────────────────────────────────────────────

    event FollowingStarted(
        address indexed follower,
        address indexed leader,
        uint8   riskTolerance,
        uint256 maxAllocationUsdc
    );

    event FollowingStopped(
        address indexed follower,
        address indexed leader
    );

    event WatcherRequestSent(
        bytes32 indexed requestId,
        address indexed follower,
        address indexed leader
    );

    event WatcherResponseReceived(
        bytes32 indexed requestId,
        address  tokenIn,
        address  tokenOut,
        uint256  amountIn,
        uint256  tradeTimestamp
    );

    event StrategistRequestSent(
        bytes32 indexed requestId,
        address indexed follower,
        string          prompt
    );

    event StrategistResponseReceived(
        bytes32 indexed requestId,
        address indexed follower,
        uint8           copyScore,    // 0-100
        bool            willExecute
    );

    event CopyTradeExecuted(
        address indexed follower,
        address indexed leader,
        uint256         usdcSpent,
        uint256         wsomiReceived,
        uint8           copyScore
    );

    event CopyTradeSkipped(
        address indexed follower,
        address indexed leader,
        uint8           copyScore,
        string          reason
    );

    event FundsDeposited(address indexed follower, uint256 amount);
    event FundsWithdrawn(address indexed follower, uint256 amount);

    // ── Modifiers ──────────────────────────────────────────────────────────────

    /// @dev Only the Somnia Agent Platform may call callback functions
    modifier onlyAgentPlatform() {
        require(msg.sender == AGENT_PLATFORM, "SAM: caller is not agent platform");
        _;
    }

    /// @dev Only the follower themselves may manage their profile
    modifier onlyFollower(address follower) {
        require(msg.sender == follower, "SAM: not your profile");
        _;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  USER-FACING FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Register as a follower and activate your copy-trading agent.
     * @dev    Caller must have approved this contract to transfer `initialDeposit`
     *         of USDC.e before calling.
     *
     * @param leader            The wallet to copy-trade
     * @param riskTolerance     1 (conservative) ->> 10 (aggressive)
     * @param maxAllocationUsdc Max USDC.e per trade (6 decimals, e.g. 100e6 = $100)
     * @param initialDeposit    USDC.e to deposit into the vault now
     */
    function startFollowing(
        address leader,
        uint8   riskTolerance,
        uint256 maxAllocationUsdc,
        uint256 initialDeposit
    ) external {
        require(leader != address(0),    "SAM: invalid leader");
        require(leader != msg.sender,    "SAM: cannot follow yourself");
        require(riskTolerance >= 1 && riskTolerance <= 10, "SAM: risk 1-10");
        require(maxAllocationUsdc > 0,   "SAM: zero allocation");

        if (initialDeposit > 0) {
            require(
                IERC20(USDCE).transferFrom(msg.sender, address(this), initialDeposit),
                "SAM: deposit failed"
            );
            emit FundsDeposited(msg.sender, initialDeposit);
        }

        profiles[msg.sender] = FollowerProfile({
            leader:             leader,
            riskTolerance:      riskTolerance,
            maxAllocationUsdc:  maxAllocationUsdc,
            depositedUsdc:      initialDeposit,
            active:             true,
            openPositionWsomi:  0
        });

        emit FollowingStarted(msg.sender, leader, riskTolerance, maxAllocationUsdc);
    }

    /**
     * @notice Deactivate copy-trading and withdraw all USDC.e.
     */
    function stopFollowing() external {
        FollowerProfile storage p = profiles[msg.sender];
        require(p.active, "SAM: not following");

        p.active = false;
        uint256 balance = p.depositedUsdc;
        p.depositedUsdc = 0;

        if (balance > 0) {
            require(IERC20(USDCE).transfer(msg.sender, balance), "SAM: withdraw failed");
            emit FundsWithdrawn(msg.sender, balance);
        }

        emit FollowingStopped(msg.sender, p.leader);
    }

    /**
     * @notice Top up the vault balance.
     * @param amount USDC.e amount (6 decimals)
     */
    function deposit(uint256 amount) external {
        require(profiles[msg.sender].active, "SAM: start following first");
        require(
            IERC20(USDCE).transferFrom(msg.sender, address(this), amount),
            "SAM: deposit failed"
        );
        profiles[msg.sender].depositedUsdc += amount;
        emit FundsDeposited(msg.sender, amount);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  AGENT PIPELINE - STEP 1: WATCHER (JSON API Agent)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Kick off the agent pipeline for a follower.
     * @dev    Anyone can call this for any active follower (acts as a keeper).
     *         Dispatches a JSON API request to the Stellalpha off-chain API asking
     *         for the leader's latest swap.
     *
     *         Request data format for JSON API Agent:
     *           abi.encode(url, jsonPath)
     *         The agent fetches the URL and extracts the value at jsonPath.
     *
     * @param follower The follower to check on behalf of
     */
    function checkLeaderActivity(address follower) external payable {
        FollowerProfile storage p = profiles[follower];
        require(p.active,  "SAM: follower inactive");
        require(
            activeRequest[follower] == bytes32(0),
            "SAM: request already in flight"
        );

        // Construct the API URL: GET /v1/leader/{address}/latest-swap
        string memory url = string.concat(AIONIS_API, _toHexString(p.leader), "/latest-swap");

        // JSON path to extract from the response (dot-notation)
        // The API returns: { tokenIn, tokenOut, amountIn, amountOut, timestamp }
        string memory jsonPath = "$.swap";

        bytes memory requestData = abi.encode(url, jsonPath);

        bytes32 requestId = ISomniaAgentPlatform(AGENT_PLATFORM).createRequest{value: msg.value}(
            JSON_API_AGENT_ID,
            requestData,
            address(this),
            this.onWatcherResponse.selector
        );

        pendingRequests[requestId] = PendingRequest({
            follower:   follower,
            leader:     p.leader,
            tradeData:  "",
            stage:      RequestStage.WATCHING,
            createdAt:  block.timestamp
        });

        activeRequest[follower] = requestId;

        emit WatcherRequestSent(requestId, follower, p.leader);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  AGENT PIPELINE - STEP 2: WATCHER CALLBACK ->> trigger STRATEGIST
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Callback invoked by the Somnia Agent Platform after the JSON API
     *         Watcher Agent fetches the leader's latest trade.
     *
     * @dev    Response is ABI-encoded:
     *           (address tokenIn, address tokenOut, uint256 amountIn,
     *            uint256 amountOut, uint256 tradeTimestamp)
     *
     * @param requestId Matches the requestId from checkLeaderActivity()
     * @param response  ABI-encoded trade data from the Watcher Agent
     */
    function onWatcherResponse(
        bytes32 requestId,
        bytes calldata response
    ) external onlyAgentPlatform {
        PendingRequest storage req = pendingRequests[requestId];
        require(req.stage == RequestStage.WATCHING, "SAM: unexpected watcher cb");

        (
            address tokenIn,
            address tokenOut,
            uint256 amountIn,
            uint256 amountOut,
            uint256 tradeTimestamp
        ) = abi.decode(response, (address, address, uint256, uint256, uint256));

        emit WatcherResponseReceived(requestId, tokenIn, tokenOut, amountIn, tradeTimestamp);

        // ── Stale-signal guard ────────────────────────────────────────────────
        if (block.timestamp - tradeTimestamp > MAX_TRADE_AGE) {
            emit CopyTradeSkipped(req.follower, req.leader, 0, "stale signal");
            _clearRequest(requestId, req.follower);
            return;
        }

        // ── Only copy WSOMI/USDC.e trades (this pool) ─────────────────────────
        bool isRelevantPair = (tokenIn == USDCE && tokenOut == WSOMI)
                           || (tokenIn == WSOMI && tokenOut == USDCE);
        if (!isRelevantPair) {
            emit CopyTradeSkipped(req.follower, req.leader, 0, "irrelevant pair");
            _clearRequest(requestId, req.follower);
            return;
        }

        // Persist trade data for the Strategist
        req.tradeData = response;
        req.stage     = RequestStage.ANALYZING;

        // ── Dispatch to LLM Strategist ────────────────────────────────────────
        _requestTradeAnalysis(requestId, req.follower, req.leader, tokenIn, amountIn, tradeTimestamp);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  AGENT PIPELINE - STEP 3: STRATEGIST (LLM Inference Agent)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @dev    Constructs a natural-language prompt for the LLM Agent and dispatches it.
     *         The LLM is constrained to respond with a single integer 0-100:
     *           0  = skip entirely
     *           1-99 = copy with that percentage of maxAllocation
     *           100 = copy with full maxAllocation
     */
    function _requestTradeAnalysis(
        bytes32 requestId,
        address follower,
        address leader,
        address tokenIn,
        uint256 amountIn,
        uint256 tradeTimestamp
    ) internal {
        FollowerProfile storage p = profiles[follower];

        string memory isBuy  = (tokenIn == USDCE) ? "BUY" : "SELL";
        string memory prompt = string.concat(
            "You are a copy-trading risk engine. Respond with ONLY a single integer 0-100. ",
            "0 = skip, 1-100 = copy percentage of max allocation.\n\n",
            "Leader: ", _toHexString(leader), "\n",
            "Trade: ", isBuy, " WSOMI\n",
            "AmountIn: ", _uint2str(amountIn / 1e6), " USDC (approx)\n",
            "Trade age: ", _uint2str(block.timestamp - tradeTimestamp), "s\n",
            "Follower riskTolerance: ", _uint2str(p.riskTolerance), "/10\n",
            "Follower maxAllocation: $", _uint2str(p.maxAllocationUsdc / 1e6), "\n",
            "Follower USDC balance: $", _uint2str(p.depositedUsdc / 1e6), "\n\n",
            "Rules: riskTolerance 1-3 ->> max 40 score. ",
            "riskTolerance 7-10 ->> can return up to 100. ",
            "SELL trades should return 0 unless riskTolerance>=8. ",
            "Respond with integer only."
        );

        bytes memory llmRequest = abi.encode(prompt);

        ISomniaAgentPlatform(AGENT_PLATFORM).createRequest(
            LLM_AGENT_ID,
            llmRequest,
            address(this),
            this.onStrategistResponse.selector
        );

        emit StrategistRequestSent(requestId, follower, prompt);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  AGENT PIPELINE - STEP 4: STRATEGIST CALLBACK ->> execute or skip
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @notice Callback invoked by the Somnia Agent Platform after the LLM
     *         Strategist Agent has evaluated the trade.
     *
     * @dev    Response is ABI-encoded uint8 in range 0-100.
     *           0          ->> skip
     *           1-99       ->> copy at that % of maxAllocation
     *           100        ->> full allocation
     *
     * @param requestId Matches a pending request in ANALYZING stage
     * @param response  ABI-encoded uint8 copy score from the LLM
     */
    function onStrategistResponse(
        bytes32 requestId,
        bytes calldata response
    ) external onlyAgentPlatform {
        PendingRequest storage req = pendingRequests[requestId];
        require(req.stage == RequestStage.ANALYZING, "SAM: unexpected strategist cb");

        uint8 copyScore = abi.decode(response, (uint8));
        // Clamp to 0-100 defensively
        if (copyScore > 100) copyScore = 100;

        bool willExecute = copyScore >= MIN_EXECUTE_SCORE;
        emit StrategistResponseReceived(requestId, req.follower, copyScore, willExecute);

        if (!willExecute) {
            emit CopyTradeSkipped(req.follower, req.leader, copyScore, "score below threshold");
            _clearRequest(requestId, req.follower);
            return;
        }

        req.stage = RequestStage.EXECUTING;
        _executeCopyTrade(requestId, copyScore);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  AGENT PIPELINE - STEP 5: ON-CHAIN EXECUTOR
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * @dev    Executes a proportional USDC.e ->> WSOMI swap on QuickSwap.
     *         Amount = (copyScore / 100) × min(maxAllocation, depositedUsdc)
     *
     * @param requestId Pending request in EXECUTING stage
     * @param copyScore LLM-determined allocation percentage 0-100
     */
    function _executeCopyTrade(bytes32 requestId, uint8 copyScore) internal {
        PendingRequest storage req  = pendingRequests[requestId];
        FollowerProfile  storage p   = profiles[req.follower];

        // ── Compute spend amount ──────────────────────────────────────────────
        uint256 maxSpend   = p.maxAllocationUsdc < p.depositedUsdc
                             ? p.maxAllocationUsdc
                             : p.depositedUsdc;
        uint256 spendUsdc  = (maxSpend * copyScore) / 100;

        if (spendUsdc == 0 || p.depositedUsdc < spendUsdc) {
            emit CopyTradeSkipped(req.follower, req.leader, copyScore, "insufficient balance");
            _clearRequest(requestId, req.follower);
            return;
        }

        // ── Debit vault ───────────────────────────────────────────────────────
        p.depositedUsdc -= spendUsdc;

        // ── Approve router ────────────────────────────────────────────────────
        require(
            IERC20(USDCE).approve(QUICKSWAP_ROUTER, spendUsdc),
            "SAM: approve failed"
        );

        // ── Execute swap via Algebra V3 (QuickSwap) ───────────────────────────
        IAlgebraRouter.ExactInputSingleParams memory params = IAlgebraRouter.ExactInputSingleParams({
            tokenIn:          USDCE,
            tokenOut:         WSOMI,
            recipient:        req.follower,   // WSOMI goes directly to follower wallet
            deadline:         block.timestamp + 60,
            amountIn:         spendUsdc,
            amountOutMinimum: 0,              // TODO: integrate slippage oracle for production
            limitSqrtPrice:   0
        });

        uint256 wsomiReceived = IAlgebraRouter(QUICKSWAP_ROUTER).exactInputSingle(params);

        // ── Update position tracking ──────────────────────────────────────────
        p.openPositionWsomi += wsomiReceived;

        emit CopyTradeExecuted(req.follower, req.leader, spendUsdc, wsomiReceived, copyScore);

        _clearRequest(requestId, req.follower);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  VIEW FUNCTIONS
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Get the full profile for a follower
    function getProfile(address follower)
        external view
        returns (FollowerProfile memory)
    {
        return profiles[follower];
    }

    /// @notice Get the stage of the latest in-flight request for a follower
    function getRequestStage(address follower)
        external view
        returns (RequestStage stage, bytes32 requestId)
    {
        requestId = activeRequest[follower];
        if (requestId == bytes32(0)) return (RequestStage.NONE, bytes32(0));
        stage = pendingRequests[requestId].stage;
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  INTERNAL HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    function _clearRequest(bytes32 requestId, address follower) internal {
        delete pendingRequests[requestId];
        delete activeRequest[follower];
    }

    function _toHexString(address addr) internal pure returns (string memory) {
        bytes memory b    = abi.encodePacked(addr);
        bytes memory hex_ = "0123456789abcdef";
        bytes memory str  = new bytes(42);
        str[0] = "0"; str[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2]     = hex_[uint8(b[i]) >> 4];
            str[3 + i * 2]     = hex_[uint8(b[i]) & 0x0f];
        }
        return string(str);
    }

    function _uint2str(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 j = v; uint256 len;
        while (j != 0) { len++; j /= 10; }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (v != 0) { k--; bstr[k] = bytes1(uint8(48 + v % 10)); v /= 10; }
        return string(bstr);
    }

    /// @dev Accept STT for agent platform fees
    receive() external payable {}
}
