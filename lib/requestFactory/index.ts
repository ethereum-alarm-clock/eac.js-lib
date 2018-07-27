/* eslint class-methods-use-this: "off" */

import initUtil from '../util';

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

  isKnownRequest(requestAddress: Address) {
    return new Promise((resolve, reject) => {
      this.instance.isKnownRequest.call(requestAddress, (err, isKnown) => {
        if (!err) resolve(isKnown)
        else reject(err)
      })
    })
  }

  validateRequestParams(addressArgs: string[], uintArgs: number[], endowment: number) {
    return new Promise((resolve, reject) => {
      this.instance.validateRequestParams.call(
        addressArgs,
        uintArgs,
        endowment,
        (err: any, isValid: any) => {
          if (!err) resolve(isValid)
          else reject(err)
        }
      )
    })
  }

  /**
   * Parses the boolean returned by validateRequestParams() and returns the
   * reason validation failed.
   * @param {Array<boolean>} isValid The array returned by this.validateRequestParams()
   * @return {Array<String>} An array of the strings of validation errors or an
   * array of length 0 if no errors.
   */
  parseIsValid(isValid: boolean[]): string[] {
    if (isValid.length != 6) {
      throw new Error("Must pass an array of booleans returned by validateRequestParams()")
    }
    const Errors = [
      "InsufficientEndowment",
      "ReservedWindowBiggerThanExecutionWindow",
      "InvalidTemporalUnit",
      "ExecutionWindowTooSoon",
      "CallGasTooHigh",
      "EmptyToAddress",
    ]
    const errors = [] as string[];
    isValid.forEach((boolIsTrue, index) => {
      if (!boolIsTrue) {
        errors.push(Errors[index])
      }
    })
    return errors
  }

  async getRequestCreatedLogs(filter: any, startBlockNum: number, endBlockNum: number): Promise<any> {
    const f = filter || {}
    const curBlock = await Util.getBlockNumber(this.web3)
    const start = startBlockNum || 1
    const end = endBlockNum || "latest"
    const event = this.instance.RequestCreated(
      f,
      { fromBlock: start, toBlock: end }
    )
    return new Promise((resolve, reject) => {
      event.get((err: any, logs: any[]) => {
        if (!err) {
          resolve(logs)
        } else reject(err)
      })
    })
  }

  watchRequestCreatedLogs(filter: any, startBlockNum: any, callback: Function): any {
    const f = filter || {}
    const curBlock = await Util.getBlockNumber(this.web3)
    const start = startBlockNum || 1
    const event = this.instance.RequestCreated(
      f,
      { fromBlock: start, toBlock: 'latest' }
    );
    event.watch(function(e,r){
      callback(e,r);
    });
    return event;
  }

  async stopWatch(event: any): Promise<{}> {
    return new Promise((resolve, reject) => {
      event.stopWatching( (err, res) => {
        if (!err) {
          resolve(res)
        } else reject(err)
      })
    })
  }

  async getRequestsByBucket(bucket: any): Promise<any[]> {
    const logs = await this.getRequestCreatedLogs({
      bucket,
    }, 0, 0)
    const requests = [] as any[];
    logs.forEach((log) => {
      requests.push({
        address: log.args.request,
        params: log.args.params,
      })
    })
    return requests
  }

  async watchRequestsByBucket(bucket: any, cb: any): any {
    return await this.watchRequestCreatedLogs({
      bucket,
    }, '',
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
  calcBucket(windowStart: number, temporalUnit: number) {
    let bucketSize = 240  // block bucketsize
    let sign = -1  // block sign

    if (temporalUnit == 2) {
      bucketSize = 3600 // timestamp bucketsize
      sign = 1 // timestamp sign
    }

    return sign * (windowStart - (windowStart % bucketSize))
  }

  async getRequests(startBlock: number, endBlock: number) {
    const logs = await this.getRequestCreatedLogs({}, startBlock, endBlock)
    const requests = [] as any[];
    logs.forEach((log: any) => {
      requests.push(log.args.request)
    })
    return requests
  }

  async watchRequests(startBlock: number, callback: Function) {
    return await this.watchRequestCreatedLogs({}, startBlock,
      (error: any, log: any) => {
        if (log) {
          callback(log.args.request);
        }
      });
  }

  async getRequestsByOwner(owner: string, startBlock: number, endBlock: number) {
    const logs = await this.getRequestCreatedLogs({
      owner,
    }, startBlock, endBlock)
    const requests = [] as any[];
    logs.forEach((log: any) => {
      requests.push(log.args.request)
    })
    return requests
  }

  async watchRequestsByOwner(owner: string, startBlock: number, callback: Function): any {
    return await this.watchRequestCreatedLogs({
      owner,
    }, startBlock, (error: any, log: any) => {
      if (log) {
        callback(log.args.request)
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
