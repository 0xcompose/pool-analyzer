import { ChainClientService } from "@spread-solvers/evm-toolchain/client"
import { Token } from "@spread-solvers/evm-toolchain/primitives"
import { UniswapV3PoolContract } from "../contracts/UniswapV3PoolContract.js"
import { PoolAnalysisResult, PoolData, TickData, TickRange } from "../types/pool.js"
import { TickData as TickServiceData, UniswapV3TickService } from "./UniswapV3TickService.js"

export class PoolAnalyzerService {
	private chainClient: ChainClientService
	private poolContract: UniswapV3PoolContract
	private tickService: UniswapV3TickService

	constructor(chainClient: ChainClientService, poolAddress: string) {
		this.chainClient = chainClient
		this.poolContract = new UniswapV3PoolContract(chainClient, poolAddress as `0x${string}`, 1)
		this.tickService = new UniswapV3TickService(this.poolContract)
	}

	/**
	 * Get all main data from Uniswap V3 Pool
	 */
	async getPoolData(): Promise<PoolData> {
		const [slot0, liquidity, fee, tickSpacing, token0Address, token1Address] = await Promise.all([
			this.poolContract.slot0(),
			this.poolContract.liquidity(),
			this.poolContract.fee(),
			this.poolContract.tickSpacing(),
			this.poolContract.token0(),
			this.poolContract.token1(),
		])

		// Get token data
		const [token0, token1] = await Promise.all([this.getTokenData(token0Address), this.getTokenData(token1Address)])

		// Calculate current price from sqrtPriceX96
		const currentPrice = this.calculatePriceFromSqrtPriceX96(slot0.sqrtPriceX96, token0.decimals, token1.decimals)

		// Calculate reserves based on current tick and liquidity
		const reserves = this.calculateReserves(slot0.sqrtPriceX96, liquidity, token0.decimals, token1.decimals)

		return {
			address: this.poolContract.address,
			token0,
			token1,
			liquidity,
			fee: Number(fee),
			tickSpacing: Number(tickSpacing),
			currentTick: slot0.tick,
			currentPrice,
			reserves,
		}
	}

	/**
	 * Get tick data around current tick
	 */
	async getTickRange(ticksAround: number = 100): Promise<TickRange> {
		const poolData = await this.getPoolData()
		const currentTick = poolData.currentTick
		const tickSpacing = poolData.tickSpacing

		// Calculate start and end ticks aligned to tick spacing
		const startTick = this.alignToTickSpacing(currentTick - (ticksAround / 2) * tickSpacing, tickSpacing)
		const endTick = this.alignToTickSpacing(currentTick + (ticksAround / 2) * tickSpacing, tickSpacing)

		const ticks: TickData[] = []
		const tickPromises: Promise<TickData>[] = []

		// Fetch ticks in parallel
		for (let tick = startTick; tick <= endTick; tick += tickSpacing) {
			tickPromises.push(this.getTickData(tick))
		}

		const tickResults = await Promise.all(tickPromises)
		ticks.push(...tickResults)

		return {
			start: startTick,
			end: endTick,
			ticks,
		}
	}

	/**
	 * Get comprehensive pool analysis
	 */
	async analyzePool(ticksAround: number = 100): Promise<PoolAnalysisResult> {
		const [poolData, tickRange] = await Promise.all([this.getPoolData(), this.getTickRange(ticksAround)])

		// Calculate price impact metrics
		const priceImpact = this.calculatePriceImpact(poolData)

		// Calculate volatility metrics (simplified for now)
		const volatility = {
			priceChange24h: "0", // Would need historical data
			volume24h: "0", // Would need historical data
			liquidityUtilization: this.calculateLiquidityUtilization(poolData, tickRange),
		}

		return {
			poolData,
			tickRange,
			priceImpact,
			volatility,
		}
	}

	/**
	 * Efficiently get all initialized ticks from the pool using tick bitmap
	 */
	async getAllTicks(): Promise<TickServiceData[]> {
		return await this.tickService.getAllTicks()
	}

	/**
	 * Get token data from contract address
	 */
	private async getTokenData(tokenAddress: string): Promise<Token> {
		// For now, return default values - token data fetching can be implemented later
		return new Token(this.chainClient, tokenAddress as `0x${string}`, 1, {
			symbol: "UNKNOWN",
			name: "Unknown Token",
			decimals: 18,
		})
	}

	/**
	 * Get individual tick data
	 */
	private async getTickData(tick: number): Promise<TickData> {
		try {
			const tickData = await this.poolContract.ticks(tick)
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
		} catch (error) {
			// Return empty tick data if tick doesn't exist
			return {
				index: tick,
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
	}

	/**
	 * Calculate price from sqrtPriceX96
	 */
	private calculatePriceFromSqrtPriceX96(
		sqrtPriceX96: bigint,
		token0Decimals: number,
		token1Decimals: number,
	): string {
		// Price = (sqrtPriceX96 / 2^96)^2
		const price = (Number(sqrtPriceX96) / Math.pow(2, 96)) ** 2

		// Adjust for token decimals
		const adjustedPrice = price * Math.pow(10, token1Decimals - token0Decimals)

		return adjustedPrice.toFixed(18)
	}

	/**
	 * Calculate reserves based on sqrtPriceX96 and liquidity
	 */
	private calculateReserves(sqrtPriceX96: bigint, liquidity: bigint, token0Decimals: number, token1Decimals: number) {
		const price = (Number(sqrtPriceX96) / Math.pow(2, 96)) ** 2
		const liquidityNumber = Number(liquidity)

		// Simplified calculation - in reality, this is more complex
		const token1Reserve = liquidityNumber / Math.sqrt(price)
		const token0Reserve = liquidityNumber * Math.sqrt(price)

		return {
			token0: BigInt(Math.floor(token0Reserve * Math.pow(10, token0Decimals))),
			token1: BigInt(Math.floor(token1Reserve * Math.pow(10, token1Decimals))),
		}
	}

	/**
	 * Align tick to tick spacing
	 */
	private alignToTickSpacing(tick: number, tickSpacing: number): number {
		return Math.floor(tick / tickSpacing) * tickSpacing
	}

	/**
	 * Calculate price impact metrics
	 */
	private calculatePriceImpact(poolData: PoolData) {
		const price = parseFloat(poolData.currentPrice)

		return {
			token0PerToken1: poolData.currentPrice,
			token1PerToken0: (1 / price).toFixed(18),
			sqrtPriceX96: this.calculateSqrtPriceX96FromPrice(
				price,
				poolData.token0.decimals,
				poolData.token1.decimals,
			),
		}
	}

	/**
	 * Calculate sqrtPriceX96 from price
	 */
	private calculateSqrtPriceX96FromPrice(price: number, token0Decimals: number, token1Decimals: number): bigint {
		const adjustedPrice = price * Math.pow(10, token1Decimals - token0Decimals)
		const sqrtPrice = Math.sqrt(adjustedPrice)
		return BigInt(Math.floor(sqrtPrice * Math.pow(2, 96)))
	}

	/**
	 * Calculate liquidity utilization
	 */
	private calculateLiquidityUtilization(poolData: PoolData, tickRange: TickRange): string {
		const totalLiquidity = tickRange.ticks.reduce((sum, tick) => sum + Number(tick.liquidityGross), 0)
		const currentLiquidity = Number(poolData.liquidity)

		if (totalLiquidity === 0) return "0"

		return (currentLiquidity / totalLiquidity).toFixed(4)
	}
}
