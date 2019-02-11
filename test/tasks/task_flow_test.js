const Task = require('../../src/worker/tasks/Task');
const ComputeTask = require('../../src/worker/tasks/ComputeTask');
const DeployTask = require('../../src/worker/tasks/DeployTask');
const Result = require('../../src/worker/tasks/Result');
const DeployResult = Result.DeployResult;
const FailedResult = Result.FailedResult;
const ComputeResult = Result.ComputeResult;
const constants = require('../../src/common/constants');
const testBuilder = require('../testUtils/quickBuilderUtil');
const testUtils = require('../testUtils/utils');
const path = require('path');
const nodeUtils = require('../../src/common/utils');
const assert = require('assert');
describe('task_flow_tests',()=>{
  it('#1 Should test w1 Publish a task and w2 receive it', async function(){
    return new Promise(async resolve => {
      // craete deploy task
      let {task, result} = generateDeployBundle(1,true)[0];
      task.setResult(result);
      // create all the boring stuff
      let {bNode,peer} = await testBuilder.createTwo();
      await testUtils.sleep(5000);
      let bNodeController = bNode.mainController;
      let bNodeCoreServer = bNode.coreServer;
      let peerController = peer.mainController;
      let peerCoreServer = peer.coreServer;
      let pPath = peer.tasksDbPath;
      let bPath = bNode.tasksDbPath;
      const stopTest = async ()=>{
        await peerController.shutdownSystem();
        peerCoreServer.disconnect();
        await bNodeController.shutdownSystem();
        bNodeCoreServer.disconnect();
        await testUtils.rm_Minus_Rf(pPath);
        await testUtils.rm_Minus_Rf(bPath);
        resolve();
      };
      const verifyPublish = async (params)=>{
        let message = params.params;
        let data = message.data;
        let msgObj = JSON.parse(data.toString());
        let resultObj = JSON.parse(msgObj.result);
        assert.strictEqual(task.getTaskId(),resultObj.taskId,"taskid not equal");
        stopTest();
      };
      // override the action response
      peerController.getNode().overrideAction(constants.NODE_NOTIFICATIONS.RECEIVED_NEW_RESULT,{
        execute : verifyPublish
      });
      // run the test
      // publish the task result
      bNodeController.getNode().execCmd(constants.NODE_NOTIFICATIONS.TASK_FINISHED, { task : task});
    });
  });
});

const generateDeployBundle = (num, isSuccess)=>{
  let output = [];
  let tasks = generateDeployTasks(num);
  let status = constants.TASK_STATUS.SUCCESS;
  if(!isSuccess){
    status = constants.TASK_STATUS.FAILED;
  }
  tasks.forEach(t=>{
    let resObj = {
      taskId : t.getTaskId(),
      status : status,
      output : testUtils.getRandomByteArray(80),
      delta : {index : 2, delta : testUtils.getRandomByteArray(20)},
      usedGas : testUtils.getRandomInt(10000),
      ethereumPayload : testUtils.getRandomByteArray(100),
      ethereumAddress : testUtils.randLenStr(40),
      signature : testUtils.getRandomByteArray(120),
      preCodeHash : testUtils.randLenStr(64),
    };
    let result = null;
    if(isSuccess){
      result = Result.DeployResult.buildDeployResult(resObj);
    }else{
      result = Result.FailedResult.buildFailedResult(resObj);
    }
    output.push({task : t, result : result});
  });
  return output;
};

function generateDeployTasks(num){
  let tasks = [];
  for(let i =0;i<num;i++){
    tasks.push(DeployTask.buildTask({
      userEthAddr : '0x' + testUtils.randLenStr(40),
      userNonce : testUtils.getRandomInt(100),
      // H(userEthAddr|userNonce)
      taskId : '0x'+testUtils.randLenStr(64),
      encryptedArgs : testUtils.randLenStr(200),
      encryptedFn : testUtils.randLenStr(200),
      userDHKey : testUtils.randLenStr(130),
      contractAddress : '0x'+testUtils.randLenStr(40),
      gasLimit : testUtils.getRandomInt(100) ,
      preCode : testUtils.randLenStr(1000),
    }));
  }
  return tasks;
}
