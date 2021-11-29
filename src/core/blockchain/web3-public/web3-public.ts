import { PCache } from '@common/decorators/cache.decorator';
import { HealthcheckError } from '@common/errors/healthcheck.error';
import { ERC20_TOKEN_ABI } from '@core/blockchain/constants/erc-20-abi';
import {
    HEALTHCHECK,
    isBlockchainHealthcheckAvailable
} from '@core/blockchain/constants/healthcheck';
import { BLOCKCHAIN_NAME } from '@core/blockchain/models/BLOCKCHAIN_NAME';
import { MULTICALL_ABI } from '@core/blockchain/web3-public/constants/multicall-abi';
import { MULTICALL_ADDRESSES } from '@core/blockchain/web3-public/constants/multicall-addresses';
import { BatchCall } from '@core/blockchain/web3-public/models/batch-call';
import { Call } from '@core/blockchain/web3-public/models/call';
import { ContractMulticallResponse } from '@core/blockchain/web3-public/models/contract-multicall-response';
import { MulticallResponse } from '@core/blockchain/web3-public/models/multicall-response';
import { RpcResponse } from '@core/blockchain/web3-public/models/rpc-response';
import { Web3Pure } from '@core/blockchain/web3-pure/web3-pure';
import pTimeout, { TimeoutError } from 'p-timeout';
import Web3 from 'web3';
import BigNumber from 'bignumber.js';
import { Method } from 'web3-core-method';
import { Transaction, provider as Provider, BlockNumber, HttpProvider } from 'web3-core';
import { AbiItem } from 'web3-utils';
import { BlockTransactionString } from 'web3-eth';

import { RubicError } from '@common/errors/rubic-error';
import { InsufficientFundsError } from '@common/errors/swap/insufficient-funds-error';

import { HttpClient } from '@common/models/http-client';
import { DefaultHttpClient } from '@common/http/default-http-client';

type SupportedTokenField = 'decimals' | 'symbol' | 'name' | 'totalSupply';

/**
 * Class containing methods for calling contracts in order to obtain information from the blockchain.
 * To send transaction or execute contract method use {@link Web3Private}.
 */
export class Web3Public {
    private multicallAddresses: Partial<Record<BLOCKCHAIN_NAME, string>> = MULTICALL_ADDRESSES;

    /**
     * @param web3 web3 instance initialized with ethereum provider, e.g. rpc link
     * @param blockchainName blockchain in which you need to execute requests
     * @param [httpClient=axios] http client that implements {@link HttpClient} interface
     */
    constructor(
        private readonly web3: Web3,
        private readonly blockchainName: BLOCKCHAIN_NAME,
        private httpClient?: HttpClient
    ) {}

    /**
     * HealthCheck current rpc node
     * @param timeoutMs acceptable node response timeout
     * @return null if healthcheck is not defined for current blockchain, else is node works status
     */
    public async healthCheck(timeoutMs: number = 4000): Promise<boolean> {
        if (!isBlockchainHealthcheckAvailable(this.blockchainName)) {
            return true;
        }
        const healthcheckData = HEALTHCHECK[this.blockchainName];

        const contract = new this.web3.eth.Contract(
            healthcheckData.contractAbi,
            healthcheckData.contractAddress
        );

        try {
            const result = await pTimeout(
                contract.methods[healthcheckData.method]().call(),
                timeoutMs
            );

            if (result !== healthcheckData.expected) {
                throw new HealthcheckError();
            }
            return true;
        } catch (e: unknown) {
            if (e instanceof TimeoutError) {
                console.debug(
                    `${this.blockchainName} node healthcheck timeout (${timeoutMs}ms) has occurred.`
                );
            } else {
                console.debug(`${this.blockchainName} node healthcheck fail: ${e}`);
            }
            return false;
        }
    }

    /**
     * @description set new provider to web3 instance
     * @param provider new web3 provider, e.g. rpc link
     */
    public setProvider(provider: Provider): void {
        this.web3.setProvider(provider);
    }

    /**
     * @description gets block by blockId
     * @param [blockId] block id: hash, number ... Default is 'latest'.
     * @returns {BlockTransactionString} block by blockId parameter.
     */
    public getBlock(blockId: BlockNumber | string = 'latest'): Promise<BlockTransactionString> {
        return this.web3.eth.getBlock(blockId);
    }

    /**
     * @description gets account eth or token balance as integer (multiplied to 10 ** decimals)
     * @param address wallet address whose balance you want to find out
     * @param [tokenAddress] address of the smart-contract corresponding to the token, or {@link NATIVE_TOKEN_ADDRESS}.
     * If not passed the balance in the native currency will be returned.
     * @returns address eth or token balance as integer (multiplied to 10 ** decimals)
     */
    public async getBalance(address: string, tokenAddress?: string): Promise<BigNumber> {
        let balance;
        if (tokenAddress && !Web3Pure.isNativeAddress(tokenAddress)) {
            balance = await this.getTokenBalance(address, tokenAddress);
        } else {
            balance = await this.web3.eth.getBalance(address);
        }
        return new BigNumber(balance);
    }

