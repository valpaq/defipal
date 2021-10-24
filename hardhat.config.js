require("@nomiclabs/hardhat-waffle");
require('@nomiclabs/hardhat-ethers');
require("@nomiclabs/hardhat-ganache");
require("hardhat-gas-reporter");
require("@nomiclabs/hardhat-etherscan");
require('hardhat-deploy');

const { mnemonic, ETHSCANAPIKEY, INFURAID } = require('./env.json');

task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

task("generate-wallet", "Generate q new wallet and prints its privateKey, address and mnemonic")
  .setAction(async () => {
    const wallet = ethers.Wallet.createRandom()
    console.log(`New wallet private key is ${wallet.privateKey}`)
    console.log(`New wallet public address is ${wallet.address}`)
    console.log(`New wallet mnemonic is ${JSON.stringify(wallet.mnemonic)}`)
  })


module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
    },
    testnet: {
      url: `https://rpc-mumbai.maticvigil.com/v1/89e3e92182814809b0854f599359f19d`,
      accounts: {mnemonic: mnemonic},
      gas: 40000000
    },
    mainnet: {
      url: `https://rpc-mainnet.maticvigil.com/v1/89e3e92182814809b0854f599359f19d`,
      accounts: {mnemonic: mnemonic},
      gas: 30000000, 
      gasPrice: 70000000000
    }
  },
  solidity: {
  version: "0.8.6",
  settings: {
    optimizer: {
      enabled: true
    }
   }
  },
  gasReporter: {
    currency: 'ETH',
    gasPrice: 0
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 2000000
  },
  etherscan: {
    apiKey: ETHSCANAPIKEY
  },
};
