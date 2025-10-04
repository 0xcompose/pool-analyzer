/**
 * Utility functions for price calculations and formatting
 */
export class PriceUtils {
	/**
	 * Convert sqrtPriceX96 to actual price
	 */
	static sqrtPriceX96ToPrice(sqrtPriceX96: bigint, token0Decimals: number, token1Decimals: number): number {
		const price = (Number(sqrtPriceX96) / Math.pow(2, 96)) ** 2
		return price * Math.pow(10, token1Decimals - token0Decimals)
	}

	/**
	 * Convert price to sqrtPriceX96
	 */
	static priceToSqrtPriceX96(price: number, token0Decimals: number, token1Decimals: number): bigint {
		const adjustedPrice = price / Math.pow(10, token1Decimals - token0Decimals)
		const sqrtPrice = Math.sqrt(adjustedPrice)
		return BigInt(Math.floor(sqrtPrice * Math.pow(2, 96)))
	}

	/**
	 * Calculate tick from price
	 */
	static priceToTick(price: number): number {
		return Math.floor(Math.log(price) / Math.log(1.0001))
	}

	/**
	 * Calculate price from tick
	 */
	static tickToPrice(tick: number): number {
		return Math.pow(1.0001, tick)
	}

	/**
	 * Format price with appropriate decimal places
	 */
	static formatPrice(price: number, decimals: number = 6): string {
		return price.toFixed(decimals)
	}

	/**
	 * Format large numbers with appropriate suffixes (K, M, B)
	 */
	static formatLargeNumber(value: bigint | number): string {
		const num = typeof value === "bigint" ? Number(value) : value

		if (num >= 1e9) {
			return (num / 1e9).toFixed(2) + "B"
		} else if (num >= 1e6) {
			return (num / 1e6).toFixed(2) + "M"
		} else if (num >= 1e3) {
			return (num / 1e3).toFixed(2) + "K"
		}

		return num.toFixed(2)
	}

	/**
	 * Calculate percentage change between two values
	 */
	static calculatePercentageChange(oldValue: number, newValue: number): string {
		if (oldValue === 0) return "0"

		const change = ((newValue - oldValue) / oldValue) * 100
		return change.toFixed(2)
	}

	/**
	 * Calculate liquidity density at a specific tick
	 */
	static calculateLiquidityDensity(tickData: any, tickSpacing: number): number {
		if (!tickData.initialized) return 0

		// Simplified calculation - in reality this would be more complex
		return Number(tickData.liquidityGross) / tickSpacing
	}

	/**
	 * Calculate price impact for a given trade size
	 */
	static calculatePriceImpactForTrade(
		poolLiquidity: bigint,
		tradeSize: bigint,
		currentPrice: number,
	): { priceImpact: number; newPrice: number } {
		const liquidity = Number(poolLiquidity)
		const trade = Number(tradeSize)

		// Simplified constant product formula
		const k = liquidity * liquidity
		const newLiquidity = liquidity - trade

		if (newLiquidity <= 0) {
			return { priceImpact: 100, newPrice: 0 }
		}

		const newPrice = (k / (newLiquidity * newLiquidity)) * currentPrice
		const priceImpact = ((newPrice - currentPrice) / currentPrice) * 100

		return {
			priceImpact: Math.abs(priceImpact),
			newPrice,
		}
	}

	/**
	 * Calculate optimal tick range for liquidity provision
	 */
	static calculateOptimalTickRange(
		currentTick: number,
		tickSpacing: number,
		volatility: number = 0.1,
	): { lowerTick: number; upperTick: number } {
		const range = Math.floor((volatility * 1000) / tickSpacing) * tickSpacing

		return {
			lowerTick: currentTick - range,
			upperTick: currentTick + range,
		}
	}

	/**
	 * Calculate impermanent loss for a given price range
	 */
	static calculateImpermanentLoss(
		priceAtDeposit: number,
		currentPrice: number,
		lowerTick: number,
		upperTick: number,
	): number {
		const lowerPrice = this.tickToPrice(lowerTick)
		const upperPrice = this.tickToPrice(upperTick)

		// If current price is outside the range, IL is 100%
		if (currentPrice < lowerPrice || currentPrice > upperPrice) {
			return 100
		}

		// Simplified IL calculation
		const priceRatio = currentPrice / priceAtDeposit
		const sqrtPriceRatio = Math.sqrt(priceRatio)
		const il = (2 * sqrtPriceRatio) / (1 + priceRatio) - 1

		return Math.abs(il) * 100
	}

	/**
	 * Calculate fees earned for a position
	 */
	static calculateFeesEarned(
		liquidity: bigint,
		feeGrowth0: bigint,
		feeGrowth1: bigint,
		feeGrowthOutside0: bigint,
		feeGrowthOutside1: bigint,
		positionFeeGrowth0: bigint,
		positionFeeGrowth1: bigint,
	): { token0Fees: bigint; token1Fees: bigint } {
		const feeGrowth0Delta = feeGrowth0 - feeGrowthOutside0 - positionFeeGrowth0
		const feeGrowth1Delta = feeGrowth1 - feeGrowthOutside1 - positionFeeGrowth1

		return {
			token0Fees: (liquidity * feeGrowth0Delta) / BigInt(2 ** 128),
			token1Fees: (liquidity * feeGrowth1Delta) / BigInt(2 ** 128),
		}
	}
}
