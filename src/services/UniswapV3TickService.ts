import { UniswapV3PoolContract } from "../contracts/UniswapV3PoolContract.js"

// Uniswap V3 constants
const MIN_TICK = -887272
const MAX_TICK = 887272
const TICK_BITMAP_WORD_SIZE = 256

export interface TickData {
	index: number
	liquidityGross: bigint
	liquidityNet: bigint
	feeGrowthOutside0X128: bigint
	feeGrowthOutside1X128: bigint
	tickCumulativeOutside: bigint
	secondsPerLiquidityOutsideX128: bigint
	secondsOutside: bigint
	initialized: boolean
}

/**
 * UniswapV3TickService provides efficient tick retrieval functionality for Uniswap V3 pools.
 * It uses the tick bitmap and viem's multicall batching to efficiently find all initialized ticks and batch fetch their data.
 */
export class UniswapV3TickService {
	constructor(private poolContract: UniswapV3PoolContract) {}

	/**
	 * Efficiently retrieves all initialized ticks from the pool using tick bitmap and multicall batching.
	 * @returns Promise resolving to array of all initialized tick data
	 */
	async getAllTicks(): Promise<TickData[]> {
		// Get tick spacing to calculate bitmap word ranges
		const tickSpacing = await this.poolContract.tickSpacing()

		// Calculate the range of bitmap words we need to check
		const minWord = this.tickToWord(MIN_TICK, tickSpacing)
		const maxWord = this.tickToWord(MAX_TICK, tickSpacing)

		// Get all bitmap words in parallel
		const bitmapPromises = []
		for (let word = minWord; word <= maxWord; word++) {
			bitmapPromises.push(this.poolContract.tickBitmap(word))
		}

		const bitmapWords = await Promise.all(bitmapPromises)

		// Find all initialized ticks from bitmap
		const initializedTicks: number[] = []
		for (let i = 0; i < bitmapWords.length; i++) {
			const word = bitmapWords[i]
			if (word && word > 0n) {
				const wordStartTick = this.wordToTick(minWord + i, tickSpacing)
				this.extractTicksFromWord(word, wordStartTick, tickSpacing, initializedTicks)
			}
		}

		// Batch fetch all tick data using multicall
		if (initializedTicks.length === 0) {
			return []
		}

		const tickDataPromises = initializedTicks.map((tick) => this.poolContract.ticks(tick))
		const tickDataResults = await Promise.all(tickDataPromises)

		// Combine tick indices with their data
		return initializedTicks.map((tick, index) => {
			const tickData = tickDataResults[index]
			if (!tickData) {
				throw new Error(`Failed to get data for tick ${tick}`)
			}
			return {
				index: tick,
				liquidityGross: tickData.liquidityGross,
				liquidityNet: tickData.liquidityNet,
				feeGrowthOutside0X128: tickData.feeGrowthOutside0X128,
				feeGrowthOutside1X128: tickData.feeGrowthOutside1X128,
				tickCumulativeOutside: tickData.tickCumulativeOutside,
				secondsPerLiquidityOutsideX128: tickData.secondsPerLiquidityOutsideX128,
				secondsOutside: tickData.secondsOutside,
				initialized: tickData.initialized,
			}
		})
	}

	/**
	 * Converts a tick to its corresponding bitmap word index.
	 * @param tick - The tick value
	 * @param tickSpacing - The tick spacing of the pool
	 * @returns The bitmap word index
	 */
	private tickToWord(tick: number, tickSpacing: number): number {
		return Math.floor(tick / tickSpacing / TICK_BITMAP_WORD_SIZE)
	}

	/**
	 * Converts a bitmap word index to the starting tick of that word.
	 * @param word - The bitmap word index
	 * @param tickSpacing - The tick spacing of the pool
	 * @returns The starting tick of the word
	 */
	private wordToTick(word: number, tickSpacing: number): number {
		return word * TICK_BITMAP_WORD_SIZE * tickSpacing
	}

	/**
	 * Extracts all initialized tick indices from a bitmap word.
	 * @param word - The bitmap word value
	 * @param wordStartTick - The starting tick of the word
	 * @param tickSpacing - The tick spacing of the pool
	 * @param initializedTicks - Array to store the found tick indices
	 */
	private extractTicksFromWord(word: bigint, wordStartTick: number, tickSpacing: number, initializedTicks: number[]) {
		// Convert bigint to binary string and process each bit
		const binaryString = word.toString(2).padStart(TICK_BITMAP_WORD_SIZE, "0")

		for (let i = 0; i < TICK_BITMAP_WORD_SIZE; i++) {
			if (binaryString[i] === "1") {
				const tick = wordStartTick + i * tickSpacing
				// Ensure tick is within valid range
				if (tick >= MIN_TICK && tick <= MAX_TICK) {
					initializedTicks.push(tick)
				}
			}
		}
	}
}
