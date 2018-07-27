import BigNumber from "bignumber.js";

import Constants from "../constants";
import initUtil from "../util";
import RequestData from "./requestData";

const Util = new initUtil(null);

enum TXREQUEST_ERROR {
  NULL_ADDRESS = "Attempted to instantiate a TxRequest class from a null address.",
}

export default class TxRequest {
  public data: RequestData = {} as RequestData;
  public instance: any;
  public web3: any;

  constructor(address: any, web3: any) {
    if (!Util.checkNotNullAddress(address)) {
      throw new Error(TXREQUEST_ERROR.NULL_ADDRESS);
    }

    this.web3 = web3;
    this.instance = this.web3.eth
      .contract(Util.getABI("TransactionRequestCore"))
      .at(address);
  }

  get address() {
    return this.instance.address;
  }

  /**
   * Window centric getters
   */

  get claimWindowSize() {
    this.checkData();
    return this.data.schedule.claimWindowSize;
  }

  get claimWindowStart() {
    this.checkData();
    return this.windowStart.minus(this.freezePeriod).minus(this.claimWindowSize);
  }

  get claimWindowEnd() {
    this.checkData();
    return this.claimWindowStart.plus(this.claimWindowSize);
  }

  get freezePeriod() {
    this.checkData();
    return this.data.schedule.freezePeriod;
  }

  get freezePeriodStart() {
    this.checkData();
    return this.windowStart.plus(this.claimWindowSize);
  }

  get freezePeriodEnd() {
    this.checkData();
    return this.claimWindowEnd.plus(this.freezePeriod);
  }

  get temporalUnit() {
    this.checkData();
    return this.data.schedule.temporalUnit;
  }

  get windowSize() {
    this.checkData();
    return this.data.schedule.windowSize;
  }

  get windowStart() {
    this.checkData();
    return this.data.schedule.windowStart;
  }

  get reservedWindowSize() {
    this.checkData();
    return this.data.schedule.reservedWindowSize;
  }

  get reservedWindowEnd() {
    this.checkData();
    return this.windowStart.plus(this.reservedWindowSize);
  }

  get executionWindowEnd() {
    this.checkData();
    return this.windowStart.plus(this.windowSize);
  }

  /**
   * Dynamic getters
   */

  public async now() {
    if (this.temporalUnit === 1) {
      return new BigNumber(await Util.getBlockNumber(this.web3));
    } else if (this.temporalUnit === 2) {
      const timestamp = await Util.getTimestamp(this.web3);
      return new BigNumber(timestamp);
    }
    throw new Error(`Unrecognized temporal unit: ${this.temporalUnit}`);
  }

  public async beforeClaimWindow() {
    const now = await this.now();
    return this.claimWindowStart.greaterThan(now);
  }

  public async inClaimWindow() {
    const now = await this.now();
    return (
      this.claimWindowStart.lessThanOrEqualTo(now) &&
      this.claimWindowEnd.greaterThan(now)
    );
  }

  public async inFreezePeriod() {
    const now = await this.now();
    return (
      this.claimWindowEnd.lessThanOrEqualTo(now) &&
      this.freezePeriodEnd.greaterThan(now)
    );
  }

  public async inExecutionWindow() {
    const now = await this.now();
    return (
      this.windowStart.lessThanOrEqualTo(now) &&
      this.executionWindowEnd.greaterThanOrEqualTo(now)
    );
  }

  public async inReservedWindow() {
    const now = await this.now();
    return (
      this.windowStart.lessThanOrEqualTo(now) &&
      this.reservedWindowEnd.greaterThan(now)
    );
  }

  public async afterExecutionWindow() {
    const now = await this.now();
    return this.executionWindowEnd.lessThan(now);
  }

  public async executedAt() {
    return ((await this.getExecutedEvent()) as any).blockNumber;
  }

  public getExecutedEvent() {
    if (!this.wasCalled) {
      return {blockNumber: 0};
    }
    const events = this.instance.allEvents({fromBlock: 0, toBlock: "latest"});
    return new Promise((resolve, reject) => {
      events.get((err: any, logs: any) => {
        if (!err) {
          const Executed = logs.filter((log: any) => {
            return log.topics[0] === "0x3e504bb8b225ad41f613b0c3c4205cdd752d1615b4d77cd1773417282fcfb5d9";
          });
          resolve({
            blockNumber: Executed[0].blockNumber,
            bounty: this.web3.toDecimal("0x" + Executed[0].data.slice(2, 66)),
            estimatedGas: this.web3.toDecimal("0x" + Executed[0].data.slice(131, 194)),
            fee: this.web3.toDecimal("0x" + Executed[0].data.slice(67, 130)),
          });
        } else {
          reject(err);
        }
      });
    });
  }

  public getBucket() {
    let sign = -1;
    let bucketSize = 0;

    if (this.temporalUnit === 1) {
      bucketSize = 240;
    } else if (this.temporalUnit === 2) {
      bucketSize = 3600;
      sign = 1;
    }
    return sign * this.windowStart.toNumber() - (this.windowStart.toNumber() % bucketSize);
  }

  /**
   * Claim props/methods
   */

  get claimedBy() {
    this.checkData();
    return this.data.claimData.claimedBy;
  }

  get isClaimed() {
    this.checkData();
    return this.data.claimData.claimedBy !== Constants.NULL_ADDRESS;
  }

  public isClaimedBy(address: any) {
    this.checkData();
    return this.claimedBy === address;
  }

  get requiredDeposit() {
    this.checkData();
    return this.data.claimData.requiredDeposit;
  }

  public async claimPaymentModifier() {
    const now = await this.now();
    const elapsed = now.minus(this.claimWindowStart);
    return elapsed.times(100).dividedToIntegerBy(this.claimWindowSize);
  }

