const web3Utils = require('web3-utils');
const crypto = require('../../src/common/cryptography');

function runSelectionAlgo(secretContractAddress, seed, nonce, balancesSum, balances, workers) {
  const hash = web3Utils.soliditySha3(
    {t: 'uint256', v: seed},
    {t: 'bytes32', v: secretContractAddress},
    {t: 'uint256', v: nonce},
  );
  // Find random number between [0, tokenCpt)
  let randVal = (web3Utils.toBN(hash).mod(web3Utils.toBN(balancesSum))).toNumber();

  for (let i = 0; i <= balances.length; i++) {
    randVal -= balances[i];
    if (randVal <= 0) {
      return workers[i];
    }
  }
}

/**
 * */
module.exports.createDataForTaskCreation = function() {
  const taskId = web3Utils.randomHex(32);
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

module.exports.createDataForTaskSubmission = function() {
  const taskId = web3Utils.randomHex(32);
  const delta = [20, 30, 66];
  const output = [59, 230, 1];
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
    output:output,
    blockNumber: blockNumber,
    usedGas: usedGas,
    ethereumPayload: ethereumPayload,
    ethereumAddress: ethereumAddress,
    signature: signature,
    preCodeHash: preCodeHash,
    status: status};
}

module.exports.createDataForSelectionAlgorithm = function() {
  const workersA = [{signer: web3Utils.toChecksumAddress(web3Utils.randomHex(20))},
    {signer: web3Utils.toChecksumAddress(web3Utils.randomHex(20))},
    {signer: web3Utils.toChecksumAddress(web3Utils.randomHex(20))},
    {signer: web3Utils.toChecksumAddress(web3Utils.randomHex(20))},
    {signer: web3Utils.toChecksumAddress(web3Utils.randomHex(20))}];
  const workersB = [{signer: web3Utils.toChecksumAddress(web3Utils.randomHex(20))},
    {signer: web3Utils.toChecksumAddress(web3Utils.randomHex(20))},
    {signer: web3Utils.toChecksumAddress(web3Utils.randomHex(20))},
    {signer: web3Utils.toChecksumAddress(web3Utils.randomHex(20))},
    {signer: web3Utils.toChecksumAddress(web3Utils.randomHex(20))}];

  const balancesA = [1, 2, 3, 4, 5];
  const balancesB = [5, 4, 3, 2, 1];
  const seed = 10;
  const nonce = 0;
  const epochSize = 100;

  let params = [{workers: workersA, balances: balancesA, seed: seed, nonce: nonce, firstBlockNumber: 300},
    {workers: workersB, balances: balancesB, seed: seed, nonce: nonce, firstBlockNumber: 400},
    {workers: workersB, balances: balancesB, seed: seed, nonce: nonce, firstBlockNumber: 0},
    {workers: workersB, balances: balancesB, seed: seed, nonce: nonce, firstBlockNumber: 100},
    {workers: workersB, balances: balancesB, seed: seed, nonce: nonce, firstBlockNumber: 200}];

  let balancesSum = balancesA.reduce((a, b) => a + b, 0);

  const secretContractAddress = web3Utils.randomHex(32);

  const expected = runSelectionAlgo(secretContractAddress, seed, nonce, balancesSum, balancesA, workersA).signer;

  return {params: params,
    expectedAddress: expected,
    expectedParams: params[0],
    secretContractAddress: secretContractAddress,
    epochSize: epochSize
  };
};

