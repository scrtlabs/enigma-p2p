const path = require("path");
const testUtils = require("./testUtils/utils");
const assert = require("assert");
const TEST_TREE = require("./test_tree").TEST_TREE;
const WorkerBuilder = require("../src/worker/builder/WorkerBuilder");
const NodeController = require("../src/worker/controller/NodeController");

const B1Path = path.join(__dirname, "testUtils/id-l.json");
const B1Port = "10300";

it("#1 Should test the worker builder", async function() {
  let tree = TEST_TREE["basic"];
  if (!tree["all"] || !tree["#1"]) {
    this.skip();
  }

  return new Promise(async resolve => {
    // load configs
    let c = WorkerBuilder.loadConfig();
    // change defaults
    c.nickname = "worker";
    c.idPath = B1Path;
    // build the worker
    let worker = WorkerBuilder.build(c);
    // start the worker
    await worker.syncRun();

    await testUtils.sleep(1000);
    assert.strictEqual(0, worker.getAllPeersInfo().length, "peer info don't match ");
    // stop the worker
    await worker.syncStop();
    resolve();
  });
});

it("#2 Should test dialing to a bootstrap", async function() {
  let tree = TEST_TREE["basic"];
  if (!tree["all"] || !tree["#2"]) {
    this.skip();
  }
  return new Promise(async resolve => {
    let bootstrapNodes = ["/ip4/0.0.0.0/tcp/10300/ipfs/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm"];
    let bootstrapController = NodeController.initDefaultTemplate({
      port: B1Port,
      idPath: B1Path,
      nickname: "bootstrap",
      bootstrapNodes: bootstrapNodes,
      extraConfig: {}
    });
    let peerController = NodeController.initDefaultTemplate({
      nickname: "peer",
      bootstrapNodes: bootstrapNodes,
      extraConfig: {}
    });

    await bootstrapController.engNode().syncRun();
    await peerController.engNode().syncRun();
    await testUtils.sleep(3000);

    assert.strictEqual(bootstrapController.isConnected(peerController.getSelfB58Id()), true);
    assert.strictEqual(bootstrapController.getConnectedPeers().length, 1);
    assert.strictEqual(peerController.isConnected(bootstrapController.getSelfB58Id()), true);
    assert.strictEqual(peerController.getConnectedPeers().length, 1);

    await bootstrapController.engNode().syncStop();
    await peerController.engNode().syncStop();
    resolve();
  });
});

it("#3 Should test libp2p discovery", async function() {
  let tree = TEST_TREE["basic"];
  if (!tree["all"] || !tree["#3"]) {
    this.skip();
  }

  return new Promise(async (resolve, reject) => {
    let nodesNum = 10;
    let bootstrapNodes = ["/ip4/0.0.0.0/tcp/10300/ipfs/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm"];
    let bNode = NodeController.initDefaultTemplate({
      port: B1Port,
      idPath: B1Path,
      nickname: "bootstrap",
      bootstrapNodes: bootstrapNodes,
      extraConfig: {}
    });

    let peers = [];

    for (let i = 0; i < nodesNum; i++) {
      let p = NodeController.initDefaultTemplate({
        nickname: "peer" + i,
        bootstrapNodes: bootstrapNodes,
        extraConfig: {}
      });
      peers.push(p);
    }

    // init bootstrap nodes
    await bNode.engNode().syncRun();

    // init peer nodes
    for (let i = 0; i < nodesNum; i++) {
      await peers[i].engNode().syncRun();
    }

    await testUtils.sleep(3000);

    assert.strictEqual(bNode.getConnectedPeers().length, nodesNum);
    for (let i = 0; i < nodesNum; ++i) {
      assert.strictEqual(bNode.getConnectedPeers().length, nodesNum);
    }

    for (let i = 0; i < nodesNum; ++i) {
      await peers[i].engNode().syncStop();
    }
    await bNode.engNode().syncStop();
    resolve();
  });
});
