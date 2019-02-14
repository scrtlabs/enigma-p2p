const testUtils = require('./testUtils/utils');
const ControllerBuilder = require('./testUtils/quickBuilderUtil');
const jayson = require('jayson');
const assert = require('assert');
const PrincipalNode = require('../src/worker/handlers/PrincipalNode');
const MsgPrincipal = require('../src/policy/p2p_messages/principal_messages');
const constants = require('../src/common/constants');

const fakeResponse = '0061d93b5412c0c9';
const fakeRequest = '84a46461746181a';
const fakeSig = 'deadbeaf';
const addresses = ['0xdeadbeaf'];
const uri = 'http://127.0.0.1:';
const test_tree = require('./test_tree').TEST_TREE;

it('#1 Should Recieve Encrypted response message from mock principal', async function() {
    let tree = test_tree.principal;
    if(!tree['all'] || !tree['#1']){
      this.skip();
    }
  return new Promise(async (resolve) => {
    const server = getMockSPrincipalNode();
    await testUtils.sleep(500);
    const port = server.address().port;

    const principalClient = new PrincipalNode({uri: uri + port});
    const msg = MsgPrincipal.build({request: fakeRequest, sig: fakeSig});
    const result = await principalClient.getStateKeys(msg);
    assert.strictEqual(result, fakeResponse);
    server.close(resolve);
  });
});

it('#2 Should Simulate the principal node and run GetStateKeysAction', async function() {
  let tree = test_tree.principal;
  if(!tree['all'] || !tree['#2']){
    this.skip();
  }

  return new Promise(async (resolve) => {
    const server = getMockSPrincipalNode();
    await testUtils.sleep(150);
    const port = server.address().port;

    const controllers = await ControllerBuilder.createNode({principalUri: uri + port});
    const mainController = controllers.mainController;

    mainController.getNode().execCmd(
        constants.NODE_NOTIFICATIONS.GET_STATE_KEYS,
        {addresses: addresses}
    );
    await testUtils.sleep(1500);
    await mainController.shutdownSystem();
    controllers.coreServer.disconnect();
    server.close(resolve);
  });
});

function getMockSPrincipalNode() {
  const server = jayson.server({
    getStateKeys: function(args, callback) {
      if (args.requestMessage) {
        const result = {encryptedResponseMessage: fakeResponse};
        callback(null, result);
      } else {
        callback('Missing requestMessage', null);
      }
    },
  }).http().setTimeout(500000);
  server.listen(0, '127.0.0.1');
  return server;
}
