import BigNumber from "bignumber.js";

import initUtil from "../util";
const Util = new initUtil(null);

type Address = string;

export default class Scheduler {
  public blockScheduler: any;
  public timestampScheduler: any;
  public web3: any;

  public sender: Address = "";
  public gasLimit: number = 0;
  public sendValue: number = 0;

  constructor(bSchedulerAddress: Address, tSchedulerAddress: Address, web3: any) {
    this.web3 = web3;
    try {
      const BlockSchedulerABI = Util.getABI("BlockScheduler");
      const TimestampSchedulerABI = Util.getABI("TimestampScheduler");
      this.blockScheduler = web3.eth
        .contract(BlockSchedulerABI)
        .at(bSchedulerAddress);
      this.timestampScheduler = web3.eth
        .contract(TimestampSchedulerABI)
        .at(tSchedulerAddress);
    } catch (err) {
      throw new Error(err);
    }
  }

  public getFactoryAddress(): Promise<Address> {
    return new Promise((resolve, reject) => {
      this.blockScheduler.factoryAddress.call((err: any, address: Address) => {
        if (!err) {
          resolve(address);
        } else {
          reject(err);
        }
      });
    });
  }

  public initSender(opts: any): boolean {
    this.sender = opts.from;
    this.gasLimit = opts.gas;
    this.sendValue = opts.value;
    return true;
  }

  public setGas(gasLimit: number): boolean {
    this.gasLimit = gasLimit;
    return true;
  }

  public setSender(address: Address): boolean {
    // TODO verfiy with ethUtil
    this.sender = address;
    return true;
  }

  public setSendValue(value: number): boolean {
    this.sendValue = value;
    return true;
  }

  public blockSchedule(
    toAddress: any,
    callData: any,
    callGas: any,
    callValue: any,
    windowSize: any,
    windowStart: any,
    gasPrice: any,
    fee: any,
    bounty: any,
    requiredDeposit: any,
    waitForMined: boolean = true,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      this.blockScheduler.schedule.sendTransaction(
        toAddress,
        callData,
        [
          callGas,
          callValue,
          windowSize,
          windowStart,
          gasPrice,
          fee,
          bounty,
          requiredDeposit,
        ],
        {
          from: this.sender,
          gas: this.gasLimit,
          value: this.sendValue,
        },
        (err: any, txHash: any) => {
          if (err) {
            reject(err);
          } else {
            const miningPromise = Util.waitForTransactionToBeMined(this.web3, txHash, null);

            if (waitForMined) {
              miningPromise
              .then((receipt) => resolve(receipt))
              .catch((e) => reject(e));
            } else {
              resolve({
                miningPromise,
                transactionHash: txHash,
              });
            }
          }
        },
      );
    });
  }

  public timestampSchedule(
    toAddress: any,
    callData: any,
    callGas: any,
    callValue: any,
    windowSize: any,
    windowStart: any,
    gasPrice: any,
    fee: any,
    bounty: any,
    requiredDeposit: any,
    waitForMined: boolean = true,
  ) {
    return new Promise((resolve, reject) => {
      this.timestampScheduler.schedule(
        toAddress,
        callData,
        [
          callGas,
          callValue,
          windowSize,
          windowStart,
          gasPrice,
          fee,
          bounty,
          requiredDeposit,
        ],
        {
          from: this.sender,
          gas: this.gasLimit,
          value: this.sendValue,
        },
        (err: any, txHash: any) => {
          if (err) {
            reject(err);
          } else {
            const miningPromise = Util.waitForTransactionToBeMined(this.web3, txHash, null);

            if (waitForMined) {
              miningPromise
                .then((receipt) => resolve(receipt))
                .catch((e) => reject(e));
            } else {
              resolve({
                miningPromise,
                transactionHash: txHash,
              });
            }
          }
        },
      );
    });
  }

  public calcEndowment(callGas: number, callValue: number, gasPrice: number, fee: number, bounty: number): BigNumber {
    // Convert the value to a bignumber works even if it's already one.
    const callGasBN = new BigNumber(callGas);
    const callValueBN = new BigNumber(callValue);
    const gasPriceBN = new BigNumber(gasPrice);
    const feeBN = new BigNumber(fee);
    const bountyBN = new BigNumber(bounty);

    return bountyBN
      .plus(feeBN.times(2))
      .plus(callGasBN.times(gasPrice))
      .plus(gasPriceBN.times(180000))
      .plus(callValueBN);
  }

  /**
   * Chain inits
   */

  // static initMainnet() {
  //   throw new Error("Not implemented.")
  // }

  // static initRopsten(web3) {
  //   return new Scheduler(web3, "ropsten")
  // }

  // static initRinkeby() {
  //   throw new Error("Not implemented.")
  // }

  // static initKovan(web3) {
  //   return new Scheduler(web3, "kovan")
  // }
}
