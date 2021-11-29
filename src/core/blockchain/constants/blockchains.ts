import { NATIVE_TOKEN_ADDRESS } from '@core/blockchain/constants/native-token-address';
import { Blockchain } from '@core/blockchain/models/blockchain';
import { BLOCKCHAIN_NAME } from '@core/blockchain/models/BLOCKCHAIN_NAME';

export const blockchains: ReadonlyArray<Blockchain> = [
    {
        id: 1,
        name: BLOCKCHAIN_NAME.ETHEREUM,
        nativeCoin: {
            blockchain: BLOCKCHAIN_NAME.ETHEREUM,
            address: NATIVE_TOKEN_ADDRESS,
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18
        }
    },
    {
        id: 56,
        name: BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN,
        nativeCoin: {
            blockchain: BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN,
            address: NATIVE_TOKEN_ADDRESS,
            name: 'Binance Coin',
            symbol: 'BNB',
            decimals: 18
        }
    },
    {
        id: 137,
        name: BLOCKCHAIN_NAME.POLYGON,
        nativeCoin: {
            blockchain: BLOCKCHAIN_NAME.POLYGON,
            address: NATIVE_TOKEN_ADDRESS,
            name: 'Matic Network',
            symbol: 'MATIC',
            decimals: 18
        }
    },
    {
        id: 1666600000,
        name: BLOCKCHAIN_NAME.HARMONY,
        nativeCoin: {
            blockchain: BLOCKCHAIN_NAME.HARMONY,
            address: NATIVE_TOKEN_ADDRESS,
            name: 'ONE',
            symbol: 'ONE',
            decimals: 18
        }
    },
    {
        id: 43114,
        name: BLOCKCHAIN_NAME.AVALANCHE,
        nativeCoin: {
            blockchain: BLOCKCHAIN_NAME.AVALANCHE,
            address: NATIVE_TOKEN_ADDRESS,
            name: 'AVAX',
            symbol: 'AVAX',
            decimals: 18
        }
    },
    {
        id: 1285,
        name: BLOCKCHAIN_NAME.MOONRIVER,
        nativeCoin: {
            blockchain: BLOCKCHAIN_NAME.MOONRIVER,
            address: NATIVE_TOKEN_ADDRESS,
            name: 'MOVR',
            symbol: 'MOVR',
            decimals: 18
        }
    },
    // Testnets
    {
        id: 42,
        name: BLOCKCHAIN_NAME.ETHEREUM_TESTNET,
        nativeCoin: {
            blockchain: BLOCKCHAIN_NAME.ETHEREUM_TESTNET,
            address: NATIVE_TOKEN_ADDRESS,
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18
        }
    },
    {
        id: 97,
        name: BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN_TESTNET,
        nativeCoin: {
            blockchain: BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN_TESTNET,
            address: NATIVE_TOKEN_ADDRESS,
            name: 'Binance Coin',
            symbol: 'BNB',
            decimals: 18
        }
    },
    {
        id: 80001,
        name: BLOCKCHAIN_NAME.POLYGON_TESTNET,
        nativeCoin: {
            blockchain: BLOCKCHAIN_NAME.POLYGON_TESTNET,
            address: NATIVE_TOKEN_ADDRESS,
            name: 'Polygon',
            symbol: 'MATIC',
            decimals: 18
        }
    },
    {
        id: 1666700000,
        name: BLOCKCHAIN_NAME.HARMONY_TESTNET,
        nativeCoin: {
            blockchain: BLOCKCHAIN_NAME.HARMONY_TESTNET,
            address: NATIVE_TOKEN_ADDRESS,
            name: 'ONE',
            symbol: 'ONE',
            decimals: 18
        }
    },
    {
        id: 43113,
        name: BLOCKCHAIN_NAME.AVALANCHE_TESTNET,
        nativeCoin: {
            blockchain: BLOCKCHAIN_NAME.AVALANCHE_TESTNET,
            address: NATIVE_TOKEN_ADDRESS,
            name: 'AVAX',
            symbol: 'AVAX',
            decimals: 18
        }
    },
    {
        id: NaN,
        name: BLOCKCHAIN_NAME.MOONRIVER_TESTNET,
        nativeCoin: {
            blockchain: BLOCKCHAIN_NAME.MOONRIVER_TESTNET,
            address: NATIVE_TOKEN_ADDRESS,
            name: 'MOVR',
            symbol: 'MOVR',
            decimals: 18
        }
    }
];