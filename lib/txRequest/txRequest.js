const { BigNumber } = require("bignumber.js")
const RequestData = require("./requestData")
const Constants = require("../constants")
const Util = require("../util")()

const moment = require('moment');

class TxRequest {
  constructor(address, web3) {
    if (!Util.checkNotNullAddress(address)) {
      throw new Error("Attempted to instantiate a TxRequest class from a null address.")
    }
    this.web3 = web3
    this.instance = this.web3.eth
      .contract(Util.getABI("TransactionRequestCore"))
      .at(address)
  }

  get address() {
    return this.instance.address
  }

  /**
   * Window centric getters
   */

  get claimWindowSize() {
    this.checkData()
    return this.data.schedule.claimWindowSize
  }

  get claimWindowStart() {
    this.checkData()
    return this.windowStart.minus(this.freezePeriod).minus(this.claimWindowSize)
  }

  get claimWindowEnd() {
    this.checkData()
    return this.claimWindowStart.plus(this.claimWindowSize)
  }

  get freezePeriod() {
    this.checkData()
    return this.data.schedule.freezePeriod
  }

  get freezePeriodStart() {
    this.checkData()
    return this.windowStart.plus(this.claimWindowSize)
  }

  get freezePeriodEnd() {
    this.checkData()
    return this.claimWindowEnd.plus(this.freezePeriod)
  }

  get temporalUnit() {
    this.checkData()
    return this.data.schedule.temporalUnit
  }

  get windowSize() {
    this.checkData()
    return this.data.schedule.windowSize
  }

  get windowStart() {
    this.checkData()
    return this.data.schedule.windowStart
  }

  get reservedWindowSize() {
    this.checkData()
    return this.data.schedule.reservedWindowSize
  }

  get reservedWindowEnd() {
    this.checkData()
    return this.windowStart.plus(this.reservedWindowSize)
  }

  get executionWindowEnd() {
    this.checkData()
    return this.windowStart.plus(this.windowSize)
  }

  /**
   * Dynamic getters
   */

  async now() {
    // If being called with an empty temporal unit the data needs to be filled.
    if (!this.temporalUnit) {
      await this.refreshData();
    }

    if (this.temporalUnit == 1) {
      // The reason for the `plus(1)` here is that the next block to be mined
      // is for all intents and purposes the `now` since the soonest this transaction
      // could be included is alongside it.
      return new BigNumber(await Util.getBlockNumber(this.web3)).plus(1);
    } else if (this.temporalUnit == 2) {
      const timestamp = new BigNumber(await Util.getTimestamp(this.web3));
      const local = new BigNumber(moment().seconds());
      return local.gt(timestamp) ? local : timestamp;
    }
    throw new Error(`[${this.address}] Unrecognized temporal unit: ${this.temporalUnit}`)
  }

  async beforeClaimWindow() {
    const now = await this.now()
    return this.claimWindowStart.greaterThan(now)
  }

  async inClaimWindow() {
    const now = await this.now()
    return (
      this.claimWindowStart.lessThanOrEqualTo(now) &&
      this.claimWindowEnd.greaterThan(now)
    )
  }

  async inFreezePeriod() {
    const now = await this.now()
    return (
      this.claimWindowEnd.lessThanOrEqualTo(now) &&
      this.freezePeriodEnd.greaterThan(now)
    )
  }

  async inExecutionWindow() {
    const now = await this.now()
    return (
      this.windowStart.lessThanOrEqualTo(now) &&
      this.executionWindowEnd.greaterThanOrEqualTo(now)
    )
  }

  async inReservedWindow() {
    const now = await this.now()
    return (
      this.windowStart.lessThanOrEqualTo(now) &&
      this.reservedWindowEnd.greaterThan(now)
    )
  }

  async afterExecutionWindow() {
    const now = await this.now()
    return this.executionWindowEnd.lessThan(now)
  }

  /**
   *
   */
  createdAt() {

  }

  async executedAt() {
    return (await this.getExecutedEvent()).blockNumber
  }

  getExecutedEvent() {
    if (!this.wasCalled) {
      return {blockNumber: 0}
    }
    const events = this.instance.allEvents({fromBlock: 0, toBlock: 'latest'})
    return new Promise((resolve, reject) => {
      events.get((err, logs) => {
        if (!err) {
          const Executed = logs.filter(log => log.topics[0] === '0x3e504bb8b225ad41f613b0c3c4205cdd752d1615b4d77cd1773417282fcfb5d9')
          resolve({
            blockNumber: Executed[0].blockNumber,
            bounty: this.web3.toDecimal('0x' + Executed[0].data.slice(2, 66)),
            fee: this.web3.toDecimal('0x' + Executed[0].data.slice(67, 130)),
            estimatedGas: this.web3.toDecimal('0x' + Executed[0].data.slice(131, 194))
          })
        }
        else reject(err)
      })
    })
  }

  getBucket() {
    let sign = -1
    let bucketSize = 240

    if (this.temporalUnit == 2) {
      bucketSize = 3600
      sign = 1
    }
    
    return sign * this.windowStart - (this.windowStart % bucketSize)
  }

  /**
   * Claim props/methods
   */

  get claimedBy() {
    this.checkData()
    return this.data.claimData.claimedBy
  }

  get isClaimed() {
    this.checkData()
    return this.data.claimData.claimedBy !== Constants.NULL_ADDRESS
  }

  isClaimedBy(address) {
    this.checkData()
    return this.claimedBy === address
  }

  get requiredDeposit() {
    this.checkData()
    return this.data.claimData.requiredDeposit
  }

