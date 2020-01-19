const ComputeTask = require("../../src/worker/tasks/ComputeTask");
const DeployTask = require("../../src/worker/tasks/DeployTask");
const Result = require("../../src/worker/tasks/Result");
const testUtils = require("../testUtils/utils");
const constants = require("../../src/common/constants");
const deployTasks = require("./random_deploy_tasks.json");
const computeTasks = require("./random_compute_tasks.json");

function generateTasks(num, type) {
  const tasks = [];
  const taskType = type === "deploy" ? DeployTask : ComputeTask;
  const taskList = type === "deploy" ? deployTasks : computeTasks;
  for (let i = 0; i < num; i++) {
    const task = taskList[i];
    task.taskId = testUtils.randLenStr(64);
    tasks.push(taskType.fromDbJson(task));
  }
  return tasks;
}

generateComputeTasks = num => generateTasks(num, "compute");

generateDeployTasks = num => generateTasks(num, "deploy");

function generateBundle(num, isSuccess, type) {
  const tasks = type === "deploy" ? generateDeployTasks(num) : generateComputeTasks(num);
  const taskResult =
    type === "deploy" ? Result.DeployResult.buildDeployResult : Result.ComputeResult.buildComputeResult;
  return tasks.map(task => {
    let resObj = {
      taskId: task.getTaskId(),
      status: isSuccess ? constants.TASK_STATUS.SUCCESS : constants.TASK_STATUS.FAILED,
      output: testUtils.randLenStr(200),
      delta: { key: 0, data: testUtils.getRandomByteArray(20) },
      usedGas: testUtils.getRandomInt(10000),
      ethereumPayload: testUtils.getRandomByteArray(100),
      ethereumAddress: testUtils.randLenStr(40),
      signature: testUtils.getRandomByteArray(120),
      preCodeHash: testUtils.randLenStr(64),
      blockNumber: testUtils.getRandomInt(100)
    };
    return {
      task,
      result: isSuccess ? taskResult(resObj) : Result.FailedResult.buildFailedResult(resObj)
    };
  });
}

module.exports.generateComputeTasks = generateComputeTasks;

module.exports.generateDeployTasks = generateDeployTasks;

module.exports.generateDeployBundle = (num, isSuccess) => generateBundle(num, isSuccess, "deploy");

module.exports.generateComputeBundle = (num, isSuccess) => generateBundle(num, isSuccess, "compute");
