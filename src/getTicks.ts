import { ChainClientService, Token } from "@spread-solvers/evm-toolchain"
import Table from "cli-table3"
import { Address } from "viem"

import { createLiquidityCharts } from "./format/charts"
import { TickRetrievalResult, TickUtils } from "./pools/TickUtils"
import { PoolUtils } from "./pools/UniV3/PoolUtils"
import { UniV3Pool } from "./pools/UniV3/UniV3Pool"
import { DummyChainClientConfigService } from "./services/DummyChainClientConfigService"
import { PriceUtils } from "./utils/priceUtils"

/* ====== CONSTANTS ====== */

const BATCH_SIZE = 10
const BATCH_DELAY_MS = 100

/* ====== TYPES ====== */

/**
 * Configuration for tick retrieval
 */
export interface TickRetrievalConfig {
	poolAddress: Address
	chainId: number
	tickCount: number
}

/**
 * Price calculation result for a specific tick
 */
export interface TickPriceResult {
	priceInToken0: number // Price of token1 in terms of token0
	priceInToken1: number // Price of token0 in terms of token1
}

/* ====== FORMATTING FUNCTIONS ====== */

/**
 * Formats tick data for display using cli-table3
 * @param result - The tick retrieval result
 * @param pool - The UniV3Pool instance to get token information
 * @returns Formatted string with tick data table
 */
export function formatTickData(result: TickRetrievalResult, pool: UniV3Pool, quoteInZeroToken: boolean): string {
	const { currentTick, tickSpacing, totalTicksRetrieved, ticks } = result

	const [baseToken, quoteToken] = quoteInZeroToken ? [pool.token1, pool.token0] : [pool.token0, pool.token1]

	// Create summary
	let output = `\n=== Tick Data Summary ===\n`
	output += `Current Tick: ${currentTick}\n`
	output += `Tick Spacing: ${tickSpacing}\n`
	output += `Total Ticks Retrieved: ${totalTicksRetrieved}\n`
	output += `Base Token: ${baseToken.symbol} (${baseToken.decimals} decimals)\n`
	output += `Quote Token: ${quoteToken.symbol} (${quoteToken.decimals} decimals)\n\n`

	// Create table
	const table = new Table({
		head: [
			"Tick Index",
			"Initialized",
			"Liquidity Gross",
			"Liquidity Net",
			`${baseToken.symbol}/${quoteToken.symbol}`,
		],
		colWidths: [12, 14, 18, 18, 16],
		style: {
			head: ["cyan"],
			border: ["gray"],
		},
	})

	// Add data rows
	ticks.forEach((tick) => {
		const initialized = tick.initialized ? "✓" : "✗"
		const liquidityGross = PriceUtils.formatLargeNumber(tick.liquidityGross)
		const liquidityNet = PriceUtils.formatLargeNumber(tick.liquidityNet)

		const [token0Decimals, token1Decimals] = quoteInZeroToken
			? [quoteToken.decimals, baseToken.decimals]
			: [baseToken.decimals, quoteToken.decimals]

		const price = PriceUtils.tickToPriceInQuoteTokens(
			tick.tickIndex,
			token0Decimals,
			token1Decimals,
			quoteInZeroToken,
		)

		const formattedPrice = PriceUtils.formatPrice(price, 6)

		table.push([tick.tickIndex.toString(), initialized, liquidityGross, liquidityNet, formattedPrice])
	})

	return output + table.toString()
}

/**
 * Calculate prices for a specific tick
 * @param tickIndex - The tick index
 * @param pool - The UniV3Pool instance to get token decimals
 * @returns Object with priceInToken0 and priceInToken1
 */
export function calculateTickPrices(tickIndex: number, pool: any) {
	const rawPrice = PriceUtils.tickToPrice(tickIndex)
	// For USDC/WETH: rawPrice is token1/token0 ratio
	// To get actual price, we need to adjust for decimal differences
	// priceInToken0 = rawPrice / 10^(token1Decimals - token0Decimals)
	const priceInToken0 = rawPrice / Math.pow(10, pool.token1.decimals - pool.token0.decimals)
	const priceInToken1 = 1 / priceInToken0

	return {
		priceInToken0,
		priceInToken1,
	}
}

const COMMON_QUOTE_TOKEN_SYMBOLS = ["USDC", "USDT", "DAI", "USDE", "USDC.e"]

function isCommonQuoteToken(token: Token): boolean {
	return COMMON_QUOTE_TOKEN_SYMBOLS.map((token) => token.toLowerCase()).includes(token.symbol.toLowerCase())
}

/**
 * Example usage function
 */
export async function main() {
	// Example configuration - replace with actual values
	const config: TickRetrievalConfig = {
		poolAddress: "0x99ac8cA7087fA4A2A1FB6357269965A2014ABc35",
		chainId: 1, // Ethereum mainnet
		tickCount: 100,
	}

	// You would need to initialize your ChainClientService here
	const chainClient = new ChainClientService(new DummyChainClientConfigService())

	try {
		const pool = await PoolUtils.getUniV3Pool(config.poolAddress, config.chainId, chainClient)
		const quoteInZeroToken = isCommonQuoteToken(pool.token0)

		console.log("Quote In Zero Token", quoteInZeroToken)

		const result = await TickUtils.getTicksAroundCurrentTick(pool, config.tickCount, BATCH_SIZE, BATCH_DELAY_MS)
		console.log(formatTickData(result, result.pool, quoteInZeroToken))

		// Get current liquidity from the pool to use as base for calculations
		const currentLiquidity = await result.pool.liquidity()
		const slot0 = await result.pool.slot0()
		const currentTick = Number(slot0.tick)

		// Display original liquidity charts
		console.log(await createLiquidityCharts(currentTick, currentLiquidity, result, quoteInZeroToken)) // true = reversed direction
	} catch (error) {
		console.error("Error retrieving ticks:", error)
	}
}

/* ====== MAIN EXECUTION ====== */

if (require.main === module) {
	// First test the tick alignment logic
	console.log("\n" + "=".repeat(50) + "\n")

	// Then run
	main()
}
