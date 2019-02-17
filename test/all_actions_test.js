const testBuilder = require('./testUtils/quickBuilderUtil');
const TEST_TREE = require('./test_tree').TEST_TREE;
const testUtils = require('./testUtils/utils');
const assert = require('assert');

describe('actions_tests',()=>{

  it('#1 GetLocalTipsOfRemote Action', async function(){
    let tree = TEST_TREE.actions_tests;
    if(!tree['all'] || !tree['#1']){
      this.skip();
    }
    return new Promise(async resolve => {
      // create all the boring stuff
      let {bNode,peer} = await testBuilder.createTwo();
      await testUtils.sleep(3000);
      let bNodeController = bNode.mainController;
      let bNodeCoreServer = bNode.coreServer;
      let peerController = peer.mainController;
      let peerCoreServer = peer.coreServer;
      let pPath = peer.tasksDbPath;
      let bPath = bNode.tasksDbPath;
      // stop the test
      const stopTest = async ()=>{
        await peerController.shutdownSystem();
        peerCoreServer.disconnect();
        await bNodeController.shutdownSystem();
        bNodeCoreServer.disconnect();
        await testUtils.rm_Minus_Rf(pPath);
        await testUtils.rm_Minus_Rf(bPath);
        resolve();
      };
      let b58Id = bNodeController.getNode().engNode().getSelfIdB58Str();
      let tips = await peerController.getNode().getLocalStateOfRemote(b58Id);
      assert.strictEqual(3, tips.length,'not 3 tips');
      await stopTest();
    });
  });
  it('#2 lookUpPeer api method', async function(){
    let tree = TEST_TREE.actions_tests;
    if(!tree['all'] || !tree['#2']){
      this.skip();
    }
    return new Promise(async resolve => {
      // create all the boring stuff
      let {bNode,peer} = await testBuilder.createTwo();
      await testUtils.sleep(3000);
      let bNodeController = bNode.mainController;
      let bNodeCoreServer = bNode.coreServer;
      let peerController = peer.mainController;
      let peerCoreServer = peer.coreServer;
      let pPath = peer.tasksDbPath;
      let bPath = bNode.tasksDbPath;
      // stop the test
      const stopTest = async ()=>{
        await peerController.shutdownSystem();
        peerCoreServer.disconnect();
        await bNodeController.shutdownSystem();
        bNodeCoreServer.disconnect();
        await testUtils.rm_Minus_Rf(pPath);
        await testUtils.rm_Minus_Rf(bPath);
        resolve();
      };
      let b58Id = bNodeController.getNode().engNode().getSelfIdB58Str();
      let peerInfo = await peerController.getNode().lookUpPeer(b58Id);
      assert.strictEqual(b58Id, peerInfo.id.toB58String(), 'peer id not equal');
      await stopTest();
    });
  });
});
