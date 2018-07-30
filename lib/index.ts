import Constants from "./constants";
import RequestFactory from "./RequestFactory";
import Scheduler from "./Scheduler";
import TxRequest, { RequestData } from "./TransactionRequest";
import Util from "./util";
import Version from "./Version";

const initPackage = (web3: any) => {
  // if (!web3) {
  //   return {
  //     Constants,
  //     RequestData,
  //     RequestFactory,
  //     Scheduler,
  //     TxRequest,
  //     Util: new Util(null),
  //     Version,
  //   };
  // }

  // We have a web3 object to initialize contracts.
  const util = new Util(web3);
  return {
    Constants,
    RequestData,
    Util: util,
    Version,
    requestFactory: async () => {
      const chainName = await util.getChainName();
      const contracts = require(`../static/assets/${chainName}.json`);
      return new RequestFactory(contracts.requestFactory, web3);
    },
    scheduler: async () => {
      const chainName = await util.getChainName()
      const contracts = require(`../static/assets/${chainName}.json`);
      return new Scheduler(
        contracts.blockScheduler,
        contracts.timestampScheduler,
        web3,
      );
    },
    transactionRequest: (address: string) => {
      return new TxRequest(address, web3);
    },
  };
};

export default initPackage;
