const assert = require('assert');
const TEST_TREE = require('./test_tree').TEST_TREE;
const EthereumServices = require('../src/ethereum/EthereumServices');

const EthereumVerifier = require('../src/ethereum/EthereumVerifier');

const EnigmaContractMock = require('./ethereum/EnigmaContractMock');
const ComputeTask  = require('../src/worker/tasks/ComputeTask');
const DeployTask  = require('../src/worker/tasks/DeployTask');
const FailedResult  = require('../src/worker/tasks/Result').FailedResult;
const ComputeResult  = require('../src/worker/tasks/Result').ComputeResult;
const DeployResult  = require('../src/worker/tasks/Result').DeployResult;

const constants = require('../src/common/constants');
const errors = require('../src/common/errors');
const DbUtils = require('../src/common/DbUtils');
const Web3 = require('web3');

describe('Verifier tests', function() {
  let web3 = new Web3();

  async function verifyMinedTaskSubmission(isComputeTask, apiMock, verifier, taskId, output, delta, outputHash, deltaHash, blockNumber) {
    let task = null;
    let res = null;

    if (isComputeTask) {
      task = new ComputeResult(taskId, constants.TASK_STATUS.UNVERIFIED, output, delta, 5, "ethereumPayload", "ethereumAddress", "signature");
    }
    else {
      task = new DeployResult(taskId, constants.TASK_STATUS.UNVERIFIED, output, delta, 5, "ethereumPayload", "ethereumAddress", "signature", "preCodeHash");
    }

    let status = constants.ETHEREUM_TASK_STATUS.RECEIPT_VERIFIED;

    // ok
    apiMock.setTaskParams(taskId, deltaHash, outputHash, blockNumber, status);
    res = await verifier.verifyTaskSubmission(task);
    assert.strictEqual(res.isVerified, true);
    assert.strictEqual(res.error, null);

    // wrong deltaHash
    apiMock.setTaskParams(taskId, web3.utils.randomHex(32), outputHash, blockNumber, status);
    res = await verifier.verifyTaskSubmission(task);
    assert.strictEqual(res.isVerified, false);
    assert.strictEqual(res.error instanceof errors.TaskVerificationErr, true);

    // wrong outputHash
    apiMock.setTaskParams(taskId, deltaHash, web3.utils.randomHex(32), blockNumber, status);
    res = await verifier.verifyTaskSubmission(task);
    assert.strictEqual(res.isVerified, false);
    assert.strictEqual(res.error instanceof errors.TaskVerificationErr, true);

    // status == RECEIPT_FAILED
    status = constants.ETHEREUM_TASK_STATUS.RECEIPT_FAILED;
    apiMock.setTaskParams(taskId, deltaHash, outputHash, blockNumber, status);
    res = await verifier.verifyTaskSubmission(task);
    assert.strictEqual(res.isVerified, false);
    assert.strictEqual(res.error instanceof errors.TaskFailedErr, true);

    task = new FailedResult(taskId, constants.TASK_STATUS.FAILED, output, 5, "signature");
    res = await verifier.verifyTaskSubmission(task);
    assert.strictEqual(res.isVerified, true);
    assert.strictEqual(res.error, null);
  }

  async function init() {
    const apiMock = new EnigmaContractMock();
    const services = new EthereumServices(apiMock);
    const verifier = new EthereumVerifier(apiMock, services);

    services.initServices();
    await verifier.init();

    return {apiMock: apiMock, services: services, verifier: verifier};
  }

  async function initStuffForTaskSubmission() {
    let {apiMock, services, verifier} = await init();

    const taskId = web3.utils.randomHex(32);
    let delta = web3.utils.randomHex(32);
    let output = web3.utils.randomHex(32);
    let deltaHash = DbUtils.kecckak256Hash(delta);
    let outputHash = DbUtils.kecckak256Hash(output);
    let blockNumber = 0;

    return {apiMock: apiMock, services: services, verifier: verifier, taskId: taskId, delta: delta, deltaHash: deltaHash,
      outputHash: outputHash, output:output, blockNumber: blockNumber};
  }

  function runSelectionAlgo(secretContractAddress, seed, nonce, balancesSum, balances, workers) {
    const hash = web3.utils.soliditySha3(
      {t: 'uint256', v: seed},
      {t: 'bytes32', v: secretContractAddress},
      {t: 'uint256', v: nonce},
    );
    // Find random number between [0, tokenCpt)
    let randVal = (web3.utils.toBN(hash).mod(web3.utils.toBN(balancesSum))).toNumber();

    for (let i = 0; i <= balances.length; i++) {
      randVal -= balances[i];
      if (randVal <= 0) {
        return workers[i];
      }
    }
  }

  async function initStuffForWorkerSelection () {
    const apiMock = new EnigmaContractMock();
    const services = new EthereumServices(apiMock);
    const verifier = new EthereumVerifier(apiMock, services);

    const workersA = [{signer: web3.utils.randomHex(32)}, {signer: web3.utils.randomHex(32)}, {signer: web3.utils.randomHex(32)},
      {signer: web3.utils.randomHex(32)}, {signer: web3.utils.randomHex(32)}];
    const workersB = [{signer: web3.utils.randomHex(32)}, {signer: web3.utils.randomHex(32)}, {signer: web3.utils.randomHex(32)},
      {signer: web3.utils.randomHex(32)}, {signer: web3.utils.randomHex(32)}];
    const balancesA = [1, 2, 3, 4, 5];
    const balancesB = [5, 4, 3, 2, 1];
    const seed = 10;
    const nonce = 0;

    let params = [{workers: workersA, balances: balancesA, seed: seed, nonce: nonce, firstBlockNumber: 300},
      {workers: workersB, balances: balancesB, seed: seed, nonce: nonce, firstBlockNumber: 400},
      {workers: workersB, balances: balancesB, seed: seed, nonce: nonce, firstBlockNumber: 0},
      {workers: workersB, balances: balancesB, seed: seed, nonce: nonce, firstBlockNumber: 100},
      {workers: workersB, balances: balancesB, seed: seed, nonce: nonce, firstBlockNumber: 200}];

    let balancesSum = balancesA.reduce((a, b) => a + b, 0);

    apiMock.setEpochSize(100);
    apiMock.setWorkerParams(Array.from(params));
    services.initServices();
    await verifier.init();

    const secretContractAddress = web3.utils.randomHex(32);

    const expected = runSelectionAlgo(secretContractAddress, seed, nonce, balancesSum, balancesA, workersA).signer;

    return {apiMock: apiMock, services: services, verifier: verifier, params: params, expectedAddress: expected,
      expectedParams: params[0], secretContractAddress: secretContractAddress};

  }

  async function initStuffForTaskCreation() {
    let a = await initStuffForWorkerSelection();
    const taskId = web3.utils.randomHex(32);
    const preCode = web3.utils.randomHex(32);
    const encryptedArgs = web3.utils.randomHex(32);
    const encryptedFn = web3.utils.randomHex(32);
    const userDHKey = web3.utils.randomHex(32);
    const gasLimit = 10;

    a['taskId'] = taskId;
    a['preCode'] = preCode;
    a['encryptedArgs'] = encryptedArgs;
    a['encryptedFn']= encryptedFn;
    a['userDHKey'] = userDHKey;
    a['gasLimit'] = gasLimit;

    return a;
  }


  it('Verify task submission when receipt is already mined', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#1']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let a = await initStuffForTaskSubmission();
      // VERIFY SUBMISSION WHEN THE TASK IS MINED ALREADY
      await verifyMinedTaskSubmission(true, a.apiMock, a.verifier, a.taskId, a.output, a.delta, a.outputHash, a.deltaHash, a.blockNumber);
      await verifyMinedTaskSubmission(false, a.apiMock, a.verifier, a.taskId, a.output, a.delta, a.outputHash, a.deltaHash, a.blockNumber);
      resolve();
    });
  });

  it('Good deploy task submission before pre-mined', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#2']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let a = await initStuffForTaskSubmission();
      let task = new DeployResult(a.taskId, constants.TASK_STATUS.UNVERIFIED, a.output, a.delta, 5, "ethereumPayload", "ethereumAddress", "signature", "preCodeHash");
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;

      // ok
      a.apiMock.setTaskParams(a.taskId, web3.utils.randomHex(32), web3.utils.randomHex(32), a.blockNumber, status);
      a.verifier.verifyTaskSubmission(task).then( (res)=> {
        //console.log("promise resolved. res=" + JSON.stringify(res) + "err=" + res.error.message);
        assert.strictEqual(res.isVerified, true);
        assert.strictEqual(res.error, null);
        resolve();
      });

      const event = {stateDeltaHash: a.deltaHash, codeHash: a.outputHash, secretContractAddress: a.taskId};
      a.apiMock.triggerEvent('SecretContractDeployed', event);
    });
  });

  it('Wrong delta hash in deploy task submission pre-mined', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#3']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let a = await initStuffForTaskSubmission();
      let task = new DeployResult(a.taskId, constants.TASK_STATUS.UNVERIFIED, a.output, a.delta, 5, "ethereumPayload", "ethereumAddress", "signature", "preCodeHash");
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;

      // ok
      a.apiMock.setTaskParams(a.taskId, web3.utils.randomHex(32), web3.utils.randomHex(32), a.blockNumber, status);
      a.verifier.verifyTaskSubmission(task).then( (res)=> {
        //console.log("promise resolved. res=" + JSON.stringify(res) + "err=" + res.error.message);
        assert.strictEqual(res.isVerified, false);
        assert.strictEqual(res.error instanceof errors.TaskVerificationErr, true);
        resolve();
      });

      const event = {stateDeltaHash: web3.utils.randomHex(32), codeHash: a.outputHash, secretContractAddress: a.taskId};
      a.apiMock.triggerEvent('SecretContractDeployed', event);
    });
  });

  it('Wrong output hash in deploy task submission pre-mined', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#4']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let a = await initStuffForTaskSubmission();
      let task = new DeployResult(a.taskId, constants.TASK_STATUS.UNVERIFIED, a.output, a.delta, 5, "ethereumPayload", "ethereumAddress", "signature", "preCodeHash");
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;

      a.apiMock.setTaskParams(a.taskId, web3.utils.randomHex(32), web3.utils.randomHex(32), a.blockNumber, status);
      a.verifier.verifyTaskSubmission(task).then( (res)=> {
        //console.log("promise resolved. res=" + JSON.stringify(res) + "err=" + res.error.message);
        assert.strictEqual(res.isVerified, false);
        assert.strictEqual(res.error instanceof errors.TaskVerificationErr, true);
        resolve();
      });

      const event = {stateDeltaHash: a.deltaHash, codeHash: web3.utils.randomHex(32), secretContractAddress: a.taskId};
      a.apiMock.triggerEvent('SecretContractDeployed', event);
    });
  });

  it('Good failed task submission pre-mined', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#5']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let a = await initStuffForTaskSubmission();
      let task = new FailedResult(a.taskId, constants.TASK_STATUS.FAILED, a.output, 5, "signature");
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;

      a.apiMock.setTaskParams(a.taskId, web3.utils.randomHex(32), web3.utils.randomHex(32), a.blockNumber, status);
      a.verifier.verifyTaskSubmission(task).then( (res)=> {
        //console.log("promise resolved. res=" + JSON.stringify(res) + "err=" + res.error.message);
        assert.strictEqual(res.isVerified, true);
        assert.strictEqual(res.error , null);
        resolve();
      });

      const event = {taskId: a.taskId};
      a.apiMock.triggerEvent('ReceiptFailed', event);
    });
  });

  it('Unexpected failed deploy task submission pre-mined', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#6']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let a = await initStuffForTaskSubmission();
      let task = new FailedResult(a.taskId, constants.TASK_STATUS.FAILED, a.output, 5, "signature");
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;

      a.apiMock.setTaskParams(a.taskId, web3.utils.randomHex(32), web3.utils.randomHex(32), a.blockNumber, status);
      a.verifier.verifyTaskSubmission(task).then( (res)=> {
        //console.log("promise resolved. res=" + JSON.stringify(res) + "err=" + res.error.message);
        assert.strictEqual(res.isVerified, false);
        assert.strictEqual(res.error instanceof errors.TaskValidityErr, true);
        resolve();
      });

      const event = {stateDeltaHash: a.deltaHash, codeHash: web3.utils.randomHex(32), secretContractAddress: a.taskId};
      a.apiMock.triggerEvent('SecretContractDeployed', event);
    });
  });

  it('Unexpected non-failed deploy task submission pre-mined', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#7']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let a = await initStuffForTaskSubmission();
      let task = new DeployResult(a.taskId, constants.TASK_STATUS.UNVERIFIED, a.output, a.delta, 5, "ethereumPayload", "ethereumAddress", "signature", "preCodeHash");
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;

      a.apiMock.setTaskParams(a.taskId, web3.utils.randomHex(32), web3.utils.randomHex(32), a.blockNumber, status);
      a.verifier.verifyTaskSubmission(task).then( (res)=> {
        //console.log("promise resolved. res=" + JSON.stringify(res) + "err=" + res.error.message);
        assert.strictEqual(res.isVerified, false);
        assert.strictEqual(res.error instanceof errors.TaskFailedErr, true);
        resolve();
      });

      const event = {taskId: a.taskId};
      a.apiMock.triggerEvent('ReceiptFailed', event);
    });
  });

  it('Unexpected event for deploy task submission pre-mined', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#8']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let a = await initStuffForTaskSubmission();
      let task = new DeployResult(a.taskId, constants.TASK_STATUS.UNVERIFIED, a.output, a.delta, 5, "ethereumPayload", "ethereumAddress", "signature", "preCodeHash");
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;

      a.apiMock.setTaskParams(a.taskId, web3.utils.randomHex(32), web3.utils.randomHex(32), a.blockNumber, status);
      a.verifier.verifyTaskSubmission(task).then( (res)=> {
        //console.log("promise resolved. res=" + JSON.stringify(res) + "err=" + res.error.message);
        assert.strictEqual(res.isVerified, false);
        assert.strictEqual(res.error instanceof errors.TaskValidityErr, true);
        resolve();
      });

      const event = {taskId: a.taskId};
      a.apiMock.triggerEvent('ReceiptVerified', event);
    });
  });

  it('Good compute task submission before pre-mined', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#9']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let a = await initStuffForTaskSubmission();
      let task = new ComputeResult(a.taskId, constants.TASK_STATUS.UNVERIFIED, a.output, a.delta, 5, "ethereumPayload", "ethereumAddress", "signature");
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;

      // ok
      a.apiMock.setTaskParams(a.taskId, web3.utils.randomHex(32), web3.utils.randomHex(32), a.blockNumber, status);
      a.verifier.verifyTaskSubmission(task).then( (res)=> {
        //console.log("promise resolved. res=" + JSON.stringify(res) + "err=" + res.error.message);
        assert.strictEqual(res.isVerified, true);
        assert.strictEqual(res.error, null);
        resolve();
      });

      const event = {stateDeltaHash: a.deltaHash, outputHash: a.outputHash, taskId: a.taskId};
      a.apiMock.triggerEvent('ReceiptVerified', event);
    });
  });

  it('Wrong delta hash in compute task submission pre-mined', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#10']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let a = await initStuffForTaskSubmission();
      let task = new ComputeResult(a.taskId, constants.TASK_STATUS.UNVERIFIED, a.output, a.delta, 5, "ethereumPayload", "ethereumAddress", "signature");
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;

      // ok
      a.apiMock.setTaskParams(a.taskId, web3.utils.randomHex(32), web3.utils.randomHex(32), a.blockNumber, status);
      a.verifier.verifyTaskSubmission(task).then( (res)=> {
        //console.log("promise resolved. res=" + JSON.stringify(res) + "err=" + res.error.message);
        assert.strictEqual(res.isVerified, false);
        assert.strictEqual(res.error instanceof errors.TaskVerificationErr, true);
        resolve();
      });

      const event = {stateDeltaHash: web3.utils.randomHex(32), outputHash: a.outputHash, taskId: a.taskId};
      a.apiMock.triggerEvent('ReceiptVerified', event);
    });
  });

  it('Wrong output hash in compute task submission pre-mined', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#11']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let a = await initStuffForTaskSubmission();
      let task = new ComputeResult(a.taskId, constants.TASK_STATUS.UNVERIFIED, a.output, a.delta, 5, "ethereumPayload", "ethereumAddress", "signature");
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;

      a.apiMock.setTaskParams(a.taskId, web3.utils.randomHex(32), web3.utils.randomHex(32), a.blockNumber, status);
      a.verifier.verifyTaskSubmission(task).then( (res)=> {
        //console.log("promise resolved. res=" + JSON.stringify(res) + "err=" + res.error.message);
        assert.strictEqual(res.isVerified, false);
        assert.strictEqual(res.error instanceof errors.TaskVerificationErr, true);
        resolve();
      });

      const event = {stateDeltaHash: a.deltaHash, outputHash: web3.utils.randomHex(32), taskId: a.taskId};
      a.apiMock.triggerEvent('ReceiptVerified', event);
    });
  });

  it('Unexpected failed compute task submission pre-mined', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#12']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let a = await initStuffForTaskSubmission();
      let task = new FailedResult(a.taskId, constants.TASK_STATUS.FAILED, a.output, 5, "signature");
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;

      a.apiMock.setTaskParams(a.taskId, web3.utils.randomHex(32), web3.utils.randomHex(32), a.blockNumber, status);
      a.verifier.verifyTaskSubmission(task).then( (res)=> {
        //console.log("promise resolved. res=" + JSON.stringify(res) + "err=" + res.error.message);
        assert.strictEqual(res.isVerified, false);
        assert.strictEqual(res.error instanceof errors.TaskValidityErr, true);
        resolve();
      });

      const event = {stateDeltaHash: a.deltaHash, outputHash: web3.utils.randomHex(32), taskId: a.taskId};
      a.apiMock.triggerEvent('ReceiptVerified', event);
    });
  });

  it('Unexpected non-failed compute task submission pre-mined', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#13']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let a = await initStuffForTaskSubmission();
      let task = new ComputeResult(a.taskId, constants.TASK_STATUS.UNVERIFIED, a.output, a.delta, 5, "ethereumPayload", "ethereumAddress", "signature");
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;

      a.apiMock.setTaskParams(a.taskId, web3.utils.randomHex(32), web3.utils.randomHex(32), a.blockNumber, status);
      a.verifier.verifyTaskSubmission(task).then( (res)=> {
        //console.log("promise resolved. res=" + JSON.stringify(res) + "err=" + res.error.message);
        assert.strictEqual(res.isVerified, false);
        assert.strictEqual(res.error instanceof errors.TaskFailedErr, true);
        resolve();
      });

      const event = {taskId: a.taskId};
      a.apiMock.triggerEvent('ReceiptFailed', event);
    });
  });

  it('Delete listener compute task submission pre-mined', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#14']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let a = await initStuffForTaskSubmission();
      let task = new ComputeResult(a.taskId, constants.TASK_STATUS.UNVERIFIED, a.output, a.delta, 5, "ethereumPayload", "ethereumAddress", "signature");
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;

      a.apiMock.setTaskParams(a.taskId, web3.utils.randomHex(32), web3.utils.randomHex(32), a.blockNumber, status);
      a.verifier.verifyTaskSubmission(task).then( (res)=> {
        // SHOULD FAIL IF GETS HERE
        assert.strictEqual(true, false);
      });

      a.verifier.deleteTaskSubmissionListener(a.taskId);
      const event = {stateDeltaHash: a.deltaHash, outputHash: web3.utils.randomHex(32), taskId: a.taskId};
      a.apiMock.triggerEvent('ReceiptVerified', event);
      resolve();
    });
  });

  it('Delete listener deploy task submission pre-mined', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#15']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let a = await initStuffForTaskSubmission();
      let task = new DeployResult(a.taskId, constants.TASK_STATUS.UNVERIFIED, a.output, a.delta, 5, "ethereumPayload", "ethereumAddress", "signature", "preCodeHash");
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;

      a.apiMock.setTaskParams(a.taskId, web3.utils.randomHex(32), web3.utils.randomHex(32), a.blockNumber, status);
      a.verifier.verifyTaskSubmission(task).then( (res)=> {
        // SHOULD FAIL IF GETS HERE
        assert.strictEqual(true, false);
      });

      a.verifier.deleteTaskSubmissionListener(a.taskId);
      const event = {stateDeltaHash: a.deltaHash, codeHash: web3.utils.randomHex(32), secretContractAddress: a.taskId};
      a.apiMock.triggerEvent('SecretContractDeployed', event);
      resolve();
    });
  });

  it('Verify worker selection algorithm', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#16']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let a = await initStuffForWorkerSelection();

      // 1.Verify only the algorithm
      const observed = EthereumVerifier.selectWorkerGroup(a.secretContractAddress, a.expectedParams, web3, 1)[0];
      assert.strictEqual(observed.signer, a.expectedAddress);

      // 2. Verify the entire flow of params update
      let blockNumber = a.expectedParams.firstBlockNumber + 50;

      // with using ComputeTask
      let task = new ComputeTask(web3.utils.randomHex(32), "encryptedArgs","encryptedFn","userDHKey",
        5, a.secretContractAddress);
      let res = await a.verifier.verifySelectedWorker(task, blockNumber, a.expectedAddress);
      assert.strictEqual(res.isVerified, true);
      assert.strictEqual(res.error, null);

      res = await a.verifier.verifySelectedWorker(task, blockNumber, web3.utils.randomHex(32));
      assert.strictEqual(res.isVerified, false);
      assert.strictEqual(res.error instanceof errors.WorkerSelectionVerificationErr, true);

      // with using DeployTask
      task = new DeployTask(a.secretContractAddress, "preCode","encryptedArgs","encryptedFn","userDHKey",
        5, web3.utils.randomHex(32));

      res = await a.verifier.verifySelectedWorker(task, blockNumber, a.expectedAddress);
      assert.strictEqual(res.isVerified, true);
      assert.strictEqual(res.error, null);

      res = await a.verifier.verifySelectedWorker(task, blockNumber, web3.utils.randomHex(32));
      assert.strictEqual(res.isVerified, false);
      assert.strictEqual(res.error instanceof errors.WorkerSelectionVerificationErr, true);

      // verify unexpected future block number
      blockNumber = 550;
      res = await a.verifier.verifySelectedWorker(task, blockNumber, a.expectedAddress);
      assert.strictEqual(res.isVerified, false);
      assert.strictEqual(res.error instanceof errors.TaskValidityErr, true);

      // now add another param and expect the task to be verified
      const event = {seed: a.expectedParams.seed, blockNumber: 500, workers: a.expectedParams.workers, balances: a.expectedParams.balances, nonce: a.expectedParams.nonce};
      a.apiMock.triggerEvent('WorkersParameterized', event);

      res = await a.verifier.verifySelectedWorker(task, blockNumber, a.expectedAddress);
      assert.strictEqual(res.isVerified, true);
      assert.strictEqual(res.error, null);

      // verify unexpected past block number
      blockNumber = 0;
      res = await a.verifier.verifySelectedWorker(task, blockNumber, a.expectedAddress);
      assert.strictEqual(res.isVerified, false);
      assert.strictEqual(res.error instanceof errors.TaskValidityErr, true);

      resolve();
    });
  });

  it('Deploy task creation post-mined', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#17']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let a = await initStuffForTaskCreation();

      let task = new DeployTask(a.secretContractAddress, a.preCode, a.encryptedArgs, a.encryptedFn, a.userDHKey, a.gasLimit, web3.utils.randomHex(32));
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;

      let blockNumber = a.expectedParams.firstBlockNumber + 50;

      a.apiMock.setTaskParams(a.secretContractAddress, web3.utils.randomHex(32), web3.utils.randomHex(32), blockNumber, status);
      a.verifier.verifyTaskCreation(task, a.expectedAddress).then( (res)=> {
        assert.strictEqual(res.isVerified, true);
        assert.strictEqual(res.error, null);
        resolve();
      });
    });
  });

  it('Wrong worker in deploy task creation post-mined', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#18']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let a = await initStuffForTaskCreation();

      let task = new DeployTask(a.secretContractAddress, a.preCode, a.encryptedArgs, a.encryptedFn, a.userDHKey, a.gasLimit, web3.utils.randomHex(32));
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;

      let blockNumber = a.expectedParams.firstBlockNumber + 50;

      a.apiMock.setTaskParams(a.secretContractAddress, web3.utils.randomHex(32), web3.utils.randomHex(32), blockNumber, status);
      a.verifier.verifyTaskCreation(task, web3.utils.randomHex(32)).then( (res)=> {
        assert.strictEqual(res.isVerified, false);
        assert.strictEqual(res.error instanceof errors.WorkerSelectionVerificationErr, true);
        resolve();
      });
    });
  });

  it('Wrong task status in deploy task creation post-mined', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#19']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let a = await initStuffForTaskCreation();

      let task = new DeployTask(a.secretContractAddress, a.preCode, a.encryptedArgs, a.encryptedFn, a.userDHKey, a.gasLimit, web3.utils.randomHex(32));
      let status = constants.ETHEREUM_TASK_STATUS.RECEIPT_FAILED;

      let blockNumber = a.expectedParams.firstBlockNumber + 50;

      a.apiMock.setTaskParams(a.secretContractAddress, web3.utils.randomHex(32), web3.utils.randomHex(32), blockNumber, status);
      a.verifier.verifyTaskCreation(task, a.expectedAddress).then( (res)=> {
        assert.strictEqual(res.isVerified, false);
        assert.strictEqual(res.error instanceof errors.TaskValidityErr, true);
        resolve();
      });
    });
  });

  it('Wrong task status in deploy task creation post-mined 2', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#20']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let a = await initStuffForTaskCreation();

      let task = new DeployTask(a.secretContractAddress, a.preCode, a.encryptedArgs, a.encryptedFn, a.userDHKey, a.gasLimit, web3.utils.randomHex(32));
      let status = constants.ETHEREUM_TASK_STATUS.RECEIPT_VERIFIED;

      let blockNumber = a.expectedParams.firstBlockNumber + 50;

      a.apiMock.setTaskParams(a.secretContractAddress, web3.utils.randomHex(32), web3.utils.randomHex(32), blockNumber, status);
      a.verifier.verifyTaskCreation(task, a.expectedAddress).then( (res)=> {
        assert.strictEqual(res.isVerified, false);
        assert.strictEqual(res.error instanceof errors.TaskValidityErr, true);
        resolve();
      });
    });
  });

  it('Good deploy task creation pre-mined', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#21']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let a = await initStuffForTaskCreation();
      let task = new DeployTask(a.secretContractAddress, a.preCode, a.encryptedArgs, a.encryptedFn, a.userDHKey, a.gasLimit, web3.utils.randomHex(32));
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_UNDEFINED;

      a.apiMock.setTaskParams(a.secretContractAddress, web3.utils.randomHex(32), web3.utils.randomHex(32), 0, status);
      a.verifier.verifyTaskCreation(task, a.expectedAddress).then( (res)=> {
        assert.strictEqual(res.isVerified, true);
        assert.strictEqual(res.error , null);
        resolve();
      });

      let blockNumber = a.expectedParams.firstBlockNumber + 50;

      const event = {taskId: a.secretContractAddress, inputsHash: a.inputsHash, gasLimit: a.gasLimit, blockNumber: blockNumber};
      a.apiMock.triggerEvent('TaskRecordCreated', event);
    });
  });

  it('Good deploy task creation pre-mined 2', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#22']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let a = await initStuffForTaskCreation();
      let task = new DeployTask(a.secretContractAddress, a.preCode, a.encryptedArgs, a.encryptedFn, a.userDHKey, a.gasLimit, web3.utils.randomHex(32));
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_UNDEFINED;

      a.apiMock.setTaskParams(a.secretContractAddress, web3.utils.randomHex(32), web3.utils.randomHex(32), 0, status);
      a.verifier.verifyTaskCreation(task, a.expectedAddress).then( (res)=> {
        assert.strictEqual(res.isVerified, true);
        assert.strictEqual(res.error , null);
        resolve();
      });

      let blockNumber = a.expectedParams.firstBlockNumber + 50;
      let event = {tasks: {}};
      event.tasks[a.secretContractAddress] = {taskId: a.secretContractAddress, inputsHash: a.inputsHash, gasLimit: a.gasLimit, blockNumber: blockNumber};
      event.tasks[web3.utils.randomHex(32)] = {taskId: a.secretContractAddress, inputsHash: a.inputsHash, gasLimit: a.gasLimit, blockNumber: blockNumber};
      a.apiMock.triggerEvent('TaskRecordsCreated', event);
    });
  });


  it('Compute task creation post-mined', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#23']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let a = await initStuffForTaskCreation();

      let task = new ComputeTask(a.taskId, a.encryptedArgs, a.encryptedFn, a.userDHKey, a.gasLimit, a.secretContractAddress);
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;
      let blockNumber = a.expectedParams.firstBlockNumber + 50;

      a.apiMock.setTaskParams(a.taskId, web3.utils.randomHex(32), web3.utils.randomHex(32), blockNumber, status);
      a.verifier.verifyTaskCreation(task, a.expectedAddress).then( (res)=> {
        assert.strictEqual(res.isVerified, true);
        assert.strictEqual(res.error, null);
        resolve();
      });
    });
  });

  it('Wrong worker in compute task creation post-mined', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#24']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let a = await initStuffForTaskCreation();

      let task = new ComputeTask(a.taskId, a.encryptedArgs, a.encryptedFn, a.userDHKey, a.gasLimit, web3.utils.randomHex(32));
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;
      let blockNumber = a.expectedParams.firstBlockNumber + 50;

      a.apiMock.setTaskParams(a.taskId, web3.utils.randomHex(32), web3.utils.randomHex(32), blockNumber, status);
      a.verifier.verifyTaskCreation(task, web3.utils.randomHex(32)).then( (res)=> {
        assert.strictEqual(res.isVerified, false);
        assert.strictEqual(res.error instanceof errors.WorkerSelectionVerificationErr, true);
        resolve();
      });
    });
  });

  it('Wrong task status in compute task creation post-mined', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#25']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let a = await initStuffForTaskCreation();

      let task = new ComputeTask(a.taskId, a.encryptedArgs, a.encryptedFn, a.userDHKey, a.gasLimit, web3.utils.randomHex(32));
      let status = constants.ETHEREUM_TASK_STATUS.RECEIPT_FAILED;
      let blockNumber = a.expectedParams.firstBlockNumber + 50;

      a.apiMock.setTaskParams(a.taskId, web3.utils.randomHex(32), web3.utils.randomHex(32), blockNumber, status);
      a.verifier.verifyTaskCreation(task, a.expectedAddress).then( (res)=> {
        assert.strictEqual(res.isVerified, false);
        assert.strictEqual(res.error instanceof errors.TaskValidityErr, true);
        resolve();
      });
    });
  });

  it('Wrong task status in compute task creation post-mined 2', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#26']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let a = await initStuffForTaskCreation();

      let task = new ComputeTask(a.taskId, a.encryptedArgs, a.encryptedFn, a.userDHKey, a.gasLimit, web3.utils.randomHex(32));
      let status = constants.ETHEREUM_TASK_STATUS.RECEIPT_VERIFIED;
      let blockNumber = a.expectedParams.firstBlockNumber + 50;

      a.apiMock.setTaskParams(a.taskId, web3.utils.randomHex(32), web3.utils.randomHex(32), blockNumber, status);
      a.verifier.verifyTaskCreation(task, a.expectedAddress).then( (res)=> {
        assert.strictEqual(res.isVerified, false);
        assert.strictEqual(res.error instanceof errors.TaskValidityErr, true);
        resolve();
      });
    });
  });

  it('Good compute task creation pre-mined', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#27']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let a = await initStuffForTaskCreation();
      let task = new ComputeTask(a.taskId, a.encryptedArgs, a.encryptedFn, a.userDHKey, a.gasLimit, a.secretContractAddress);
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_UNDEFINED;

      a.apiMock.setTaskParams(a.taskId, web3.utils.randomHex(32), web3.utils.randomHex(32), 0, status);
      a.verifier.verifyTaskCreation(task, a.expectedAddress).then( (res)=> {
        assert.strictEqual(res.isVerified, true);
        assert.strictEqual(res.error , null);
        resolve();
      });

      let blockNumber = a.expectedParams.firstBlockNumber + 50;
      const event = {taskId: a.taskId, inputsHash: a.inputsHash, gasLimit: a.gasLimit, blockNumber: blockNumber};
      a.apiMock.triggerEvent('TaskRecordCreated', event);
    });
  });

  it('Good compute task creation pre-mined 2', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#28']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let a = await initStuffForTaskCreation();
      let task = new ComputeTask(a.taskId, a.encryptedArgs, a.encryptedFn, a.userDHKey, a.gasLimit, a.secretContractAddress);
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_UNDEFINED;

      a.apiMock.setTaskParams(a.taskId, web3.utils.randomHex(32), web3.utils.randomHex(32), 0, status);
      a.verifier.verifyTaskCreation(task, a.expectedAddress).then( (res)=> {
        assert.strictEqual(res.isVerified, true);
        assert.strictEqual(res.error , null);
        resolve();
      });

      let blockNumber = a.expectedParams.firstBlockNumber + 50;
      let event = {tasks: {}};
      event.tasks[a.taskId] = {taskId: a.taskId, inputsHash: a.inputsHash, gasLimit: a.gasLimit, blockNumber: blockNumber};
      event.tasks[web3.utils.randomHex(32)] = {taskId: a.taskId, inputsHash: a.inputsHash, gasLimit: a.gasLimit, blockNumber: blockNumber};
      a.apiMock.triggerEvent('TaskRecordsCreated', event);
    });
  });

  it('Wrong deploy task creation pre-mined due to selection algorithm', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#29']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let a = await initStuffForTaskCreation();
      let task = new DeployTask(a.secretContractAddress, a.preCode, a.encryptedArgs, a.encryptedFn, a.userDHKey, a.gasLimit, web3.utils.randomHex(32));
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_UNDEFINED;

      a.apiMock.setTaskParams(a.secretContractAddress, web3.utils.randomHex(32), web3.utils.randomHex(32), 0, status);
      a.verifier.verifyTaskCreation(task, web3.utils.randomHex(32)).then( (res)=> {
        assert.strictEqual(res.isVerified, false);
        assert.strictEqual(res.error instanceof errors.WorkerSelectionVerificationErr, true);
        resolve();
      });

      let blockNumber = a.expectedParams.firstBlockNumber + 50;

      const event = {taskId: a.secretContractAddress, inputsHash: a.inputsHash, gasLimit: a.gasLimit, blockNumber: blockNumber};
      a.apiMock.triggerEvent('TaskRecordCreated', event);
    });
  });

  it('Wrong compute task creation pre-mined due to selection algorithm', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#30']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let a = await initStuffForTaskCreation();
      let task = new ComputeTask(a.taskId, a.encryptedArgs, a.encryptedFn, a.userDHKey, a.gasLimit, a.secretContractAddress);
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_UNDEFINED;

      a.apiMock.setTaskParams(a.taskId, web3.utils.randomHex(32), web3.utils.randomHex(32), 0, status);
      a.verifier.verifyTaskCreation(task, web3.utils.randomHex(32)).then( (res)=> {
        assert.strictEqual(res.isVerified, false);
        assert.strictEqual(res.error instanceof errors.WorkerSelectionVerificationErr, true);
        resolve();
      });

      let blockNumber = a.expectedParams.firstBlockNumber + 50;
      const event = {taskId: a.taskId, inputsHash: a.inputsHash, gasLimit: a.gasLimit, blockNumber: blockNumber};
      a.apiMock.triggerEvent('TaskRecordCreated', event);
    });
  });

});
