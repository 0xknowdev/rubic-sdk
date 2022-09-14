import { RubicSdkError } from 'src/common/errors/rubic-sdk.error';

/**
 * Thrown, when `swap` transaction in lifi is failed.
 */
export class LifiPairIsUnavailable extends RubicSdkError {
    constructor() {
        super('The swap using this pair is currently unavailable. Please try again later.');
        Object.setPrototypeOf(this, LifiPairIsUnavailable.prototype);
    }
}
