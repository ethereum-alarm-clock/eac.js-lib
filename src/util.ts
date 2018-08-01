import BigNumber from "bignumber.js";
import * as ethUtil from "ethereumjs-util";

import Constants from "./constants";

type Address = string;

enum UTIL_ERROR {
  WEB3_ERROR = "[eac.js-lib] You must either pass a Web3 object to Util class or instatiate it with Web3 object.",
  DEPRECATED = "[eac.js-lib] Deprecated.",
}

export default class Util {
  public web3: any;

  constructor(web3: any) {
    this.web3 = web3;
  }

  public calcEndowment(
    gas: BigNumber,
    value: BigNumber,
    gasPrice: BigNumber,
    fee: BigNumber,
    bounty: BigNumber,
  ): BigNumber {
    return bounty.add(fee).add(gas.times(gasPrice)).add(gasPrice.times(180000)).add(value);
  }

  public checkForUnlockedAccount() {
    throw new Error(UTIL_ERROR.DEPRECATED);
  }

  public checkNetworkID(): Promise<boolean> {
    const web3 = this.checkWeb3();

    return new Promise((resolve: any, reject: any) => {
      web3.version.getNetwork((err: any, netId: any) => {
        switch (netId) {
          case "1":
            // mainnet
            resolve(false); break;
          case "3":
            // ropsten
            resolve(true); break;
          case "4":
            // rinkeby
            resolve(false); break;
          case "42":
            // kovan
            resolve(true); break;
          case "1001":
            // docker
            resolve(true); break;
          case "1002":
            // development
            resolve(true); break;
          default:
            resolve(false);
        }
      });
    });
  }

  public checkNotNullAddress(address: Address): boolean {
    return address !== Constants.NULL_ADDRESS;
  }

  public checkValidAddress(address: Address): boolean {
    return ethUtil.isValidAddress(address);
  }

  public estimateGas(opts: {}): Promise<number> {
    const web3 = this.checkWeb3();

    return new Promise((resolve: any, reject: any) => {
      web3.eth.estimateGas(opts, (err: any, gas: any) => {
        if (!err) {
          resolve(gas);
        } else {
          reject(err);
        }
      });
    });
  }

  public getABI(name: string): {} {
    return require(`../static/build/abi/${name}.json`);
  }

  public getBalance(address: Address): Promise<number> {
    const web3 = this.checkWeb3();

    return new Promise((resolve: any, reject: any) => {
      web3.eth.getBalance(address, (err: any, bal: any) => {
        if (!err) {
          resolve(bal);
        } else {
          reject(err);
        }
      });
    });
  }

  public getBlockNumber(): Promise<number> {
    const web3 = this.checkWeb3();

    return new Promise((resolve: any, reject: any) => {
      web3.eth.getBlockNumber((err: any, blockNum: any) => {
        if (!err) {
          resolve(blockNum);
        } else {
          reject(err);
        }
      });
    });
  }

  public getGasPrice(): Promise<number> {
    const web3 = this.checkWeb3();

    return new Promise((resolve: any, reject: any) => {
      web3.eth.getGasPrice((err: any, gasPrice: any) => {
        if (!err) {
          resolve(gasPrice);
        } else {
          reject(err);
        }
      });
    });
  }

  public getTimestamp(): Promise<number> {
    const web3 = this.checkWeb3();

    return new Promise((resolve: any, reject: any) => {
      web3.eth.getBlock("latest", (err: any, block: any) => {
        if (!err) {
          resolve(block.timestamp);
        } else {
          reject(err);
        }
      });
    });
  }

  public getTimestampForBlock(blockNum: any): any {
    const web3 = this.checkWeb3();

    this.getBlockNumber().then((curBlockNum) => {
      if (blockNum > curBlockNum) {
        throw new Error(`[eac.js-lib] Passed blockNum ${blockNum} is greater than current blockNum ${curBlockNum}`);
      }

      return new Promise((resolve: any, reject: any) => {
        web3.eth.getBlock(blockNum, (err: any, block: any) => {
          if (!err) {
            resolve(block.timestamp);
          } else {
            reject(err);
          }
        });
      });
    });
  }

  public getTxRequestFromReceipt(receipt: any): Address {
    const newRequestLog = receipt.logs.find((log: any) => {
      return log.topics[0] === Constants.NEWREQUESTLOG;
    });

    if (!newRequestLog) {
      throw new Error("[eac.js-lib] Invalid receipt passed!");
    }

    return "0x" + newRequestLog.data.slice(-40);
  }

  public getChainName(): Promise<string> {
    const web3 = this.checkWeb3();

    return new Promise((resolve: any, reject: any) => {
      web3.version.getNetwork((err: any, netId: any) => {
        switch (netId) {
          case "1":
            reject("Not implemented on mainnet.");
            break;
          case "3":
            resolve("ropsten");
            break;
          case "4":
            resolve("rinkeby");
            break;
          case "42":
            resolve("kovan");
            break;
          case "1001":
            resolve("docker");
            break;
          case "1002":
            resolve("development");
            break;
          default:
            resolve("tester");
        }
      });
    });
  }

  public waitForTransactionToBeMined(txHash: any, interval: any): Promise<any> {
    interval = interval || 500;
    const web3 = this.checkWeb3();

    const txReceiptAsync = (txHash2: any, resolve: any, reject: any) => {
      web3.eth.getTransactionReceipt(txHash2, (err: any, receipt: any) => {
        if (err) {
          reject(err);
        } else if (receipt === null) {
          setTimeout(() => {
            txReceiptAsync(txHash2, resolve, reject);
          }, interval);
        } else {
          resolve(receipt);
        }
      });
    };

    return new Promise((resolve: any, reject: any) => {
      txReceiptAsync(txHash, resolve, reject);
    });
  }

  private checkWeb3(): any {
    if (!this.web3) {
      throw new Error(UTIL_ERROR.WEB3_ERROR);
    }
    return this.web3;
  }
}

// module.exports = (web3) => {
//   if (!web3) {
//     return {
//       calcEndowment,
//       checkForUnlockedAccount,
//       checkNetworkID,
//       checkNotNullAddress,
//       checkValidAddress,
//       estimateGas,
//       getABI,
//       getBalance,
//       getBlockNumber,
//       getChainName,
//       getGasPrice,
//       getTimestamp,
//       getTimestampForBlock,
//       getTxRequestFromReceipt,
//       waitForTransactionToBeMined,
//     }
//   }

//   return {
//     calcEndowment,
//     checkForUnlockedAccount: () => checkForUnlockedAccount(web3),
//     checkNetworkID: () => checkNetworkID(web3),
//     checkNotNullAddress,
//     checkValidAddress,
//     estimateGas: opts => estimateGas(web3, opts),
//     getABI,
//     getBalance: address => getBalance(web3, address),
//     getBlockNumber: () => getBlockNumber(web3),
//     getChainName: () => getChainName(web3),
//     getGasPrice: () => getGasPrice(web3),
//     getTimestamp: () => getTimestamp(web3),
//     getTimestampForBlock: blockNum => getTimestampForBlock(web3, blockNum),
//     getTxRequestFromReceipt,
//     waitForTransactionToBeMined: txHash =>
//       waitForTransactionToBeMined(web3, txHash),
//   }
// }