  async claimPaymentModifier() {
    // If the data is not filled it will cause errors.
    if (!this.data.claimData.paymentModifier) {
      await this.refreshData();
    }

    // console.log(this.claimData)
    
    // TxRequest is claimed and already has a set paymentModifier.
    if (this.isClaimed) {
      return new BigNumber(this.data.claimData.paymentModifier)
    }

    // TxRequest is unclaimed so paymentModifier is calculated.
    const now = await this.now()
    const elapsed = now.minus(this.claimWindowStart)
    return elapsed.times(100).dividedToIntegerBy(this.claimWindowSize)
  }

  /**
   * Meta
   */
  get isCancelled() {
    this.checkData()
    return this.data.meta.isCancelled
  }

  get wasCalled() {
    this.checkData()
    return this.data.meta.wasCalled
  }

  get wasSuccessful() {
    this.checkData()
      return this.data.meta.wasSuccessful
  }

  get owner() {
    this.checkData()
    return this.data.meta.owner
  }

  /**
   * TxData
   */

  get toAddress() {
    this.checkData()
    return this.data.txData.toAddress
  }

  get callGas() {
    this.checkData()
    return this.data.txData.callGas
  }

  get callValue() {
    this.checkData()
    return this.data.txData.callValue
  }

  get gasPrice() {
    this.checkData()
    return this.data.txData.gasPrice
  }

  get fee() {
    this.checkData()
    return this.data.paymentData.fee
  }

  get bounty() {
    this.checkData()
    return this.data.paymentData.bounty
  }

  /**
   * Call Data
   */

  callData() {
    return new Promise((resolve, reject) => {
      this.instance.callData.call((err, callData) => {
        if (!err) resolve(callData)
        else reject(err)
      })
    })
  }

  /**
   * Data management
   */

  async fillData() {
    const requestData = await RequestData.from(this.instance)
    this.data = requestData
    return true
  }

  async refreshData() {
    if (!this.data) {
      return this.fillData()
    }
    return this.data.refresh()
  }

  /**
   * ABI convenience functions
   */

  get claimData() {
    return this.instance.claim.getData()
  }

  get executeData() {
    return this.instance.execute.getData()
  }

  get cancelData() {
    return this.instance.cancel.getData()
  }

  /**
   * Action Wrappers
   */

  /**
   * @param {Object} params Transaction object including `from`, `gas`, `gasPrice` and `value`.
   */
  claim(params) {
    return new Promise((resolve, reject) => {
      this.instance.claim(params, (err, txHash) => {
        if (err) reject(err)
        else {
          Util.waitForTransactionToBeMined(this.web3, txHash)
            .then(receipt => resolve(receipt))
            .catch(e => reject(e))
        }
      })
    })
  }

  /**
   * @param {Object} params Transaction object including `from`, `gas`, `gasPrice` and `value`.
   */
  execute(params) {
    return new Promise((resolve, reject) => {
      this.instance.execute(params, (err, txHash) => {
        if (err) reject(err)
        else {
          Util.waitForTransactionToBeMined(this.web3, txHash)
            .then(receipt => resolve(receipt))
            .catch(e => reject(e))
        }
      })
    })
  }

  /**
   * @param {Object} params Transaction object including `from`, `gas`, `gasPrice` and `value`.
   */
  cancel(params) {
    return new Promise((resolve, reject) => {
      this.instance.cancel(params, (err, txHash) => {
        if (err) reject(err)
        else {
          Util.waitForTransactionToBeMined(this.web3, txHash)
            .then(receipt => resolve(receipt))
            .catch(e => reject(e))
        }
      })
    })
  }

  /**
   * Proxy
   * @param {string} toAddress Ethereum address
   * @param {string} data Hex encoded data for the transaction to proxy
   * @param {Object} params Transaction object including `from`, `gas`, `gasPrice` and `value`.
   */
  proxy(toAddress, data, params) {
    return new Promise((resolve, reject) => {
      this.instance.proxy(toAddress, data, params, (err, txHash) => {
        if (err) reject(err)
        else {
          Util.waitForTransactionToBeMined(this.web3, txHash)
            .then(resolve) // resolves the receipt
            .catch(reject) // rejects the error
        }
      })
    })
  }

  /**
   * Pull Payments
   */

  refundClaimDeposit(params) {
    return new Promise((resolve, reject) => {
      this.instance.refundClaimDeposit(params, (err, txHash) => {
        if (err) reject(err)
        else {
          Util.waitForTransactionToBeMined(this.web3, txHash)
            .then(resolve)
            .catch(reject)
        }
      })
    })
  }

  sendFee(params) {
    return new Promise((resolve, reject) => {
      this.instance.sendFee(params, (err, txHash) => {
        if (err) reject(err)
        else {
          Util.waitForTransactionToBeMined(this.web3, txHash)
            .then(resolve)
            .catch(reject)
        }
      })
    })
  }

  sendBounty(params) {
    return new Promise((resolve, reject) => {
      this.instance.sendBounty(params, (err, txHash) => {
        if (err) reject(err)
        else {
          Util.waitForTransactionToBeMined(this.web3, txHash)
            .then(resolve)
            .catch(reject)
        }
      })
    })
  }

  sendOwnerEther(params) {
    return new Promise((resolve, reject) => {
      this.instance.sendOwnerEther(params, (err, txHash) => {
        if (err) reject(err)
        else {
          Util.waitForTransactionToBeMined(this.web3, txHash)
            .then(resolve)
            .catch(reject)
        }
      })
    })
  }

  /**
   * Misc.
   */

  async getBalance() {
    const bal = await Util.getBalance(this.web3, this.address)
    return new BigNumber(bal)
  }

  /**
   * Error handling
   */
  checkData() {
    if (!this.data) {
      throw new Error('Data has not been filled! Please call `txRequest.fillData()` before using this method.')
    }
  }
}

module.exports = TxRequest
