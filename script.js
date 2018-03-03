const Web3 = require('web3')
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'))
const eac = require('./index')(web3)

const assert = (cond, msg) => {
    if (!cond) {
        throw new Error(msg)
    }
}

const main = async () => {
    const tr = eac.transactionRequest('0xebFB687B528Ac269d42abA4ab3A23C81A42a2bA7')
    await tr.fillData()
    assert(tr.wasCalled == true, 'it should have been called')
    console.log(await tr.getExecutedEvent())
    console.log(await tr.executedAt())
}
main()
