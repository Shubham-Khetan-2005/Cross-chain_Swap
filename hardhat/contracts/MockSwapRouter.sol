// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/ISwapRouter.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockSwapRouter is ISwapRouter {
    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut) {
        // For tests: transfer amountIn of tokenOut from this contract to recipient
        uint256 amt = params.amountIn;
        bool ok = IERC20(params.tokenOut).transfer(params.recipient, amt);
        require(ok, "MockRouter: transfer failed");
        amountOut = amt;
    }
}
