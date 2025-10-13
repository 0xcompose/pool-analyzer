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

	static tickToPriceInQuoteTokens(
		tick: number,
		token0Decimals: number,
		token1Decimals: number,
		zeroTokenIsQuoteToken: boolean,
	): number {
		let price = this.tickToPrice(tick)

		const adjustedPrice = price / Math.pow(10, token1Decimals - token0Decimals)

		if (zeroTokenIsQuoteToken) return 1 / adjustedPrice

		return adjustedPrice
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
	 * Format large numbers using scientific notation
	 * Handles negative numbers by formatting absolute value and preserving sign
	 */
	static formatLargeNumber(value: bigint | number): string {
		const num = typeof value === "bigint" ? Number(value) : value
		const isNegative = num < 0
		const absNum = Math.abs(num)

		// Use scientific notation for numbers >= 1000
		if (absNum >= 1000) {
			const formatted = absNum.toExponential(2)
			return isNegative ? "-" + formatted : formatted
		} else {
			// For smaller numbers, just use fixed decimal
			const formatted = absNum.toFixed(2)
			return isNegative ? "-" + formatted : formatted
		}
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

	/**
	 * Calculate token amounts from liquidity at a specific tick
	 * Based on Uniswap V3's liquidity math: L = sqrt(x * y)
	 * @param liquidity - The total liquidity amount
	 * @param tickIndex - The tick index
	 * @param token0Decimals - Token0 decimal places
	 * @param token1Decimals - Token1 decimal places
	 * @returns Object with token0Amount and token1Amount
	 */
	static calculateTokenAmountsFromLiquidity(
		liquidity: bigint,
		tickIndex: number,
		token0Decimals: number,
		token1Decimals: number,
	): { token0Amount: bigint; token1Amount: bigint } {
		const liquidityNum = Number(liquidity)

		// Calculate price at this tick
		const price = this.tickToPrice(tickIndex)

		// Adjust price for decimal differences
		const adjustedPrice = price / Math.pow(10, token1Decimals - token0Decimals)

		// For Uniswap V3: L = sqrt(x * y) where x = token0 amount, y = token1 amount
		// And y = x * price, so L = sqrt(x * x * price) = x * sqrt(price)
		// Therefore: x = L / sqrt(price), y = L * sqrt(price)

		const sqrtPrice = Math.sqrt(adjustedPrice)

		// Calculate token amounts
		const token0Amount = Math.floor(liquidityNum / sqrtPrice)
		const token1Amount = Math.floor(liquidityNum * sqrtPrice)

		return {
			token0Amount: BigInt(Math.floor(token0Amount)),
			token1Amount: BigInt(Math.floor(token1Amount)),
		}
	}

	/**
	 * Calculate token amounts for a liquidity range (between two ticks)
	 * @param liquidity - The total liquidity amount
	 * @param lowerTick - Lower tick of the range
	 * @param upperTick - Upper tick of the range
	 * @param currentTick - Current tick (price)
	 * @param token0Decimals - Token0 decimal places
	 * @param token1Decimals - Token1 decimal places
	 * @returns Object with token0Amount and token1Amount
	 */
	static calculateTokenAmountsInRange(
		liquidity: bigint,
		lowerTick: number,
		upperTick: number,
		currentTick: number,
		token0Decimals: number,
		token1Decimals: number,
	): { token0Amount: bigint; token1Amount: bigint } {
		const liquidityNum = Number(liquidity)

		// Calculate prices at ticks
		const lowerPrice = this.tickToPrice(lowerTick)
		const upperPrice = this.tickToPrice(upperTick)
		const currentPrice = this.tickToPrice(currentTick)

		// Adjust prices for decimal differences
		const decimalAdjustment = Math.pow(10, token1Decimals - token0Decimals)
		const adjustedLowerPrice = lowerPrice / decimalAdjustment
		const adjustedUpperPrice = upperPrice / decimalAdjustment
		const adjustedCurrentPrice = currentPrice / decimalAdjustment

		let token0Amount = 0
		let token1Amount = 0

		// If current price is below the range, all liquidity is in token0
		if (adjustedCurrentPrice <= adjustedLowerPrice) {
			token0Amount =
				(liquidityNum * (Math.sqrt(adjustedUpperPrice) - Math.sqrt(adjustedLowerPrice))) /
				Math.sqrt(adjustedLowerPrice * adjustedUpperPrice)
		}
		// If current price is above the range, all liquidity is in token1
		else if (adjustedCurrentPrice >= adjustedUpperPrice) {
			token1Amount = liquidityNum * (Math.sqrt(adjustedUpperPrice) - Math.sqrt(adjustedLowerPrice))
		}
		// If current price is within the range, liquidity is split
		else {
			token0Amount =
				(liquidityNum * (Math.sqrt(adjustedUpperPrice) - Math.sqrt(adjustedCurrentPrice))) /
				Math.sqrt(adjustedCurrentPrice * adjustedUpperPrice)
			token1Amount = liquidityNum * (Math.sqrt(adjustedCurrentPrice) - Math.sqrt(adjustedLowerPrice))
		}

		return {
			token0Amount: BigInt(Math.floor(Math.max(0, token0Amount))),
			token1Amount: BigInt(Math.floor(Math.max(0, token1Amount))),
		}
	}

	/**
	 * Format token amount with proper decimals
	 * @param amount - Token amount in wei/smallest unit
	 * @param decimals - Token decimal places
	 * @param displayDecimals - Number of decimal places to display (default: 6)
	 * @returns Formatted string
	 */
	static formatTokenAmount(amount: bigint, decimals: number, displayDecimals: number = 6): string {
		const divisor = BigInt(Math.pow(10, decimals))
		const wholePart = amount / divisor
		const fractionalPart = amount % divisor

		if (fractionalPart === 0n) {
			return wholePart.toString()
		}

		const fractionalStr = fractionalPart.toString().padStart(decimals, "0")
		const displayFractional = fractionalStr.substring(0, displayDecimals)

		// Remove trailing zeros
		const trimmedFractional = displayFractional.replace(/0+$/, "")

		if (trimmedFractional === "") {
			return wholePart.toString()
		}

		return `${wholePart}.${trimmedFractional}`
	}
}
