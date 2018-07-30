#!/bin/bash
echo "Deploying contracts..."
cd ethereum-alarm-clock
truffle network --clean
truffle migrate --reset
cd ..

echo "Moving the generated contract files..."
rm -Rfv static/build/*
cp -Rfv ethereum-alarm-clock/build/* static/build/
cp -fv ethereum-alarm-clock/package.json static/build/ethereum-alarm-clock.json
ls static/build

node ./extractContractsInfo.js development
mv -fv contracts.json static/assets/development.json || true

echo "Done."