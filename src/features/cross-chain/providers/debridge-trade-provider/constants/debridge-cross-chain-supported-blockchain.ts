import { BLOCKCHAIN_NAME } from '@rsdk-core/blockchain/models/blockchain-name';

export const deBridgeCrossChainSupportedBlockchains = [
    BLOCKCHAIN_NAME.ETHEREUM,
    BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN,
    BLOCKCHAIN_NAME.POLYGON,
    BLOCKCHAIN_NAME.AVALANCHE,
    BLOCKCHAIN_NAME.ARBITRUM
] as const;

export type DeBridgeCrossChainSupportedBlockchain =
    typeof deBridgeCrossChainSupportedBlockchains[number];
