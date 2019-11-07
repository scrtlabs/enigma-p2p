const JSBI = require('jsbi');
const abi = require('ethereumjs-abi');
const web3Utils = require('web3-utils');
const crypto = require('../../src/common/cryptography');
const DB_PROVIDER = require('../../src/core/core_server_mock/data/provider_db');
const DbUtils = require('../../src/common/DbUtils');
const nodeUtils = require('../../src/common/utils');


function runSelectionAlgo(secretContractAddress, seed, nonce, balancesSum, balances, workers) {
  const hash = crypto.hash(abi.rawEncode(
    ['uint256', 'bytes32', 'uint256'],
    [seed, nodeUtils.add0x(secretContractAddress), nonce]
  ));
  // Find random number between [0, tokenCpt)
  let randVal = JSBI.remainder(JSBI.BigInt(hash), JSBI.BigInt(balancesSum));

  for (let i = 0; i <= balances.length; i++) {
    randVal = JSBI.subtract(randVal, balances[i]);
    if (randVal <= 0) {
      return workers[i];
    }
  }
}

/**
 * */
module.exports.createDataForTaskCreation = function () {
  const taskId = nodeUtils.remove0x(web3Utils.randomHex(32));
  const preCode = [56, 86, 27];
  const encryptedArgs = web3Utils.randomHex(32);
  const encryptedFn = web3Utils.randomHex(32);
  const userDHKey = web3Utils.randomHex(32);
  const gasLimit = 10;

  return {
    taskId: taskId,
    preCode: preCode,
    encryptedArgs: encryptedArgs,
    encryptedFn: encryptedFn,
    userDHKey: userDHKey,
    gasLimit: gasLimit
  };
};

module.exports.createDataForTaskSubmission = function () {
  const taskId = nodeUtils.remove0x(web3Utils.randomHex(32));
  const delta = [20, 30, 66];
  const output = "ff123456";
  const deltaHash = crypto.hash(delta);
  const outputHash = crypto.hash(output);
  const blockNumber = 0;
  const usedGas = 90;
  const ethereumPayload = "";
  const ethereumAddress = "";
  const signature = "";
  const preCodeHash = "";
  const status = "SUCCESS";

  return {
    taskId: taskId,
    delta: delta,
    deltaHash: deltaHash,
    outputHash: outputHash,
    output: output,
    blockNumber: blockNumber,
    usedGas: usedGas,
    ethereumPayload: ethereumPayload,
    ethereumAddress: ethereumAddress,
    signature: signature,
    preCodeHash: preCodeHash,
    status: status
  };
}

module.exports.createDataForSelectionAlgorithm = function () {
  const workersA = [nodeUtils.remove0x(web3Utils.randomHex(20).toLowerCase()),
  nodeUtils.remove0x(web3Utils.randomHex(20).toLowerCase()),
  nodeUtils.remove0x(web3Utils.randomHex(20).toLowerCase()),
  nodeUtils.remove0x(web3Utils.randomHex(20).toLowerCase()),
  nodeUtils.remove0x(web3Utils.randomHex(20).toLowerCase())];
  const workersB = [nodeUtils.remove0x(web3Utils.randomHex(20).toLowerCase()),
  nodeUtils.remove0x(web3Utils.randomHex(20).toLowerCase()),
  nodeUtils.remove0x(web3Utils.randomHex(20).toLowerCase()),
  nodeUtils.remove0x(web3Utils.randomHex(20).toLowerCase()),
  nodeUtils.remove0x(web3Utils.randomHex(20).toLowerCase())];

  const balancesA = [crypto.toBN(1), crypto.toBN(2), crypto.toBN(3), crypto.toBN(4), crypto.toBN(5)];
  const balancesB = [crypto.toBN(5), crypto.toBN(4), crypto.toBN(3), crypto.toBN(2), crypto.toBN(1)];
  const seed = 10;
  const nonce = 0;
  const epochSize = 100;

  let params = [{ workers: workersA, balances: balancesA, seed: seed, nonce: nonce, firstBlockNumber: 300 },
  { workers: workersB, balances: balancesB, seed: seed, nonce: nonce, firstBlockNumber: 400 },
  { workers: workersB, balances: balancesB, seed: seed, nonce: nonce, firstBlockNumber: 0 },
  { workers: workersB, balances: balancesB, seed: seed, nonce: nonce, firstBlockNumber: 100 },
  { workers: workersB, balances: balancesB, seed: seed, nonce: nonce, firstBlockNumber: 200 }];

  let balancesSum = balancesA.reduce((a, b) => JSBI.add(a, b), JSBI.BigInt(0));

  const secretContractAddress = nodeUtils.remove0x(web3Utils.randomHex(32));

  const expected = runSelectionAlgo(secretContractAddress, seed, nonce, balancesSum, balancesA, workersA);

  return {
    params: params,
    expectedAddress: expected,
    expectedParams: params[0],
    secretContractAddress: secretContractAddress,
    epochSize: epochSize
  };
};

