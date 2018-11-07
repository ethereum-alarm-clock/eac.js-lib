const Util = require("../util")()
const TxRequest = require("../txRequest")
const { BigNumber } = require("bignumber.js")

class Analytics {
  constructor(web3, scheduler, requestFactory) {
    this._web3 = web3;
    this._scheduler = scheduler;
    this._requestFactory = requestFactory;
  }

  async getTotalEthTransferred() {

    let totalEthTransferred = 0;

    this._scheduler = await this._scheduler();

    const chainName = await Util.getChainName(this._web3);

    const subdomain = chainName === 'mainnet' ? 'api' : `api-${chainName}`;
    const baseUrl = `http://${subdomain}.etherscan.io/api?module=account&action=txlist&startblock=0&endblock=99999999&sort=asc`;
    const timestampSchedulerUrl = `${baseUrl}&address=${this._scheduler.timestampScheduler.address}`;
    const blockSchedulerUrl = `${baseUrl}&address=${this._scheduler.blockScheduler.address}`;
    
    const urls = [timestampSchedulerUrl, blockSchedulerUrl];
    
    let promises = [];
      
    urls.forEach(url => {
      const resultPromise = fetch(url).then(async (resp) => {
        const response = await resp.json();
        
        if (response.status == "1" && response.message === "OK") {
          const weiTransferred = response.result.reduce((acc, tx) => acc + parseInt(tx.value), 0);
          return this._web3.fromWei(weiTransferred, 'ether');
        } else {
          throw Error(response.result);
        }
      });
      promises.push(resultPromise);
    });
    
    let values;
    try {
      values = await Promise.all(promises);
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