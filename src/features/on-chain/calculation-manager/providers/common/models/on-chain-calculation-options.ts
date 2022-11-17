import { MarkRequired } from 'ts-essentials';
import { IsDeflationToken } from 'src/features/deflation-token-manager/models/is-deflation-token';

/**
 * Stores options for calculating trade.
 */
export interface OnChainCalculationOptions {
    /**
     * Takes value from 0 to 1.
     */
    readonly slippageTolerance?: number;

    /**
     * Transaction deadline, passed in minutes.
     */
    readonly deadlineMinutes?: number;

    /**
     * Disabled or enables gas fee calculation.
     * `rubicOptimisation` options means, that gas fee is converted into usd
     * and subtracted from output token amount, also converted in usd.
     */
    readonly gasCalculation?: 'disabled' | 'calculate' | 'rubicOptimisation';

    /**
     * If true, then only direct token pairs can be used in calculation.
     */
    readonly disableMultihops?: boolean;

    /**
     * User wallet address, from which transaction will be sent.
     */
    readonly fromAddress?: string;

    /**
     * Affiliate address for zrx provider.
     */
    readonly zrxAffiliateAddress?: string;

    readonly providerAddress?: string;

    /**
     * @internal
     * Wrapped native address.
     */
    readonly wrappedAddress?: string;

    /**
     * @internal
     * True, if trade must be swapped through on-chain proxy contract.
     * False, if trade must be swapped through dex directly.
     * Default is false.
     */
    readonly useProxy?: boolean;

    /**
     * @internal
     * Contains information whether from token is deflation or not.
     */
    readonly isDeflationFrom?: IsDeflationToken;

    /**
     * @internal
     * Contains information whether to token is deflation or not.
     */
    readonly isDeflationTo?: IsDeflationToken;
}

export type RequiredOnChainCalculationOptions = MarkRequired<
    OnChainCalculationOptions,
    'slippageTolerance' | 'gasCalculation' | 'providerAddress' | 'useProxy'
>;
