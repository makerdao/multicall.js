/// <reference types="node"/>

declare module '@makerdao/multicall' {
  import { BigNumber } from 'bignumber.js';

  export interface IConfig {
    preset: 'mainnet' | 'kovan' | 'rinkeby' | 'goerli' | 'xdai' | 'ropsten';
    rpcUrl: string;
    multicallAddress: string;
    interval: number;
    staleBlockRetryWait: number;
    errorRetryWait: number;
  }

  export interface IPostProcess {
    (v: any): any;
  }

  export interface ICall {
    target: string;
    call: string[];
    returns: (string | IPostProcess)[][];
  }

  export interface IArgumentsMapping {
    [key: string]: string[];
  }

  export interface IKeysValues {
    [key: string]: any;
  }

  export interface IResult {
    blockNumber: BigNumber;
    original: IKeysValues;
    transformed: IKeysValues;
    keyToArgMap: IArgumentsMapping;
  }

  export interface IResponse {
    results: IResult;
  }

  export interface IUpdate {
    type: string;
    value: any;
    args: any[];
  }

  export interface IBatchWatcher {
    updates(callback: (updates: IUpdate[]) => void): undefined;
  }

  export interface IWatcher {
    subscribe(callback: (update: IUpdate) => void): undefined;

    batch(): IBatchWatcher;

    onNewBlock(callback: (blockNumber: number) => void): undefined;

    tap(callback: (calls: Partial<ICall>[]) => Partial<ICall>[]): Promise<undefined>;

    recreate(calls: Partial<ICall>[], config: Partial<IConfig>): IWatcher;

    start(): undefined;
  }

  export function aggregate(calls: Partial<ICall>[], config: Partial<IConfig>): Promise<IResponse>;

  export function createWatcher(calls: Partial<ICall>[], config: Partial<IConfig>): IWatcher;
}
