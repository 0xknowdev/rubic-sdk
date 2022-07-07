import { Token } from '@rsdk-core/blockchain/tokens/token';
import { BlockchainName } from '@rsdk-core/blockchain/models/blockchain-name';
import { PriceTokenAmount } from '@rsdk-core/blockchain/tokens/price-token-amount';
import { notNull } from '@rsdk-common/utils/object';
import { PriceToken } from '@rsdk-core/blockchain/tokens/price-token';
import { RubicSdkError } from '@rsdk-common/errors/rubic-sdk.error';
import { combineOptions } from '@rsdk-common/utils/options';
import { getPriceTokensFromInputTokens } from '@rsdk-common/utils/tokens';
import { Mutable } from '@rsdk-common/utils/types/mutable';
import { CelerCrossChainTradeProvider } from '@rsdk-features/cross-chain/providers/celer-trade-provider/celer-cross-chain-trade-provider';
import { CcrTypedTradeProviders } from '@rsdk-features/cross-chain/models/typed-trade-provider';
import {
    CelerCrossChainTrade,
    CROSS_CHAIN_TRADE_TYPE,
    CrossChainTrade,
    CrossChainTradeType
} from 'src/features';
import { SwapManagerCrossChainCalculationOptions } from '@rsdk-features/cross-chain/models/swap-manager-cross-chain-options';
import pTimeout from '@rsdk-common/utils/p-timeout';
import { CrossChainTradeProvider } from '@rsdk-features/cross-chain/providers/common/cross-chain-trade-provider';
import { WrappedCrossChainTrade } from '@rsdk-features/cross-chain/providers/common/models/wrapped-cross-chain-trade';
import BigNumber from 'bignumber.js';
import { MarkRequired } from 'ts-essentials';
import { RequiredCrossChainOptions } from '@rsdk-features/cross-chain/models/cross-chain-options';
import { RubicCrossChainTradeProvider } from 'src/features/cross-chain/providers/rubic-trade-provider/rubic-cross-chain-trade-provider';
import { SymbiosisCrossChainTradeProvider } from 'src/features/cross-chain/providers/symbiosis-trade-provider/symbiosis-cross-chain-trade-provider';
import { LifiCrossChainTrade } from 'src/features/cross-chain/providers/lifi-trade-provider/lifi-cross-chain-trade';
import { LifiCrossChainTradeProvider } from './providers/lifi-trade-provider/lifi-cross-chain-trade-provider';

type RequiredSwapManagerCalculationOptions = MarkRequired<
    SwapManagerCrossChainCalculationOptions,
    'timeout' | 'disabledProviders'
> &
    RequiredCrossChainOptions;

/**
 * Contains method to calculate best cross chain trade.
 */
export class CrossChainManager {
    private static readonly defaultCalculationTimeout = 20_000;

    private static readonly defaultSlippageTolerance = 0.02;

    private static readonly defaultDeadline = 20;

    public readonly tradeProviders: CcrTypedTradeProviders = [
        RubicCrossChainTradeProvider,
        CelerCrossChainTradeProvider,
        SymbiosisCrossChainTradeProvider,
        LifiCrossChainTradeProvider
    ].reduce((acc, ProviderClass) => {
        const provider = new ProviderClass();
        acc[provider.type] = provider;
        return acc;
    }, {} as Mutable<CcrTypedTradeProviders>);

    constructor(private readonly providerAddress: string) {}

    /**
     * Calculates cross chain trades and sorts them by exchange courses.
     * Wrapped trade object may contain error, but sometimes course can be
     * calculated even with thrown error (e.g. min/max amount error).
     *
     * @example
     * ```ts
     * const fromBlockchain = BLOCKCHAIN_NAME.ETHEREUM;
     * // ETH
     * const fromTokenAddress = '0x0000000000000000000000000000000000000000';
     * const fromAmount = 1;
     * const toBlockchain = BLOCKCHAIN_NAME.BINANCE_SMART_CHAIN;
     * // BUSD
     * const toTokenAddress = '0xe9e7cea3dedca5984780bafc599bd69add087d56';
     *
     * const wrappedTrades = await sdk.crossChain.calculateTrade(
     *     { blockchain: fromBlockchain, address: fromTokenAddress },
     *     fromAmount,
     *     { blockchain: toBlockchain, address: toTokenAddress }
     * );
     * const bestTrade = wrappedTrades[0];
     *
     * wrappedTrades.forEach(wrappedTrade => {
     *    if (wrappedTrade.trade) {
     *        console.log(wrappedTrade.tradeType, `to amount: ${wrappedTrade.trade.to.tokenAmount.toFormat(3)}`));
     *    }
     *    if (wrappedTrade.error) {
     *        console.error(wrappedTrade.tradeType, 'error: wrappedTrade.error');
     *    }
     * });
     *
     * ```
     *
     * @param fromToken Token to sell.
     * @param fromAmount Amount to sell.
     * @param toToken Token to get.
     * @param options Additional options.
     * @returns Array of sorted wrapped cross chain trades with possible errors.
     */
    public async calculateTrade(
        fromToken:
            | Token
            | {
                  address: string;
                  blockchain: BlockchainName;
              },
        fromAmount: string | number,
        toToken:
            | Token
            | {
                  address: string;
                  blockchain: BlockchainName;
              },
        options?: Omit<SwapManagerCrossChainCalculationOptions, 'providerAddress'>
    ): Promise<WrappedCrossChainTrade[]> {
        if (toToken instanceof Token && fromToken.blockchain === toToken.blockchain) {
            throw new RubicSdkError('Blockchains of from and to tokens must be different.');
        }

        const { from, to } = await getPriceTokensFromInputTokens(
            fromToken,
            fromAmount.toString(),
            toToken
        );

        return this.calculateBestTradeFromTokens(from, to, this.getFullOptions(options));
    }

