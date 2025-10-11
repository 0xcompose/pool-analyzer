import { BaseContract, ChainClientService, Token } from "@spread-solvers/evm-toolchain"
import { type Address, getContract, type GetContractReturnType, type PublicClient } from "viem"
import { UNISWAP_V3_POOL_ABI } from "../../abi/UniswapV3Pool"

/**
 * Tick data structure for output
 */
export interface TickData {
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
 * UniswapV3PoolContract provides a typed interface for interacting with Uniswap V3 pool contracts.
 * It extends BaseContract and implements the IUniswapV3PoolContract interface.
 */
export class UniV3Pool extends BaseContract {
	private readonly contract: GetContractReturnType<typeof UNISWAP_V3_POOL_ABI, PublicClient, Address>

	constructor(
		chainClient: ChainClientService,
		poolAddress: Address,
		chainId: number,
		readonly token0: Token,
		readonly token1: Token,
	) {
		super(chainClient, poolAddress, chainId)

		this.contract = getContract({
			address: poolAddress as `0x${string}`,
			abi: UNISWAP_V3_POOL_ABI,
			client: chainClient.getClient(chainId),
		})
	}

	/**
	 * Returns the current state of the pool including price, tick, and observation data.
	 * @returns Promise resolving to slot0 data containing sqrtPriceX96, tick, observation data, and protocol fees
	 */
	async slot0() {
		const result = await this.contract.read.slot0()
		return {
			sqrtPriceX96: result[0],
			tick: result[1],
			observationIndex: result[2],
			observationCardinality: result[3],
			observationCardinalityNext: result[4],
			feeProtocol: result[5],
			unlocked: result[6],
		}
	}

	/**
	 * Returns the current liquidity in the pool.
	 * @returns Promise resolving to the current liquidity amount
	 */
	async liquidity() {
		return await this.contract.read.liquidity()
	}

	/**
	 * Returns the fee tier of the pool.
	 * @returns Promise resolving to the fee tier (e.g., 3000 for 0.3%)
	 */
	async fee() {
		return await this.contract.read.fee()
	}

	/**
	 * Returns the tick spacing of the pool.
	 * @returns Promise resolving to the tick spacing value
	 */
	async tickSpacing() {
		return await this.contract.read.tickSpacing()
	}

	/**
	 * Returns tick data for a specific tick.
	 * @param tick - The tick index to query
	 * @returns Promise resolving to tick data including liquidity and fee growth
	 */
	async ticks(tick: number): Promise<TickData> {
		const result = await this.contract.read.ticks([tick])
		return {
			liquidityGross: result[0],
			liquidityNet: result[1],
			feeGrowthOutside0X128: result[2],
			feeGrowthOutside1X128: result[3],
			tickCumulativeOutside: result[4],
			secondsPerLiquidityOutsideX128: result[5],
			secondsOutside: BigInt(result[6]),
			initialized: result[7],
		}
	}

	/**
	 * Returns the tick bitmap of the pool.
	 * @returns Promise resolving to the tick bitmap
	 */
	async tickBitmap(word: number) {
		return await this.contract.read.tickBitmap([word])
	}

	/**
	 * Returns time-weighted average tick and liquidity values for the given time periods.
	 * @param secondsAgos - Array of time periods in seconds ago to query
	 * @returns Promise resolving to tick cumulatives and liquidity cumulatives
	 */
	async observe(secondsAgos: number[]) {
		const result = await this.contract.read.observe([secondsAgos])
		return {
			tickCumulatives: [...result[0]],
			secondsPerLiquidityCumulativeX128s: [...result[1]],
		}
	}
}
