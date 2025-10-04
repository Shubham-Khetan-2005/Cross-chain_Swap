// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

contract SwapExecutor is ReentrancyGuard {
    address public owner;
    ISwapRouter public immutable swapRouter;

    event SwapExecuted(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint256 amountOut,
        uint256 timestamp,
        bytes extra
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    constructor(address _swapRouter) {
        owner = msg.sender;
        swapRouter = ISwapRouter(_swapRouter);
    }

    function swapExactInputSingle(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        uint256 amountIn,
        uint256 amountOutMin,
        uint256 deadline,
        uint160 sqrtPriceLimitX96,
        bytes calldata extra
    ) external nonReentrant returns (uint256 amountOut) {
        require(deadline >= block.timestamp, "deadline passed");

        // Pull tokens from user
        require(IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn), "transferFrom failed");

        // Approve router
        require(IERC20(tokenIn).approve(address(swapRouter), amountIn), "approve failed");

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: fee,
            recipient: msg.sender,
            deadline: deadline,
            amountIn: amountIn,
            amountOutMinimum: amountOutMin,
            sqrtPriceLimitX96: sqrtPriceLimitX96
        });

        amountOut = swapRouter.exactInputSingle(params);

        emit SwapExecuted(msg.sender, tokenIn, tokenOut, fee, amountIn, amountOut, block.timestamp, extra);
    }

    function rescueERC20(address token, address to) external onlyOwner {
        uint256 bal = IERC20(token).balanceOf(address(this));
        if (bal > 0) {
            require(IERC20(token).transfer(to, bal), "rescue transfer failed");
        }
    }
}
