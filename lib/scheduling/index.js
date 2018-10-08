/* eslint class-methods-use-this: "off" */

const Util = require("../util")()

class Scheduler {
  constructor(bSchedulerAddress, tSchedulerAddress, web3) {
    this.web3 = web3
    try {
      const BlockSchedulerABI = Util.getABI("BlockScheduler")
      const TimestampSchedulerABI = Util.getABI("TimestampScheduler")
      this.blockScheduler = web3.eth
        .contract(BlockSchedulerABI)
        .at(bSchedulerAddress)
      this.timestampScheduler = web3.eth
        .contract(TimestampSchedulerABI)
        .at(tSchedulerAddress)
    } catch (err) {
      throw new Error(err)
    }
  }

  getFactoryAddress() {
    return new Promise((resolve, reject) => {
      this.blockScheduler.factoryAddress.call((err, address) => {
        if (!err) resolve(address)
        else reject(err)
      })
    })
  }

  initSender(opts) {
    this.sender = opts.from
    this.gasLimit = opts.gas
    this.sendValue = opts.value
  }

  setGas(gasLimit) {
    this.gasLimit = gasLimit
  }

  setSender(address) {
    // TODO verfiy with ethUtil
    this.sender = address
  }

  setSendValue(value) {
    this.sendValue = value
  }

  blockSchedule(
    toAddress,
    callData,
    callGas,
    callValue,
    windowSize,
    windowStart,
    gasPrice,
    fee,
    bounty,
    requiredDeposit,
    waitForMined = true,
    sendGasPrice
  ) {
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
          gasPrice: sendGasPrice || null,
          value: this.sendValue,
        },
        (err, txHash) => {
          if (err) reject(err)
          else {
            const miningPromise = Util.waitForTransactionToBeMined(this.web3, txHash);

            if (waitForMined) {
              miningPromise
              .then(receipt => resolve(receipt))
              .catch(e => reject(e))
            } else {
              resolve({
                transactionHash: txHash,
                miningPromise
              });
            }
          }
        }
      )
    })
  }

  timestampSchedule(
    toAddress,
    callData,
    callGas,
    callValue,
    windowSize,
    windowStart,
    gasPrice,
    fee,
    bounty,
    requiredDeposit,
    waitForMined = true,
    sendGasPrice
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
          gasPrice: sendGasPrice || null,
          value: this.sendValue,
        },
        (err, txHash) => {
          if (err) reject(err)
          else {
            const miningPromise = Util.waitForTransactionToBeMined(this.web3, txHash);

            if (waitForMined) {
              miningPromise
                .then(receipt => resolve(receipt))
                .catch(e => reject(e))
            } else {
              resolve({
                transactionHash: txHash,
                miningPromise
              });
            }
          }
        }
      )
    })
  }
}

module.exports = Scheduler
