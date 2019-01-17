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
   userTaskId : 'ae2c488a1a718dd9a854783cc34d1b3ae82121d0fc33615c54a290d90e2b02b3',
   encryptedArgs : '3cf8eb4f23632a59e3e2b21a25c6aa4538fde5253c7b50a10caa948e12ddc83f607790e4a0fb317cff8bde1a8b94f8e0e52741d9',
   encryptedFn : '5a380b9a7f5982f2b9fa69d952064e82cb4b6b9a718d98142da4b83a43d823455d75a35cc3600ba01fe4aa0f1b140006e98106a112e13e6f676d4bccb7c70cdd1c',
   userPubKey : '2532eb4f23632a59e3e2b21a25c6aa4538fde5253c7b50a10caa948e12ddc83f607790e4a0fb317cff8bde1a8b94f8e0e52741d9',
   contractAddress : '0xae2c488a1a718dd9a854783cc34d1b3ae82121d0fc33615c54a290d90e2b02b3',
   preCode : 'f236658468465aef1grd56gse6fg1ae65f1aw684fr6aw81faw51f561fwawf32a59e3e2b21a25c6aa4538fde5253c7b50a10caa948e12ddc83f607790e4a0fb317cff8bde1a8b94f8e0e52741d92532eb4f23632a59e3e2b21a25c6aa4538fde5253c7b50a10caa948e12ddc83f607790e4a0fb317cff8bde1a8b94f8e0e52741d92532eb4f23632a59e3e2b21a25c6aa4538fde5253c7b50a10caa948e12ddc83f607790e4a0fb317cff8bde1a8b94f8e0e52741d92532eb4f23632a59e3e2b21a25c6aa4538fde5253c7b50a10caa948e12ddc83f607790e4a0fb317cff8bde1a8b94f8e0e52741d92532eb4f23632a59e3e2b21a25c6aa4538fde5253c7b50a10caa948e12ddc83f607790e4a0fb317cff8bde1a8b94f8e0e52741d92532eb4f23632a59e3e2b21a25c6aa4538fde5253c7b50a10caa948e12ddc83f607790e4a0fb317cff8bde1a8b94f8e0e52741d9',
};

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

  afterEach(function(done) {
    // runs after each test in this block
    testUtils.deleteFolderFromOSRecursive(dbPath,()=>{
      done();
    });
  });

  it('#1 Should init and destroy', async function(){
    if(!tree['all'] || !tree['#1']){
      this.skip();
    }
    // initialize the taskManager
    let taskManager = new TaskManager(dbPath, logger);
    // add unverified task
    // delete task

  });
});





