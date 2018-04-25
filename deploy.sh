#!/bin/bash
cd ethereum-alarm-clock && truffle network --clean && truffle migrate --reset && cd ..
rm -Rf lib/build/*
cp -Rf ethereum-alarm-clock/build/contracts lib/build
mv -f ethereum-alarm-clock/contracts.json lib/assets/development.json || true
mv -f ethereum-alarm-clock/development.json lib/assets || true
node ./extractABI.js