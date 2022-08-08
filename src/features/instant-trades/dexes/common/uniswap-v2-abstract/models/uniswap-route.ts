import { Token } from '@rsdk-core/blockchain/tokens/token';
import BigNumber from 'bignumber.js';

export interface UniswapRoute {
    readonly path: ReadonlyArray<Token>;
    readonly outputAbsoluteAmount: BigNumber;
}