module.exports.transformStatesListToMap = (statesList) => {
  const statesMap = {};
  for (let i = 0; i < statesList.length; ++i) {
    const address = statesList[i].address;
    if (!(address in statesMap)) {
      statesMap[address] = {};
    }
    const key = statesList[i].key;
    const delta = statesList[i].data;
    statesMap[address][key] = delta;
  }
  return statesMap;
};

module.exports.PROVIDERS_DB_MAP = this.transformStatesListToMap(DB_PROVIDER);

function getEthereumBlockNumber(web3) {
  return new Promise((resolve, reject) => {
    web3.eth.getBlockNumber((error, data) => error ? reject(error) : resolve(data));
  });
}
module.exports.advanceXConfirmations = async function (web3, confirmations = 12) {
  let initialEthereumBlockNumber = await getEthereumBlockNumber(web3);
  let ethereumBlockNumber = 0;

  const accounts = await web3.eth.getAccounts();
  const from = accounts[9];
  const to = accounts[10];

  // +2 because this function usually starts before the api call
  // TODO fix this somehow - need to be exact
  while (ethereumBlockNumber - initialEthereumBlockNumber < confirmations + 2) {
    await web3.eth.sendTransaction(
      {
        from,
        to,
        value: 1
      }, function (err, transactionHash) {
        if (err) {
          console.log("Dummy transaction error:", err);
        }
      });
    ethereumBlockNumber = await getEthereumBlockNumber(web3);
  }
}

// add the whole DB_PROVIDER as a state in ethereum. ethereum must be running for this worker
module.exports.setEthereumState = async (api, web3, workerAddress, workerEnclaveSigningAddress) => {
  for (const address in this.PROVIDERS_DB_MAP) {
    const secretContractData = this.PROVIDERS_DB_MAP[address];
    const addressInByteArray = address.split(',').map(function (item) {
      return parseInt(item, 10);
    });

    const hexString = '0x' + DbUtils.toHexString(addressInByteArray);
    const codeHash = crypto.hash(secretContractData[-1]);
    const firstDeltaHash = crypto.hash(secretContractData[0]);
    const outputHash = web3.utils.randomHex(32);
    const gasUsed = 5;
    const optionalEthereumData = '0x00';
    const optionalEthereumContractAddress = '0x0000000000000000000000000000000000000000';
    const accounts = await web3.eth.getAccounts();

    const deploySecretContractPromise = api.deploySecretContract(hexString, codeHash, codeHash, firstDeltaHash, optionalEthereumData,
      optionalEthereumContractAddress, gasUsed, workerEnclaveSigningAddress, { from: workerAddress });
    module.exports.advanceXConfirmations(api.w3())
    await deploySecretContractPromise;

    let i = 1;

    while (i in secretContractData) {
      const taskId = web3.utils.randomHex(32);
      const delta = secretContractData[i];
      const stateDeltaHash = crypto.hash(delta);
      const commitReceiptPromise = api.commitReceipt(hexString, taskId, stateDeltaHash, outputHash, optionalEthereumData, optionalEthereumContractAddress, gasUsed,
        workerEnclaveSigningAddress, { from: workerAddress });
      module.exports.advanceXConfirmations(api.w3())
      await commitReceiptPromise;

      i++;
    }
  }
};
