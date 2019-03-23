const assert = require('assert');
const EngCid = require('../src/common/EngCID');
const tree = require('./test_tree').TEST_TREE.sync_network;
const constants = require('../src/common/constants');
const testBuilder = require('./testUtils/quickBuilderUtil');
const testUtils = require('./testUtils/utils');
const DeployTask = require('../src/worker/tasks/DeployTask');
const Result = require('../src/worker/tasks/Result');
const noLoggerOpts = {
  bOpts : {
    withLogger : false,
  },
  pOpts : {
    withLogger : false,
  },
};
describe('sync_network_tests',()=> {
  /**
   * plan:
   * create 15 nodes. y? idk
   * chose 1 worker node
   * chose 1 verifier node
   * - worker node publishes deployment task
   * - all nodes get the task
   * - verifier node request to find providers for that ecid
   * - verify that it returns 14 potential providers => this means everyone synched and announced properly.
   * */
  it('#1 should test that everyone announced after task result published to the p2p', async function() {
    if (!tree['all'] || !tree['#1']) {
      this.skip();
    }
    return new Promise(async resolve => {
      let peersNum = 3;
      let {peers,bNode} = await testBuilder.createN(peersNum,noLoggerOpts);
      await testUtils.sleep(5000);
      let bNodeController = bNode.mainController;
      let bNodeCoreServer = bNode.coreServer;
      let pPaths = peers.map(p=>{
        return p.tasksDbPath;
      });
      let bPath = bNode.tasksDbPath;
      const stopTest = async ()=>{
        for(let i=0;i<pPaths.length;++i){
          await peers[i].mainController.shutdownSystem();
          peers[i].coreServer.disconnect();
          await testUtils.rm_Minus_Rf(pPaths[i]);
        }
        await bNodeController.shutdownSystem();
        bNodeCoreServer.disconnect();
        await testUtils.rm_Minus_Rf(bPath);
        resolve();
      };
      // create deploy task
      let task = getDeployResultTask();
      let workerPeer = peers[0];
      let verifierPeer = peers[1];
      // publish the task
      workerPeer.mainController.getNode().execCmd(constants.NODE_NOTIFICATIONS.TASK_FINISHED, { task : task});
      await testUtils.sleep(3000);
      let ecid = EngCid.createFromSCAddress(task.getContractAddr());
      let findProvidersResult = await verifierPeer.mainController.getNode().asyncFindProviders([ecid]);
      assert.strictEqual(false, findProvidersResult.isErrors(), ' errors found in find provider result');
      let providers = findProvidersResult.getProvidersFor(ecid);
      let providersNum = Object.keys(providers).length;
      assert.strictEqual(peersNum+1, providersNum, `wrong providers number current = ${providersNum} instead of ${peersNum+1}`);
      await stopTest();
    });
  });
});


function getDeployResultTask(){
  let taskRawObj = {
    taskId : '0x0033105ed3302282dddd38fcc8330a6448f6ae16bbcb26209d8740e8b3d28538',
    preCode : [0,1,2,3,4,5,6,7,8,9,10,11,22,11,33,22,55,66,99,66,33,66,33,66,33,66,33],
    encryptedArgs : 'kjidejkdjeu83832uewhriowehjuehyhejdekioeuisdrhjfdrkhjfesdjksfdljkoifdkliutrjiukerfjk',
    encryptedFn : 'kjhbsarglikujrhehihiuhihikkkkkkkkkkkkjdhfyueuehen',
    userDHKey :  '5587fbc96b01bfe6482bf9361a08e84810afcc0b1af72a8e4520f98771ea1080681e8a2f9546e5924e18c047fa948591dba098bffaced50f97a41b0050bdab99',
    gasLimit : 1200,
    contractAddress : '0x0033105ed3302282dddd38fcc8330a6448f6ae16bbcb26209d8740e8b3d28538'
  };
  let deployTask = DeployTask.buildTask(taskRawObj);
  // create result
  let resultRawObj = {
    taskId : deployTask.getTaskId(),
    status : constants.TASK_STATUS.SUCCESS,
    output : [123,22,4,55,66],
    delta : {index : 2, data : [96,22,4,55,66,88]},
    usedGas : 213,
    ethereumPayload : [233,46,78],
    ethereumAddress : 'cc353334487696ebc3e15411e0b106186eba3c0c',
    signature : [233,43,67,54],
    preCodeHash : '87c2d362de99f75a4f2755cdaaad2d11bf6cc65dc71356593c445535ff28f43d'
  };
  let result = Result.DeployResult.buildDeployResult(resultRawObj);
  deployTask.setResult(result);
  return deployTask;
}
