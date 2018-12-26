const Util = require("../util")()
const TxRequest = require("../txRequest")
const { BigNumber } = require("bignumber.js")
const moment = require('moment');

class Analytics {
  constructor(web3, scheduler, requestFactory) {
    this._web3 = web3;
    this._scheduler = scheduler;
    this._requestFactory = requestFactory;

    this._canFetchUSD = false;
  }

  /**
    * Enables the API for fetching USD values from the Nomics API.
    * @param {string} apiKey Nomics API key that will be used for fetching (required).
    */
  async enableUSDFetching(apiKey) {
    const startBlock = await Util.getRequestFactoryStartBlock(this._web3);
    const startTimestamp = await Util.getTimestampForBlock(this._web3, startBlock);
    const startDate = moment.unix(startTimestamp);

    const url = `https://api.nomics.com/v1/exchange-rates/history?key=${apiKey}&currency=ETH&start=${startDate.toISOString()}`;

    const ethToUsdAtTimestampValues = await fetch(url).then(async (resp) => {
      const response = await resp.json();
      return response;
    });

    this.ethToUsdAtTimestampValues = ethToUsdAtTimestampValues;
    this._canFetchUSD = true;
  }

  getUsdValueAtTime(weiAmount, timestamp) {
    const ethAmount = this._web3.fromWei(weiAmount);
    const txDate = moment.unix(timestamp).utc();
    
    const roundTxDate = txDate.startOf('day');

    const timePeriod = this.ethToUsdAtTimestampValues.find(timePeriod => timePeriod.timestamp === roundTxDate.format('YYYY-MM-DD[T]HH:mm:ss[Z]'));
    
    if (timePeriod === undefined) {
      console.log(`Unable to fetch rate for date ${roundTxDate.toString()}`)
      return 0;
    }

    return parseFloat(timePeriod.rate) * parseFloat(ethAmount);
  }

  async getTotalTransferred() {
    let totalEthTransferred;
    let totalUsdTransferred;

    this._scheduler = await this._scheduler();

    const chainName = await Util.getChainName(this._web3);

    const subdomain = chainName === 'mainnet' ? 'api' : `api-${chainName}`;
    const baseUrl = `https://${subdomain}.etherscan.io/api?module=account&action=txlist&startblock=0&endblock=99999999&sort=asc`;
    const timestampSchedulerUrl = `${baseUrl}&address=${this._scheduler.timestampScheduler.address}`;
    const blockSchedulerUrl = `${baseUrl}&address=${this._scheduler.blockScheduler.address}`;
    
    const urls = [timestampSchedulerUrl, blockSchedulerUrl];
    
    let promises = [];
      
    urls.forEach(url => {
      const resultPromise = fetch(url).then(async (resp) => {
        const response = await resp.json();
        
        if (response.status == '1' && response.message === 'OK') {
          const weiTransferred = response.result.reduce((acc, tx) => acc + parseInt(tx.value), 0);
          const usdTransferred = this._canFetchUSD ? response.result.reduce((acc, tx) => acc + this.getUsdValueAtTime(tx.value, tx.timeStamp), 0) : null;

          return {
            eth: this._web3.fromWei(weiTransferred, 'ether'),
            usd: usdTransferred
          };
        } else {
          throw Error(response.result);
        }
      });
      promises.push(resultPromise);
    });
    
    let values;
    try {
      values = await Promise.all(promises);
      totalEthTransferred = values.reduce((acc, value) => acc + parseFloat(value.eth), 0);
      if (this._canFetchUSD) {
        totalUsdTransferred = values.reduce((acc, value) => acc + parseFloat(value.usd), 0);
      }
    } catch (e) {
      console.log('Unable to connect to Etherscan. Fetching analytics natively...');
      totalEthTransferred = this.getTotalEthTransferredNatively();
    }

    return {
      eth: totalEthTransferred,
      usd: this._canFetchUSD ? totalUsdTransferred : null
    };
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
