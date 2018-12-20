const assert = require('assert');
const waterfall = require('async/waterfall');
const TEST_TREE = require('./test_tree').TEST_TREE;
const CoreServer = require('../src/core/core_server_mock/core_server');
const EnvironmentBuilder = require('../src/main_controller/EnvironmentBuilder');


it('#1 should tryAnnounce action from mock-db no-cache', async function(){
  const tree = TEST_TREE['sync_basic'];
  if (!tree['all'] || !tree['#1']){
    this.skip();
  }
  return new Promise(async (resolve)=>{
    let uri ='tcp://127.0.0.1:6111';
    let coreServer = new CoreServer();
    const peerConfig = {
      'bootstrapNodes': [],
      'port': '0',
      'nickname': 'peer',
      'idPath': null,
    };
    let mainController;
    waterfall([
      (cb)=>{
        // start the mock server first
        coreServer.setProvider(true);
        coreServer.runServer(uri);
        // await testUtils.sleep(500);
        cb(null);
      },
      (cb)=>{
        let builder = new EnvironmentBuilder();
        builder
        .setNodeConfig(peerConfig)
        .setIpcConfig({uri : uri})
        .build().then(instance=>{
          mainController = instance;
          cb(null);
        });
      },
      cb=>{
        // announce
        mainController.getNode().tryAnnounce((err,ecids)=>{
          assert.strictEqual(null,err, 'error announcing' + err);
          cb(null,ecids);
        });
      },
      (ecids,cb)=>{
        // verify announcement FindContentProviderAction action
        mainController.getNode().findProviders(ecids,(findProvidersResult)=>{
          let keyCounter = findProvidersResult.getKeysList().length;
          assert.strictEqual(ecids.length,keyCounter, 'not enough keys');
          cb(null);
        });
      }
    ],async (err)=>{
      assert.strictEqual(null,err, 'error in waterfall ' + err);
      await mainController.getNode().stop();
      mainController.getIpcClient().disconnect();
      coreServer.disconnect();
      resolve();
    });
  });
});


// it('#2 should perform a full sync scenario (using mock-db)', async function(){
//   const tree = TEST_TREE['basic'];
//   if (!tree['all'] || !tree['#2']) {
//     this.skip();
//   }
//   return new Promise(async (resolve)=>{
//     const dnsConfig = {
//       'bootstrapNodes': [],
//       'port': '0',
//       'nickname': 'dns',
//       'idPath': null,
//     };
//     const peerConfig = {
//       'bootstrapNodes': [],
//       'port': '1',
//       'nickname': 'peer',
//       'idPath': null,
//     };
//     const dnsMockUri = 'tcp://127.0.0.1:5454';
//     const peerMockUri = 'tcp://127.0.0.1:5555';
//
//     // start the dns mock server (core)
//     CoreServer.setProvider(true);
//     CoreServer.runServer(dnsMockUri);
//
//     // start the peer mock server (core)
//     CoreServer.runServer(peerMockUri);
//
//     await nodeUtils.sleep(1500);
//
//     // start the dns
//     let dnsBuilder = new EnvironmentBuilder();
//     let dnsController = await dnsBuilder
//       .setNodeConfig(dnsConfig)
//       .setIpcConfig({uri : dnsMockUri})
//       .build();
//
//     // start the dns
//     let peerBuilder = new EnvironmentBuilder();
//     let peerController = await peerBuilder
//       .setNodeConfig(peerConfig)
//       .setIpcConfig({uri : peerMockUri})
//       .build();
//     await nodeUtils.sleep(2000);
//
//     // let fromCache = false;
//     //
//     // dnsController.getNode().getAllLocalTips(fromCache,async (err,missingStates)=>{
//     //   assert.strictEqual(null,err,'some error in response [' + err + ' ]');
//     //   assert.strictEqual(3, missingStates.tips.length, 'len not 3');
//     //   assert.strictEqual(10, missingStates.tips[0].key, 'key not 10');
//     //   assert.strictEqual(34, missingStates.tips[1].key, 'key not 34');
//     //   assert.strictEqual(0, missingStates.tips[2].key, 'key not 0');
//     //   await mainController.getNode().stop();
//     //   mainController.getIpcClient().disconnect();
//     //   CoreServer.disconnect();
//     resolve();
//
//
//
//
//     // let bootstrapNodes = ["/ip4/0.0.0.0/tcp/10300/ipfs/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm"];
//     // let dnsController = NodeController.initDefaultTemplate({"port":B1Port, "idPath":B1Path, "nickname":"dns", "bootstrapNodes":bootstrapNodes});
//     // let peerController = NodeController.initDefaultTemplate({"nickname":"peer" , "bootstrapNodes":bootstrapNodes});
//     //
//     // await dnsController.engNode().syncRun();
//     //
//     // await testUtils.sleep(2000);
//     //
//     // await peerController.engNode().syncRun();
//     //
//     // await testUtils.sleep(4000);
//     //
//     // let peersLen = peerController.engNode().getAllPeersInfo().length;
//     //
//     // assert.strictEqual(1,peersLen, "error in peers len should be 1");
//     //
//     // // validate handshake on the peer side
//     // let handshakedPeers = peerController.stats().getAllHandshakedPeers();
//     //
//     // assert.strictEqual(1,handshakedPeers.length);
//     // assert.strictEqual(dnsController.engNode().getSelfIdB58Str(), handshakedPeers[0]);
//     //
//     // // validate handshake on the dns side
//     // handshakedPeers = dnsController.stats().getAllHandshakedPeers();
//     //
//     // assert.strictEqual(1,handshakedPeers.length);
//     // assert.strictEqual(peerController.engNode().getSelfIdB58Str(), handshakedPeers[0]);
//     //
//     // await dnsController.engNode().syncStop();
//     // await peerController.engNode().syncStop();
//     // resolve();
//   });
// });


