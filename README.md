[<img src="https://s3.amazonaws.com/chronologic.network/ChronoLogic_logo.svg" width="128px">](https://github.com/chronologic)

_Note: `eac.js` is operational but we're still working out the bugs. If you use it on the mainnet please first educate yourself about the possible risks._ 

[![npm version](https://badge.fury.io/js/eac.js-lib.svg)](https://badge.fury.io/js/eac.js-lib)
[![Greenkeeper badge](https://badges.greenkeeper.io/ethereum-alarm-clock/eac.js-lib.svg)](https://greenkeeper.io/)

# eac.js-lib

This is a part of eac.js family that includes 
* [eac.js-lib](https://github.com/ethereum-alarm-clock/eac.js-lib)
* [eac.js-client](https://github.com/ethereum-alarm-clock/eac.js-client)
* [eac.js-cli](https://github.com/ethereum-alarm-clock/eac.js-cli)

Eac.js-lib is the collection of lightweight helpers and wrappers for the Ethereum Alarm Clock protocol.  

## Documentation

[Documentation is available!](https://ethereum-alarm-clock.github.io/eac.js-lib/)

## Testing

Install mocha `npm i -g mocha` and `mocha` at the root of the directory to run the test script on an isolated virtual blockchain using mocha.

## Dev version deployment

* `git submodule init ethereum-alarm-clock`
* `git submodule update`
* `cd ethereum-alarm-clock && git checkout {branch} && cd ..`
* `ganache-cli -b 4 -i 1002`
* `./deploy.sh`

## Contributing

Pull requests are always welcome. Not all functionalities of the Ethereum Alarm Clock smart contracts are translated to this library, it was mostly just utilities needed to write the client and grew from there. If you need some functionality and are not finding it in the API docs, please open a issue or contribute a pull request.

## Questions or Concerns?

Since this is alpha software, we highly encourage you to test it, use it and try to break it. We would love your feedback if you get stuck somewhere or you think something is not working the way it should be. Please open an issue if you need to report a bug or would like to leave a suggestion. Pull requests are welcome.