    private getFullOptions(
        options?: SwapManagerCrossChainCalculationOptions
    ): RequiredSwapManagerCalculationOptions {
        return combineOptions<RequiredSwapManagerCalculationOptions>(options, {
            fromSlippageTolerance: CrossChainManager.defaultSlippageTolerance,
            toSlippageTolerance: CrossChainManager.defaultSlippageTolerance,
            gasCalculation: 'enabled',
            disabledProviders: [],
            timeout: CrossChainManager.defaultCalculationTimeout,
            providerAddress: this.providerAddress,
            slippageTolerance: CrossChainManager.defaultSlippageTolerance * 2,
            deadline: CrossChainManager.defaultDeadline
        });
    }

    private async calculateBestTradeFromTokens(
        from: PriceTokenAmount,
        to: PriceToken,
        options: RequiredSwapManagerCalculationOptions
    ): Promise<WrappedCrossChainTrade[]> {
        const wrappedTrades = await this.calculateTradeFromTokens(
            from,
            to,
            this.getFullOptions(options)
        );

        const fromTokenPrice = (
            wrappedTrades.find(wrappedTrade => wrappedTrade.trade instanceof LifiCrossChainTrade)
                ?.trade as LifiCrossChainTrade
        )?.from.price;

        if (!fromTokenPrice) {
            return wrappedTrades.sort(tradeA => (tradeA?.trade ? -1 : 1));
        }
        return wrappedTrades.sort((firstTrade, secondTrade) => {
            const firstTradeRatio = this.getProviderRatio(firstTrade.trade, fromTokenPrice);
            const secondTradeRatio = this.getProviderRatio(secondTrade.trade, fromTokenPrice);

            return firstTradeRatio.comparedTo(secondTradeRatio);
        });
    }

    private getProviderRatio(trade: CrossChainTrade | null, fromTokenPrice: BigNumber) {
        if (!trade || !fromTokenPrice) {
            return new BigNumber(Infinity);
        }

        if (trade instanceof CelerCrossChainTrade) {
            return fromTokenPrice.plus(trade.cryptoFeeToken.price).dividedBy(trade.to.tokenAmount);
        }

        return fromTokenPrice.dividedBy(trade.to.tokenAmount);
    }

    private async calculateTradeFromTokens(
        from: PriceTokenAmount,
        to: PriceToken,
        options: RequiredSwapManagerCalculationOptions
    ): Promise<WrappedCrossChainTrade[]> {
        const { disabledProviders, timeout, ...providersOptions } = options;
        const providers = Object.entries(this.tradeProviders).filter(([type]) => {
            if (disabledProviders.includes(type as CrossChainTradeType)) {
                return false;
            }

            if (
                type === CROSS_CHAIN_TRADE_TYPE.RUBIC &&
                CelerCrossChainTradeProvider.isSupportedBlockchain(from.blockchain) &&
                CelerCrossChainTradeProvider.isSupportedBlockchain(to.blockchain)
            ) {
                return false;
            }

            return true;
        }) as [CrossChainTradeType, CrossChainTradeProvider][];

        if (!providers.length) {
            throw new RubicSdkError(`There are no providers for trade`);
        }

        const calculationPromises = providers.map(async ([type, provider]) => {
            try {
                const calculation = provider.calculate(from, to, providersOptions);
                const wrappedTrade = await pTimeout(calculation, timeout);
                if (!wrappedTrade) {
                    return null;
                }

                return {
                    ...wrappedTrade,
                    tradeType: provider.type
                };
            } catch (e) {
                console.debug(
                    `[RUBIC_SDK] Trade calculation error occurred for ${type} trade provider.`,
                    e
                );
                return null;
            }
        });
        const results = (await Promise.all(calculationPromises)).filter(notNull);
        if (!results?.length) {
            throw new RubicSdkError('No success providers calculation for the trade');
        }
        return results;
    }
}
