const Task = require('../../src/worker/tasks/Task');
const ComputeTask = require('../../src/worker/tasks/ComputeTask');
const DeployTask = require('../../src/worker/tasks/DeployTask');
const DeployResult = require('../../src/worker/tasks/Result').DeployResult;
const FailedResult = require('../../src/worker/tasks/Result').FailedResult;
const ComputeResult = require('../../src/worker/tasks/Result').ComputeResult;
const assert = require('assert');
const constants = require('../../src/common/constants');
const userEthAddr = '0xce16109f8b49da5324ce97771b81247db6e17868';
const userNonce = 3;
// H(userEthAddr|userNonce)
const userTaskId = 'ae2c488a1a718dd9a854783cc34d1b3ae82121d0fc33615c54a290d90e2b02b3';
const encryptedArgs = '3cf8eb4f23632a59e3e2b21a25c6aa4538fde5253c7b50a10caa948e12ddc83f607790e4a0fb317cff8bde1a8b94f8e0e52741d9';
const encryptedFn = '5a380b9a7f5982f2b9fa69d952064e82cb4b6b9a718d98142da4b83a43d823455d75a35cc3600ba01fe4aa0f1b140006e98106a112e13e6f676d4bccb7c70cdd1c';
const userPubKey = '2532eb4f23632a59e3e2b21a25c6aa4538fde5253c7b50a10caa948e12ddc83f607790e4a0fb317cff8bde1a8b94f8e0e52741d9';
const contractAddress = '0xae2c488a1a718dd9a854783cc34d1b3ae82121d0fc33615c54a290d90e2b02b3';
const preCode = 'f236658468465aef1grd56gse6fg1ae65f1aw684fr6aw81faw51f561fwawf32a59e3e2b21a25c6aa4538fde5253c7b50a10caa948e12ddc83f607790e4a0fb317cff8bde1a8b94f8e0e52741d92532eb4f23632a59e3e2b21a25c6aa4538fde5253c7b50a10caa948e12ddc83f607790e4a0fb317cff8bde1a8b94f8e0e52741d92532eb4f23632a59e3e2b21a25c6aa4538fde5253c7b50a10caa948e12ddc83f607790e4a0fb317cff8bde1a8b94f8e0e52741d92532eb4f23632a59e3e2b21a25c6aa4538fde5253c7b50a10caa948e12ddc83f607790e4a0fb317cff8bde1a8b94f8e0e52741d92532eb4f23632a59e3e2b21a25c6aa4538fde5253c7b50a10caa948e12ddc83f607790e4a0fb317cff8bde1a8b94f8e0e52741d92532eb4f23632a59e3e2b21a25c6aa4538fde5253c7b50a10caa948e12ddc83f607790e4a0fb317cff8bde1a8b94f8e0e52741d9';

it('#1 Should test computeTask', function(done){
  //let expected = ['taskId','encryptedArgs','encryptedFn','userPubKey','gasLimit','contractAddress'];
  let task = ComputeTask.buildTask({
    taskId : userTaskId,
    encryptedArgs : encryptedArgs,
    encryptedFn : encryptedFn,
    userDHKey : userPubKey,
    gasLimit : 1200,
    contractAddress : contractAddress
  });

  assert(task instanceof ComputeTask, 'task was not initiallized');
  assert.strictEqual(constants.TASK_STATUS.UNVERIFIED,
      task.getStatus(),'not unverified');
  assert.strictEqual(constants.TASK_STATUS.IN_PROGRESS,
      task.setInProgressStatus().getStatus(),'status not in progress');
  assert.strictEqual(constants.TASK_STATUS.SUCCESS,
      task.setSuccessStatus().getStatus(),'status not success');
  assert.strictEqual(constants.TASK_STATUS.FAILED,
      task.setFailedStatus().getStatus(),'status not failure');

  assert.strictEqual(userTaskId,task.getTaskId(),'taskId dont match');
  assert.strictEqual(encryptedArgs,task.getEncyptedArgs(),'encArgs dont match');
  assert.strictEqual(encryptedFn,task.getEncryptedFn(),'encFn dont match');
  assert.strictEqual(userPubKey,task.getUserDHKey(),'userKey dont match');
  assert.strictEqual(1200,task.getGasLimit(),'gasLimit dont match');
  assert.strictEqual(contractAddress,task.getContractAddr(),'addr dont match');
  done();
});


