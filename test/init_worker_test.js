const tree = require('./test_tree').TEST_TREE.init_worker;
const assert = require('assert');
const testBuilder = require('./testUtils/quickBuilderUtil');
const testUtils = require('./testUtils/utils');
const DbUtils = require('../src/common/DbUtils');
const DB_PROVIDER = require('../src/core/core_server_mock/data/provider_db');
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

const PROVIDERS_DB_MAP = transformStatesListToMap(DB_PROVIDER);

async function setEthereumState(api, web3, workerAddress, workerEnclaveSigningAddress) {
  for (const address in PROVIDERS_DB_MAP) {
    const secretContractData = PROVIDERS_DB_MAP[address];
    const addressInByteArray = address.split(',').map(function(item) {
      return parseInt(item, 10);
    });

    const hexString = '0x' + DbUtils.toHexString(addressInByteArray);
    const codeHash = web3.utils.keccak256(secretContractData[-1]);
    const firstDeltaHash = web3.utils.keccak256(secretContractData[0]);
    const outputHash = web3.utils.randomHex(32);
    const gasUsed = 5;
    const optionalEthereumData = '0x00';
    const optionalEthereumContractAddress = '0x0000000000000000000000000000000000000000';
    await api.deploySecretContract(hexString, codeHash, codeHash, firstDeltaHash, optionalEthereumData,
      optionalEthereumContractAddress, gasUsed, workerEnclaveSigningAddress, {from: workerAddress});
    let i = 1;

    while (i in secretContractData) {
      const taskId = web3.utils.randomHex(32);
      const delta = secretContractData[i];
      const stateDeltaHash = web3.utils.keccak256(delta);
      await api.commitReceipt(hexString, taskId, stateDeltaHash, outputHash, optionalEthereumData, optionalEthereumContractAddress, gasUsed,
        workerEnclaveSigningAddress, {from: workerAddress});
      i++;
    }
  }
}

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
  await setEthereumState(api, api.w3(), workerAddress, accounts[1]);
  await testUtils.sleep(2000);
}

function transformStatesListToMap(statesList) {
  const statesMap = {};
  for (let i = 0; i < statesList.length; ++i) {
    const address = statesList[i].address;
    if (!(address in statesMap)) {
      statesMap[address] = {};
    }
    const key = statesList[i].key;
    const delta = statesList[i].data;
    statesMap[address][key] = delta;
  }
  return statesMap;
}

function prepareSyncTestData() {
  const res = {};

  res.tips = [];
  res.expected = PROVIDERS_DB_MAP;
  return res;
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
    let data = prepareSyncTestData();
    bNodeCoreServer.setProvider(true);
    await bNodeController.getNode().asynctryAnnounce();
    coreServer.setReceiverTips(data.tips);
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
