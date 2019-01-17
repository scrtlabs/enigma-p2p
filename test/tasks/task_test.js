const Task = require('../../src/worker/tasks/Task');
const ComputeTask = require('../../src/worker/tasks/ComputeTask');
const DeployTask = require('../../src/worker/tasks/DeployTask');
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
    userPubKey : userPubKey,
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
  assert.strictEqual(userPubKey,task.getUserPubKey(),'userKey dont match');
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
    userPubKey : userPubKey,
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
  assert.strictEqual(userPubKey,task.getUserPubKey(),'userKey dont match');
  assert.strictEqual(1200,task.getGasLimit(),'gasLimit dont match');
  assert.strictEqual(contractAddress,task.getContractAddr(),'addr dont match');
  assert.strictEqual(preCode,task.getPreCode(),'preCode dont match');
  done();
});


