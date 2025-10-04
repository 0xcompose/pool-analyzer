import { IChainClientConfigService } from "@spread-solvers/evm-toolchain/client"
import { Hex } from "viem"

export class DummyChainClientConfigService implements IChainClientConfigService {
	privateKey: Hex = "0x0000000000000000000000000000000000000000000000000000000000000001"
}
