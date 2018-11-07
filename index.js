/* eslint global-require: "off", import/no-dynamic-require: "off" */

const Constants = require("./lib/constants")
const RequestFactory = require("./lib/requestFactory")
const Analytics = require("./lib/analytics")
const Scheduler = require("./lib/scheduling")
const TxRequest = require("./lib/txRequest")
const Util = require("./lib/util")
const RequestData = require("./lib/txRequest/requestData")
const version = require('./package.json').version;
const contracts = require("./package.json").dependencies["@ethereum-alarm-clock/contracts"];

/**
 * 
 * @param {Web3} web3 The web3 object (required). 
 * @param {Object} assetJSON The asset JSON object which contains the contracts names
 * mapped to the addresses.
 */
module.exports = (web3, assetJSON) => {
  if (!web3) {
    return {
      Constants,
      RequestFactory,
      Scheduler,
      TxRequest,
      Util: Util(),
      RequestData,
      version,
      contracts
    }
  }

  const util = Util(web3)

  const requestFactory = async () => {
    let contracts;
    if (!assetJSON) {
      const chainName = await util.getChainName()
      contracts = require(`./lib/assets/${chainName}.json`)
    } else {
      contracts = assetJSON;
    }
    return new RequestFactory(contracts.requestFactory, web3)
  };

  return {
    Constants,
    requestFactory,
    scheduler: async () => {
      let contracts;
      if (!assetJSON) {
        const chainName = await util.getChainName()
        contracts = require(`./lib/assets/${chainName}.json`)
      } else {
        contracts = assetJSON;
      }
      return new Scheduler(
        contracts.blockScheduler,
        contracts.timestampScheduler,
        web3
      )
    },
    transactionRequest: address => new TxRequest(address, web3),
    Util: util,
    RequestData,
    Analytics: new Analytics(requestFactory, web3),
    version,
    contracts
  }
}
