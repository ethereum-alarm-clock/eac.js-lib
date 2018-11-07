const Util = require("../util")()
const TxRequest = require("../txRequest")
const { BigNumber } = require("bignumber.js")

class Analytics {
  constructor(requestFactory, web3) {
    this._requestFactory = requestFactory;
    this._web3 = web3;
  }

  async getTotalEthTransferred() {

    let totalEthTransferred = 0;

    try {
      const baseUrl = 'http://api.etherscan.io/api?module=account&action=txlist&startblock=0&endblock=99999999&sort=asc&';
      const timestampSchedulerUrl = baseUrl + 'address=0x09e0c54ed4cffca45d691d5eb7b976d650f5904c';
      const blockSchedulerUrl = baseUrl + 'address=0x56efae8a6d07fb29c24e67d76f3eccac180cf527';
  
      const urls = [timestampSchedulerUrl, blockSchedulerUrl];
  
      let promises = [];
  
      urls.forEach(url => {
        const resultPromise = fetch(url).then(async (resp) => {
          const response = await resp.json();
          const weiTransferred = response.result.reduce((acc, tx) => acc + parseInt(tx.value), 0);
          return this._web3.fromWei(weiTransferred, 'ether');
        });
  
        promises.push(resultPromise);
      });
  
      const values = await Promise.all(promises);
      totalEthTransferred = values.reduce((acc, value) => acc + parseFloat(value), 0);
    } catch (e) {
      console.log('Unable to connect to Etherscan. Fetching analytics natively...');
      totalEthTransferred = this.getTotalEthTransferredNatively();
    }

    return totalEthTransferred;
  }

  async getTotalEthTransferredNatively() {
    const requestFactory = this._web3.eth.contract(Util.getABI('RequestFactory')).at(this._requestFactory.address);
    const fromBlock = await Util.getRequestFactoryStartBlock(this._web3);

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
      const request = new TxRequest(tx.address, this._web3);
      await request.fillData();
      return request;
    }));

    const weiTransferred = transactions.reduce((acc, tx) => acc.plus(tx.callValue), new BigNumber(0));
    const ethTransferred = this._web3.fromWei(weiTransferred, 'ether').toNumber();

    return ethTransferred;
  }
}

module.exports = Analytics;