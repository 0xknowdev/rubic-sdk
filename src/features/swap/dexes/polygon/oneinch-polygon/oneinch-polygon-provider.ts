import { OneinchProvider } from '@features/swap/dexes/common/oneinch-abstract/oneinch-provider';
import { BLOCKCHAIN_NAME } from '@core/blockchain/models/BLOCKCHAIN_NAME';

export class OneinchPolygonProvider extends OneinchProvider {
    public readonly blockchain = BLOCKCHAIN_NAME.POLYGON;
}