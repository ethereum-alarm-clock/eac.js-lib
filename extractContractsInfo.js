const artifactsDir = './lib/build/contracts';
const dest = './lib/build/abi'
const fs = require('fs');
const path = require('path');

const networkId = '1002';

if (!fs.existsSync(dest)) {
  fs.mkdirSync(dest)
}

const contracts = {}

fs.readdir(artifactsDir, (err, files) => {
  files.forEach(file => {
    const contractName = uncapitalize(file.split('.json')[0]);

    const filePath = path.join(artifactsDir, file)
    const content = fs.readFileSync(filePath)
    const parsedContent = JSON.parse(content)
    const abi = parsedContent.abi

    const outputFilePath = path.join(dest, file)

    if (parsedContent.networks[networkId] && contractName !== 'migrations') {
      const address = parsedContent.networks[networkId].address;
      contracts[contractName] = address;
    }

    fs.writeFileSync(outputFilePath, JSON.stringify(abi))
  });

  fs.writeFileSync('contracts.json', JSON.stringify(contracts));
})

function uncapitalize(text) {
  return text.charAt(0).toLowerCase() + text.substr(1);
}