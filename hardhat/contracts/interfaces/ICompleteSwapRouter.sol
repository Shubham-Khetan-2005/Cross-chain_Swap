// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./ISwapRouter.sol";

// This interface extends the basic ISwapRouter with all the payable and utility functions we need.
interface ICompleteSwapRouter is ISwapRouter {
    function unwrapWETH9(uint256 amountMinimum, address recipient) external payable;
    function refundETH() external payable;
    function multicall(bytes[] calldata data) external payable returns (bytes[] memory results);
}