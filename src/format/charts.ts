import { TokenId } from "@spread-solvers/evm-toolchain"
import { TickRetrievalResult, TickUtils } from "../pools/TickUtils"
import { PriceUtils } from "../utils/priceUtils"

// Import asciichart with any type to avoid TypeScript errors
const asciichart = require("asciichart")

/**
 * Creates ASCII charts for liquidity visualization
 * @param currentTick - The current tick index
 * @param currentTickLiquidity - The current tick liquidity amount
 * @param result - The tick retrieval result
 * @param reverseDirection - default price is token1/token0 ration, this flag flips it to token0/token1 ratio. Affects graphs
 * @returns Formatted string with charts
 */
export async function createLiquidityCharts(
	currentTick: number,
	currentTickLiquidity: bigint,
	result: TickRetrievalResult,
	quoteTokenId: TokenId,
): Promise<string> {
	const { ticks, pool } = result
	const [baseToken, quoteToken] =
		pool.token0.id === quoteTokenId ? [pool.token1, pool.token0] : [pool.token0, pool.token1]

	const token0IsQuoteToken = pool.token0.id === quoteTokenId

	// Calculate actual liquidity at each tick by working from current tick in both directions
	const liquidityPoints: number[] = []

	// Find the closest tick to current tick (current tick is always empty in UniV3)
	const closestTickIndex = TickUtils.findClosestTickIndex(ticks, currentTick)
	const closestTick = ticks[closestTickIndex]

	console.log(
		`Using closest tick ${closestTick.tickIndex} (distance: ${Math.abs(closestTick.tickIndex - currentTick)}) as reference for current tick ${currentTick}`,
	)

	// Initialize liquidity points array
	for (let i = 0; i < ticks.length; i++) {
		liquidityPoints.push(0)
	}

	// Set the closest tick liquidity as our reference point
	liquidityPoints[closestTickIndex] = Number(currentTickLiquidity)

	// Calculate liquidity going DOWN from closest tick (towards lower ticks)
	let runningLiquidity = Number(currentTickLiquidity)
	for (let i = closestTickIndex - 1; i >= 0; i--) {
		// When going down, we subtract the liquidity net (because we're moving away from the tick)
		runningLiquidity -= Number(ticks[i].liquidityNet)
		liquidityPoints[i] = runningLiquidity
	}

	// Calculate liquidity going UP from closest tick (towards higher ticks)
	runningLiquidity = Number(currentTickLiquidity)
	for (let i = closestTickIndex + 1; i < ticks.length; i++) {
		// When going up, we add the liquidity net (because we're moving towards the tick)
		runningLiquidity += Number(ticks[i].liquidityNet)
		liquidityPoints[i] = runningLiquidity
	}

	// Extract other data for charts
	const liquidityGross = ticks.map((tick) => Number(tick.liquidityGross))
	const liquidityNet = ticks.map((tick) => Number(tick.liquidityNet))

	// Filter out zero values for better visualization
	const nonZeroGross = liquidityGross.filter((val) => val > 0)
	const nonZeroNet = liquidityNet.filter((val) => val !== 0)

	let output = `\n=== Liquidity Charts ===\n\n`

	// Chart 1: Actual Liquidity Distribution (calculated from liquidity + net changes)
	if (liquidityPoints.length > 0) {
		const minLiquidity = Math.min(...liquidityPoints)
		const maxLiquidity = Math.max(...liquidityPoints)

		output += `📊 Actual Liquidity Distribution (Current Tick: ${currentTick}, Reference: ${closestTick.tickIndex}, Base: ${PriceUtils.formatLargeNumber(currentTickLiquidity)})\n`
		output += `Range: ${minLiquidity.toExponential(2)} to ${maxLiquidity.toExponential(2)}\n`
		output += `Direction: "Left = Lower ${baseToken.symbol} Price, Right = Higher ${baseToken.symbol} Price" : "Left = Higher ${quoteToken.symbol} Price, Right = Lower ${quoteToken.symbol} Price"\n`

		if (!token0IsQuoteToken) liquidityPoints.reverse()

		output += asciichart.plot(liquidityPoints, {
			height: 12,
			colors: [asciichart.blue],
			format: (value: number) => value.toExponential(2),
		})
		output += `\n\n`
	}

	// Chart 2: Liquidity Gross (only non-zero values)
	if (nonZeroGross.length > 0) {
		output += `📈 Liquidity Gross Distribution (Non-Zero Values)\n`
		output += `Range: ${Math.min(...nonZeroGross).toExponential(2)} to ${Math.max(...nonZeroGross).toExponential(2)}\n`
		output += asciichart.plot(nonZeroGross, {
			height: 10,
			colors: [asciichart.green],
			format: (value: number) => value.toExponential(2),
		})
		output += `\n\n`
	}

	// Chart 3: Liquidity Net Changes (positive and negative values)
	if (nonZeroNet.length > 0) {
		output += `📉 Liquidity Net Changes (Positive = Add, Negative = Remove)\n`
		output += `Range: ${Math.min(...nonZeroNet).toExponential(2)} to ${Math.max(...nonZeroNet).toExponential(2)}\n`
		output += asciichart.plot(nonZeroNet, {
			height: 8,
			colors: [asciichart.red],
			format: (value: number) => value.toExponential(2),
		})
		output += `\n\n`
	}

	// Chart 4: Price progression
	const prices = ticks.map((tick) => {
		let rawPrice = PriceUtils.tickToPrice(tick.tickIndex)
		const baseTokenPriceInQuoteTokens = rawPrice / Math.pow(10, quoteToken.decimals - baseToken.decimals)
		return baseTokenPriceInQuoteTokens
	})

	output += `💰 Price Progression (${baseToken.symbol}/${quoteToken.symbol})\n`
	output += `Range: ${Math.min(...prices).toFixed(6)} to ${Math.max(...prices).toFixed(6)}\n`
	output += asciichart.plot(prices, {
		height: 8,
		colors: [asciichart.yellow],
		format: (value: number) => value.toFixed(6),
	})

	return output
}
