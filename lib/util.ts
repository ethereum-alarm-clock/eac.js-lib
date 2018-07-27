import BigNumber from 'bignumber.js';
import * as ethUtil from 'ethereumjs-util';

import Constants from './constants';

type Address = string;

export default class Util {
  public web3: any;
  
  constructor(web3: any) {
    this.web3 = web3;
  }

  private checkWeb3(web3: any): any {
    if (!web3 && !this.web3) {
      throw new Error('[eac.js-lib] You must either pass a Web3 object to Util class or instatiate it with Web3 object.');
    }
    return web3 || this.web3;
  }

  calcEndowment(gas: BigNumber, value: BigNumber, gasPrice: BigNumber, fee: BigNumber, bounty: BigNumber): BigNumber {
    return bounty.add(fee).add(gas.times(gasPrice)).add(gasPrice.times(180000)).add(value);
  }

  checkForUnlockedAccount = () => {
    throw new Error("[eac.js-lib] Deprecated.");
  }

  checkNetworkID(web3: any): Promise<boolean> {
    web3 = this.checkWeb3(web3);

    return new Promise((resolve: any, reject: any) => {
      web3.version.getNetwork((err: any, netId: any) => {
        switch (netId) {
          case '1':
            // mainnet
            resolve(false); break;
          case '3':
            // ropsten
            resolve(true); break;
          case '4':
            // rinkeby
            resolve(false); break;
          case '42':
            // kovan
            resolve(true); break;
          case '1001':
            // docker
            resolve(true); break;
          case '1002':
            // development
            resolve(true); break;
          default:
            resolve(false);
        }
      })
    })
  }

  checkNotNullAddress(address: Address): boolean {
    return address !== Constants.NULL_ADDRESS;
  }

  checkValidAddress(address: Address): boolean {
    return ethUtil.isValidAddress(address);
  }

  estimateGas(web3: any, opts: {}): Promise<number> {
    web3 = this.checkWeb3(web3);

    return new Promise((resolve: any, reject: any) => {
      web3.eth.estimateGas(opts, (err: any, gas: any) => {
        if (!err) {
          resolve(gas);
        } else {
          reject(err);
        }
      })
    })
  }

  getABI(name: string): {} {
    return require(`${__dirname}/build/abi/${name}.json`);
  }

  getBalance(web3: any, address: Address): Promise<number> {
    web3 = this.checkWeb3(web3);

    return new Promise((resolve: any, reject: any) => {
      web3.eth.getBalance(address, (err: any, bal: any) => {
        if (!err) {
          resolve(bal);
        } else {
          reject(err);
        }
      })
    })
  }

  getBlockNumber(web3: any): Promise<number> {
    web3 = this.checkWeb3(web3);

    return new Promise((resolve: any, reject: any) => {
      web3.eth.getBlockNumber((err: any, blockNum: any) => {
        if (!err) {
          resolve(blockNum);
        } else {
          reject(err);
        }
      })
    })
  }

  getGasPrice(web3: any): Promise<number> {
    web3 = this.checkWeb3(web3);

    return new Promise((resolve: any, reject: any) => {
      web3.eth.getGasPrice((err: any, gasPrice: any) => {
        if (!err) {
          resolve(gasPrice);
        } else {
          reject(err);
        }
      })
    })
  }

  getTimestamp(web3: any): Promise<number> {
    web3 = this.checkWeb3(web3);

    return new Promise((resolve: any, reject: any) => {
      web3.eth.getBlock('latest', (err: any, block: any) => {
        if (!err) {
          resolve(block.timestamp);
        } else {
          reject(err);
        }
      })
    })
  }

  getTimestampForBlock(web3: any, blockNum: any): Promise<number> {
    web3 = this.checkWeb3(web3);
    
    this.getBlockNumber(web3).then((curBlockNum) => {
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
        })
      })
    })
  }

  getTxRequestFromReceipt(receipt: any): Address {
    const newRequestLog = receipt.logs.find((log) => {
      return log.topics[0] === Constants.NEWREQUESTLOG;
    })

    if (!newRequestLog) {
      throw new Error('[eac.js-lib] Invalid receipt passed!');
    }

    return "0x" + newRequestLog.data.slice(-40);
  }

  getChainName(web3: any): Promise<string> {
    web3 = this.checkWeb3(web3);

    return new Promise((resolve: any, reject: any) => {
      web3.version.getNetwork((err: any, netId: any) => {
        switch (netId) {
          case '1':
            reject("Not implemented on mainnet.");
            break;
          case '3':
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
      })
    })
  }

  waitForTransactionToBeMined(web3: any, txHash: any, interval: any): Promise<any> {
    interval = interval || 500;
    web3 = this.checkWeb3(web3);

    const txReceiptAsync = (txHash: any, resolve: any, reject: any) => {
      web3.eth.getTransactionReceipt(txHash, (err: any, receipt: any) => {
        if (err) {
          reject(err);
        } else if (receipt === null) {
          setTimeout(() => {
            txReceiptAsync(txHash, resolve, reject)
          }, interval);
        } else {
          resolve(receipt);
        }
      })
    }

    return new Promise((resolve: any, reject: any) => {
      txReceiptAsync(txHash, resolve, reject);
    })
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
