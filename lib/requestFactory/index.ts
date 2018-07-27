/* eslint class-methods-use-this: "off" */

import initUtil from "../util";

type Address = string;

const Util = new initUtil(null);

export default class RequestFactory {
  public instance: any;
  public web3: any;

  constructor(address: Address, web3: any) {
    if (!Util.checkNotNullAddress(address)) {
      throw new Error(`Cannot initialize a RequestFactory from address ${address}`);
    }

    this.web3 = web3;
    this.instance = this.web3.eth
      .contract(Util.getABI("RequestFactory"))
      .at(address);
  }

  get address(): Address {
    return this.instance.address;
  }

  /**
   * Conveinence methods
   */

  public isKnownRequest(requestAddress: Address) {
    return new Promise((resolve, reject) => {
      this.instance.isKnownRequest.call(requestAddress, (err: any, isKnown: any) => {
        if (!err) {
          resolve(isKnown);
        } else {
          reject(err);
        }
      });
    });
  }

  public validateRequestParams(addressArgs: string[], uintArgs: number[], endowment: number) {
    return new Promise((resolve, reject) => {
      this.instance.validateRequestParams.call(
        addressArgs,
        uintArgs,
        endowment,
        (err: any, isValid: any) => {
          if (!err) {
            resolve(isValid);
          } else {
            reject(err);
          }
        },
      );
    });
  }

  /**
   * Parses the boolean returned by validateRequestParams() and returns the
   * reason validation failed.
   * @param {Array<boolean>} isValid The array returned by this.validateRequestParams()
   * @return {Array<String>} An array of the strings of validation errors or an
   * array of length 0 if no errors.
   */
  public parseIsValid(isValid: boolean[]): string[] {
    if (isValid.length !== 6) {
      throw new Error("Must pass an array of booleans returned by validateRequestParams()");
    }
    const Errors = [
      "InsufficientEndowment",
      "ReservedWindowBiggerThanExecutionWindow",
      "InvalidTemporalUnit",
      "ExecutionWindowTooSoon",
      "CallGasTooHigh",
      "EmptyToAddress",
    ];
    const errors = [] as string[];
    isValid.forEach((boolIsTrue, index) => {
      if (!boolIsTrue) {
        errors.push(Errors[index]);
      }
    });
    return errors;
  }

  public async getRequestCreatedLogs(filter: any, startBlockNum: number, endBlockNum: number): Promise<any> {
    const f = filter || {};
    const curBlock = await Util.getBlockNumber(this.web3);
    const start = startBlockNum || 1;
    const end = endBlockNum || "latest";
    const event = this.instance.RequestCreated(
      f,
      { fromBlock: start, toBlock: end },
    );
    return new Promise((resolve, reject) => {
      event.get((err: any, logs: any[]) => {
        if (!err) {
          resolve(logs);
        } else {
          reject(err);
        }
      });
    });
  }

  public async watchRequestCreatedLogs(filter: any, startBlockNum: any, callback: any): Promise<any> {
    const f = filter || {};
    const curBlock = await Util.getBlockNumber(this.web3);
    const start = startBlockNum || 1;
    const event = this.instance.RequestCreated(
      f,
      { fromBlock: start, toBlock: "latest" },
    );
    event.watch((err: any, res: any) => {
      callback(err, res);
    });
    return event;
  }

  public async stopWatch(event: any): Promise<{}> {
    return new Promise((resolve, reject) => {
      event.stopWatching((err: any, res: any) => {
        if (!err) {
          resolve(res);
        } else {
          reject(err);
        }
      });
    });
  }

  public async getRequestsByBucket(bucket: any): Promise<any[]> {
    const logs = await this.getRequestCreatedLogs({
      bucket,
    }, 0, 0);
    const requests = [] as any[];
    logs.forEach((log: any) => {
      requests.push({
        address: log.args.request,
        params: log.args.params,
      });
    });
    return requests;
  }

  public async watchRequestsByBucket(bucket: any, cb: any): Promise<any> {
    return await this.watchRequestCreatedLogs({
      bucket,
    }, "",
      (error: any, log: any) => {
        if (log) {
          cb({
            address: log.args.request,
            params: log.args.params,
          });
        }
      });
  }

  // Assume the temporalUnit is blocks if not timestamp.
  public calcBucket(windowStart: number, temporalUnit: number) {
    let bucketSize = 240;  // block bucketsize
    let sign = -1;  // block sign

    if (temporalUnit === 2) {
      bucketSize = 3600; // timestamp bucketsize
      sign = 1; // timestamp sign
    }

    return sign * (windowStart - (windowStart % bucketSize));
  }

  public async getRequests(startBlock: number, endBlock: number) {
    const logs = await this.getRequestCreatedLogs({}, startBlock, endBlock);
    const requests = [] as any[];
    logs.forEach((log: any) => {
      requests.push(log.args.request);
    });
    return requests;
  }

  public async watchRequests(startBlock: number, callback: any) {
    return await this.watchRequestCreatedLogs({}, startBlock,
      (error: any, log: any) => {
        if (log) {
          callback(log.args.request);
        }
      });
  }

  public async getRequestsByOwner(owner: string, startBlock: number, endBlock: number) {
    const logs = await this.getRequestCreatedLogs({
      owner,
    }, startBlock, endBlock);
    const requests = [] as any[];
    logs.forEach((log: any) => {
      requests.push(log.args.request);
    });
    return requests;
  }

  public async watchRequestsByOwner(owner: string, startBlock: number, callback: any): Promise<any> {
    return await this.watchRequestCreatedLogs({
      owner,
    }, startBlock, (error: any, log: any) => {
      if (log) {
        callback(log.args.request);
      }
    });
  }

  /**
   * Chain inits
   */

  // static initMainnet() {
  //   throw new Error("Not implemented.")
  // }

  // static initRopsten(web3) {
  //   const address = require("../assets/ropsten.json").requestFactory
  //   return new RequestFactory(address, web3)
  // }

  // static initRinkeby() {
  //   throw new Error("Not implemented.")
  // }

  // static initKovan(web3) {
  //   const address = require("../assets/kovan.json").requestFactory
  //   return new RequestFactory(address, web3)
  // }
}
