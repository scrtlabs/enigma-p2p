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
    await testUtils.sleep(4*1000);
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


    let testedNode = peers[0];
    // discover
    await testedNode.mainController.getNode().asyncTryConsistentDiscovery();
    // perform the health check
    let hc = await testedNode.mainController.healthCheck();
    assert.strictEqual(hc.status, true);
    // an address is 20 bytes + '0x' in hex: is 42
    assert.strictEqual(hc.core.registrationParams.signKey.length, 42);
    // close all peers and resolve test
    await stopTest();
  })
});

