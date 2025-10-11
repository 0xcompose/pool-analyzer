import { TickData, UniV3Pool } from "./UniV3/UniV3Pool"

/**
 * Extended tick data with tick index
 */
export interface TickDataWithIndex extends TickData {
	tickIndex: number
}

/**
 * Result of tick retrieval
 */
export interface TickRetrievalResult {
	currentTick: number
	tickSpacing: number
	totalTicksRetrieved: number
	ticks: TickDataWithIndex[]
	pool: UniV3Pool // UniV3Pool instance for accessing token information
}

export class TickUtils {
	/**
	 * Retrieves ticks around the current tick of a Uniswap V3 pool
	 * @param chainClient - The chain client service
	 * @param config - Configuration for tick retrieval
	 * @returns Promise resolving to tick retrieval result
	 */
	static async getTicksAroundCurrentTick(
		pool: UniV3Pool,
		tickCountToRetrieve: number,
		batchSize: number,
		batchDelayMs: number,
	): Promise<TickRetrievalResult> {
		// Get current tick and tick spacing
		const slot0 = await pool.slot0()
		const currentTick = Number(slot0.tick)
		const tickSpacing = Number(await pool.tickSpacing())

		// Calculate tick indices around current tick
		const tickIndices = TickUtils.calculateTickIndices(currentTick, tickSpacing, tickCountToRetrieve)

		// Retrieve tick data in batches
		const ticks = await TickUtils.retrieveTicksInBatches(pool, tickIndices, batchSize, batchDelayMs)

		return {
			currentTick,
			tickSpacing,
			totalTicksRetrieved: ticks.length,
			ticks,
			pool,
		}
	}
	/**
	 * Calculates tick indices around the current tick, ensuring proper alignment with tick spacing
	 * @param currentTick - The current tick index
	 * @param tickSpacing - The tick spacing for the pool
	 * @param tickCount - Total number of ticks to retrieve (default: 100)
	 * @returns Array of tick indices to query
	 */
	static calculateTickIndices(currentTick: number, tickSpacing: number, tickCount: number): number[] {
		const halfCount = Math.floor(tickCount / 2)

		// Find the nearest tick that's divisible by tickSpacing
		const alignedTick = Math.floor(currentTick / tickSpacing) * tickSpacing

		// Generate tick indices around the aligned tick
		const tickIndices: number[] = []
		for (let i = -halfCount; i <= halfCount; i++) {
			const tickIndex = alignedTick + i * tickSpacing
			tickIndices.push(tickIndex)
		}

		return tickIndices
	}

	/**
	 * Retrieves tick data in batches to manage RPC rate limits
	 * @param pool - The UniV3Pool instance
	 * @param tickIndices - Array of tick indices to retrieve
	 * @returns Promise resolving to array of tick data with indices
	 */
	static async retrieveTicksInBatches(
		pool: UniV3Pool,
		tickIndices: number[],
		batchSize: number,
		batchDelayMs: number,
	): Promise<TickDataWithIndex[]> {
		const ticks: TickDataWithIndex[] = []

		for (let i = 0; i < tickIndices.length; i += batchSize) {
			const batch = tickIndices.slice(i, i + batchSize)

			// Process batch in parallel
			const batchPromises = batch.map(async (tickIndex) => {
				try {
					const tickData = await pool.ticks(tickIndex)
					return {
						...tickData,
						tickIndex,
					}
				} catch (error) {
					console.warn(`Failed to retrieve tick ${tickIndex}:`, error)
					// Return empty tick data for failed retrievals
					return {
						tickIndex,
						liquidityGross: 0n,
						liquidityNet: 0n,
						feeGrowthOutside0X128: 0n,
						feeGrowthOutside1X128: 0n,
						tickCumulativeOutside: 0n,
						secondsPerLiquidityOutsideX128: 0n,
						secondsOutside: 0n,
						initialized: false,
					}
				}
			})

			const batchResults = await Promise.all(batchPromises)
			ticks.push(...batchResults)

			// Add delay between batches to respect RPC limits
			if (i + batchSize < tickIndices.length) {
				await new Promise((resolve) => setTimeout(resolve, batchDelayMs))
			}
		}

		return ticks
	}

	/**
	 * Finds the closest tick to the current tick in the retrieved ticks array
	 * @param ticks - Array of retrieved ticks
	 * @param currentTick - The current tick index
	 * @returns Index of the closest tick in the array
	 */
	static findClosestTickIndex(ticks: TickDataWithIndex[], currentTick: number): number {
		let closestIndex = 0
		let minDistance = Math.abs(ticks[0].tickIndex - currentTick)

		for (let i = 1; i < ticks.length; i++) {
			const distance = Math.abs(ticks[i].tickIndex - currentTick)
			if (distance < minDistance) {
				minDistance = distance
				closestIndex = i
			}
		}

		return closestIndex
	}
}
