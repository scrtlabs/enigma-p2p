const tree = require('./test_tree').TEST_TREE.healthcheck;
const assert = require('assert');
const testBuilder = require('./testUtils/quickBuilderUtil');
const testUtils = require('./testUtils/utils');
const noLoggerOpts = {
  bOpts : {
    withLogger : false,
  },
  pOpts : {
    withLogger : false,
  },
};

const stopTest = async (peers,bNodeController,bNodeCoreServer,resolve)=>{
  let pPaths = peers.map(p=>{
    return p.tasksDbPath;
  });
  for(let i=0;i<pPaths.length;++i){
    await peers[i].mainController.shutdownSystem();
    peers[i].coreServer.disconnect();
  }
  await bNodeController.shutdownSystem();
  bNodeCoreServer.disconnect();
  resolve();
};

it('#1 perform healthcheck', async function() {
  if (!tree['all'] || !tree['#1']) {
    this.skip();
  }
  return new Promise(async resolve => {
    let peersNum = 7;
    // init nodes
    let {peers,bNode} = await testBuilder.createN(peersNum,noLoggerOpts);
    await testUtils.sleep(4000);
    let bNodeController = bNode.mainController;
    let bNodeCoreServer = bNode.coreServer;
    // start the tested node
    const testBundle = await testBuilder.createNode({withEth : true});
    await testUtils.sleep(1000);
    await testBundle.mainController.getNode().asyncTryConsistentDiscovery();
    let hc = await testBundle.mainController.healthCheck();
    // assertion checks
    assert.strictEqual(hc.status, true);

    assert.strictEqual(hc.connection.outbound, 8);
    assert.strictEqual(hc.connection.status, true);

    assert.strictEqual(hc.core.status, true);
    assert.strictEqual(hc.core.registrationParams.signKey.length, 42);
    assert.strictEqual(hc.ethereum.status, true);

    assert.strictEqual(Object.keys(hc.state.missing).length, 0);
    assert.strictEqual(hc.state.status, true);

    // STOP EVERYTHING
    peers.push(testBundle);
    await stopTest(peers,bNodeController,bNodeCoreServer,resolve);
  })
});
