#!/bin/bash
echo "Deploying contracts..."
cd ethereum-alarm-clock
truffle network --clean
truffle migrate --reset
cd ..

echo "Moving the generated contract files..."
rm -Rfv lib/build/*
cp -Rfv ethereum-alarm-clock/build/contracts lib/build

node ./extractContractsInfo.js development
mv -fv contracts.json lib/assets/development.json || true

echo "Done."