const Logger = require('../../src/common/logger');
const path = require('path');
const Task = require('../../src/worker/tasks/Task');
const ComputeTask = require('../../src/worker/tasks/ComputeTask');
const DeployTask = require('../../src/worker/tasks/DeployTask');
const assert = require('assert');
const constants = require('../../src/common/constants');
const TaskManager = require('../../src/worker/tasks/TaskManager');
const TEST_TREE = require('../test_tree').TEST_TREE;
const testUtils = require('../testUtils/utils');
let tree = TEST_TREE.task_manager;

const user1 = {
   userEthAddr : '0xce16109f8b49da5324ce97771b81247db6e17868',
   userNonce : 3,
  // H(userEthAddr|userNonce)
   taskId : 'ae2c488a1a718dd9a854783cc34d1b3ae82121d0fc33615c54a290d90e2b02b3',
   encryptedArgs : '3cf8eb4f23632a59e3e2b21a25c6aa4538fde5253c7b50a10caa948e12ddc83f607790e4a0fb317cff8bde1a8b94f8e0e52741d9',
   encryptedFn : '5a380b9a7f5982f2b9fa69d952064e82cb4b6b9a718d98142da4b83a43d823455d75a35cc3600ba01fe4aa0f1b140006e98106a112e13e6f676d4bccb7c70cdd1c',
   userPubKey : '2532eb4f23632a59e3e2b21a25c6aa4538fde5253c7b50a10caa948e12ddc83f607790e4a0fb317cff8bde1a8b94f8e0e52741d9',
   contractAddress : '0xae2c488a1a718dd9a854783cc34d1b3ae82121d0fc33615c54a290d90e2b02b3',
   gasLimit : 24334 ,
   preCode : 'f236658468465aef1grd56gse6fg1ae65f1aw684fr6aw81faw51f561fwawf32a59e3e2b21a25c6aa4538fde5253c7b50a10caa948e12ddc83f607790e4a0fb317cff8bde1a8b94f8e0e52741d92532eb4f23632a59e3e2b21a25c6aa4538fde5253c7b50a10caa948e12ddc83f607790e4a0fb317cff8bde1a8b94f8e0e52741d92532eb4f23632a59e3e2b21a25c6aa4538fde5253c7b50a10caa948e12ddc83f607790e4a0fb317cff8bde1a8b94f8e0e52741d92532eb4f23632a59e3e2b21a25c6aa4538fde5253c7b50a10caa948e12ddc83f607790e4a0fb317cff8bde1a8b94f8e0e52741d92532eb4f23632a59e3e2b21a25c6aa4538fde5253c7b50a10caa948e12ddc83f607790e4a0fb317cff8bde1a8b94f8e0e52741d92532eb4f23632a59e3e2b21a25c6aa4538fde5253c7b50a10caa948e12ddc83f607790e4a0fb317cff8bde1a8b94f8e0e52741d9',
};
const user2 = {
  userEthAddr : '0x3216109f8b49da5324ce97771b81247db6e17864',
  userNonce : 43,
  // H(userEthAddr|userNonce)
  taskId : 'aaac488a1a718dd9a854783cc34d1b3ae82121d0fc33615c54a290d90e2b02cc',
  encryptedArgs : '4ff8eb4f23632a59e3e2b21a25c6aa4538fde5253c7b50a10caa948e12ddc83f607790e4a0fb317cff8bde1a8b94f8e0e5274f4',
  encryptedFn : '0b9a7f5982f2b9fa69d952064e82cb4b6b9a718d98142da4b83a43d823455d75a35cc3600ba01fe4aa0f1b140006e98106a112e13e6f676d4bccb7c70cdd',
  userPubKey : '4343eb4f23632a59e3e2b21a25c6aa4538fde5253c7b50a10caa948e12ddc83f607790e4a0fb317cff8bde1a8b94f8e0e52741aa',
  contractAddress : '0x322c488a1a718dd9a854783cc34d1b3ae82121d0fc33615c54a290d90e2b0233',
  gasLimit : 24344 ,
  preCode : 'ab36658468465aef1grd56gse6fg1ae65f1aw684fr6aw81faw51f561fwawf32a59e3e2b21a25c6aa4538fde5253c7b50a10caa948e12ddc83f607790e4a0fb317cff8bde1a8b94f8e0e52741d92532eb4f23632a59e3e2b21a25c6aa4538fde5253c7b50a10caa948e12ddc83f607790e4a0fb317cff8bde1a8b94f8e0e52741d92532eb4f23632a59e3e2b21a25c6aa4538fde5253c7b50a10caa948e12ddc83f607790e4a0fb317cff8bde1a8b94f8e0e52741d92532eb4f23632a59e3e2b21a25c6aa4538fde5253c7b50a10caa948e12ddc83f607790e4a0fb317cff8bde1a8b94f8e0e52741d92532eb4f23632a59e3e2b21a25c6aa4538fde5253c7b50a10caa948e12ddc83f607790e4a0fb317cff8bde1a8b94f8e0e52741d92532eb4f23632a59e3e2b21a25c6aa4538fde5253c7b50a10caa948e12ddc83f607790e4a0fb317cff8bde1a8b94f8e0e52741ba',
};

