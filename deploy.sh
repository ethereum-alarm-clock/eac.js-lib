#!/bin/bash
echo "Deploying contracts..."
cd ethereum-alarm-clock
truffle network --clean
truffle migrate --reset
cd ..

echo "Moving the generated contract files..."
rm -Rfv lib/build/*

echo "cp -Rfv ethereum-alarm-clock/build/* lib/build/"
cp --version
cp -Rfv ethereum-alarm-clock/build/ lib/build/*

node ./extractContractsInfo.js development
mv -fv contracts.json lib/assets/development.json || true

echo "Done."