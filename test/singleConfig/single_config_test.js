const EnvironmentBuilder = require("../../src/main_controller/EnvironmentBuilder");
const CoreServer = require("../../src/core/core_server_mock/core_server");
const tree = require("../test_tree").TEST_TREE.single_config;
const expect = require("expect");
const assert = require("assert");
const MainController = require("../../src/main_controller/FacadeController");
const testUtils = require("../testUtils/utils");
const path = require("path");
const ID_B_PATH = path.join(__dirname, "id-l.json");
const jayson = require("jayson");

function getRpcClient(port) {
  return jayson.client.http("http://localhost:" + port);
}
function getConfig() {
  return require("./config_1");
}
function getBootsrapConfig() {
  let c = require("./config_2_bootstrap");
  c.node.idPath = ID_B_PATH;
  return c;
}

function getCoreServer(uri) {
  coreServer = new CoreServer();
  coreServer.runServer(uri);
  return coreServer;
}

describe("single_config_tests", () => {
  it("#1 Should create node and shutdown", async function() {
    if (!tree["all"] || !tree["#1"]) {
      this.skip();
    }
    const c = getConfig();
    return new Promise(async resolve => {
      let coreServer = getCoreServer(c.core.uri);
      let mainController = await EnvironmentBuilder.buildFromSingle(c);
      expect(mainController).toEqual(expect.anything());
      assert(mainController instanceof MainController, "not main controller");
      await mainController.shutdownSystem();
      coreServer.disconnect();
      resolve();
    });
  });
  it("#2 Should test with proxy and shutdown", async function() {
    if (!tree["all"] || !tree["#2"]) {
      this.skip();
    }
    return new Promise(async (resolve, reject) => {
      await testUtils.sleep(2000);
      const c = getConfig();
      const bc = getBootsrapConfig();
      let bCoreServer = getCoreServer(bc.core.uri);
      let pCoreServer = getCoreServer(c.core.uri);
      let bMainController = await EnvironmentBuilder.buildFromSingle(bc);
      let pMainController = await EnvironmentBuilder.buildFromSingle(c);
      let client = getRpcClient(bc.proxy.port);
      // verify connectivity
      expect(pMainController).toEqual(expect.anything());
      assert(pMainController instanceof MainController, "not main controller");
      assert(bMainController instanceof MainController, "not main controller");
      await testUtils.sleep(5000);
      // rpc
      let signKey = await pMainController.getNode().selfSubscribeAction();
      await testUtils.sleep(1000);
      const userPubKey =
        "5587fbc96b01bfe6482bf9361a08e84810afcc0b1af72a8e4520f9" +
        "8771ea1080681e8a2f9546e5924e18c047fa948591dba098bffaced50f97a41b0050bdab99";
      client.request("getWorkerEncryptionKey", { workerAddress: signKey, userPubKey: userPubKey }, async (err, res) => {
        if (err) {
          reject(err);
        }
        assert.strictEqual(
          "worker-signature-with-signed-by-the-private-key-of-the-sender-key",
          res.result.result.workerSig,
          "workersig dont match"
        );
        await pMainController.shutdownSystem();
        await bMainController.shutdownSystem();
        pCoreServer.disconnect();
        bCoreServer.disconnect();
        resolve();
      });
    });
  });
});
