// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.19;

// import "./SwapExecutor.sol";
// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// contract SwapTester {
//     address public owner;
//     SwapExecutor public swapExecutor;
//     IERC20 public weth;

//     event TestSwapResult(bool success, string message);

//     constructor(address _swapExecutorAddress, address _wethAddress) {
//         owner = msg.sender;
//         swapExecutor = SwapExecutor(_swapExecutorAddress);
//         weth = IERC20(_wethAddress);
//     }

//     // Function to receive WETH from our script
//     receive() external payable {}

//     function executeTestSwap(
//         address tokenOut,
//         uint24 fee,
//         uint256 amountIn,
//         uint256 amountOutMin
//     ) external {
//         require(msg.sender == owner, "Only owner can run test");

//         weth.approve(address(swapExecutor), amountIn);

//         // --- THE FIX: Call the function with the correct 5 arguments ---
//         try swapExecutor.swapExactInputSingle(
//             address(weth),
//             tokenOut,
//             fee,
//             amountIn,
//             amountOutMin
//         ) returns (uint256 amountOut) {
//             emit TestSwapResult(true, "Swap successful!");
//         } catch (bytes memory reason) {
//             emit TestSwapResult(false, string(reason));
//         }
//     }
// }