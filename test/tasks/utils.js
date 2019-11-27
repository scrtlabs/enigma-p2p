const ComputeTask = require("../../src/worker/tasks/ComputeTask");
const DeployTask = require("../../src/worker/tasks/DeployTask");
const Result = require("../../src/worker/tasks/Result");
const testUtils = require("../testUtils/utils");
const constants = require("../../src/common/constants");

function generateComputeTasks(num) {
  let tasks = [];
  for (let i = 0; i < num; i++) {
    let task = ComputeTask.buildTask({
      userEthAddr: "0x" + testUtils.randLenStr(40),
      userNonce: testUtils.getRandomInt(100),
      // H(userEthAddr|userNonce)
      taskId: "0x" + testUtils.randLenStr(64),
      encryptedArgs: testUtils.randLenStr(200),
      encryptedFn: testUtils.randLenStr(200),
      userDHKey: testUtils.randLenStr(130),
      contractAddress: "0x" + testUtils.randLenStr(40),
      gasLimit: testUtils.getRandomInt(100),
      blockNumber: testUtils.getRandomInt(100)
    });
    if (task) tasks.push(task);
    else console.log("task is null error in generating test data!!!!");
  }
  return tasks;
}

function generateDeployTasks(num) {
  let tasks = [];
  for (let i = 0; i < num; i++) {
    tasks.push(
      DeployTask.buildTask({
        userEthAddr: "0x" + testUtils.randLenStr(40),
        userNonce: testUtils.getRandomInt(100),
        // H(userEthAddr|userNonce)
        taskId: "0x" + testUtils.randLenStr(64),
        encryptedArgs: testUtils.randLenStr(200),
        encryptedFn: testUtils.randLenStr(200),
        userDHKey: testUtils.randLenStr(130),
        contractAddress: "0x" + testUtils.randLenStr(40),
        gasLimit: testUtils.getRandomInt(100),
        preCode: testUtils.randLenStr(1000),
        blockNumber: testUtils.getRandomInt(100)
      })
    );
  }
  return tasks;
}

module.exports.generateComputeTasks = generateComputeTasks;

module.exports.generateDeployTasks = generateDeployTasks;

module.exports.generateDeployBundle = function(num, isSuccess) {
  let output = [];
  let tasks = generateDeployTasks(num);
  let status = constants.TASK_STATUS.SUCCESS;
  if (!isSuccess) {
    status = constants.TASK_STATUS.FAILED;
  }
  tasks.forEach(t => {
    let resObj = {
      taskId: t.getTaskId(),
      status: status,
      output: testUtils.randLenStr(200),
      delta: { key: 0, data: testUtils.getRandomByteArray(20) },
      usedGas: testUtils.getRandomInt(10000),
      ethereumPayload: testUtils.getRandomByteArray(100),
      ethereumAddress: testUtils.randLenStr(40),
      signature: testUtils.getRandomByteArray(120),
      preCodeHash: testUtils.randLenStr(64),
      blockNumber: testUtils.getRandomInt(100)
    };
    let result = null;
    if (isSuccess) {
      result = Result.DeployResult.buildDeployResult(resObj);
    } else {
      result = Result.FailedResult.buildFailedResult(resObj);
    }
    output.push({ task: t, result: result });
  });
  return output;
};

module.exports.generateComputeBundle = function(num, isSuccess) {
  let output = [];
  let tasks = generateComputeTasks(num);
  let status = constants.TASK_STATUS.SUCCESS;
  if (!isSuccess) {
    status = constants.TASK_STATUS.FAILED;
  }
  tasks.forEach(t => {
    let resObj = {
      taskId: t.getTaskId(),
      status: status,
      output: testUtils.randLenStr(200),
      delta: { key: 5, data: testUtils.getRandomByteArray(20) },
      usedGas: testUtils.getRandomInt(10000),
      ethereumPayload: testUtils.getRandomByteArray(100),
      ethereumAddress: testUtils.randLenStr(40),
      signature: testUtils.getRandomByteArray(120),
      blockNumber: testUtils.getRandomInt(100)
    };
    let result = null;
    if (isSuccess) {
      result = Result.ComputeResult.buildComputeResult(resObj);
    } else {
      result = Result.FailedResult.buildFailedResult(resObj);
    }
    output.push({ task: t, result: result });
  });
  return output;
};