    /**
     * @description gets ERC-20 tokens balance as integer (multiplied to 10 ** decimals)
     * @param tokenAddress address of the smart-contract corresponding to the token
     * @param address wallet address whose balance you want to find out
     * @returns address tokens balance as integer (multiplied to 10 ** decimals)
     */
    public async getTokenBalance(address: string, tokenAddress: string): Promise<BigNumber> {
        const contract = new this.web3.eth.Contract(ERC20_TOKEN_ABI as AbiItem[], tokenAddress);

        const balance = await contract.methods.balanceOf(address).call();
        return new BigNumber(balance);
    }

    /**
     * @description predicts the volume of gas required to execute the contract method
     * @param contractAbi abi of smart-contract
     * @param contractAddress address of smart-contract
     * @param methodName method whose execution gas number is to be calculated
     * @param methodArguments arguments of the executed contract method
     * @param fromAddress the address for which the gas calculation will be called
     * @param [value] The value transferred for the call “transaction” in wei.
     * @return The gas amount estimated
     */
    public async getEstimatedGas(
        contractAbi: AbiItem[],
        contractAddress: string,
        methodName: string,
        methodArguments: unknown[],
        fromAddress: string,
        value?: string | BigNumber
    ): Promise<BigNumber> {
        const contract = new this.web3.eth.Contract(contractAbi, contractAddress);

        const gasLimit = await contract.methods[methodName](...methodArguments).estimateGas({
            from: fromAddress,
            gas: 10000000,
            ...(value && { value })
        });
        return new BigNumber(gasLimit);
    }

    /**
     * @description calculates the average price per unit of gas according to web3
     * @return average gas price in Wei
     */
    public async getGasPrice(): Promise<string> {
        return this.web3.eth.getGasPrice();
    }

    /**
     * @description calculates the average price per unit of gas according to web3
     * @return average gas price in ETH
     */
    public async getGasPriceInETH(): Promise<BigNumber> {
        const gasPrice = await this.web3.eth.getGasPrice();
        return new BigNumber(gasPrice).div(10 ** 18);
    }

    /**
     * @description calculates the gas fee using average price per unit of gas according to web3 and Eth price according to coingecko
     * @param gasLimit gas limit
     * @param etherPrice price of Eth unit
     * @return gas fee in usd$
     */
    public async getGasFee(gasLimit: BigNumber, etherPrice: BigNumber): Promise<BigNumber> {
        const gasPrice = await this.getGasPriceInETH();
        return gasPrice.multipliedBy(gasLimit).multipliedBy(etherPrice);
    }

    /**
     * @description executes allowance method in ERC-20 token contract
     * @param tokenAddress address of the smart-contract corresponding to the token
     * @param spenderAddress wallet or contract address, allowed to spend
     * @param ownerAddress wallet address to spend from
     * @return tokens amount, allowed to be spent
     */
    public async getAllowance(
        tokenAddress: string,
        ownerAddress: string,
        spenderAddress: string
    ): Promise<BigNumber> {
        const contract = new this.web3.eth.Contract(ERC20_TOKEN_ABI as AbiItem[], tokenAddress);

        const allowance = await contract.methods
            .allowance(ownerAddress, spenderAddress)
            .call({ from: ownerAddress });
        return new BigNumber(allowance);
    }

    /**
     * @description gets mined transaction gas fee in Ether
     * @param hash transaction hash
     * @return transaction gas fee in Wei or null if transaction is not mined
     */
    public async getTransactionGasFee(hash: string): Promise<BigNumber | null> {
        const transaction = await this.getTransactionByHash(hash);
        const receipt = await this.web3.eth.getTransactionReceipt(hash);

        if (!transaction || !receipt) {
            return null;
        }

        const gasPrice = new BigNumber(transaction.gasPrice);
        const gasLimit = new BigNumber(receipt.gasUsed);

        return gasPrice.multipliedBy(gasLimit);
    }

    /**
     * @description get a transaction by hash in several attempts
     * @param hash hash of the target transaction
     * @param attempt current attempt number
     * @param attemptsLimit maximum allowed number of attempts
     * @param delay ms delay before next attempt
     */
    public async getTransactionByHash(
        hash: string,
        attempt?: number,
        attemptsLimit?: number,
        delay?: number
    ): Promise<Transaction | null> {
        attempt = attempt || 0;
        const limit = attemptsLimit || 10;
        const timeoutMs = delay || 500;

        if (attempt >= limit) {
            return null;
        }

        const transaction = await this.web3.eth.getTransaction(hash);
        if (transaction === null) {
            return new Promise(resolve =>
                setTimeout(() => resolve(this.getTransactionByHash(hash, attempt!! + 1)), timeoutMs)
            );
        }
        return transaction;
    }

