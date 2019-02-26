const assert = require('assert');
const TEST_TREE = require('../test_tree').TEST_TREE;
const ethTestUtils = require('./utils');
const ControllerBuilder = require('../testUtils/quickBuilderUtil');
const EthereumAPIMock = require('../../src/ethereum/EthereumAPI').EthereumAPIMock;
// const EthereumVerifier = require('../src/ethereum/EthereumVerifier');
const ComputeTask  = require('../../src/worker/tasks/ComputeTask');
const DeployTask  = require('../../src/worker/tasks/DeployTask');
// const FailedResult  = require('../src/worker/tasks/Result').FailedResult;
// const ComputeResult  = require('../src/worker/tasks/Result').ComputeResult;
// const DeployResult  = require('../src/worker/tasks/Result').DeployResult;
//
const constants = require('../../src/common/constants');
// const errors = require('../src/common/errors');
// const DbUtils = require('../src/common/DbUtils');
const Web3 = require('web3');
const defaultsDeep = require('@nodeutils/defaults-deep');
const testUtils = require('../testUtils/utils');

// TODO: lena: THIS TESTS SUITE SHOULD USE REAL ETHEREUM, ONCE CONTRACT UPDATED

describe('Verifier tests', function() {
  let web3 = new Web3();

  // async function verifyMinedTaskSubmission(isComputeTask, apiMock, verifier, taskId, output, delta, outputHash, deltaHash, blockNumber) {
  //   let task = null;
  //   let res = null;
  //
  //   if (isComputeTask) {
  //     task = new ComputeResult(taskId, constants.TASK_STATUS.UNVERIFIED, output, delta, 5, "ethereumPayload", "ethereumAddress", "signature");
  //   }
  //   else {
  //     task = new DeployResult(taskId, constants.TASK_STATUS.UNVERIFIED, output, delta, 5, "ethereumPayload", "ethereumAddress", "signature", "preCodeHash");
  //   }
  //
  //   let status = constants.ETHEREUM_TASK_STATUS.RECEIPT_VERIFIED;
  //
  //   // ok
  //   apiMock.setTaskParams(taskId, deltaHash, outputHash, blockNumber, status);
  //   res = await verifier.verifyTaskSubmission(task);
  //   assert.strictEqual(res.isVerified, true);
  //   assert.strictEqual(res.error, null);
  //
  //   // wrong deltaHash
  //   apiMock.setTaskParams(taskId, web3.utils.randomHex(32), outputHash, blockNumber, status);
  //   res = await verifier.verifyTaskSubmission(task);
  //   assert.strictEqual(res.isVerified, false);
  //   assert.strictEqual(res.error instanceof errors.TaskVerificationErr, true);
  //
  //   // wrong outputHash
  //   apiMock.setTaskParams(taskId, deltaHash, web3.utils.randomHex(32), blockNumber, status);
  //   res = await verifier.verifyTaskSubmission(task);
  //   assert.strictEqual(res.isVerified, false);
  //   assert.strictEqual(res.error instanceof errors.TaskVerificationErr, true);
  //
  //   // status == RECEIPT_FAILED
  //   status = constants.ETHEREUM_TASK_STATUS.RECEIPT_FAILED;
  //   apiMock.setTaskParams(taskId, deltaHash, outputHash, blockNumber, status);
  //   res = await verifier.verifyTaskSubmission(task);
  //   assert.strictEqual(res.isVerified, false);
  //   assert.strictEqual(res.error instanceof errors.TaskFailedErr, true);
  //
  //   task = new FailedResult(taskId, constants.TASK_STATUS.FAILED, output, 5, "signature");
  //   res = await verifier.verifyTaskSubmission(task);
  //   assert.strictEqual(res.isVerified, true);
  //   assert.strictEqual(res.error, null);
  // }

  async function init(isDeploy) {
    let {params, expectedAddress, expectedParams, secretContractAddress, epochSize} = ethTestUtils.createDataForSelectionAlgorithm();
    const ethereumAPI = new EthereumAPIMock();

    ethereumAPI.api().setEpochSize(epochSize);
    ethereumAPI.api().setWorkerParams(Array.from(params));
    await ethereumAPI.init();

    const builder = await ControllerBuilder.createNode();
    const controller = builder.mainController;
    controller.getNode().setEthereumApi(ethereumAPI);

    let taskData = ethTestUtils.createDataForTaskCreation();
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
      web3.utils.randomHex(32),
      web3.utils.randomHex(32),
      expectedParams.firstBlockNumber + 50,
      constants.ETHEREUM_TASK_STATUS.RECORD_CREATED,
      gasLimit);

    const coreServer = builder.coreServer;
    coreServer.setSigningKey(expectedAddress);


    return {controller: controller,
      coreServer: coreServer,
      dbPath: builder.tasksDbPath,
      taskData: taskData,
      gasLimit: gasLimit};
    //   apiMock: ethereumAPI.api(), services: ethereumAPI.services(), verifier: ethereumAPI.verifier(), params: params, expectedAddress: expectedAddress,
    //   expectedParams: expectedParams, secretContractAddress: secretContractAddress
    // };
  }

 //  async function initStuffForTaskCreation() {
 //    let workerSelectionData = await initStuffForWorkerSelection();
 //    let taskData = testUtils.createDataForTaskCreation();
 //
 //    return defaultsDeep(workerSelectionData, taskData);
 //  }
 //
 //  const ethereumAPI = new EthereumAPIMock();
 //  await ethereumAPI.init();
 //
 //  return {
 //    apiMock: ethereumAPI.api(), services:
 //      ethereumAPI.services(), verifier: ethereumAPI.verifier()
 //  };
 // }

  it('Verify new compute task verification action', async function() {
    const tree = TEST_TREE.ethereum_integration;
    if (!tree['all'] || !tree['#1']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let {controller, coreServer, dbPath, taskData, gasLimit} = await init(true);

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
      assert.strictEqual(res.isVerified, true);
      assert.strictEqual(res.error, null);
      assert.strictEqual(res.gasLimit, gasLimit);

      await stopTest();
    });
  });

  it('Verify new compute task verification action', async function() {
    const tree = TEST_TREE.ethereum_integration;
    if (!tree['all'] || !tree['#2']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      let {controller, coreServer, dbPath, taskData, gasLimit} = await init(false);

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
      assert.strictEqual(res.isVerified, true);
      assert.strictEqual(res.error, null);
      assert.strictEqual(res.gasLimit, gasLimit);

      await stopTest();
    });
  });
})
