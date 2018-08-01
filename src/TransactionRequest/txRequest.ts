import BigNumber from "bignumber.js";

import Constants from "../constants";
import { Address, TemporalUnit } from "../Types";
import initUtil from "../util";
import RequestData from "./requestData";

enum TXREQUEST_ERROR {
  NULL_ADDRESS = "Attempted to instantiate a TxRequest class from a null address.",
}

export default class TxRequest {
  public data: RequestData = {} as RequestData;
  public instance: any;
  public util: any;
  public web3: any;

  constructor(address: Address, web3: any) {
    if (!this.util.checkNotNullAddress(address)) {
      throw new Error(TXREQUEST_ERROR.NULL_ADDRESS);
    }

    this.web3 = web3;
    this.util = new initUtil(web3);
    this.instance = this.web3.eth
      .contract(this.util.getABI("TransactionRequestCore"))
      .at(address);
  }

  get address(): Address {
    return this.instance.address;
  }

  /**
   * Window centric getters
   */

  get claimWindowSize(): BigNumber {
    this.checkData();
    return this.data.schedule.claimWindowSize;
  }

  get claimWindowStart(): BigNumber {
    this.checkData();
    return this.windowStart.minus(this.freezePeriod).minus(this.claimWindowSize);
  }

  get claimWindowEnd(): BigNumber {
    this.checkData();
    return this.claimWindowStart.plus(this.claimWindowSize);
  }

  get freezePeriod(): BigNumber {
    this.checkData();
    return this.data.schedule.freezePeriod;
  }

  get freezePeriodStart(): BigNumber {
    this.checkData();
    return this.windowStart.plus(this.claimWindowSize);
  }

  get freezePeriodEnd(): BigNumber {
    this.checkData();
    return this.claimWindowEnd.plus(this.freezePeriod);
  }

  get temporalUnit(): TemporalUnit {
    this.checkData();
    return this.data.schedule.temporalUnit;
  }

  get windowSize(): BigNumber {
    this.checkData();
    return this.data.schedule.windowSize;
  }

  get windowStart(): BigNumber {
    this.checkData();
    return this.data.schedule.windowStart;
  }

  get reservedWindowSize(): BigNumber {
    this.checkData();
    return this.data.schedule.reservedWindowSize;
  }

  get reservedWindowEnd(): BigNumber {
    this.checkData();
    return this.windowStart.plus(this.reservedWindowSize);
  }

  get executionWindowEnd(): BigNumber {
    this.checkData();
    return this.windowStart.plus(this.windowSize);
  }

  /**
   * Dynamic getters
   */

  public async now(): Promise<BigNumber> {
    if (this.temporalUnit === 1) {
      return new BigNumber(await this.util.getBlockNumber(this.web3));
    } else if (this.temporalUnit === 2) {
      const timestamp = await this.util.getTimestamp(this.web3);
      return new BigNumber(timestamp);
    }
    throw new Error(`Unrecognized temporal unit: ${this.temporalUnit}`);
  }

  public async beforeClaimWindow(): Promise<boolean> {
    const now = await this.now();
    return this.claimWindowStart.greaterThan(now);
  }

  public async inClaimWindow(): Promise<boolean> {
    const now = await this.now();
    return (
      this.claimWindowStart.lessThanOrEqualTo(now) &&
      this.claimWindowEnd.greaterThan(now)
    );
  }

  public async inFreezePeriod(): Promise<boolean> {
    const now = await this.now();
    return (
      this.claimWindowEnd.lessThanOrEqualTo(now) &&
      this.freezePeriodEnd.greaterThan(now)
    );
  }

  public async inExecutionWindow(): Promise<boolean> {
    const now = await this.now();
    return (
      this.windowStart.lessThanOrEqualTo(now) &&
      this.executionWindowEnd.greaterThanOrEqualTo(now)
    );
  }

  public async inReservedWindow(): Promise<boolean> {
    const now = await this.now();
    return (
      this.windowStart.lessThanOrEqualTo(now) &&
      this.reservedWindowEnd.greaterThan(now)
    );
  }

  public async afterExecutionWindow(): Promise<boolean> {
    const now = await this.now();
    return this.executionWindowEnd.lessThan(now);
  }

  public async executedAt(): Promise<any> {
    return ((await this.getExecutedEvent()) as any).blockNumber;
  }

  public getExecutedEvent(): any|Promise<any> {
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

  get claimedBy(): Address {
    this.checkData();
    return this.data.claimData.claimedBy;
  }

  get isClaimed(): boolean {
    this.checkData();
    return this.data.claimData.claimedBy !== Constants.NULL_ADDRESS;
  }

  public isClaimedBy(address: any): boolean {
    this.checkData();
    return this.claimedBy === address;
  }

  get requiredDeposit(): BigNumber {
    this.checkData();
    return this.data.claimData.requiredDeposit;
  }

  public async claimPaymentModifier(): Promise<BigNumber> {
    const now = await this.now();
    const elapsed = now.minus(this.claimWindowStart);
    return elapsed.times(100).dividedToIntegerBy(this.claimWindowSize);
  }

  /**
   * Meta
   */

  get isCancelled(): boolean {
    this.checkData();
    return this.data.meta.isCancelled;
  }

  get wasCalled(): boolean {
    this.checkData();
    return this.data.meta.wasCalled;
  }

  get wasSuccessful(): boolean {
    this.checkData();
    return this.data.meta.wasSuccessful;
  }

  get owner(): Address {
    this.checkData();
    return this.data.meta.owner;
  }

  /**
   * TxData
   */

  get toAddress(): Address {
    this.checkData();
    return this.data.txData.toAddress;
  }

  get callGas(): BigNumber {
    this.checkData();
    return this.data.txData.callGas;
  }

  get callValue(): BigNumber {
    this.checkData();
    return this.data.txData.callValue;
  }

  get gasPrice(): BigNumber {
    this.checkData();
    return this.data.txData.gasPrice;
  }

  get fee(): BigNumber {
    this.checkData();
    return this.data.paymentData.fee;
  }

  get bounty(): BigNumber {
    this.checkData();
    return this.data.paymentData.bounty;
  }

  /**
   * Call Data
   */

  public callData(): Promise<any> {
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

  public async fillData(): Promise<boolean> {
    const requestData = await RequestData.from(this.instance);
    this.data = requestData;
    return true;
  }

  public async refreshData(): Promise<boolean> {
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
          this.util.waitForTransactionToBeMined(txHash, null)
            .then((receipt: any) => resolve(receipt))
            .catch((e: any) => reject(e));
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
          this.util.waitForTransactionToBeMined(txHash, null)
            .then((receipt: any) => resolve(receipt))
            .catch((e: any) => reject(e));
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
          this.util.waitForTransactionToBeMined(txHash, null)
            .then((receipt: any) => resolve(receipt))
            .catch((e: any) => reject(e));
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
          this.util.waitForTransactionToBeMined(txHash, null)
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
          this.util.waitForTransactionToBeMined(txHash, null)
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
          this.util.waitForTransactionToBeMined(txHash, null)
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
          this.util.waitForTransactionToBeMined(txHash, null)
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
          this.util.waitForTransactionToBeMined(txHash, null)
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
    const bal = await this.util.getBalance(this.address);
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

export {
  RequestData,
};
