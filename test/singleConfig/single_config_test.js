const EnvironmentBuilder = require('../../src/main_controller/EnvironmentBuilder');
const CoreServer = require('../../src/core/core_server_mock/core_server');
const tree = require('../test_tree').TEST_TREE.single_config;
const expect = require('expect');
const assert = require('assert');
const MainController = require('../../src/main_controller/FacadeController');
const testUtils = require('../testUtils/utils');
const path = require('path');
const ID_B_PATH = path.join(__dirname, './id-l');

function getConfig() {
  return require('./config_1');
}
function getBootsrapConfig() {
  let c =require('./config_2_bootstrap');
  c.node.idPath = ID_B_PATH;
  return c;
}

function getCoreServer(uri){
  coreServer = new CoreServer();
  coreServer.runServer(uri);
  return coreServer;
}

describe('single_config_tests',()=> {

  it('#1 Should create node and shutdown', async function() {
    if (!tree['all'] || !tree['#1']) {
      this.skip();
    }
    return new Promise(async resolve => {
      const c = getConfig();
      let coreServer = getCoreServer(c.core.uri);
      let mainController = await EnvironmentBuilder.buildFromSingle(c);
      expect(mainController).toEqual(expect.anything());
      assert(mainController instanceof MainController, 'not main controller');
      await mainController.shutdownSystem();
      coreServer.disconnect();
      resolve();
    });
  });
  it('#1 Should create node and shutdown', async function() {
    if (!tree['all'] || !tree['#1']) {
      this.skip();
    }
    return new Promise(async resolve => {
      const c = getConfig();
      let coreServer = getCoreServer(c.core.uri);
      let mainController = await EnvironmentBuilder.buildFromSingle(c);
      expect(mainController).toEqual(expect.anything());
      assert(mainController instanceof MainController, 'not main controller');
      await mainController.shutdownSystem();
      coreServer.disconnect();
      resolve();
    });
  });
  it('#2 Should do discovery and shutdown', async function() {
    if (!tree['all'] || !tree['#2']) {
      this.skip();
    }
    return new Promise(async resolve => {
      const c = getConfig();
      const bc = getBootsrapConfig();
      let bCoreServer = getCoreServer(bc.core.uri);
      let pCoreServer = getCoreServer(c.core.uri);
      let bMainController = await EnvironmentBuilder.buildFromSingle(bc);
      let pMainController = await EnvironmentBuilder.buildFromSingle(c);
      expect(pMainController).toEqual(expect.anything());
      assert(pMainController instanceof MainController, 'not main controller');
      assert(bMainController instanceof MainController, 'not main controller');
      await testUtils.sleep(5000);
      let pOut = pMainController.getNode().getAllOutboundHandshakes().length;
      let bIn = bMainController.getNode().getAllInboundHandshakes().length;
      assert.strictEqual(1,  pOut, `${pOut} outbound connections`);
      assert.strictEqual(1,  bIn, `${bIn} inbound connections`);
      await pMainController.shutdownSystem();
      await bMainController.shutdownSystem();
      pCoreServer.disconnect();
      bCoreServer.disconnect();
      resolve();
    });
  });
// 3. test with proxy
});