function destroyDb(dbPath,resolve){
  testUtils.deleteFolderFromOSRecursive(dbPath,()=>{
    console.log("[task_mananger] deleted db.");
    resolve();
  });
}
describe('TaskManager isolated tests', ()=>{


  let logger;
  let dbPath;

  before(async function() {
    if(!tree['all']){
      this.skip();
    }
    // runs before all tests in this block
     logger = new Logger({
      'level': 'debug',
      'cli': true,
    });
    dbPath = path.join(__dirname, '/tasks_temp_db');
  });
  after((done)=>{
    testUtils.deleteFolderFromOSRecursive(dbPath,()=>{
      console.log("[task_mananger:AfterAll] deleted db.");
      done();
    });
  });
  it('#1 Should add 1 task', async function(){
    if(!tree['all'] || !tree['#1']){
      this.skip();
    }
    return new Promise(resolve => {
      // initialize the taskManager
      let taskManager = new TaskManager(dbPath, logger);
      taskManager.on('notify',(obj)=>{
        if(constants.NODE_NOTIFICATIONS.TASK_VERIFIED === obj.notification){
          // task added
          console.log("task added!");
          taskManager.getAllTasks((err,tasks)=>{
            assert.strictEqual(1,tasks.length,"more than 1 task");
            assert.strictEqual(user1.taskId,tasks[0].getTaskId(),"task id not equal");
            assert.strictEqual(constants.TASK_STATUS.IN_PROGRESS,tasks[0].getStatus(), "task not in progress");
            // close the db
            taskManager.stop((err)=>{
              assert.ifError(err);
              destroyDb(dbPath,resolve);
            });
          });
        }
      });
      // add task
      let t = ComputeTask.buildTask(user1);
      taskManager.addTask(t)
    });
  });
  it('#2 Should get all ids pointer from db', async function(){
    if (!tree['all'] || !tree['#3']) {
      this.skip();
    }
    return new Promise(async resolve=>{
      // init task manager
      let taskManager = new TaskManager(dbPath, logger);
      // add tasks
      let t1 = ComputeTask.buildTask(user1);
      let t2 = DeployTask.buildTask(user2);
      let isVerified = await taskManager.asyncAddTask(t1);
      let storedIds = await taskManager._asyncGetAllStoredIds();
      assert.strictEqual(1,storedIds.length, "not 1, actually = " + storedIds);
      assert.strictEqual(true,isVerified,"t1 not verified");
      let tasks = await taskManager.asyncGetAllTasks();
      assert.strictEqual(1, tasks.length, "not 1 tasks");
      isVerified = await taskManager.asyncAddTask(t2);
      assert.strictEqual(true,isVerified,"t2 not verified");
      tasks = await taskManager.asyncGetAllTasks();
      assert.strictEqual(2, tasks.length, "not 2 tasks");
      // check ids num
      taskManager._getAllStoredIds((err,ids)=>{
        assert.ifError(err);
        assert.strictEqual(2,ids.length,"not 2 id's, actuall = " + ids.length);
        taskManager.stop((err)=>{
          assert.ifError(err);
          destroyDb(dbPath,resolve);
        });
      });
    });
  });

  it('#3 Should remove Task from db', async function(){
    if (!tree['all'] || !tree['#3']) {
      this.skip();
    }
    return new Promise(async resolve => {
      // init task manager
      let taskManager = new TaskManager(dbPath, logger);
      // add tasks
      let t1 = ComputeTask.buildTask(user1);
      let t2 = DeployTask.buildTask(user2);
      let isVerified = await taskManager.asyncAddTask(t1);
      assert.strictEqual(true,isVerified,"t1 not verified");
      let tasks = await taskManager.asyncGetAllTasks();
      assert.strictEqual(1, tasks.length, "not 1 tasks");
      isVerified = await taskManager.asyncAddTask(t2);
      assert.strictEqual(true,isVerified,"t2 not verified");
      tasks = await taskManager.asyncGetAllTasks();
      assert.strictEqual(2, tasks.length, "not 2 tasks");
      let storedIds = await taskManager._asyncGetAllStoredIds();
      assert.strictEqual(2,storedIds.length,"not 2 stored ids in pointer table, actually = " + storedIds.length);
      // the actuall test - remove 1 task
      await taskManager.asyncRemoveTask(t1.getTaskId());
      storedIds = await taskManager._asyncGetAllStoredIds();
      assert.strictEqual(1,storedIds.length,"not 1 stored ids in pointer table, actually = " + storedIds.length);
      tasks = await taskManager.asyncGetAllTasks();
      assert.strictEqual(1, tasks.length, "not 1 tasks in deletion, now exist: " + tasks.length);
      // remove the second task
      await taskManager.asyncRemoveTask(t2.getTaskId());
      tasks = await taskManager.asyncGetAllTasks();
      assert.strictEqual(0, tasks.length, "not 0 tasks in deletion, now exist: " + tasks.length);
      
      taskManager.stop((err)=>{
        assert.ifError(err);
        destroyDb(dbPath,resolve);
      });
      });
    });
  // end of suite
});





