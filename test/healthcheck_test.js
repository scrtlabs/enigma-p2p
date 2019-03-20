const tree = require('./test_tree').TEST_TREE.healthcheck;
const assert = require('assert');
const testBuilder = require('./testUtils/quickBuilderUtil');
const constants = require('../src/common/constants');
const testUtils = require('./testUtils/utils');
const noLoggerOpts = {
  bOpts : {
    withLogger : true,
  },
  pOpts : {
    withLogger : true,
  },
};
//TODO:: sync_network_test.js to learn about createN usage

it('#1 perform healthcheck', async function() {
  if (!tree['all'] || !tree['#1']) {
    this.skip();
  }
  return new Promise(async  resolve =>{
    // create env 9 nodes
    // discover
    // assert connections report
    let peersNum = 8;
    let {peers,bNode} = await testBuilder.createN(peersNum,noLoggerOpts);
    let bNodeController = bNode.mainController;
    let bNodeCoreServer = bNode.coreServer;
    let pPaths = peers.map(p=>{
      return p.tasksDbPath;
    });
    let bPath = bNode.tasksDbPath;
    const stopTest = async ()=>{
      for(let i = 0; i < pPaths.length; ++i){
        await peers[i].mainController.shutdownSystem();
        peers[i].coreServer.disconnect();
        await testUtils.rm_Minus_Rf(pPaths[i]);
      }
      await bNodeController.shutdownSystem();
      bNodeCoreServer.disconnect();
      await testUtils.rm_Minus_Rf(bPath);
      resolve();
    };
    // for(let i = 0; i < pPaths.length; ++i) {
    //   let outCount = await peers[i].mainController.getNode().getAllOutboundHandshakes().length;
    //   assert(outCount === 1);
    // }
    await testUtils.sleep(8*1000);
    await stopTest();
    // await testUtils.sleep(1000);
  //   peers.forEach((peer) => {
  //     let node = peer.mainController.getNode();
  //     node.tryConsistentDiscovery();
  //     let outCount = node.getAllOutboundHandshakes().length;
  //     assert(outCount, constants.DHT_STATUS.OPTIMAL_DHT_SIZE);
  //   });
  // resolve();
  })
});

