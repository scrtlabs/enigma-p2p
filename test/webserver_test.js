const assert = require("assert");
const axios = require("axios");
const testBuilder = require("./testUtils/quickBuilderUtil");
const testUtils = require("./testUtils/utils");
const constants = require("../src/common/constants");
const tree = require("./test_tree").TEST_TREE.healthcheck;

const noLoggerOpts = {
  bOpts: {
    withLogger: true
  },
  pOpts: {
    withLogger: true
  }
};

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

it("#1 Query healthCheck + status", async function() {
  if (!tree["all"] || !tree["#1"]) {
    this.skip();
  }
  return new Promise(async resolve => {
    const peersNum = 5;
    const port = 9898;
    const hcUrl = "/hc";
    const statusUrl = "/st";
    // init nodes
    const { peers, bNode } = await testBuilder.createN(peersNum, noLoggerOpts);
    await testUtils.sleep(4000);
    const bNodeController = bNode.mainController;
    const bNodeCoreServer = bNode.coreServer;
    // start the tested node
    const testPeer = await testBuilder.createNode({
      withEth: true,
      ethWorkerAddress: "0xb9A219631Aed55eBC3D998f17C3840B7eC39C0cc",
      webserver: { port: port, healthCheck: { url: hcUrl }, status: { url: statusUrl } }
    });

    let connectedPeers = 0;
    testPeer.mainController
      .getNode()
      .engNode()
      .node.on(constants.PROTOCOLS.PEER_CONNECT, async peer => {
        connectedPeers += 1;

        // start test only after all connections established
        if (connectedPeers === peersNum + 1) {
          // request health check
          let url = "http://localhost:" + port + hcUrl;
          let response = await axios.get(url);
          assert.strictEqual(response.status, 200);
          assert.strictEqual(response.data.core.status, true);
          assert.strictEqual(response.data.core.registrationParams.signKey.length, 42);
          assert.strictEqual(response.data.ethereum.status, true);
          assert.strictEqual(response.data.connectivity.status, true);
          assert.strictEqual(response.data.connectivity.connections, peersNum + 1);

          // request status
          url = "http://localhost:" + port + statusUrl;
          response = await axios.get(url);
          assert.strictEqual(response.status, 200);
          assert.strictEqual(response.data, constants.WORKER_STATUS.UNREGISTERED);

          // STOP EVERYTHING
          peers.push(testPeer);
          await stopTest(peers, bNodeController, bNodeCoreServer, resolve);
        }
      });
  });
});
