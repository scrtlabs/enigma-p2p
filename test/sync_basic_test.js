const assert = require('assert');
const waterfall = require('async/waterfall');
const TEST_TREE = require('./test_tree').TEST_TREE;
const CoreServer = require('../src/core/core_server_mock/core_server');
const EnvironmentBuilder = require('../src/main_controller/EnvironmentBuilder');


it('#1 should tryAnnounce action from mock-db no-cache', async function(){
  let tree = TEST_TREE['sync_basic'];
  if(!tree['all'] || !tree['#1']){
    this.skip();
  }
  return new Promise(async (resolve)=>{
    let uri ='tcp://127.0.0.1:6111';
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
        CoreServer.setProvider(true);
        CoreServer.runServer(uri);
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
      CoreServer.disconnect();
      resolve();
    });
  });
});