    /**
     * @description call smart-contract pure method of smart-contract and returns its output value
     * @param contractAddress address of smart-contract which method is to be executed
     * @param contractAbi abi of smart-contract which method is to be executed
     * @param methodName calling method name
     * @param [options] additional options
     * @param [options.from] the address the call “transaction” should be made from
     * @param [options.methodArguments] executing method arguments
     * @return smart-contract pure method returned value
     */
    public async callContractMethod(
        contractAddress: string,
        contractAbi: AbiItem[],
        methodName: string,
        options: {
            methodArguments?: unknown[];
            from?: string;
        } = { methodArguments: [] }
    ): Promise<string | string[]> {
        const contract = new this.web3.eth.Contract(contractAbi, contractAddress);

        return contract.methods[methodName](...options.methodArguments!!).call({
            ...(options.from && { from: options.from })
        });
    }

    /**
     * @description get balance of multiple tokens via multicall
     * @param address wallet address
     * @param tokensAddresses tokens addresses
     */
    public async getTokensBalances(
        address: string,
        tokensAddresses: string[]
    ): Promise<BigNumber[]> {
        const contract = new this.web3.eth.Contract(
            ERC20_TOKEN_ABI as AbiItem[],
            tokensAddresses[0]
        );
        const indexOfNativeCoin = tokensAddresses.findIndex(Web3Pure.isNativeAddress);
        const promises: [Promise<MulticallResponse[]>?, Promise<BigNumber>?] = [];

        if (indexOfNativeCoin !== -1) {
            tokensAddresses.splice(indexOfNativeCoin, 1);
            promises[1] = this.getBalance(address);
        }
        const calls: Call[] = tokensAddresses.map(tokenAddress => ({
            target: tokenAddress,
            callData: contract.methods.balanceOf(address).encodeABI()
        }));
        promises[0] = this.multicall(calls);

        const results = await Promise.all(
            promises as [Promise<MulticallResponse[]>, Promise<BigNumber>]
        );
        const tokensBalances = results[0].map(({ success, returnData }) =>
            success ? new BigNumber(returnData) : new BigNumber(0)
        );

        if (indexOfNativeCoin !== -1) {
            tokensBalances.splice(indexOfNativeCoin, 0, results[1]);
        }

        return tokensBalances;
    }

    /**
     * @description use multicall to make many calls in the single rpc request
     * @param contractAddress target contract address
     * @param contractAbi target contract abi
     * @param methodName target method name
     * @param methodCallsArguments list method calls parameters arrays
     */
    public async multicallContractMethod<Output>(
        contractAddress: string,
        contractAbi: AbiItem[],
        methodName: string,
        methodCallsArguments: unknown[][]
    ): Promise<ContractMulticallResponse<Output>[]> {
        const contract = new this.web3.eth.Contract(contractAbi, contractAddress);
        const calls: Call[] = methodCallsArguments.map(callArguments => ({
            callData: contract.methods[methodName](...callArguments).encodeABI(),
            target: contractAddress
        }));

        const outputs = await this.multicall(calls);

        const methodOutputAbi = contractAbi.find(
            funcSignature => funcSignature.name === methodName
        )?.outputs;

        if (!methodOutputAbi) {
            throw new RubicError(`Contract method ${methodName} does not exist.`);
        }

        return outputs.map(output => ({
            success: output.success,
            output: output.success
                ? (this.web3.eth.abi.decodeParameters(methodOutputAbi, output.returnData) as Output)
                : null
        }));
    }

    /**
     * @description Checks if the specified address contains the required amount of these tokens.
     * Throws an InsufficientFundsError if the balance is insufficient
     * @param token token balance for which you need to check
     * @param amount required balance
     * @param userAddress the address where the required balance should be
     */
    public async checkBalance(
        token: { address: string; symbol: string; decimals: number },
        amount: BigNumber,
        userAddress: string
    ): Promise<void> {
        let balance: BigNumber;
        if (Web3Pure.isNativeAddress(token.address)) {
            balance = await this.getBalance(userAddress);
        } else {
            balance = await this.getTokenBalance(userAddress, token.address);
        }

        const amountAbsolute = Web3Pure.toWei(amount, token.decimals);
        if (balance.lt(amountAbsolute)) {
            throw new InsufficientFundsError(amount.toFixed(0));
        }
    }

