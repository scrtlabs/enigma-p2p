const assert = require('assert');
const tree = require('./test_tree').TEST_TREE.sync_network;
const constants = require('../src/common/constants');
const testBuilder = require('./testUtils/quickBuilderUtil');
const testUtils = require('./testUtils/utils');

describe('sync_network_tests',()=> {
  it('#1 Should test w1 Publish a task and w2 receive it', async function() {
    if (!tree['all'] || !tree['#1']) {
      this.skip();
    }
    return new Promise(async resolve => {
      let {peers,bNode} = await testBuilder.createN(2);
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
      await stopTest();
    });
  });
});
