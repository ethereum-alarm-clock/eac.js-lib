const BigNumber = require("bignumber.js")
const Deployer = require("../deploy.js")
const expect = require("chai").expect

describe("Util", () => {
    let eac
    let web3

	before(async () => {
		const deployed = await Deployer()
        web3 = deployed.web3
        eac = require('../index')(web3)
    })

    it('tests init without a parameter', () => {
        const util = require('../index')().Util
        expect(util)
        .to.exist
        // console.log(util)
    })

    // it('tests init', async () => {
    //     const chainName = await eac.Util.getChainName()
    //     console.log(chainName)

    // })
})