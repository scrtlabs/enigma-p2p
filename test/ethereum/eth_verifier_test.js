const assert = require('assert');
const TEST_TREE = require('../test_tree').TEST_TREE;
const ethTestUtils = require('./utils');
const ControllerBuilder = require('../testUtils/quickBuilderUtil');
const EthereumAPIMock = require('./EthereumAPIMock');
const ComputeTask  = require('../../src/worker/tasks/ComputeTask');
const DeployTask  = require('../../src/worker/tasks/DeployTask');
const ComputeResult  = require('../../src/worker/tasks/Result').ComputeResult;
const DeployResult  = require('../../src/worker/tasks/Result').DeployResult;
const constants = require('../../src/common/constants');
const errors = require('../../src/common/errors');
const Web3 = require('web3');
const testUtils = require('../testUtils/utils');

// TODO: lena: THIS TESTS SUITE SHOULD USE REAL ETHEREUM, ONCE CONTRACT UPDATED

describe('Verifier tests', function() {
  let web3 = new Web3();

  async function init(isDeploy, taskCreation) {
    const builder = await ControllerBuilder.createNode();
    const controller = builder.mainController;

    let {params, expectedAddress, expectedParams, secretContractAddress, epochSize} = ethTestUtils.createDataForSelectionAlgorithm();
    const ethereumAPI = new EthereumAPIMock(controller.getNode().logger());

    ethereumAPI.api().setEpochSize(epochSize);
    ethereumAPI.api().setWorkerParams(Array.from(params));
    await ethereumAPI.init();

    controller.getNode().setEthereumApi(ethereumAPI);

    let taskStatus;
    let taskData;

    if (taskCreation) {
      taskStatus = constants.ETHEREUM_TASK_STATUS.RECORD_CREATED;
      taskData = ethTestUtils.createDataForTaskCreation();
    }
    else {
      taskStatus = constants.ETHEREUM_TASK_STATUS.RECEIPT_VERIFIED;
      taskData = ethTestUtils.createDataForTaskSubmission();
      if (isDeploy) {
        ethereumAPI.api().setContractParams(secretContractAddress, taskData.outputHash, {0: taskData.deltaHash}, null);
        const delta = taskData.delta;
        const key = 0;
        taskData.delta = {data: delta, key: key};
      }
      else {
        ethereumAPI.api().setContractParams(secretContractAddress, null, {1: taskData.deltaHash}, {0: taskData.outputHash});
        const delta = taskData.delta;
        const key = 1;
        taskData.delta = {data: delta, key: key};
      }
    }

    taskData['contractAddress'] = secretContractAddress;

    let taskId;
    if (isDeploy) {
      taskId = secretContractAddress;
      taskData.taskId = taskId;
    }
    else {
      taskId = taskData.taskId;
    }

    const gasLimit = 989;


    ethereumAPI.api().setTaskParams(taskId,
      expectedParams.firstBlockNumber + 50,
      taskStatus,
      gasLimit);

    const coreServer = builder.coreServer;
    coreServer.setSigningKey(expectedAddress);

    return {
      controller: controller,
      coreServer: coreServer,
      dbPath: builder.tasksDbPath,
      taskData: taskData,
      gasLimit: gasLimit};
  }

  it('Verify new compute task verification action', async function() {
    const tree = TEST_TREE.ethereum_integration;
    if (!tree['all'] || !tree['#1']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let {controller, coreServer, dbPath, taskData, gasLimit} = await init(true, true);

      // stop the test
      const stopTest = async ()=>{
        await controller.shutdownSystem();
        coreServer.disconnect();
        await testUtils.rm_Minus_Rf(dbPath);
        resolve();
      };

      const task = DeployTask.buildTask(taskData);
      const res = await controller.getNode().asyncExecCmd(
        constants.NODE_NOTIFICATIONS.VERIFY_NEW_TASK, {task: task});
      assert.strictEqual(res, true);
      await stopTest();
    });
  });

  it('Verify new compute task verification action', async function() {
    const tree = TEST_TREE.ethereum_integration;
    if (!tree['all'] || !tree['#2']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let {controller, coreServer, dbPath, taskData, gasLimit} = await init(false, true);

      // stop the test
      const stopTest = async ()=>{
        await controller.shutdownSystem();
        coreServer.disconnect();
        await testUtils.rm_Minus_Rf(dbPath);
        resolve();
      };

      const task = ComputeTask.buildTask(taskData);
      const res = await controller.getNode().asyncExecCmd(
        constants.NODE_NOTIFICATIONS.VERIFY_NEW_TASK, {task: task});
      assert.strictEqual(res, true);
      await stopTest();
    });
  });

  it('Compute task verification action wrong worker address', async function() {
    const tree = TEST_TREE.ethereum_integration;
    if (!tree['all'] || !tree['#3']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let {controller, coreServer, dbPath, taskData, gasLimit} = await init(false, true);

      // stop the test
      const stopTest = async ()=>{
        await controller.shutdownSystem();
        coreServer.disconnect();
        await testUtils.rm_Minus_Rf(dbPath);
        resolve();
      };

      coreServer.setSigningKey(web3.utils.randomHex(20));

      const task = ComputeTask.buildTask(taskData);
      const res = await controller.getNode().asyncExecCmd(
        constants.NODE_NOTIFICATIONS.VERIFY_NEW_TASK, {task: task});
      assert.strictEqual(res, false);
      await stopTest();
    });
  });

  it('Deploy task verification action ethereum exception', async function() {
    const tree = TEST_TREE.ethereum_integration;
    if (!tree['all'] || !tree['#4']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let {controller, coreServer, dbPath, taskData, gasLimit} = await init(true, true);

      // stop the test
      const stopTest = async ()=>{
        await controller.shutdownSystem();
        coreServer.disconnect();
        await testUtils.rm_Minus_Rf(dbPath);
        resolve();
      };

      controller.getNode().ethereum().api().triggerException();

      const task = DeployTask.buildTask(taskData);
      const res = await controller.getNode().asyncExecCmd(
        constants.NODE_NOTIFICATIONS.VERIFY_NEW_TASK, {task: task});
      assert.strictEqual(res, false);
      await stopTest();
    });
  });

  it('Verify deploy task submission action', async function() {
    const tree = TEST_TREE.ethereum_integration;
    if (!tree['all'] || !tree['#5']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let {controller, coreServer, dbPath, taskData, gasLimit} = await init(true, false);

      // stop the test
      const stopTest = async () => {
        await controller.shutdownSystem();
        coreServer.disconnect();
        await testUtils.rm_Minus_Rf(dbPath);
        resolve();
      };

      const callback = async (err) => {
        assert.strictEqual(err, null);
        await stopTest();
      };

      const task = DeployResult.buildDeployResult(taskData);
      const rawMessage = Buffer.from(JSON.stringify({result: task.toDbJson(),
        contractAddress: taskData.contractAddress,
        type: constants.CORE_REQUESTS.DeploySecretContract}));

      controller.getNode().execCmd(
        constants.NODE_NOTIFICATIONS.RECEIVED_NEW_RESULT, {params: {data: rawMessage}, callback: callback});
    });
  });

  it('Verify compute task submission action', async function() {
    const tree = TEST_TREE.ethereum_integration;
    if (!tree['all'] || !tree['#6']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let {controller, coreServer, dbPath, taskData, gasLimit} = await init(false, false);

      // stop the test
      const stopTest = async () => {
        await controller.shutdownSystem();
        coreServer.disconnect();
        await testUtils.rm_Minus_Rf(dbPath);
        resolve();
      };

      const callback = async (err) => {
        assert.strictEqual(err, null);
        await stopTest();
      };

      const task = ComputeResult.buildComputeResult(taskData);
      const rawMessage = Buffer.from(JSON.stringify({result: task.toDbJson(),
        contractAddress: taskData.contractAddress,
        type: constants.CORE_REQUESTS.ComputeTask}));

      controller.getNode().execCmd(
        constants.NODE_NOTIFICATIONS.RECEIVED_NEW_RESULT, {params: {data: rawMessage}, callback: callback});
    });
  });

  it('Deploy task submission action verification error', async function() {
    const tree = TEST_TREE.ethereum_integration;
    if (!tree['all'] || !tree['#7']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let {controller, coreServer, dbPath, taskData, gasLimit} = await init(true, false);

      // stop the test
      const stopTest = async () => {
        await controller.shutdownSystem();
        coreServer.disconnect();
        await testUtils.rm_Minus_Rf(dbPath);
        resolve();
      };

      const callback = async (err) => {
        assert.strictEqual(err instanceof errors.TaskVerificationErr, true);
        await stopTest();
      };

      taskData.delta.data = web3.utils.randomHex(20);

      const task = DeployResult.buildDeployResult(taskData);
      const rawMessage = Buffer.from(JSON.stringify({result: task.toDbJson(),
        contractAddress: taskData.contractAddress,
        type: constants.CORE_REQUESTS.DeploySecretContract}));

      controller.getNode().execCmd(
        constants.NODE_NOTIFICATIONS.RECEIVED_NEW_RESULT, {params: {data: rawMessage}, callback: callback});
    });
  });

  it('Compute task submission action ethereum exception', async function() {
    const tree = TEST_TREE.ethereum_integration;
    if (!tree['all'] || !tree['#8']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let {controller, coreServer, dbPath, taskData, gasLimit} = await init(false, false);

      // stop the test
      const stopTest = async () => {
        await controller.shutdownSystem();
        coreServer.disconnect();
        await testUtils.rm_Minus_Rf(dbPath);
        resolve();
      };

      const callback = async (err) => {
        assert.strictEqual(err instanceof Error, true);
        await stopTest();
      };

      controller.getNode().ethereum().api().triggerException();

      const task = ComputeResult.buildComputeResult(taskData);
      const rawMessage = Buffer.from(JSON.stringify({result: task.toDbJson(),
        contractAddress: taskData.contractAddress,
        type: constants.CORE_REQUESTS.ComputeTask}));

      controller.getNode().execCmd(
        constants.NODE_NOTIFICATIONS.RECEIVED_NEW_RESULT, {params: {data: rawMessage}, callback: callback});
    });
  });
})
