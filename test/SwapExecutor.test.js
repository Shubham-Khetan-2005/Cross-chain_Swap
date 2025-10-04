const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SwapExecutor (unit)", function () {
  let tokenA, tokenB, mockRouter, swapExecutor;
  let owner, user;

  beforeEach(async () => {
    [owner, user] = await ethers.getSigners();

    const TestToken = await ethers.getContractFactory("TestToken");
    tokenA = await TestToken.deploy("TokenA", "TKA");
    // wait for deployment if available (compat safety)
    if (tokenA.waitForDeployment) await tokenA.waitForDeployment();

    tokenB = await TestToken.deploy("TokenB", "TKB");
    if (tokenB.waitForDeployment) await tokenB.waitForDeployment();

    const MockSwapRouter = await ethers.getContractFactory("MockSwapRouter");
    mockRouter = await MockSwapRouter.deploy();
    if (mockRouter.waitForDeployment) await mockRouter.waitForDeployment();

    const SwapExecutor = await ethers.getContractFactory("SwapExecutor");
    swapExecutor = await SwapExecutor.deploy(mockRouter.target || mockRouter.address);
    if (swapExecutor.waitForDeployment) await swapExecutor.waitForDeployment();

    // Mint tokens to user and fund mockRouter with tokenB
    const mintAmount = ethers.parseUnits("1000", 18);
    await tokenA.mint(user.address, mintAmount);
    await tokenB.mint(mockRouter.target || mockRouter.address, mintAmount);
  });

  it("executes swapExactInputSingle and emits SwapExecuted", async function () {
    const amountIn = ethers.parseUnits("10", 18);
    const fee = 3000; // Uniswap V3 pool fee tier (for test mock it's unused)
    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

    // Approve SwapExecutor to pull tokenA from user
    const executorAddress = swapExecutor.target || swapExecutor.address;
    await tokenA.connect(user).approve(executorAddress, amountIn);

    // Call swapExactInputSingle with full parameter list
    const tx = await swapExecutor.connect(user).swapExactInputSingle(
      tokenA.target || tokenA.address,        // tokenIn
      tokenB.target || tokenB.address,        // tokenOut
      fee,                                    // fee
      amountIn,                               // amountIn
      0,                                      // amountOutMin (no slippage constraint for mock)
      deadline,                               // deadline
      0,                                      // sqrtPriceLimitX96
      "0x"                                    // extra (bytes)
    );

    // Wait for receipt
    const receipt = await tx.wait();

    // Parse logs for SwapExecuted event using contract interface
    const parsedEvents = receipt.logs
      .map((log) => {
        try {
          return swapExecutor.interface.parseLog(log);
        } catch (err) {
          return null;
        }
      })
      .filter((p) => p && p.name === "SwapExecuted");

    expect(parsedEvents.length).to.equal(1);
    const evtArgs = parsedEvents[0].args;

    // Some sanity checks
    expect(evtArgs.user).to.equal(user.address);
    expect(evtArgs.tokenIn).to.equal(tokenA.target || tokenA.address);
    expect(evtArgs.tokenOut).to.equal(tokenB.target || tokenB.address);
    expect(evtArgs.amountIn).to.equal(amountIn);

    // MockRouter transfers tokenOut (1:1 for our mock) so user should now have tokenB equal to amountIn
    const userBal = await tokenB.balanceOf(user.address);
    expect(userBal).to.equal(amountIn);
  });
});
