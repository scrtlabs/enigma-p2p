const assert = require('assert');
const TEST_TREE = require('./test_tree').TEST_TREE;
const EthereumAPIMock = require('./ethereum/EthereumAPIMock');
const EthereumVerifier = require('../src/ethereum/EthereumVerifier');
const ComputeTask  = require('../src/worker/tasks/ComputeTask');
const DeployTask  = require('../src/worker/tasks/DeployTask');
const FailedResult  = require('../src/worker/tasks/Result').FailedResult;
const ComputeResult  = require('../src/worker/tasks/Result').ComputeResult;
const DeployResult  = require('../src/worker/tasks/Result').DeployResult;

const constants = require('../src/common/constants');
const cryptography = require('../src/common/cryptography');
const errors = require('../src/common/errors');
const testUtils = require('./ethereum/utils');
const web3Utils = require('web3-utils');
const defaultsDeep = require('@nodeutils/defaults-deep');
const Logger = require('../src/common/logger');

describe('Verifier tests', function() {

  async function verifyMinedTaskSubmission(isComputeTask, apiMock, verifier, taskId, output, delta, outputHash, deltaHash, blockNumber) {
    let contractAddress = web3Utils.randomHex(20);

    let task = null;
    let res = null;
    let status = constants.ETHEREUM_TASK_STATUS.RECEIPT_VERIFIED;

    if (isComputeTask) {
      task = new ComputeResult(taskId, constants.TASK_STATUS.UNVERIFIED, output, {data: delta, key: 1},
        5, "ethereumPayload", "ethereumAddress", "signature");

      apiMock.setContractParams(contractAddress, null, [web3Utils.randomHex(32), deltaHash]);
      // ok
      apiMock.setTaskParams(taskId, blockNumber, status, null, null, outputHash);
    }
    else {
      task = new DeployResult(taskId, constants.TASK_STATUS.UNVERIFIED, output, {data: delta, key: 0},
        5, "ethereumPayload", "ethereumAddress", "signature", "preCodeHash");

      contractAddress = taskId;
      apiMock.setContractParams(contractAddress, outputHash, [deltaHash] );
      // ok
      apiMock.setTaskParams(taskId, blockNumber, status, null, null, null);
    }

    res = await verifier.verifyTaskSubmission(task, contractAddress, null);
    assert.strictEqual(res.isVerified, true);
    assert.strictEqual(res.error, null);

    // wrong deltaHash
    if (isComputeTask) {
      apiMock.setContractParams(contractAddress, null, [web3Utils.randomHex(32), web3Utils.randomHex(32)]);
    }
    else {
      apiMock.setContractParams(taskId, outputHash, [web3Utils.randomHex(32)]);
    }
    res = await verifier.verifyTaskSubmission(task, contractAddress, null);
    assert.strictEqual(res.isVerified, false);
    assert.strictEqual(res.error instanceof errors.TaskVerificationErr, true);

    // wrong deltaHash key
    if (isComputeTask) {
      apiMock.setContractParams(contractAddress, null, [web3Utils.randomHex(32), web3Utils.randomHex(32), deltaHash]);
    }
    else {
      apiMock.setContractParams(taskId, outputHash, [web3Utils.randomHex(32), web3Utils.randomHex(32), deltaHash]);
    }
    res = await verifier.verifyTaskSubmission(task, contractAddress, null);
    assert.strictEqual(res.isVerified, false);
    assert.strictEqual(res.error instanceof errors.TaskVerificationErr, true);

    // wrong outputHash
    if (isComputeTask) {
      apiMock.setTaskParams(taskId, blockNumber, status, null, null, web3Utils.randomHex(32));
    }
    else {
      apiMock.setContractParams(contractAddress, web3Utils.randomHex(32), [deltaHash]);
    }
    res = await verifier.verifyTaskSubmission(task, contractAddress, null);
    assert.strictEqual(res.isVerified, false);
    assert.strictEqual(res.error instanceof errors.TaskVerificationErr, true);

    // status == RECEIPT_FAILED
    status = constants.ETHEREUM_TASK_STATUS.RECEIPT_FAILED;
    if (isComputeTask) {
      apiMock.setTaskParams(taskId, blockNumber, status, null, null, outputHash);
    }
    else {
      apiMock.setTaskParams(taskId, blockNumber, status, null, null, null);
    }
    res = await verifier.verifyTaskSubmission(task, contractAddress, null);
    assert.strictEqual(res.isVerified, false);
    assert.strictEqual(res.error instanceof errors.TaskFailedErr, true);

    task = new FailedResult(taskId, constants.TASK_STATUS.FAILED, output, 5, "signature");
    res = await verifier.verifyTaskSubmission(task, contractAddress, null);
    assert.strictEqual(res.isVerified, true);
    assert.strictEqual(res.error, null);

    // Wrong key in deploy
    if (!isComputeTask) {
      status = constants.ETHEREUM_TASK_STATUS.RECEIPT_VERIFIED;
      task = new DeployResult(taskId, constants.TASK_STATUS.UNVERIFIED, output, {data: delta, key: 4},
        5, "ethereumPayload", "ethereumAddress", "signature", "preCodeHash");
      apiMock.setTaskParams(taskId, blockNumber, status, null, null, null);
      res = await verifier.verifyTaskSubmission(task, taskId, null);
      assert.strictEqual(res.isVerified, false);
      assert.strictEqual(res.error instanceof errors.TaskVerificationErr, true);
    }

    // No output
    status = constants.ETHEREUM_TASK_STATUS.RECEIPT_VERIFIED;
    if (isComputeTask) {
      task = new ComputeResult(taskId, constants.TASK_STATUS.UNVERIFIED, null, {data: delta, key: 1},
        5, "ethereumPayload", "ethereumAddress", "signature");

      apiMock.setContractParams(contractAddress, null, [web3Utils.randomHex(32), deltaHash]);
      apiMock.setTaskParams(taskId, blockNumber, status, null, null, constants.ETHEREUM_EMPTY_HASH);
      // ok
      res = await verifier.verifyTaskSubmission(task, contractAddress, null);
      assert.strictEqual(res.isVerified, true);
      assert.strictEqual(res.error, null);
    }
    else {
      task = new DeployResult(taskId, constants.TASK_STATUS.UNVERIFIED, null, {data: delta, key: 0},
        5, "ethereumPayload", "ethereumAddress", "signature", "preCodeHash");

      contractAddress = taskId;
      apiMock.setContractParams(contractAddress, outputHash, [deltaHash]);
      apiMock.setTaskParams(taskId, blockNumber, status, null, null, constants.ETHEREUM_EMPTY_HASH);
      // error
      res = await verifier.verifyTaskSubmission(task, taskId, null);
      assert.strictEqual(res.isVerified, false);
      assert.strictEqual(res.error instanceof errors.TaskVerificationErr, true);
    }

    // No Delta
    if (isComputeTask) {
      task = new ComputeResult(taskId, constants.TASK_STATUS.UNVERIFIED, output,
        5, "ethereumPayload", "ethereumAddress", "signature");

      apiMock.setContractParams(contractAddress, null,  [deltaHash]);
      apiMock.setTaskParams(taskId, blockNumber, status, null, null, outputHash);
      // ok
      res = await verifier.verifyTaskSubmission(task, contractAddress, delta);
      assert.strictEqual(res.isVerified, true);
      assert.strictEqual(res.error, null);
      // and no output
      task = new ComputeResult(taskId, constants.TASK_STATUS.UNVERIFIED, null,
        5, "ethereumPayload", "ethereumAddress", "signature");

      apiMock.setContractParams(contractAddress, null,  [deltaHash]);
      apiMock.setTaskParams(taskId, blockNumber, status, null, null, constants.ETHEREUM_EMPTY_HASH);
      // ok
      res = await verifier.verifyTaskSubmission(task, contractAddress, delta);
      assert.strictEqual(res.isVerified, true);
      assert.strictEqual(res.error, null);
    }
    else {
      task = new DeployResult(taskId, constants.TASK_STATUS.UNVERIFIED, outputHash, null,
        5, "ethereumPayload", "ethereumAddress", "signature", "preCodeHash");

      contractAddress = taskId;
      apiMock.setContractParams(contractAddress, outputHash, [deltaHash]);
      apiMock.setTaskParams(taskId, blockNumber, status, null, null, outputHash);
      // error
      res = await verifier.verifyTaskSubmission(task, taskId, null);
      assert.strictEqual(res.isVerified, false);
      assert.strictEqual(res.error instanceof errors.TaskVerificationErr, true);
    }
  }

  async function initStuffForTaskSubmission() {
    let taskData = testUtils.createDataForTaskSubmission();
    const logger = new Logger();
    const ethereumAPI = new EthereumAPIMock(logger);
    await ethereumAPI.init();

    return defaultsDeep({apiMock: ethereumAPI.api(), services: ethereumAPI.services(), verifier: ethereumAPI.verifier()}, taskData);
  }

  async function initStuffForWorkerSelection () {
    let {params, expectedAddress, expectedParams, secretContractAddress, epochSize} = testUtils.createDataForSelectionAlgorithm();

    const logger = new Logger();
    const ethereumAPI = new EthereumAPIMock(logger);
    ethereumAPI.api().setEpochSize(epochSize);
    ethereumAPI.api().setWorkerParams(Array.from(params));
    await ethereumAPI.init();

    return {apiMock: ethereumAPI.api(), services: ethereumAPI.services(), verifier: ethereumAPI.verifier(), params: params, expectedAddress: expectedAddress,
      expectedParams: expectedParams, secretContractAddress: secretContractAddress};

  }

  async function initStuffForTaskCreation() {
    let workerSelectionData = await initStuffForWorkerSelection();
    let taskData = testUtils.createDataForTaskCreation();

    return defaultsDeep(workerSelectionData, taskData);
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

  it('Good deploy task submission pre-mined', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#2']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let a = await initStuffForTaskSubmission();
      let task = new DeployResult(a.taskId, constants.TASK_STATUS.UNVERIFIED, a.output, {data: a.delta, key: 0},
        5, "ethereumPayload", "ethereumAddress", "signature", "preCodeHash");
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;

      // ok
      a.apiMock.setTaskParams(a.taskId, a.blockNumber, status);
      a.verifier.verifyTaskSubmission(task, a.taskId, null).then( (res)=> {
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
      let task = new DeployResult(a.taskId, constants.TASK_STATUS.UNVERIFIED, a.output, {data: a.delta, key: 0},
        5, "ethereumPayload", "ethereumAddress", "signature", "preCodeHash");
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;

      // ok
      a.apiMock.setTaskParams(a.taskId, a.blockNumber, status);
      a.verifier.verifyTaskSubmission(task, a.taskId, null).then( (res)=> {
        assert.strictEqual(res.isVerified, false);
        assert.strictEqual(res.error instanceof errors.TaskVerificationErr, true);
        resolve();
      });

      const event = {stateDeltaHash: web3Utils.randomHex(32), codeHash: a.outputHash, secretContractAddress: a.taskId};
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
      let task = new DeployResult(a.taskId, constants.TASK_STATUS.UNVERIFIED, a.output, {data: a.delta, key: 0},
        5, "ethereumPayload", "ethereumAddress", "signature", "preCodeHash");
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;

      a.apiMock.setTaskParams(a.taskId, a.blockNumber, status);
      a.verifier.verifyTaskSubmission(task, a.taskId, null).then( (res)=> {
        assert.strictEqual(res.isVerified, false);
        assert.strictEqual(res.error instanceof errors.TaskVerificationErr, true);
        resolve();
      });

      const event = {stateDeltaHash: a.deltaHash, codeHash: web3Utils.randomHex(32), secretContractAddress: a.taskId};
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

      a.apiMock.setTaskParams(a.taskId, a.blockNumber, status);
      a.verifier.verifyTaskSubmission(task, a.taskId, null).then( (res)=> {
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

      a.apiMock.setTaskParams(a.taskId, a.blockNumber, status);
      a.verifier.verifyTaskSubmission(task, a.taskId, null).then( (res)=> {
        assert.strictEqual(res.isVerified, false);
        assert.strictEqual(res.error instanceof errors.TaskValidityErr, true);
        resolve();
      });

      const event = {stateDeltaHash: a.deltaHash, codeHash: web3Utils.randomHex(32), secretContractAddress: a.taskId};
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
      let task = new DeployResult(a.taskId, constants.TASK_STATUS.UNVERIFIED, a.output, {data: a.delta, key: 0},
        5, "ethereumPayload", "ethereumAddress", "signature", "preCodeHash");
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;

      a.apiMock.setTaskParams(a.taskId, a.blockNumber, status);
      a.verifier.verifyTaskSubmission(task, a.taskId, null).then( (res)=> {
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
      let task = new DeployResult(a.taskId, constants.TASK_STATUS.UNVERIFIED, a.output, {data: a.delta, key: 0},
        5, "ethereumPayload", "ethereumAddress", "signature", "preCodeHash");
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;

      a.apiMock.setTaskParams(a.taskId, a.blockNumber, status);
      a.verifier.verifyTaskSubmission(task, a.taskId, null).then( (res)=> {
        assert.strictEqual(res.isVerified, false);
        assert.strictEqual(res.error instanceof errors.TaskValidityErr, true);
        resolve();
      });

      const event = {taskId: a.taskId};
      a.apiMock.triggerEvent('ReceiptVerified', event);
    });
  });

  it('Good compute task submission pre-mined', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#9']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      const key = 2;

      let a = await initStuffForTaskSubmission();
      let task = new ComputeResult(a.taskId, constants.TASK_STATUS.UNVERIFIED, a.output, {data: a.delta, key: key},
        5, "ethereumPayload", "ethereumAddress", "signature");
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;

      // ok
      a.apiMock.setTaskParams(a.taskId, a.blockNumber, status);
      a.verifier.verifyTaskSubmission(task, "40", null).then( (res)=> {
        assert.strictEqual(res.isVerified, true);
        assert.strictEqual(res.error, null);
        resolve();
      });

      const event = {stateDeltaHash: a.deltaHash, stateDeltaHashIndex: key, outputHash: a.outputHash, taskId: a.taskId};
      a.apiMock.triggerEvent('ReceiptVerified', event);
    });
  });

  it('Wrong delta hash in compute task submission pre-mined', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#10']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      const key = 2;
      let a = await initStuffForTaskSubmission();
      let task = new ComputeResult(a.taskId, constants.TASK_STATUS.UNVERIFIED, a.output, {data: a.delta, key: key},
        5, "ethereumPayload", "ethereumAddress", "signature");
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;

      // ok
      a.apiMock.setTaskParams(a.taskId, a.blockNumber, status);
      a.verifier.verifyTaskSubmission(task, "40", null).then( (res)=> {
        assert.strictEqual(res.isVerified, false);
        assert.strictEqual(res.error instanceof errors.TaskVerificationErr, true);
        resolve();
      });

      const event = {stateDeltaHash: web3Utils.randomHex(32), outputHash: a.outputHash, stateDeltaHashIndex: key, taskId: a.taskId};
      a.apiMock.triggerEvent('ReceiptVerified', event);
    });
  });

  it('Wrong output hash in compute task submission pre-mined', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#11']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      const key = 2;
      let a = await initStuffForTaskSubmission();
      let task = new ComputeResult(a.taskId, constants.TASK_STATUS.UNVERIFIED, a.output, {data: a.delta, key: key},
        5, "ethereumPayload", "ethereumAddress", "signature");
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;

      a.apiMock.setTaskParams(a.taskId, a.blockNumber, status);
      a.verifier.verifyTaskSubmission(task, "40", null).then( (res)=> {
        assert.strictEqual(res.isVerified, false);
        assert.strictEqual(res.error instanceof errors.TaskVerificationErr, true);
        resolve();
      });

      const event = {stateDeltaHash: a.deltaHash, stateDeltaHashIndex: key, outputHash: web3Utils.randomHex(32), taskId: a.taskId};
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

      a.apiMock.setTaskParams(a.taskId, a.blockNumber, status);
      a.verifier.verifyTaskSubmission(task, "40", null).then( (res)=> {
        assert.strictEqual(res.isVerified, false);
        assert.strictEqual(res.error instanceof errors.TaskValidityErr, true);
        resolve();
      });

      const event = {stateDeltaHash: a.deltaHash, outputHash: web3Utils.randomHex(32), taskId: a.taskId};
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
      let task = new ComputeResult(a.taskId, constants.TASK_STATUS.UNVERIFIED, a.output, {data: a.delta, key: 2},
        5, "ethereumPayload", "ethereumAddress", "signature");
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;

      a.apiMock.setTaskParams(a.taskId, a.blockNumber, status);
      a.verifier.verifyTaskSubmission(task, "40", null).then( (res)=> {
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
      let task = new ComputeResult(a.taskId, constants.TASK_STATUS.UNVERIFIED, a.output, {data: a.delta, key: 2},
        5, "ethereumPayload", "ethereumAddress", "signature");
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;

      a.apiMock.setTaskParams(a.taskId, a.blockNumber, status);
      a.verifier.verifyTaskSubmission(task, "40", null).then( (res)=> {
        // SHOULD FAIL IF GETS HERE
        assert.strictEqual(true, false);
      });

      a.verifier.deleteTaskSubmissionListener(a.taskId);
      const event = {stateDeltaHash: a.deltaHash, outputHash: web3Utils.randomHex(32), taskId: a.taskId};
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
      let task = new DeployResult(a.taskId, constants.TASK_STATUS.UNVERIFIED, a.output, a.delta, {data: a.delta, key: 0},
        "ethereumPayload", "ethereumAddress", "signature", "preCodeHash");
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;

      a.apiMock.setTaskParams(a.taskId, a.blockNumber, status);
      a.verifier.verifyTaskSubmission(task, "40", null).then( (res)=> {
        // SHOULD FAIL IF GETS HERE
        assert.strictEqual(true, false);
      });

      a.verifier.deleteTaskSubmissionListener(a.taskId);
      const event = {stateDeltaHash: a.deltaHash, codeHash: web3Utils.randomHex(32), secretContractAddress: a.taskId};
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
      const observed = EthereumVerifier.selectWorkerGroup(a.secretContractAddress, a.expectedParams, 1)[0];
      assert.strictEqual(observed, a.expectedAddress);

      // 2. Verify the entire flow of params update
      let blockNumber = a.expectedParams.firstBlockNumber + 50;

      // with using ComputeTask
      let task = new ComputeTask(web3Utils.randomHex(32), "encryptedArgs","encryptedFn","userDHKey",
        5, a.secretContractAddress);
      let res = await a.verifier.verifySelectedWorker(task, blockNumber, a.expectedAddress);
      assert.strictEqual(res.isVerified, true);
      assert.strictEqual(res.error, null);

      res = await a.verifier.verifySelectedWorker(task, blockNumber, web3Utils.randomHex(32));
      assert.strictEqual(res.isVerified, false);
      assert.strictEqual(res.error instanceof errors.WorkerSelectionVerificationErr, true);

      // with using DeployTask
      task = new DeployTask(a.secretContractAddress, "preCode","encryptedArgs","encryptedFn","userDHKey",
        5, a.secretContractAddress);

      res = await a.verifier.verifySelectedWorker(task, blockNumber, a.expectedAddress);
      assert.strictEqual(res.isVerified, true);
      assert.strictEqual(res.error, null);

      res = await a.verifier.verifySelectedWorker(task, blockNumber, web3Utils.randomHex(32));
      assert.strictEqual(res.isVerified, false);
      assert.strictEqual(res.error instanceof errors.WorkerSelectionVerificationErr, true);

      // now add another param and expect the task to be verified
      blockNumber = 550;
      let event = {seed: a.expectedParams.seed, firstBlockNumber: 500, workers: a.expectedParams.workers, balances: a.expectedParams.balances, nonce: a.expectedParams.nonce};
      a.apiMock.triggerEvent('WorkersParameterized', event);

      res = await a.verifier.verifySelectedWorker(task, blockNumber, a.expectedAddress);
      assert.strictEqual(res.isVerified, true);
      assert.strictEqual(res.error, null);

      // verify unexpected past block number
      blockNumber = 50;
      res = await a.verifier.verifySelectedWorker(task, blockNumber, a.expectedAddress);
      assert.strictEqual(res.isVerified, false);
      assert.strictEqual(res.error instanceof errors.TaskValidityErr, true);

      // trigger a problematic event and expect that the workers params array won'y be updated
      blockNumber = 150;
      event = {seed: a.expectedParams.seed, blockNumber:600, workers: a.expectedParams.workers, balances: a.expectedParams.balances, nonce: a.expectedParams.nonce};
      a.apiMock.triggerEvent('WorkersParameterized', event);

      res = await a.verifier.verifySelectedWorker(task, blockNumber, a.expectedAddress);
      assert.strictEqual(res.isVerified, false);
      assert.strictEqual(res.error instanceof errors.WorkerSelectionVerificationErr, true); // and not instanceof errors.TaskValidityErr

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
      let blockNumber = a.expectedParams.firstBlockNumber + 50;

      let task = new DeployTask(a.secretContractAddress, a.preCode, a.encryptedArgs, a.encryptedFn, a.userDHKey,
        a.gasLimit, a.secretContractAddress, 0);
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;

      let inputsHash = cryptography.hashArray([a.encryptedFn, a.encryptedArgs, cryptography.hash(a.preCode), a.userDHKey]);

      a.apiMock.setTaskParams(a.secretContractAddress, blockNumber, status, a.gasLimit, inputsHash);
      a.verifier.verifyTaskCreation(task, a.expectedAddress).then( (res)=> {
        assert.strictEqual(res.isVerified, true);
        assert.strictEqual(res.error, null);
        assert.strictEqual(res.gasLimit, a.gasLimit);
        assert.strictEqual(res.blockNumber, blockNumber);
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

      let task = new DeployTask(a.secretContractAddress, a.preCode, a.encryptedArgs, a.encryptedFn, a.userDHKey, a.gasLimit, a.secretContractAddress);
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;

      let blockNumber = a.expectedParams.firstBlockNumber + 50;
      let inputsHash = cryptography.hashArray([a.encryptedFn, a.encryptedArgs, cryptography.hash(a.preCode), a.userDHKey]);

      a.apiMock.setTaskParams(a.secretContractAddress, blockNumber, status, a.gasLimit, inputsHash);
      a.verifier.verifyTaskCreation(task, web3Utils.toChecksumAddress(web3Utils.randomHex(20))).then( (res)=> {
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

      let task = new DeployTask(a.secretContractAddress, a.preCode, a.encryptedArgs, a.encryptedFn, a.userDHKey, a.gasLimit, a.secretContractAddress);
      let status = constants.ETHEREUM_TASK_STATUS.RECEIPT_FAILED;

      let blockNumber = a.expectedParams.firstBlockNumber + 50;
      let inputsHash = cryptography.hashArray([a.encryptedFn, a.encryptedArgs, cryptography.hash(a.preCode), a.userDHKey]);

      a.apiMock.setTaskParams(a.secretContractAddress, blockNumber, status, a.gasLimit, inputsHash);
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

      let task = new DeployTask(a.secretContractAddress, a.preCode, a.encryptedArgs, a.encryptedFn, a.userDHKey, a.gasLimit, a.secretContractAddress);
      let status = constants.ETHEREUM_TASK_STATUS.RECEIPT_VERIFIED;

      let blockNumber = a.expectedParams.firstBlockNumber + 50;
      let inputsHash = cryptography.hashArray([a.encryptedFn, a.encryptedArgs, cryptography.hash(a.preCode), a.userDHKey]);

      a.apiMock.setTaskParams(a.secretContractAddress, blockNumber, status, a.gasLimit, inputsHash);
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
      let blockNumber = a.expectedParams.firstBlockNumber + 50;
      let task = new DeployTask(a.secretContractAddress, a.preCode, a.encryptedArgs, a.encryptedFn, a.userDHKey, a.gasLimit, a.secretContractAddress, 0);
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_UNDEFINED;
      let inputsHash = cryptography.hashArray([a.encryptedFn, a.encryptedArgs, cryptography.hash(a.preCode), a.userDHKey]);

      a.apiMock.setTaskParams(a.secretContractAddress,0, status, a.gasLimit, inputsHash);
      a.verifier.verifyTaskCreation(task, a.expectedAddress).then( (res)=> {
        assert.strictEqual(res.isVerified, true);
        assert.strictEqual(res.error , null);
        assert.strictEqual(res.gasLimit , a.gasLimit);
        assert.strictEqual(res.blockNumber , blockNumber);
        resolve();
      });

      const event = {taskId: a.secretContractAddress, inputsHash: inputsHash, gasLimit: a.gasLimit, blockNumber: blockNumber};
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
      let task = new DeployTask(a.secretContractAddress, a.preCode, a.encryptedArgs, a.encryptedFn, a.userDHKey, a.gasLimit, a.secretContractAddress, 0);
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_UNDEFINED;
      let inputsHash = cryptography.hashArray([a.encryptedFn, a.encryptedArgs, cryptography.hash(a.preCode), a.userDHKey]);
      let blockNumber = a.expectedParams.firstBlockNumber + 50;

      a.apiMock.setTaskParams(a.secretContractAddress,0, status, a.gasLimit, inputsHash);
      a.verifier.verifyTaskCreation(task, a.expectedAddress).then( (res)=> {
        assert.strictEqual(res.isVerified, true);
        assert.strictEqual(res.error , null);
        assert.strictEqual(res.blockNumber , blockNumber);
        assert.strictEqual(res.gasLimit , a.gasLimit);
        resolve();
      });


      let event = {tasks: {}};
      event.tasks[a.secretContractAddress] = {taskId: a.secretContractAddress, inputsHash: inputsHash, gasLimit: a.gasLimit, blockNumber: blockNumber};
      event.tasks[web3Utils.randomHex(32)] = {taskId: a.secretContractAddress, inputsHash: inputsHash, gasLimit: a.gasLimit, blockNumber: blockNumber};
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
      let inputsHash = cryptography.hashArray([a.encryptedFn, a.encryptedArgs, a.secretContractAddress, a.userDHKey]);

      a.apiMock.setTaskParams(a.taskId, blockNumber, status, a.gasLimit, inputsHash);
      a.verifier.verifyTaskCreation(task, a.expectedAddress).then( (res)=> {
        assert.strictEqual(res.isVerified, true);
        assert.strictEqual(res.error, null);
        assert.strictEqual(res.blockNumber , blockNumber);
        assert.strictEqual(res.gasLimit , a.gasLimit);
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

      let otherAddress = web3Utils.randomHex(32);
      let task = new ComputeTask(a.taskId, a.encryptedArgs, a.encryptedFn, a.userDHKey, a.gasLimit, otherAddress);
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;
      let blockNumber = a.expectedParams.firstBlockNumber + 50;
      let inputsHash = cryptography.hashArray([a.encryptedFn, a.encryptedArgs,otherAddress, a.userDHKey]);

      a.apiMock.setTaskParams(a.taskId, blockNumber, status, a.gasLimit, inputsHash);
      a.verifier.verifyTaskCreation(task, web3Utils.toChecksumAddress(web3Utils.randomHex(20))).then( (res)=> {
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

      let task = new ComputeTask(a.taskId, a.encryptedArgs, a.encryptedFn, a.userDHKey, a.gasLimit, web3Utils.randomHex(32));
      let status = constants.ETHEREUM_TASK_STATUS.RECEIPT_FAILED;
      let blockNumber = a.expectedParams.firstBlockNumber + 50;
      let inputsHash = cryptography.hashArray([a.encryptedFn, a.encryptedArgs, a.secretContractAddress, a.userDHKey]);

      a.apiMock.setTaskParams(a.taskId, blockNumber, status, a.gasLimit, inputsHash);
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

      let task = new ComputeTask(a.taskId, a.encryptedArgs, a.encryptedFn, a.userDHKey, a.gasLimit, web3Utils.randomHex(32));
      let status = constants.ETHEREUM_TASK_STATUS.RECEIPT_VERIFIED;
      let blockNumber = a.expectedParams.firstBlockNumber + 50;
      let inputsHash = cryptography.hashArray([a.encryptedFn, a.encryptedArgs, a.secretContractAddress, a.userDHKey]);

      a.apiMock.setTaskParams(a.taskId, blockNumber, status, a.gasLimit, inputsHash);
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
      let task = new ComputeTask(a.taskId, a.encryptedArgs, a.encryptedFn, a.userDHKey, a.gasLimit, a.secretContractAddress, 0);
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_UNDEFINED;
      let inputsHash = cryptography.hashArray([a.encryptedFn, a.encryptedArgs, a.secretContractAddress, a.userDHKey]);
      let blockNumber = a.expectedParams.firstBlockNumber + 50;

      a.apiMock.setTaskParams(a.taskId,0, status);
      a.verifier.verifyTaskCreation(task, a.expectedAddress).then( (res)=> {
        assert.strictEqual(res.isVerified, true);
        assert.strictEqual(res.error , null);
        assert.strictEqual(res.blockNumber , blockNumber);
        assert.strictEqual(res.gasLimit , a.gasLimit);
        resolve();
      });

      const event = {taskId: a.taskId, inputsHash: inputsHash, gasLimit: a.gasLimit, blockNumber: blockNumber};
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
      let task = new ComputeTask(a.taskId, a.encryptedArgs, a.encryptedFn, a.userDHKey, a.gasLimit, a.secretContractAddress, 0);
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_UNDEFINED;
      let inputsHash = cryptography.hashArray([a.encryptedFn, a.encryptedArgs, a.secretContractAddress, a.userDHKey]);
      let blockNumber = a.expectedParams.firstBlockNumber + 50;

      a.apiMock.setTaskParams(a.taskId,0, status);
      a.verifier.verifyTaskCreation(task, a.expectedAddress).then( (res)=> {
        assert.strictEqual(res.isVerified, true);
        assert.strictEqual(res.error , null);
        assert.strictEqual(res.blockNumber , blockNumber);
        assert.strictEqual(res.gasLimit , a.gasLimit);
        resolve();
      });


      let event = {tasks: {}};
      event.tasks[a.taskId] = {taskId: a.taskId, inputsHash: inputsHash, gasLimit: a.gasLimit, blockNumber: blockNumber};
      event.tasks[web3Utils.randomHex(32)] = {taskId: a.taskId, inputsHash: inputsHash, gasLimit: a.gasLimit, blockNumber: blockNumber};
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
      let task = new DeployTask(a.secretContractAddress, a.preCode, a.encryptedArgs, a.encryptedFn, a.userDHKey, a.gasLimit, a.secretContractAddress);
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_UNDEFINED;
      let inputsHash = cryptography.hashArray([a.encryptedFn, a.encryptedArgs, cryptography.hash(a.preCode), a.userDHKey]);

      a.apiMock.setTaskParams(a.secretContractAddress,0, status, a.gasLimit, inputsHash);
      a.verifier.verifyTaskCreation(task, web3Utils.toChecksumAddress(web3Utils.randomHex(20))).then( (res)=> {
        assert.strictEqual(res.isVerified, false);
        assert.strictEqual(res.error instanceof errors.WorkerSelectionVerificationErr, true);
        resolve();
      });

      let blockNumber = a.expectedParams.firstBlockNumber + 50;

      const event = {taskId: a.secretContractAddress, inputsHash: inputsHash, gasLimit: a.gasLimit, blockNumber: blockNumber};
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
      let inputsHash = cryptography.hashArray([a.encryptedFn, a.encryptedArgs, a.secretContractAddress, a.userDHKey]);

      a.apiMock.setTaskParams(a.taskId,0, status);
      a.verifier.verifyTaskCreation(task, web3Utils.toChecksumAddress(web3Utils.randomHex(20))).then( (res)=> {
        assert.strictEqual(res.isVerified, false);
        assert.strictEqual(res.error instanceof errors.WorkerSelectionVerificationErr, true);
        resolve();
      });

      let blockNumber = a.expectedParams.firstBlockNumber + 50;
      const event = {taskId: a.taskId, inputsHash: inputsHash, gasLimit: a.gasLimit, blockNumber: blockNumber};
      a.apiMock.triggerEvent('TaskRecordCreated', event);
    });
  });

  it('Wrong compute task creation post-mined due to wrong worker address', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#31']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let a = await initStuffForTaskCreation();

      let task = new ComputeTask(a.taskId, a.encryptedArgs, a.encryptedFn, a.userDHKey, a.gasLimit, a.secretContractAddress);
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;
      let blockNumber = a.expectedParams.firstBlockNumber + 50;
      let inputsHash = cryptography.hashArray([a.encryptedFn, a.encryptedArgs, a.secretContractAddress, a.userDHKey]);

      a.apiMock.setTaskParams(a.taskId, blockNumber, status, a.gasLimit, inputsHash);
      a.verifier.verifyTaskCreation(task, web3Utils.randomHex(22)).then( (res)=> {
        assert.strictEqual(res.isVerified, false);
        assert.strictEqual(res.error instanceof errors.TypeErr, true);
        resolve();
      });
    });
  });

  it('Wrong deploy task creation post-mined due to wrong worker address', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#32']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let a = await initStuffForTaskCreation();

      let task = new DeployTask(a.secretContractAddress, a.preCode, a.encryptedArgs, a.encryptedFn, a.userDHKey, a.gasLimit, a.secretContractAddress);
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;
      let blockNumber = a.expectedParams.firstBlockNumber + 50;
      let inputsHash = cryptography.hashArray([a.encryptedFn, a.encryptedArgs, cryptography.hash(a.preCode), a.userDHKey]);

      a.apiMock.setTaskParams(a.taskId, blockNumber, status, a.gasLimit, inputsHash);
      a.verifier.verifyTaskCreation(task, web3Utils.randomHex(22)).then( (res)=> {
        assert.strictEqual(res.isVerified, false);
        assert.strictEqual(res.error instanceof errors.TypeErr, true);
        resolve();
      });
    });
  });

  it('Wrong task creation post-mined due to wrong task type', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#33']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let a = await initStuffForTaskCreation();

      a.verifier.verifyTaskCreation({}, a.expectedAddress).then( (res)=> {
        assert.strictEqual(res.isVerified, false);
        assert.strictEqual(res.error instanceof errors.TypeErr, true);
        resolve();
      });
    });
  });

  it('Wrong deploy task creation post-mined due to wrong delta key', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#32']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let a = await initStuffForTaskCreation();

      let task = new DeployTask(a.secretContractAddress, a.preCode, a.encryptedArgs, a.encryptedFn, a.userDHKey, a.gasLimit, a.secretContractAddress);
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;
      let blockNumber = a.expectedParams.firstBlockNumber + 50;
      let inputsHash = cryptography.hashArray([a.encryptedFn, a.encryptedArgs, cryptography.hash(a.preCode), a.userDHKey]);

      a.apiMock.setTaskParams(a.taskId, blockNumber, status, a.gasLimit, inputsHash);
      a.verifier.verifyTaskCreation(task, web3Utils.randomHex(22)).then( (res)=> {
        assert.strictEqual(res.isVerified, false);
        assert.strictEqual(res.error instanceof errors.TypeErr, true);
        resolve();
      });
    });
  });

  it('Wrong task creation post-mined due to wrong task type', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#33']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let a = await initStuffForTaskCreation();

      a.verifier.verifyTaskCreation({}, a.expectedAddress).then( (res)=> {
        assert.strictEqual(res.isVerified, false);
        assert.strictEqual(res.error instanceof errors.TypeErr, true);
        resolve();
      });
    });
  });

  it('Wrong deploy task creation post-mined due to wrong inputs hash', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#34']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let a = await initStuffForTaskCreation();
      let task = new DeployTask(a.secretContractAddress, a.preCode, a.encryptedArgs, a.encryptedFn, a.userDHKey, a.gasLimit, a.secretContractAddress);
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;

      let blockNumber = a.expectedParams.firstBlockNumber + 50;
      let inputsHash = web3Utils.randomHex(10);

      a.apiMock.setTaskParams(a.secretContractAddress, blockNumber, status, a.gasLimit, inputsHash);
      a.verifier.verifyTaskCreation(task, a.expectedAddress).then( (res)=> {
        assert.strictEqual(res.isVerified, false);
        assert.strictEqual(res.error instanceof errors.TaskVerificationErr, true);
        resolve();
      });
    });
  });

  it('Wrong compute task creation post-mined due to wrong inputs hash', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#35']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let a = await initStuffForTaskCreation();

      let task = new ComputeTask(a.taskId, a.encryptedArgs, a.encryptedFn, a.userDHKey, a.gasLimit, a.secretContractAddress);
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;
      let blockNumber = a.expectedParams.firstBlockNumber + 50;
      let inputsHash = web3Utils.randomHex(10);

      a.apiMock.setTaskParams(a.taskId, blockNumber, status, a.gasLimit, inputsHash);
      a.verifier.verifyTaskCreation(task, a.expectedAddress).then( (res)=> {
        assert.strictEqual(res.isVerified, false);
        assert.strictEqual(res.error instanceof errors.TaskVerificationErr, true);
        resolve();
      });
    });
  });

  it('Wrong compute task submission pre-mined due to wrong key', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#36']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      const key = 4;

      let a = await initStuffForTaskSubmission();
      let task = new ComputeResult(a.taskId, constants.TASK_STATUS.UNVERIFIED, a.output, {data: a.delta, key: key},
        5, "ethereumPayload", "ethereumAddress", "signature");
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;

      // ok
      a.apiMock.setTaskParams(a.taskId, a.blockNumber, status);
      a.verifier.verifyTaskSubmission(task, "40", null).then( (res)=> {
        assert.strictEqual(res.isVerified, false);
        assert.strictEqual(res.error instanceof errors.TaskVerificationErr, true);
        resolve();
      });

      const event = {stateDeltaHash: a.deltaHash, stateDeltaHashIndex: 2, outputHash: a.outputHash, taskId: a.taskId};
      a.apiMock.triggerEvent('ReceiptVerified', event);
    });
  });

  it('Good compute task submission pre-mined - no output', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#37']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      const key = 2;

      let a = await initStuffForTaskSubmission();
      let task = new ComputeResult(a.taskId, constants.TASK_STATUS.UNVERIFIED, null, {data: a.delta, key: key},
        5, "ethereumPayload", "ethereumAddress", "signature");
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;

      // ok
      a.apiMock.setTaskParams(a.taskId, a.blockNumber, status);
      a.verifier.verifyTaskSubmission(task, "40", null).then( (res)=> {
        assert.strictEqual(res.isVerified, true);
        assert.strictEqual(res.error, null);
        resolve();
      });

      const event = {stateDeltaHash: a.deltaHash, stateDeltaHashIndex: key, outputHash: constants.ETHEREUM_EMPTY_HASH, taskId: a.taskId};
      a.apiMock.triggerEvent('ReceiptVerified', event);
    });
  });

  it('Good compute task submission pre-mined - no delta', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#38']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      const key = 2;

      let a = await initStuffForTaskSubmission();
      let task = new ComputeResult(a.taskId, constants.TASK_STATUS.UNVERIFIED, a.output, {key: 0},
        5, "ethereumPayload", "ethereumAddress", "signature");
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;

      // ok
      a.apiMock.setTaskParams(a.taskId, a.blockNumber, status);
      a.verifier.verifyTaskSubmission(task, "40", null).then( (res)=> {
        assert.strictEqual(res.isVerified, true);
        assert.strictEqual(res.error, null);
        resolve();
      });

      const event = {stateDeltaHash: constants.ETHEREUM_EMPTY_HASH, stateDeltaHashIndex: 0, outputHash: a.outputHash, taskId: a.taskId};
      a.apiMock.triggerEvent('ReceiptVerified', event);
    });
  });

  it('Good compute task submission pre-mined - no delta and no output', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#39']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      const key = 2;

      let a = await initStuffForTaskSubmission();
      let task = new ComputeResult(a.taskId, constants.TASK_STATUS.UNVERIFIED, null, {key: 0},
        5, "ethereumPayload", "ethereumAddress", "signature");
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;

      // ok
      a.apiMock.setTaskParams(a.taskId, a.blockNumber, status);
      a.verifier.verifyTaskSubmission(task, "40", null).then( (res)=> {
        assert.strictEqual(res.isVerified, true);
        assert.strictEqual(res.error, null);
        resolve();
      });

      const event = {stateDeltaHash: constants.ETHEREUM_EMPTY_HASH, stateDeltaHashIndex: 0, outputHash: constants.ETHEREUM_EMPTY_HASH, taskId: a.taskId};
      a.apiMock.triggerEvent('ReceiptVerified', event);
    });
  });

  it('Wrong compute task submission pre-mined - no output and wrong delta', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#40']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      const key = 2;

      let a = await initStuffForTaskSubmission();
      let task = new ComputeResult(a.taskId, constants.TASK_STATUS.UNVERIFIED, null, {data: [200], key: key},
        5, "ethereumPayload", "ethereumAddress", "signature");
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;

      // ok
      a.apiMock.setTaskParams(a.taskId, a.blockNumber, status);
      a.verifier.verifyTaskSubmission(task, "40", null).then( (res)=> {
        assert.strictEqual(res.isVerified, false);
        assert.strictEqual(res.error instanceof errors.TaskVerificationErr, true);
        resolve();
      });

      const event = {stateDeltaHash: a.deltaHash, stateDeltaHashIndex: key, outputHash: constants.ETHEREUM_EMPTY_HASH, taskId: a.taskId};
      a.apiMock.triggerEvent('ReceiptVerified', event);
    });
  });

  it('Wrong compute task submission pre-mined - no delta and wrong output', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#38']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      const key = 2;

      let a = await initStuffForTaskSubmission();
      let task = new ComputeResult(a.taskId, constants.TASK_STATUS.UNVERIFIED, [500], {key: 0},
        5, "ethereumPayload", "ethereumAddress", "signature");
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;

      // ok
      a.apiMock.setTaskParams(a.taskId, a.blockNumber, status);
      a.verifier.verifyTaskSubmission(task, "40", null).then( (res)=> {
        assert.strictEqual(res.isVerified, false);
        assert.strictEqual(res.error instanceof errors.TaskVerificationErr, true);
        resolve();
      });

      const event = {stateDeltaHash: constants.ETHEREUM_EMPTY_HASH, stateDeltaHashIndex: 0, outputHash: a.outputHash, taskId: a.taskId};
      a.apiMock.triggerEvent('ReceiptVerified', event);
    });
  });

  it('Wrong deploy task submission pre-mined - no output', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#42']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let a = await initStuffForTaskSubmission();
      let task = new DeployResult(a.taskId, constants.TASK_STATUS.UNVERIFIED, null, {data: a.delta, key: 0},
        5, "ethereumPayload", "ethereumAddress", "signature", "preCodeHash");
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;

      // ok
      a.apiMock.setTaskParams(a.taskId, a.blockNumber, status);
      a.verifier.verifyTaskSubmission(task, a.taskId, null).then( (res)=> {
        assert.strictEqual(res.isVerified, false);
        assert.strictEqual(res.error instanceof errors.TaskVerificationErr, true);
        resolve();
      });

      const event = {stateDeltaHash: a.deltaHash, codeHash: a.outputHash, secretContractAddress: a.taskId};
      a.apiMock.triggerEvent('SecretContractDeployed', event);
    });
  });

  it('Wrong deploy task submission pre-mined - no delta', async function() {
    const tree = TEST_TREE.verifier;
    if (!tree['all'] || !tree['#43']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let a = await initStuffForTaskSubmission();
      let task = new DeployResult(a.taskId, constants.TASK_STATUS.UNVERIFIED, a.output, {key: 0},
        5, "ethereumPayload", "ethereumAddress", "signature", "preCodeHash");
      let status = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;

      // ok
      a.apiMock.setTaskParams(a.taskId, a.blockNumber, status);
      a.verifier.verifyTaskSubmission(task, a.taskId, null).then( (res)=> {
        assert.strictEqual(res.isVerified, false);
        assert.strictEqual(res.error instanceof errors.TaskVerificationErr, true);
        resolve();
      });

      const event = {stateDeltaHash: a.deltaHash, codeHash: a.outputHash, secretContractAddress: a.taskId};
      a.apiMock.triggerEvent('SecretContractDeployed', event);
    });
  });
});
