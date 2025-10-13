import { Token } from "@spread-solvers/evm-toolchain"
import * as asciichart from "asciichart"
import { TickDataWithIndex, TickRetrievalResult, TickUtils } from "../pools/TickUtils"
import { PriceUtils } from "../utils/priceUtils"

/**
 * Calculate actual liquidity distribution across ticks
 */
function calculateLiquidityDistribution(
	ticks: any[],
	currentTick: number,
	currentTickLiquidity: bigint,
): { liquidityPoints: number[]; closestTickIndex: number; closestTick: any } {
	const liquidityPoints: number[] = Array(ticks.length).fill(0)

	// Find the closest tick to current tick
	const closestTickIndex = TickUtils.findClosestTickIndex(ticks, currentTick)
	const closestTick = ticks[closestTickIndex]

	console.log(
		`Using closest tick ${closestTick.tickIndex} (distance: ${Math.abs(closestTick.tickIndex - currentTick)}) as reference for current tick ${currentTick}`,
	)

	// Set the closest tick liquidity as our reference point
	liquidityPoints[closestTickIndex] = Number(currentTickLiquidity)

	// Calculate liquidity going DOWN from closest tick
	let runningLiquidity = Number(currentTickLiquidity)

	for (let i = closestTickIndex - 1; i >= 0; i--) {
		runningLiquidity -= Number(ticks[i].liquidityNet)
		liquidityPoints[i] = runningLiquidity
	}

	// Calculate liquidity going UP from closest tick
	runningLiquidity = Number(currentTickLiquidity)
	for (let i = closestTickIndex + 1; i < ticks.length; i++) {
		runningLiquidity += Number(ticks[i].liquidityNet)
		liquidityPoints[i] = runningLiquidity
	}

	return { liquidityPoints, closestTickIndex, closestTick }
}

/**
 * Create actual liquidity distribution chart
 */
function createLiquidityDistributionChart(
	liquidityPoints: number[],
	currentTick: number,
	closestTick: any,
	currentTickLiquidity: bigint,
	baseToken: any,
	quoteToken: any,
	quoteInZeroToken: boolean,
): string {
	if (liquidityPoints.length === 0) return ""

	const minLiquidity = Math.min(...liquidityPoints)
	const maxLiquidity = Math.max(...liquidityPoints)

	let output = `📊 Actual Liquidity Distribution (Current Tick: ${currentTick}, Reference: ${closestTick.tickIndex}, Base: ${PriceUtils.formatLargeNumber(currentTickLiquidity)})\n`
	output += `Range: ${minLiquidity.toExponential(2)} to ${maxLiquidity.toExponential(2)}\n`
	output += `Direction: "Left = Lower ${baseToken.symbol} Price, Right = Higher ${baseToken.symbol} Price" : "Left = Higher ${quoteToken.symbol} Price, Right = Lower ${quoteToken.symbol} Price"\n`

	const chartData = quoteInZeroToken ? liquidityPoints : [...liquidityPoints].reverse()

	output += asciichart.plot(chartData, {
		height: 12,
		colors: [asciichart.blue],
		format: (value: number) => value.toExponential(2),
	})

	return output + `\n\n`
}

/**
 * Create liquidity gross distribution chart
 */
function createLiquidityGrossChart(ticks: any[]): string {
	const liquidityGross = ticks.map((tick) => Number(tick.liquidityGross))
	const nonZeroGross = liquidityGross.filter((val) => val > 0)

	if (nonZeroGross.length === 0) return ""

	let output = `📈 Liquidity Gross Distribution (Non-Zero Values)\n`
	output += `Range: ${Math.min(...nonZeroGross).toExponential(2)} to ${Math.max(...nonZeroGross).toExponential(2)}\n`
	output += asciichart.plot(nonZeroGross, {
		height: 10,
		colors: [asciichart.green],
		format: (value: number) => value.toExponential(2),
	})

	return output + `\n\n`
}

/**
 * Create liquidity net changes chart
 */
function createLiquidityNetChart(ticks: any[], chartHeight: number = 8): string {
	const displayDigits = 2
	const liquidityNet = ticks.map((tick) => Number(tick.liquidityNet))
	const nonZeroNet = liquidityNet.filter((val) => val !== 0)

	if (nonZeroNet.length === 0) return ""

	let output = `📉 Liquidity Net Changes (Positive = Add, Negative = Remove)\n`

	output += `Range: ${Math.min(...nonZeroNet).toExponential(displayDigits)} to ${Math.max(...nonZeroNet).toExponential(displayDigits)}\n`

	output += asciichart.plot(nonZeroNet, {
		height: chartHeight,
		colors: [asciichart.red],
		format: (value: number) => value.toExponential(displayDigits),
	})

	return output + `\n\n`
}

/**
 * Create price progression chart
 */
function createPriceProgressionChart(
	ticks: TickDataWithIndex[],
	baseToken: Token,
	quoteToken: Token,
	zeroTokenIsQuoteToken: boolean,
	displayDigits: number = 6,
	chartHeight: number = 8,
): string {
	const prices = ticks.map((tick) => {
		const [token0Decimals, token1Decimals] = zeroTokenIsQuoteToken
			? [quoteToken.decimals, baseToken.decimals]
			: [baseToken.decimals, quoteToken.decimals]

		return PriceUtils.tickToPriceInQuoteTokens(
			tick.tickIndex,
			token0Decimals,
			token1Decimals,
			zeroTokenIsQuoteToken,
		)
	})

	if (zeroTokenIsQuoteToken) {
		prices.reverse()
	}

	let output = `💰 Price Progression (${baseToken.symbol}/${quoteToken.symbol})\n`
	output += `Range: ${Math.min(...prices).toFixed(displayDigits)} to ${Math.max(...prices).toFixed(displayDigits)}\n`

	output += asciichart.plot(prices, {
		height: chartHeight,
		colors: [asciichart.yellow],
		format: (value: number) => value.toFixed(displayDigits),
	})

	return output
}

/**
 * Main function to create all liquidity charts
 */
export async function createLiquidityCharts(
	currentTick: number,
	currentTickLiquidity: bigint,
	result: TickRetrievalResult,
	isZeroTokenQuoteToken: boolean,
): Promise<string> {
	const { ticks, pool } = result
	const [baseToken, quoteToken] = isZeroTokenQuoteToken ? [pool.token1, pool.token0] : [pool.token0, pool.token1]

	// Calculate liquidity distribution
	const { liquidityPoints, closestTick } = calculateLiquidityDistribution(ticks, currentTick, currentTickLiquidity)

	let output = `\n=== Liquidity Charts ===\n\n`

	// Create all charts
	output += createLiquidityDistributionChart(
		liquidityPoints,
		currentTick,
		closestTick,
		currentTickLiquidity,
		baseToken,
		quoteToken,
		isZeroTokenQuoteToken,
	)

	output += createLiquidityGrossChart(ticks)
	output += createLiquidityNetChart(ticks)
	output += createPriceProgressionChart(ticks, baseToken, quoteToken, isZeroTokenQuoteToken)

	return output
}
