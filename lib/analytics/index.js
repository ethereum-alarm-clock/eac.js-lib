const Util = require("../util")()
const TxRequest = require("../txRequest")
const { BigNumber } = require("bignumber.js")

class Analytics {
  constructor(requestFactory) {
    this._requestFactory = requestFactory;
  }

  async getTotalEthTransferred() {
    const requestFactory = web3.eth.contract(Util.getABI('RequestFactory')).at(this._requestFactory.address);
    const fromBlock = await Util.getRequestFactoryStartBlock(web3);

    console.log(fromBlock)

    let transactions = await new Promise(resolve => {
      requestFactory
        .RequestCreated({}, { fromBlock, toBlock: 'latest' })
        .get((error, events) => {
          resolve(
            events.map(log => ({
              address: log.args.request,
              params: log.args.params
            }))
          );
        });
    });

    transactions = await Promise.all(transactions.map(async (tx) => {
      const request = new TxRequest(tx.address, web3);
      await request.fillData();
      return request;
    }));

    const weiTransferred = transactions.reduce((acc, tx) => acc.plus(tx.callValue), new BigNumber(0));
    const ethTransferred = web3.fromWei(weiTransferred, 'ether').toNumber();

    return ethTransferred;
  }
}

module.exports = Analytics;