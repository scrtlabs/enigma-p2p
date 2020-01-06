const tree = require("./test_tree").TEST_TREE.init_worker;
const assert = require("assert");
const testBuilder = require("./testUtils/quickBuilderUtil");
const testUtils = require("./testUtils/utils");
const utils = require("../src/common/utils");
const ethTestUtils = require("./ethereum/utils");
const constants = require("../src/common/constants");
const Web3 = require("web3");

const DB_PROVIDER = require("../src/core/core_server_mock/data/provider_db");
const PROVIDERS_DB_MAP = utils.transformStatesListToMap(DB_PROVIDER);

const stopTest = async (peers, bNodeController, bNodeCoreServer, resolve) => {
  const pPaths = peers.map(p => {
    return p.tasksDbPath;
  });
  try {
    for (let i = 0; i < pPaths.length; ++i) {
      await peers[i].mainController.shutdownSystem();
      peers[i].coreServer.disconnect();
    }
    await bNodeController.shutdownSystem();
    bNodeCoreServer.disconnect();
  } catch (e) {
    console.log("ERROR while trying to stop the nodes=" + JSON.stringify(e));
  }
  resolve();
};

async function prepareEthData(controller, bootstrapAccount, peerAccount) {
  let api = controller
    .getNode()
    .ethereum()
    .api();
  const accounts = await api.w3().eth.getAccounts();

  const WORKER_WEI_VALUE = 100000000000000000;
  await api.w3().eth.sendTransaction({
    from: accounts[1],
    to: bootstrapAccount.address,
    value: WORKER_WEI_VALUE
  });
  await api.w3().eth.sendTransaction({
    from: accounts[2],
    to: peerAccount.address,
    value: WORKER_WEI_VALUE
  });

  const workerReport = "0x123456";
  const signature = api.w3().utils.randomHex(32);
  const workerEnclaveSigningAddress = accounts[3];

  await api.register(workerEnclaveSigningAddress, workerReport, signature, {
    from: bootstrapAccount.address
  });
  await api.login({ from: bootstrapAccount.address });
  await ethTestUtils.setEthereumState(
    api,
    api.w3(),
    bootstrapAccount.address,
    workerEnclaveSigningAddress,
    PROVIDERS_DB_MAP
  );
}

// todo: create a DB for the coreServer which is stored in memory and
//  use a test flag 'stateful` to decide if to store data to it or not.
it("#1 run init and healthCheck", async function() {
  if (!tree["all"] || !tree["#1"]) {
    this.skip();
  }
  return new Promise(async resolve => {
    const bootstrapAccount = new Web3().eth.accounts.create();
    const bootstrapStakingAccount = new Web3().eth.accounts.create();
    const peerAccount = new Web3().eth.accounts.create();
    const peerStakingAccount = new Web3().eth.accounts.create();

    // This creates 8 enigma-p2p nodes - 1 bootstrap, 7 workers
    let peersNum = 7;
    const config = {
      bOpts: {
        withLogger: false,
        withEth: true,
        ethStakingAddress: bootstrapStakingAccount.address,
        ethWorkerAddress: bootstrapAccount.address,
        ethWorkerPrivateKey: bootstrapAccount.privateKey
      },
      pOpts: {
        withLogger: false
      }
    };
    let { peers, bNode } = await testBuilder.createN(peersNum, config);
    await testUtils.sleep(4000); // TODO fix
    let bNodeController = bNode.mainController;
    let bNodeCoreServer = bNode.coreServer; // mock

    // connect the bootstrap node to ethereum
    await prepareEthData(bNodeController, bootstrapAccount, peerAccount);

    // start the tested node
    const testPeer = await testBuilder.createNode({
      withEth: true,
      ethStakingAddress: peerStakingAccount.address,
      ethWorkerAddress: peerAccount.address,
      ethWorkerPrivateKey: peerAccount.privateKey,
      coreDb: {}
    });
    testPeer.mainController
      .getNode()
      .engNode()
      .node.on(constants.PROTOCOLS.PEER_CONNECT, async peer => {
        await bNodeController.getNode().asynctryAnnounce();

        await testPeer.mainController.getNode().asyncInitializeWorkerProcess({ amount: 50000 });

        // request the check straight forward
        let hc = await testPeer.mainController.getNode().asyncExecCmd(constants.NODE_NOTIFICATIONS.HEALTH_CHECK, {});
        // assertion checks
        assert.strictEqual(hc.status, true);
        assert.strictEqual(hc.core.status, true);
        assert.strictEqual(hc.core.registrationParams.signKey.length, 42);
        assert.strictEqual(hc.ethereum.status, true);
        assert.strictEqual(hc.connectivity.status, true);

        const { missingList, excessList } = await testPeer.mainController
          .getNode()
          .asyncExecCmd(constants.NODE_NOTIFICATIONS.IDENTIFY_MISSING_STATES_FROM_REMOTE);

        assert.strictEqual(missingList.length, 0);
        assert.strictEqual(excessList.length, 0);

        // STOP EVERYTHING
        peers.push(testPeer);
        await stopTest(peers, bNodeController, bNodeCoreServer, resolve);
      });
  });
});
