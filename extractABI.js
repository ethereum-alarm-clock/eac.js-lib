const contracts = './lib/build/contracts';
const dest = './lib/build/abi'
const fs = require('fs');
const path = require('path');

if (!fs.existsSync(dest)) {
  fs.mkdirSync(dest)
}

fs.readdir(contracts, (err, files) => {
  files.forEach(file => {
    const filePath = path.join(contracts, file)
    const content = fs.readFileSync(filePath)
    const abi = JSON.parse(content).abi

    const outputFilePath = path.join(dest, file)
    fs.writeFileSync(outputFilePath, JSON.stringify(abi))
  });
})