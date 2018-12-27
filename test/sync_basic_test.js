const assert = require('assert');
const path = require('path');
const waterfall = require('async/waterfall');
const TEST_TREE = require('./test_tree').TEST_TREE;
const CoreServer = require('../src/core/core_server_mock/core_server');
const EnvironmentBuilder = require('../src/main_controller/EnvironmentBuilder');
const testUtils = require('./testUtils/utils');

const B1Path = path.join(__dirname, "testUtils/id-d");
const B1Port = "10301";


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
}, 20000);


it('#2 should perform a full sync scenario (using mock-db)', async function(){
  const tree = TEST_TREE['sync_basic'];
  if (!tree['all'] || !tree['#1']) {
    this.skip();
  }
  return new Promise(async (resolve)=>{

    //await testUtils.sleep(5000);

    let bootstrapNodes = ["/ip4/0.0.0.0/tcp/" + B1Port + "/ipfs/Qma3GsJmB47xYuyahPZPSadh1avvxfyYQwk8R3UnFrQ6aP"];

    const dnsConfig = {
      'bootstrapNodes': bootstrapNodes,
      'port': B1Port,
      'nickname': 'dns',
      'idPath': B1Path,
    };
    const peerConfig = {
      'bootstrapNodes': bootstrapNodes,
      'nickname': 'peer',
    };
    const dnsMockUri = 'tcp://127.0.0.1:4444';
    const peerMockUri = 'tcp://127.0.0.1:5555';

    let dnsMockCore = new CoreServer();
    let peerMockCore = new CoreServer();

    // start the dns mock server (core)
    dnsMockCore.setProvider(true);
    dnsMockCore.runServer(dnsMockUri);

    // start the peer mock server (core)
    peerMockCore.runServer(peerMockUri);

    await testUtils.sleep(1500);

    console.log("started initializing");

    // start the dns
    let dnsBuilder = new EnvironmentBuilder();
    let dnsController = await dnsBuilder
      .setNodeConfig(dnsConfig)
      .setIpcConfig({uri : dnsMockUri})
      .build();

    // start the dns
    let peerBuilder = new EnvironmentBuilder();
    let peerController = await peerBuilder
      .setNodeConfig(peerConfig)
      .setIpcConfig({uri : peerMockUri})
      .build();

    await testUtils.sleep(5000);

    waterfall([
      (cb)=>{
        // announce
        dnsController.getNode().tryAnnounce((err, ecids)=>{
          assert.strictEqual(null,err, 'error announcing' + err);
          cb(null);
        });
      },
      (cb)=>{
        // sync
        peerController.getNode().syncReceiverPipeline((err, statusResult)=>{
          assert.strictEqual(null,err, 'error syncing' + err);
          //console.log("statusResult=" + JSON.stringify(statusResult));
          cb(null, statusResult);
        });
      }
    ],async (err, statusResult)=>{
      assert.strictEqual(null,err, 'error in waterfall ' + err);
      await dnsController.getNode().stop();
      dnsController.getIpcClient().disconnect();

      await peerController.getNode().stop();
      peerController.getIpcClient().disconnect();

      dnsMockCore.disconnect();
      peerMockCore.disconnect();
      resolve();
    });
  });
}, 20000);


