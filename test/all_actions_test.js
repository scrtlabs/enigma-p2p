const testBuilder = require("./testUtils/quickBuilderUtil");
const TEST_TREE = require("./test_tree").TEST_TREE;
const testUtils = require("./testUtils/utils");
const assert = require("assert");
const EngCid = require("../src/common/EngCID");
const EncoderUtil = require("../src/common/EncoderUtil");
const CidUtil = require("../src/common/CIDUtil");
const constants = require("../src/common/constants");
describe("actions_tests", () => {
  it("#1 GetLocalTipsOfRemote Action", async function() {
    let tree = TEST_TREE.actions_tests;
    if (!tree["all"] || !tree["#1"]) {
      this.skip();
    }
    return new Promise(async resolve => {
      // create all the boring stuff
      let { bNode, peer } = await testBuilder.createTwo();
      await testUtils.sleep(3000);
      let bNodeController = bNode.mainController;
      let bNodeCoreServer = bNode.coreServer;
      let peerController = peer.mainController;
      let peerCoreServer = peer.coreServer;
      let pPath = peer.tasksDbPath;
      let bPath = bNode.tasksDbPath;
      // stop the test
      const stopTest = async () => {
        await peerController.shutdownSystem();
        peerCoreServer.disconnect();
        await bNodeController.shutdownSystem();
        bNodeCoreServer.disconnect();
        // await testUtils.rm_Minus_Rf(pPath);
        // await testUtils.rm_Minus_Rf(bPath);
        resolve();
      };
      let b58Id = bNodeController
        .getNode()
        .engNode()
        .getSelfIdB58Str();
      let tips = await peerController.getNode().getLocalStateOfRemote(b58Id);
      assert.strictEqual(3, tips.length, "not 3 tips");
      await stopTest();
    });
  });
  it("#2 lookUpPeer api method", async function() {
    let tree = TEST_TREE.actions_tests;
    if (!tree["all"] || !tree["#2"]) {
      this.skip();
    }
    return new Promise(async resolve => {
      // create all the boring stuff
      let { bNode, peer } = await testBuilder.createTwo();
      await testUtils.sleep(3000);
      let bNodeController = bNode.mainController;
      let bNodeCoreServer = bNode.coreServer;
      let peerController = peer.mainController;
      let peerCoreServer = peer.coreServer;
      let pPath = peer.tasksDbPath;
      let bPath = bNode.tasksDbPath;
      // stop the test
      const stopTest = async () => {
        await peerController.shutdownSystem();
        peerCoreServer.disconnect();
        await bNodeController.shutdownSystem();
        bNodeCoreServer.disconnect();
        // await testUtils.rm_Minus_Rf(pPath);
        // await testUtils.rm_Minus_Rf(bPath);
        resolve();
      };
      let b58Id = bNodeController
        .getNode()
        .engNode()
        .getSelfIdB58Str();
      let peerInfo = await peerController.getNode().lookUpPeer(b58Id);
      assert.strictEqual(b58Id, peerInfo.id.toB58String(), "peer id not equal");
      await stopTest();
    });
  });
  it("#3 AnnounceContent action", async function() {
    let tree = TEST_TREE.actions_tests;
    if (!tree["all"] || !tree["#3"]) {
      this.skip();
    }
    return new Promise(async resolve => {
      // create all the boring stuff
      let { bNode, peer } = await testBuilder.createTwo();
      await testUtils.sleep(3000);
      let bNodeController = bNode.mainController;
      let bNodeCoreServer = bNode.coreServer;
      let peerController = peer.mainController;
      let peerCoreServer = peer.coreServer;
      let pPath = peer.tasksDbPath;
      let bPath = bNode.tasksDbPath;
      // stop the test
      const stopTest = async () => {
        await peerController.shutdownSystem();
        peerCoreServer.disconnect();
        await bNodeController.shutdownSystem();
        bNodeCoreServer.disconnect();
        // await testUtils.rm_Minus_Rf(pPath);
        // await testUtils.rm_Minus_Rf(bPath);
        resolve();
      };
      // run the actual test
      // 1. create some content
      let blob = [
        22,
        33,
        44,
        55,
        66,
        77,
        88,
        99,
        100,
        101,
        102,
        103,
        104,
        105,
        106,
        107,
        108,
        109,
        110,
        111,
        112,
        113,
        113,
        115,
        116
      ];
      // 2. turn it into eng cid
      let engCid = EngCid.createFromByteArray(blob);
      // 3. announce the content
      let failedCids = await peerController.getNode().asyncExecCmd(constants.NODE_NOTIFICATIONS.ANNOUNCE_ENG_CIDS, {
        engCids: [engCid]
      });
      assert.strictEqual(0, failedCids.length, `failed cids ${failedCids.length}`);
      // 4. verify provider
      await testUtils.sleep(1000);
      let findProvidersResult = await bNodeController.getNode().asyncFindProviders([engCid]);
      assert.strictEqual(false, findProvidersResult.isErrors(), " errors found in find provider result");
      let providers = findProvidersResult.getProvidersFor(engCid);
      assert.strictEqual(
        peerController.getNode().getSelfB58Id(),
        providers[0].id.toB58String(),
        `peerId != providerId`
      );
      assert.strictEqual(1, providers.length, `providers length is ${providers.length}`);
      await stopTest();
    });
  });
});
