// const EnvironmentBuilder = require('../../src/main_controller/EnvironmentBuilder');
// const CoreServer = require('../../src/core/core_server_mock/core_server');
// const tree = require('../test_tree').TEST_TREE.single_config;
// const expect = require('expect');
// const assert = require('assert');
// const MainController = require('../../src/main_controller/FacadeController');
// const testUtils = require('../testUtils/utils');
// const path = require('path');
// const ID_B_PATH = path.join(__dirname, './id-l');
// const jayson = require('jayson');
//
// function getRpcClient(port){
//   return jayson.client.http('http://localhost:' + port);
// }
// function getConfig() {
//   return require('./config_1');
// }
// function getBootsrapConfig() {
//   let c =require('./config_2_bootstrap');
//   c.node.idPath = ID_B_PATH;
//   return c;
// }
//
// function getCoreServer(uri){
//   coreServer = new CoreServer();
//   coreServer.runServer(uri);
//   return coreServer;
// }
//
// describe('persistent_discovery_tests',()=> {
//
//   it('#1 Should do persistent discovery', async function() {
//     if (!tree['all'] || !tree['#1']) {
//       this.skip();
//     }
//     const c = getConfig();
//     return new Promise(async resolve => {
//       let coreServer = getCoreServer(c.core.uri);
//       let mainController = await EnvironmentBuilder.buildFromSingle(c);
//       expect(mainController).toEqual(expect.anything());
//       assert(mainController instanceof MainController, 'not main controller');
//       await mainController.shutdownSystem();
//       coreServer.disconnect();
//       resolve();
//     });
//   });
// });
//
