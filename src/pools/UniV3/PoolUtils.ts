import { ChainClientService, Token, TokenUtils } from "@spread-solvers/evm-toolchain"
import { Address, getContract } from "viem"
import { UNISWAP_V3_POOL_ABI } from "../../abi/UniswapV3Pool"
import { UniV3Pool } from "./UniV3Pool"

export class PoolUtils {
	static async getUniV3Pool(pool: Address, chainId: number, chainClient: ChainClientService): Promise<UniV3Pool> {
		const poolContract = getContract({
			address: pool,
			abi: UNISWAP_V3_POOL_ABI,
			client: chainClient.getClient(chainId),
		})
		const [token0Address, token1Address] = await Promise.all([
			poolContract.read.token0(),
			poolContract.read.token1(),
		])

		const token0 = await new TokenUtils(chainClient).fromAddress<Token>(token0Address, chainId)
		const token1 = await new TokenUtils(chainClient).fromAddress<Token>(token1Address, chainId)

		return new UniV3Pool(chainClient, pool, chainId, token0, token1)
	}
}