it('#2 Should test DeployTask', function(done){
  let task = DeployTask.buildTask({
    taskId : userTaskId,
    preCode : preCode,
    encryptedArgs : encryptedArgs,
    encryptedFn : encryptedFn,
    userDHKey : userPubKey,
    gasLimit : 1200,
    contractAddress : contractAddress
  });

  assert(task instanceof DeployTask, 'task was not initiallized');
  assert.strictEqual(constants.TASK_STATUS.UNVERIFIED,
      task.getStatus(),'not unverified');
  assert.strictEqual(constants.TASK_STATUS.IN_PROGRESS,
      task.setInProgressStatus().getStatus(),'status not in progress');
  assert.strictEqual(constants.TASK_STATUS.SUCCESS,
      task.setSuccessStatus().getStatus(),'status not success');
  assert.strictEqual(constants.TASK_STATUS.FAILED,
      task.setFailedStatus().getStatus(),'status not failure');

  assert.strictEqual(userTaskId,task.getTaskId(),'taskId dont match');
  assert.strictEqual(encryptedArgs,task.getEncyptedArgs(),'encArgs dont match');
  assert.strictEqual(encryptedFn,task.getEncryptedFn(),'encFn dont match');
  assert.strictEqual(userPubKey,task.getUserDHKey(),'userKey dont match');
  assert.strictEqual(1200,task.getGasLimit(),'gasLimit dont match');
  assert.strictEqual(contractAddress,task.getContractAddr(),'addr dont match');
  assert.strictEqual(preCode,task.getPreCode(),'preCode dont match');
  done();
});


it('#3 Should test DeployResult and ComputeResult', function(done){
  let taskRawObj = {
    taskId : userTaskId,
    preCode : preCode,
    encryptedArgs : encryptedArgs,
    encryptedFn : encryptedFn,
    userDHKey : userPubKey,
    gasLimit : 1200,
    contractAddress : contractAddress
  };

  let deployTask = DeployTask.buildTask(taskRawObj);
  let computeTask = ComputeTask.buildTask(taskRawObj);

  let resultRawObj = {
    taskId : deployTask.getTaskId(),
    status : constants.TASK_STATUS.SUCCESS,
    output : [123,22,4,55,66],
    delta : {index : 2, delta : [96,22,4,55,66,88]},
    usedGas : 213,
    ethereumPayload : [233,46,78],
    ethereumAddress : 'cc353334487696ebc3e15411e0b106186eba3c0c',
    signature : [233,43,67,54],
    preCodeHash : '87c2d362de99f75a4f2755cdaaad2d11bf6cc65dc71356593c445535ff28f43d'
  };
  // create deploy result
  let deployResult = DeployResult.buildDeployResult(resultRawObj);
  // set deploy result
  deployTask.setResult(deployResult);
  // create compute result
  resultRawObj.status = constants.TASK_STATUS.FAILED;
  let computeResult = ComputeResult.buildComputeResult(resultRawObj);
  // set compute result
  computeTask.setResult(computeResult);

  // test compute result
  assert.strictEqual(constants.TASK_STATUS.FAILED,computeTask.getStatus(),"status didnt change");
  assert.strictEqual(true,computeResult.isFailed(),"result not success");
  assert.strictEqual(false, computeTask.isUnverified(), "task is unverified");
  // test deploy result
  assert.strictEqual(constants.TASK_STATUS.SUCCESS,deployTask.getStatus(),"status didnt change");
  assert.strictEqual(true,deployResult.isSuccess(),"result not success");
  assert.strictEqual(false, deployTask.isUnverified(), "task is unverified");
  done();
});

it('#4 Should test FailedResult', function(done) {
  let taskRawObj = {
    taskId : userTaskId,
    preCode : preCode,
    encryptedArgs : encryptedArgs,
    encryptedFn : encryptedFn,
    userDHKey : userPubKey,
    gasLimit : 1200,
    contractAddress : contractAddress
  };

  let deployTask = DeployTask.buildTask(taskRawObj);

  let resultRawObj = {
    taskId : deployTask.getTaskId(),
    output : [123,22,4,55,66],
    usedGas : 213,
    signature : [233,43,67,54],
  };
  // create deploy result
  let deployResult = FailedResult.buildFailedResult(resultRawObj);
  // set deploy result
  deployTask.setResult(deployResult);
  // test deploy result
  assert.strictEqual(constants.TASK_STATUS.FAILED,deployTask.getStatus(),"status didnt change");
  assert.strictEqual(true,deployResult.isFailed(),"result is success");
  assert.strictEqual(false, deployTask.isUnverified(), "task is unverified");
  assert.strictEqual(true,deployTask.isFinished(), "task is not finished");
  assert.strictEqual(true,deployTask.isFailed(), "task is not failed");
  done();
});
