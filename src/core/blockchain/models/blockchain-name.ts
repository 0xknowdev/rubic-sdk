export const BLOCKCHAIN_NAME = {
    ETHEREUM: 'ETH',
    BINANCE_SMART_CHAIN: 'BSC',
    POLYGON: 'POLYGON',
    AVALANCHE: 'AVALANCHE',
    MOONRIVER: 'MOONRIVER',
    FANTOM: 'FANTOM',
    HARMONY: 'HARMONY',
    ARBITRUM: 'ARBITRUM',
    AURORA: 'AURORA',
    TELOS: 'TELOS',
    SOLANA: 'SOLANA',
    NEAR: 'NEAR',
    OPTIMISM: 'OPTIMISM',
    CRONOS: 'CRONOS',
    OKE_X_CHAIN: 'OKT',
    GNOSIS: 'GNOSIS',
    FUSE: 'FUSE',
    MOONBEAM: 'MOONBEAM',
    CELO: 'CELO'
} as const;

export type BlockchainName = typeof BLOCKCHAIN_NAME[keyof typeof BLOCKCHAIN_NAME];
