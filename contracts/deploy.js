// Deploy the livestock record anchor to local Ganache or Ethereum Sepolia.
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../server/.env') });
const { ethers } = require('ethers');

async function main() {
  const sepolia = process.argv.includes('--sepolia');
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || (!sepolia && 'http://127.0.0.1:8545');
  const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY || (!sepolia && '0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d');
  if (!rpcUrl) throw new Error('Set BLOCKCHAIN_RPC_URL in server/.env before deploying to Sepolia.');
  if (!privateKey) throw new Error('Set BLOCKCHAIN_PRIVATE_KEY in server/.env. Use a dedicated wallet funded only with Sepolia ETH.');
  const envPath = path.resolve(__dirname, '../server/.env');
  if (!fs.existsSync(envPath)) throw new Error('server/.env was not found; copy server/.env.example and configure it before deployment.');

  console.log(`📡 Connecting to ${sepolia ? 'Ethereum Sepolia' : 'local EVM'} (RPC URL hidden)...`);
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const network = await provider.getNetwork();
  const expectedChainId = sepolia ? 11155111n : 1337n;
  if (network.chainId !== expectedChainId) {
    throw new Error(`Wrong network: expected chain ID ${expectedChainId}, got ${network.chainId}. No transaction was sent.`);
  }

  const wallet = new ethers.Wallet(privateKey, provider);
  console.log(`👤 Deployer Account: ${wallet.address}`);
  const balance = await provider.getBalance(wallet.address);
  console.log(`💰 Account Balance: ${ethers.formatEther(balance)} ETH`);
  if (balance === 0n) throw new Error('Deployer wallet has no ETH on the selected network. Fund it before deploying.');

  const abiPath = path.join(__dirname, 'build/contracts_AgriChainAnchor_sol_AgriChainAnchor.abi');
  const binPath = path.join(__dirname, 'build/contracts_AgriChainAnchor_sol_AgriChainAnchor.bin');

  if (!fs.existsSync(abiPath) || !fs.existsSync(binPath)) {
    throw new Error('Compiled contract artifacts are missing. Run npm run compile:contract first.');
  }

  const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
  const bytecode = '0x' + fs.readFileSync(binPath, 'utf8').trim();

  console.log(`🚀 Deploying livestock record anchor to ${sepolia ? 'Sepolia' : 'local EVM'}...`);
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log(`🎉 Contract deployed at: ${contractAddress}`);
  if (sepolia) console.log(`🔎 https://sepolia.etherscan.io/address/${contractAddress}`);

  // Update server/.env
  let envContent = fs.readFileSync(envPath, 'utf8');
  if (/^BLOCKCHAIN_CONTRACT_ADDRESS=.*$/m.test(envContent)) {
    envContent = envContent.replace(/^BLOCKCHAIN_CONTRACT_ADDRESS=.*$/m, `BLOCKCHAIN_CONTRACT_ADDRESS=${contractAddress}`);
  } else {
    envContent = `${envContent.trimEnd()}\nBLOCKCHAIN_CONTRACT_ADDRESS=${contractAddress}\n`;
  }
  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('📝 Saved the contract address in server/.env.');
}

main().catch(err => {
  console.error('Deployment failed:', err);
  process.exit(1);
});

