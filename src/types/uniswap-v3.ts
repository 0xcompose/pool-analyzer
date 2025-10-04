export interface UniswapV3PoolContract {
	slot0(): Promise<{
		sqrtPriceX96: bigint
		tick: number
		observationIndex: number
		observationCardinality: number
		observationCardinalityNext: number
		feeProtocol: number
		unlocked: boolean
	}>

	liquidity(): Promise<bigint>

	fee(): Promise<number>

	tickSpacing(): Promise<number>

	token0(): Promise<string>

	token1(): Promise<string>

	ticks(tick: number): Promise<{
		liquidityGross: bigint
		liquidityNet: bigint
		feeGrowthOutside0X128: bigint
		feeGrowthOutside1X128: bigint
		tickCumulativeOutside: bigint
		secondsPerLiquidityOutsideX128: bigint
		secondsOutside: bigint
		initialized: boolean
	}>

	tickBitmap(word: number): Promise<bigint>

	observe(secondsAgos: number[]): Promise<{
		tickCumulatives: bigint[]
		secondsPerLiquidityCumulativeX128s: bigint[]
	}>
}
