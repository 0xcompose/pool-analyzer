import { ChainClientService, UniswapV3PoolContract, UniswapV3TickService } from "../index.js"
import { DummyChainClientConfigService } from "../services/DummyChainClientConfigService.js"

/**
 * Example demonstrating direct usage of UniswapV3TickService
 */
async function tickServiceExample() {
	try {
		// Initialize chain client
		const clientConfig = new DummyChainClientConfigService()
		const chainClient = new ChainClientService(clientConfig)

		// Example: USDC/ETH 0.3% pool on Ethereum
		const poolAddress = "0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640"

		// Create pool contract
		const poolContract = new UniswapV3PoolContract(chainClient, poolAddress as `0x${string}`, 1)

		// Create tick service
		const tickService = new UniswapV3TickService(poolContract)

		console.log("Fetching basic pool info...")

		// Get basic pool information
		const [slot0, fee, tickSpacing, token0, token1] = await Promise.all([
			poolContract.slot0(),
			poolContract.fee(),
			poolContract.tickSpacing(),
			poolContract.token0(),
			poolContract.token1(),
		])

		console.log("Pool Info:", {
			address: poolAddress,
			token0,
			token1,
			fee: Number(fee),
			tickSpacing: Number(tickSpacing),
			currentTick: slot0.tick,
			sqrtPriceX96: slot0.sqrtPriceX96.toString(),
		})

		console.log("Fetching all ticks efficiently...")

		// Get all ticks using the efficient bitmap approach
		const allTicks = await tickService.getAllTicks()

		console.log("Tick Analysis:", {
			totalTicks: allTicks.length,
			ticksWithLiquidity: allTicks.filter((tick) => tick.liquidityGross > 0n).length,
			ticksWithNetLiquidity: allTicks.filter((tick) => tick.liquidityNet !== 0n).length,
			tickRange:
				allTicks.length > 0
					? {
							min: Math.min(...allTicks.map((t) => t.index)),
							max: Math.max(...allTicks.map((t) => t.index)),
						}
					: null,
			currentTickInRange: allTicks.some((tick) => tick.index === slot0.tick),
		})

		// Show some sample tick data
		if (allTicks.length > 0) {
			console.log("Sample tick data (first 3 ticks):")
			allTicks.slice(0, 3).forEach((tick) => {
				console.log(`  Tick ${tick.index}:`, {
					liquidityGross: tick.liquidityGross.toString(),
					liquidityNet: tick.liquidityNet.toString(),
					initialized: tick.initialized,
				})
			})
		}
	} catch (error) {
		console.error("Error:", error)
	}
}

// Run the example
if (require.main === module) {
	tickServiceExample().catch(console.error)
}
