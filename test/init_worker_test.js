const tree = require('./test_tree').TEST_TREE.init_worker;
const assert = require('assert');
const testBuilder = require('./testUtils/quickBuilderUtil');
const testUtils = require('./testUtils/utils');
const noLoggerOpts = {
  bOpts : {
    withLogger : false,
    withEth : true,
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

async function prepareEthData(controller) {
  let api = controller.getNode().ethereum().api();
  const accounts = await api.w3().eth.getAccounts();
  const workerAddress = accounts[1];
  const workerReport = '0x123456';
  const signature = api.w3().utils.randomHex(32);
  const depositValue = 1000;
  const workerEnclaveSigningAddress = accounts[2];
  await api.register(workerEnclaveSigningAddress, workerReport, signature, {from: workerAddress});
  await api.deposit(workerAddress, depositValue, {from: workerAddress});
  await api.login({from: workerAddress});
  await testUtils.setEthereumState(api, api.w3(), workerAddress, accounts[1]);
  await testUtils.sleep(2000);
}

// todo: create a DB for the coreServer which is stored in memory and
//  use a test flag 'stateful` to decide if to store data to it or not.
it('#1 run init and healthCheck', async function() {
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
    await prepareEthData(bNodeController);
    // start the tested node
    const testPeer = await testBuilder.createNode({withEth : true, stateful: true});
    await testUtils.sleep(1000);

    const controller = testPeer.mainController;
    const coreServer = testPeer.coreServer;

    const accounts = await controller.getNode().ethereum().api().w3().eth.getAccounts();
    const workerAddress = accounts[0];
    coreServer.setSigningKey(workerAddress);
    let noTipsReceiver = [];
    bNodeCoreServer.setProvider(true);
    await bNodeController.getNode().asynctryAnnounce();
    coreServer.setReceiverTips(noTipsReceiver);
    await testPeer.mainController.getNode().asyncInitializeWorkerProcess({amount: 50000});
    // await testUtils.sleep(2000);
    let hc = await testPeer.mainController.healthCheck();
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
    peers.push(testPeer);
    await stopTest(peers,bNodeController,bNodeCoreServer,resolve);
  })
});