/* eslint global-require: "off", import/no-dynamic-require: "off" */

const Constants = require("./lib/constants")
const RequestFactory = require("./lib/requestFactory")
const Scheduler = require("./lib/scheduling")
const TxRequest = require("./lib/txRequest")
const Util = require("./lib/util")
const RequestData = require("./lib/txRequest/requestData")

module.exports = (web3) => {
  if (!web3) {
    return {
      Constants,
      RequestFactory,
      Scheduler,
      TxRequest,
      Util: Util(),
      RequestData
    }
  }

  const util = Util(web3)
  return {
    Constants,
    requestFactory: async () => {
      const chainName = await util.getChainName()
      const contracts = require(`./lib/assets/${chainName}.json`)
      return new RequestFactory(contracts.requestFactory, web3)
    },
    scheduler: async () => {
      const chainName = await util.getChainName()
      const contracts = require(`./lib/assets/${chainName}.json`)
      return new Scheduler(
        contracts.blockScheduler,
        contracts.timestampScheduler,
        web3
      )
    },
    transactionRequest: address => new TxRequest(address, web3),
    Util: util,
    RequestData
  }
}
