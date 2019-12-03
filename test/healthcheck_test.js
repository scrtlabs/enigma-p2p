const tree = require("./test_tree").TEST_TREE.healthcheck;
const assert = require("assert");
const http = require("http");
const testBuilder = require("./testUtils/quickBuilderUtil");
const testUtils = require("./testUtils/utils");
const constants = require("../src/common/constants");

const noLoggerOpts = {
  bOpts: {
    withLogger: false
  },
  pOpts: {
    withLogger: false
  }
};

const stopTest = async (peers, bNodeController, bNodeCoreServer, resolve) => {
  let pPaths = peers.map(p => {
    return p.tasksDbPath;
  });
  for (let i = 0; i < pPaths.length; ++i) {
    await peers[i].mainController.shutdownSystem();
    peers[i].coreServer.disconnect();
  }
  await bNodeController.shutdownSystem();
  bNodeCoreServer.disconnect();
  resolve();
};

it("#1 Perform healthCheck", async function() {
  if (!tree["all"] || !tree["#1"]) {
    this.skip();
  }
  return new Promise(async resolve => {
    const peersNum = 7;
    const hcPort = 9898;
    const hcUrl = "/hc";
    // init nodes
    let { peers, bNode } = await testBuilder.createN(peersNum, noLoggerOpts);
    await testUtils.sleep(4000);
    let bNodeController = bNode.mainController;
    let bNodeCoreServer = bNode.coreServer;
    // start the tested node
    const testPeer = await testBuilder.createNode({
      withEth: true,
      webserver: { healthCheck: { port: hcPort, url: hcUrl } }
    });
    await testUtils.sleep(1000);

    // request the health check straight forward

    let hc = await testPeer.mainController.getNode().asyncExecCmd(constants.NODE_NOTIFICATIONS.HEALTH_CHECK, {});
    assert.strictEqual(hc.core.status, true);
    assert.strictEqual(hc.core.registrationParams.signKey.length, 42);
    assert.strictEqual(hc.ethereum.status, true);

    // assert.strictEqual(Object.keys(hc.state.missing).length, 0);
    // assert.strictEqual(hc.state.status, true);

    // request the check using the web server
    http.get({ hostname: "localhost", port: hcPort, path: hcUrl }, async res => {
      assert.strictEqual(res.statusMessage, "OK");
      assert.strictEqual(res.statusCode, 200);
      // STOP EVERYTHING
      peers.push(testPeer);
      await stopTest(peers, bNodeController, bNodeCoreServer, resolve);
    });
  });
});
