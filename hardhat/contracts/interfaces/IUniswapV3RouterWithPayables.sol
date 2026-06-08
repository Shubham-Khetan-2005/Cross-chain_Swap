// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ISwapRouter.sol";

// This interface extends the basic ISwapRouter with the payable functions we need
interface IUniswapV3RouterWithPayables is ISwapRouter {
    function unwrapWETH9(uint256 amountMinimum, address recipient) external payable;

    function refundETH() external payable;

    function multicall(bytes[] calldata data) external payable returns (bytes[] memory results);
}