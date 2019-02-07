// const Task = require('../../src/worker/tasks/Task');
// const ComputeTask = require('../../src/worker/tasks/ComputeTask');
// const DeployTask = require('../../src/worker/tasks/DeployTask');
// const DeployResult = require('../../src/worker/tasks/Result').DeployResult;
// const FailedResult = require('../../src/worker/tasks/Result').FailedResult;
// const ComputeResult = require('../../src/worker/tasks/Result').ComputeResult;
// const constants = require('../../src/common/constants');
// const testBuilder = require('../testUtils/quickBuilderUtil');
// const testUtils = require('../testUtils/utils');
//
//
// describe('task_flow_tests',()=>{
//   it('#1 Should test w1 Publish a task and w2 receive it', async function(){
//     return new Promise(async resolve => {
//       // create all the boring stuff
//       let {bNodeEnv,peerEnv} = await testBuilder.createTwo();
//       await testUtils.sleep(1000);
//       let bNodeController = bNodeEnv.mainController;
//       let bNodeCoreServer = bNodeEnv.coreServer;
//       let peerController = peerEnv.mainController;
//       let peerCoreServer = peerEnv.coreServer;
//       const stopTest = async ()=>{
//         await peerController.getNode().stop();
//         peerController.getIpcClient().disconnect();
//         peerCoreServer.disconnect();
//         await bNodeController.getNode().stop();
//         bNodeController.getIpcClient().disconnect();
//         bNodeCoreServer.disconnect();
//         resolve();
//       };
//       // run the test
//       // craete deploy task
//       // let {task, result} = generateDeployBundle(1,true)[0];
//       // task.setResult(result);
//       // // publish the tasj result
//       // peerController.getNode().execCmd(constants.NODE_NOTIFICATIONS.TASK_FINISHED, { task : task});
//       stopTest();
//     });
//   });
// });
//
// const generateDeployBundle = (num, isSuccess)=>{
//   let output = [];
//   let tasks = generateDeployTasks(num);
//   let status = constants.TASK_STATUS.SUCCESS;
//   if(!isSuccess){
//     status = constants.TASK_STATUS.FAILED;
//   }
//   tasks.forEach(t=>{
//     let resObj = {
//       taskId : t.getTaskId(),
//       status : status,
//       output : testUtils.getRandomByteArray(80),
//       delta : {index : 2, delta : testUtils.getRandomByteArray(20)},
//       usedGas : testUtils.getRandomInt(10000),
//       ethereumPayload : testUtils.getRandomByteArray(100),
//       ethereumAddress : testUtils.randLenStr(40),
//       signature : testUtils.getRandomByteArray(120),
//       preCodeHash : testUtils.randLenStr(64),
//     };
//     let result = null;
//     if(isSuccess){
//       result = Result.DeployResult.buildDeployResult(resObj);
//     }else{
//       result = Result.FailedResult.buildFailedResult(resObj);
//     }
//     output.push({task : t, result : result});
//   });
//   return output;
// }
