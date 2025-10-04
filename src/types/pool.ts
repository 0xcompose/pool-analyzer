import { Token } from "@spread-solvers/evm-toolchain/primitives"

export interface PoolData {
	address: string
	token0: Token
	token1: Token
	liquidity: bigint
	fee: number
	tickSpacing: number
	currentTick: number
	currentPrice: string
	reserves: {
		token0: bigint
		token1: bigint
	}
}

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

export interface TickRange {
	start: number
	end: number
	ticks: TickData[]
}

export interface PoolAnalysisResult {
	poolData: PoolData
	tickRange: TickRange
	priceImpact: {
		token0PerToken1: string
		token1PerToken0: string
		sqrtPriceX96: bigint
	}
	volatility: {
		priceChange24h: string
		volume24h: string
		liquidityUtilization: string
	}
}