  /**
   * Meta
   */

  get isCancelled() {
    this.checkData();
    return this.data.meta.isCancelled;
  }

  get wasCalled() {
    this.checkData();
    return this.data.meta.wasCalled;
  }

  get wasSuccessful() {
    this.checkData();
    return this.data.meta.wasSuccessful;
  }

  get owner() {
    this.checkData();
    return this.data.meta.owner;
  }

  /**
   * TxData
   */

  get toAddress() {
    this.checkData();
    return this.data.txData.toAddress;
  }

  get callGas() {
    this.checkData();
    return this.data.txData.callGas;
  }

  get callValue() {
    this.checkData();
    return this.data.txData.callValue;
  }

  get gasPrice() {
    this.checkData();
    return this.data.txData.gasPrice;
  }

  get fee() {
    this.checkData();
    return this.data.paymentData.fee;
  }

  get bounty() {
    this.checkData();
    return this.data.paymentData.bounty;
  }

  /**
   * Call Data
   */

  public callData() {
    return new Promise((resolve, reject) => {
      this.instance.callData.call((err: any, callData: any) => {
        if (!err) {
          resolve(callData);
        } else {
          reject(err);
        }
      });
    });
  }

  /**
   * Data management
   */

  public async fillData() {
    const requestData = await RequestData.from(this.instance);
    this.data = requestData;
    return true;
  }

  public async refreshData() {
    if (!this.data) {
      return this.fillData();
    }
    return this.data.refresh();
  }

  /**
   * ABI convenience functions
   */

  get claimData() {
    return this.instance.claim.getData();
  }

  get executeData() {
    return this.instance.execute.getData();
  }

  get cancelData() {
    return this.instance.cancel.getData();
  }

  /**
   * Action Wrappers
   */

  /**
   * @param {Object} params Transaction object including `from`, `gas`, `gasPrice` and `value`.
   */
  public claim(params: any) {
    return new Promise((resolve, reject) => {
      this.instance.claim(params, (err: any, txHash: any) => {
        if (err) {
          reject(err);
        } else {
          Util.waitForTransactionToBeMined(this.web3, txHash, null)
            .then((receipt) => resolve(receipt))
            .catch((e) => reject(e));
        }
      });
    });
  }

  /**
   * @param {Object} params Transaction object including `from`, `gas`, `gasPrice` and `value`.
   */
  public execute(params: any) {
    return new Promise((resolve, reject) => {
      this.instance.execute(params, (err: any, txHash: any) => {
        if (err) {
          reject(err);
        } else {
          Util.waitForTransactionToBeMined(this.web3, txHash, null)
            .then((receipt) => resolve(receipt))
            .catch((e) => reject(e));
        }
      });
    });
  }

  /**
   * @param {Object} params Transaction object including `from`, `gas`, `gasPrice` and `value`.
   */
  public cancel(params: any) {
    return new Promise((resolve, reject) => {
      this.instance.cancel(params, (err: any, txHash: any) => {
        if (err) {
          reject(err);
        } else {
          Util.waitForTransactionToBeMined(this.web3, txHash, null)
            .then((receipt) => resolve(receipt))
            .catch((e) => reject(e));
        }
      });
    });
  }

  /**
   * Proxy
   * @param {string} toAddress Ethereum address
   * @param {string} data Hex encoded data for the transaction to proxy
   * @param {Object} params Transaction object including `from`, `gas`, `gasPrice` and `value`.
   */
  public proxy(toAddress: any, data: any, params: any) {
    return new Promise((resolve, reject) => {
      this.instance.proxy(toAddress, data, params, (err: any, txHash: any) => {
        if (err) {
          reject(err);
        } else {
          Util.waitForTransactionToBeMined(this.web3, txHash, null)
            .then(resolve) // resolves the receipt
            .catch(reject); // rejects the error
        }
      });
    });
  }

  /**
   * Pull Payments
   */
  public refundClaimDeposit(params: any) {
    return new Promise((resolve, reject) => {
      this.instance.refundClaimDeposit(params, (err: any, txHash: any) => {
        if (err) {
          reject(err);
        } else {
          Util.waitForTransactionToBeMined(this.web3, txHash, null)
            .then(resolve)
            .catch(reject);
        }
      });
    });
  }

  public sendFee(params: any) {
    return new Promise((resolve, reject) => {
      this.instance.sendFee(params, (err: any, txHash: any) => {
        if (err) {
          reject(err);
        } else {
          Util.waitForTransactionToBeMined(this.web3, txHash, null)
            .then(resolve)
            .catch(reject);
        }
      });
    });
  }

  public sendBounty(params: any) {
    return new Promise((resolve, reject) => {
      this.instance.sendBounty(params, (err: any, txHash: any) => {
        if (err) {
          reject(err);
        } else {
          Util.waitForTransactionToBeMined(this.web3, txHash, null)
            .then(resolve)
            .catch(reject);
        }
      });
    });
  }

  public sendOwnerEther(params: any) {
    return new Promise((resolve, reject) => {
      this.instance.sendOwnerEther(params, (err: any, txHash: any) => {
        if (err) {
          reject(err);
        } else {
          Util.waitForTransactionToBeMined(this.web3, txHash, null)
            .then(resolve)
            .catch(reject);
        }
      });
    });
  }

  /**
   * Misc.
   */

  public async getBalance() {
    const bal = await Util.getBalance(this.web3, this.address);
    return new BigNumber(bal);
  }

  /**
   * Error handling
   */
  public checkData() {
    if (!this.data) {
      throw new Error("Data has not been filled! Please call `txRequest.fillData()` before using this method.");
    }
  }
}
