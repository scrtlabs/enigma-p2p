const EnvironmentBuilder = require('../../src/main_controller/EnvironmentBuilder');
const CoreServer = require('../../src/core/core_server_mock/core_server');
const tree = require('../test_tree').TEST_TREE.persistent_discovery;
const expect = require('expect');
const assert = require('assert');
const MainController = require('../../src/main_controller/FacadeController');
const testUtils = require('../testUtils/utils');
const path = require('path');
const ID_B_PATH = path.join(__dirname, './id-l');
const jayson = require('jayson');
const testBuilder = require('../testUtils/quickBuilderUtil');
const constants = require('../../src/common/constants');
const options = {
  bOpts : {
    // withLogger : false,
  },
  pOpts : {
    persistentDiscovery : false,
    // withLogger : false,
  },
};

function getConnectedNodes(source,targets){
  let result = [];
  let sourceID = source.mainController.getNode().getSelfB58Id();
  targets.forEach(t=>{
    let tId = t.mainController.getNode().getSelfB58Id();
    if(tId !== sourceID && source.mainController.getNode().isSimpleConnected(tId)){
      result.push(t)
    }
  });
  return result
}
describe('persistent_discovery_tests',()=> {
  it('#1 Should do persistent discovery', async function() {
    if (!tree['all'] || !tree['#1']) {
      this.skip();
    }
    let optimalDht = constants.DHT_STATUS.OPTIMAL_DHT_SIZE;
    return new Promise(async resolve => {
      let deletedIds = [];
      let peersNum = 10;
      // use --persistet feature
      options.pOpts.persistentDiscovery = true;
      let {peers,bNode} = await testBuilder.createN(peersNum,options);
      await testUtils.sleep(5000);
      let bNodeController = bNode.mainController;
      let bNodeCoreServer = bNode.coreServer;
      let pPaths = peers.map(p=>{
        return p.tasksDbPath;
      });
      let bPath = bNode.tasksDbPath;
      const stopTest = async ()=>{
        for(let i=0;i<pPaths.length;++i){
          // already deleted
          if(deletedIds.indexOf(peers[i].mainController.getNode().getSelfB58Id()) > -1) {
            continue;
          }
          await peers[i].mainController.shutdownSystem();
          peers[i].coreServer.disconnect();
          await testUtils.rm_Minus_Rf(pPaths[i]);
        }
        await bNodeController.shutdownSystem();
        bNodeCoreServer.disconnect();
        await testUtils.rm_Minus_Rf(bPath);
        resolve();
      };
      let testedPeer = peers[0];

      testedPeer.mainController.getNode().tryConsistentDiscovery();
      await testUtils.sleep(10*1000);
      let outBound = testedPeer.mainController.getNode().getAllOutboundHandshakes();
      assert.strictEqual(optimalDht,outBound.length,'not 8 peers as optimal dht');
      let connectedNodes = getConnectedNodes(testedPeer,peers);
      // disconnect 2 connected nodes
      deletedIds.push(connectedNodes[0].mainController.getNode().getSelfB58Id())
      deletedIds.push(connectedNodes[1].mainController.getNode().getSelfB58Id())
      connectedNodes[0].coreServer.disconnect();
      await connectedNodes[0].mainController.shutdownSystem();
      connectedNodes[1].coreServer.disconnect();
      await connectedNodes[1].mainController.shutdownSystem();
      // test lost connections
      await testUtils.sleep(10*1000);
      outBound = testedPeer.mainController.getNode().getAllOutboundHandshakes();
      assert.strictEqual(optimalDht - 2,outBound.length,'didnt reach exact critical dht');
      await testUtils.sleep(8 * 1000);
      // test persistency - actuall test
      outBound = testedPeer.mainController.getNode().getAllOutboundHandshakes();
      assert.strictEqual(optimalDht,outBound.length,`didn't reach optimal dht current :${outBound.length}`);
      // stop the test
      await stopTest();
    });
  });
});