    /**
     * Gets ERC-20 token info by address.
     * @param tokenAddress Address of token.
     * @param tokenFields Token's fields to get.
     */
    @PCache
    public async callForTokenInfo(
        tokenAddress: string,
        tokenFields: SupportedTokenField[] = ['decimals', 'symbol', 'name']
    ): Promise<Partial<Record<SupportedTokenField, string>>> {
        const tokenFieldsPromises = tokenFields.map(method =>
            this.callContractMethod(tokenAddress, ERC20_TOKEN_ABI, method)
        );
        const tokenFieldsResults = await Promise.all(tokenFieldsPromises);
        return tokenFieldsResults.reduce(
            (acc, field, index) => ({ ...acc, [tokenFields[index]]: field }),
            {} as Record<SupportedTokenField, string>
        );
    }

    /**
     * @description get estimated gas of several contract method execution via rpc batch request
     * @param abi contract ABI
     * @param contractAddress contract address
     * @param fromAddress sender address
     * @param callsData transactions parameters
     * @returns list of contract execution estimated gases.
     * if the execution of the method in the real blockchain would not be reverted,
     * then the list item would be equal to the predicted gas limit.
     * Else (if you have not enough balance, allowance ...) then the list item would be equal to null
     */
    public async batchEstimatedGas(
        abi: AbiItem[],
        contractAddress: string,
        fromAddress: string,
        callsData: BatchCall[]
    ): Promise<(BigNumber | null)[]> {
        try {
            const contract = new this.web3.eth.Contract(abi, contractAddress);

            const dataList = callsData.map(callData =>
                contract.methods[callData.contractMethod](...callData.params).encodeABI()
            );

            const rpcCallsData = dataList.map((data, index) => ({
                rpcMethod: 'eth_estimateGas',
                params: {
                    from: fromAddress,
                    to: contractAddress,
                    data,
                    ...(callsData[index].value && {
                        value: `0x${callsData[index].value!!.toString(16)}`
                    })
                }
            }));

            const result = await this.rpcBatchRequest<string>(rpcCallsData);
            return result.map(value => (value ? new BigNumber(value) : null));
        } catch (e) {
            console.error(e);
            return callsData.map(() => null);
        }
    }

    /**
     * @description send batch request via web3
     * @see {@link https://web3js.readthedocs.io/en/v1.3.0/web3-eth.html#batchrequest|Web3BatchRequest}
     * @param calls Web3 method calls
     * @param callsParams ethereum method transaction parameters
     * @returns batch request call result sorted in order of input parameters
     */
    public web3BatchRequest<T extends string | string[]>(
        calls: { request: (...params: unknown[]) => Method }[],
        callsParams: Object[]
    ): Promise<T[]> {
        const batch = new this.web3.BatchRequest();
        const promises: Promise<T>[] = calls.map(
            (call, index) =>
                new Promise((resolve, reject) =>
                    batch.add(
                        call.request({ ...callsParams[index] }, (error: Error, result: T) =>
                            error ? reject(error) : resolve(result)
                        )
                    )
                )
        );

        batch.execute();

        return Promise.all(promises);
    }

    /**
     * @description send batch request to rpc provider directly
     * @see {@link https://playground.open-rpc.org/?schemaUrl=https://raw.githubusercontent.com/ethereum/eth1.0-apis/assembled-spec/openrpc.json&uiSchema%5BappBar%5D%5Bui:splitView%5D=false&uiSchema%5BappBar%5D%5Bui:input%5D=false&uiSchema%5BappBar%5D%5Bui:examplesDropdown%5D=false|EthereumJSON-RPC}
     * @param rpcCallsData rpc methods and parameters list
     * @returns rpc batch request call result sorted in order of input 1parameters
     */
    public async rpcBatchRequest<T extends string | string[]>(
        rpcCallsData: {
            rpcMethod: string;
            params: Object;
        }[]
    ): Promise<(T | null)[]> {
        const seed = Date.now();
        const batch = rpcCallsData.map((callData, index) => ({
            id: seed + index,
            jsonrpc: '2.0',
            method: callData.rpcMethod,
            params: [{ ...callData.params }]
        }));

        const httpClient = await this.getHttpClient();

        const response = await httpClient.post<RpcResponse<T>[]>(
            (<HttpProvider>this.web3.currentProvider).host,
            batch
        );

        return response.sort((a, b) => a.id - b.id).map(item => (item.error ? null : item.result));
    }

    /**
     * @description execute multiplie calls in the single contract call
     * @param calls multicall calls data list
     * @return result of calls execution
     */
    private async multicall(calls: Call[]): Promise<MulticallResponse[]> {
        const contract = new this.web3.eth.Contract(
            MULTICALL_ABI,
            this.multicallAddresses[this.blockchainName]
        );
        return contract.methods.tryAggregate(false, calls).call();
    }

    /**
     * @description returns httpClient if it exists or imports the axios client
     */
    private async getHttpClient(): Promise<HttpClient> {
        if (!this.httpClient) {
            this.httpClient = await DefaultHttpClient.getInstance();
        }
        return this.httpClient;
    }
}