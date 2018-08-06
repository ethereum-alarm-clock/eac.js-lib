/* eslint class-methods-use-this: "off" */

const Util = require("../util")()

class RequestFactory {
  constructor(address, web3) {
    if (!Util.checkNotNullAddress(address)) {
      throw new Error("Attempted to instantiate a RequestFactory class from a null address.")
    }
    this.web3 = web3
    this.instance = this.web3.eth
      .contract(Util.getABI("RequestFactory"))
      .at(address)
  }

  get address() {
    return this.instance.address
  }

  /**
   * Conveinence methods
   */

  isKnownRequest(requestAddress) {
    return new Promise((resolve, reject) => {
      this.instance.isKnownRequest.call(requestAddress, (err, isKnown) => {
        if (!err) resolve(isKnown)
        else reject(err)
      })
    })
  }

  validateRequestParams(addressArgs, uintArgs, endowment) {
    return new Promise((resolve, reject) => {
      this.instance.validateRequestParams.call(
        addressArgs,
        uintArgs,
        endowment,
        (err, isValid) => {
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
  parseIsValid(isValid) {
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

    const errors = []
    isValid.forEach((boolIsTrue, index) => {
      if (!boolIsTrue) {
        errors.push(Errors[index])
      }
    })
    return errors
  }

  async getRequestCreatedLogs(filter = {}, fromBlock = 1, toBlock = "latest") {
    const event = this.instance.RequestCreated(
      filter,
      { fromBlock, toBlock }
    )
    return new Promise((resolve, reject) => {
      event.get((err, logs) => {
        if (!err) {
          resolve(logs)
        } else reject(err)
      })
    })
  }

  async watchRequestCreatedLogs(filter = {}, fromBlock = 1, callback) {
    const event = this.instance.RequestCreated(
      filter,
      { fromBlock, toBlock: 'latest' }
    );
    event.watch(function(e,r){
      callback(e,r);
    });
    return event;
  }

  async stopWatch(event) {
    return new Promise((resolve, reject) => {
      event.stopWatching( (err, res) => {
        if (!err) {
          resolve(res)
        } else reject(err)
      })
    })
  }

  async getRequestsByBucket(bucket) {
    const logs = await this.getRequestCreatedLogs({
      bucket,
    }, '', '')

    return logs.map(log => ({
      address: log.args.request,
      params: log.args.params,
    }))
  }

  async watchRequestsByBucket(bucket, cb) {
    return await this.watchRequestCreatedLogs({
      bucket,
    }, '',
      (error,log) => {
        if (log) {
          cb({
            address: log.args.request,
            params: log.args.params,
          });
        }
      });
  }

  // Assume the temporalUnit is blocks if not timestamp.
  calcBucket(windowStart, temporalUnit) {
    let bucketSize = 240  // block bucketsize
    let sign = -1  // block sign

    if (temporalUnit == 2) {
      bucketSize = 3600 // timestamp bucketsize
      sign = 1 // timestamp sign
    }

    return sign * (windowStart - (windowStart % bucketSize))
  }

  async getRequests(startBlock, endBlock) {
    const logs = await this.getRequestCreatedLogs({}, startBlock, endBlock)
    
    return logs.map(log => log.args.request)
  }

  async watchRequests(startBlock, callback) {
    return await this.watchRequestCreatedLogs({}, startBlock,
      (error,log) => {
        if (log) {
          callback(log.args.request);
        }
      });
  }

  async getRequestsByOwner(owner, startBlock, endBlock) {
    const logs = await this.getRequestCreatedLogs({
      owner,
    }, startBlock, endBlock)
    const requests = []
    logs.forEach((log) => {
      requests.push(log.args.request)
    })
    return requests
  }

  async watchRequestsByOwner(owner, startBlock, callback) {
    return await this.watchRequestCreatedLogs({
      owner,
    }, startBlock, (error,log) => {
      if (log) {
        callback(log.args.request)
      }
    });
  }
}

module.exports = RequestFactory
