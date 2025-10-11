import type { IChainClientConfigService, RpcUrl } from "@spread-solvers/evm-toolchain"
import * as dotenv from "dotenv"
import type { Hex } from "viem"

dotenv.config()

export class DummyChainClientConfigService implements IChainClientConfigService {
	privateKey: Hex = "0x0000000000000000000000000000000000000000000000000000000000000001"
	rpcSettings: Record<
		number,
		| {
				rpcUrls: RpcUrl[]
				disableDefaultRpcUrl: boolean
		  }
		| undefined
	>

	constructor() {
		this.rpcSettings = {
			1: {
				rpcUrls: [`https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`],
				disableDefaultRpcUrl: true,
			},
		}
	}
}
