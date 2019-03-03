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
const uri = 'http://127.0.0.1:';
const addresses = ['0xdeadbeaf'];
const TEST_TREE = require('./test_tree').TEST_TREE;
let recivedRequest = false;

it('#1 Should Recieve Encrypted response message from mock principal', async function() {
  const tree = TEST_TREE.principal;
  if (!tree['all'] || !tree['#1']) {
    this.skip();
  }
  return new Promise(async (resolve) => {
    const server = getMockPrincipalNode();
    await testUtils.sleep(500);
    const port = server.address().port;

    const principalClient = new PrincipalNode({uri: uri + port});
    const msg = MsgPrincipal.build({request: fakeRequest, sig: fakeSig});
    const result = await principalClient.getStateKeys(msg);
    assert.strictEqual(result.data, fakeResponse);
    assert.strictEqual(result.sig, fakeSig);
    server.close(resolve);
  });
});


it('#2 Should Simulate the principal node and run GetStateKeysAction', async function() {
  recivedRequest = false;
  const tree = TEST_TREE.principal;
  if (!tree['all'] || !tree['#2']) {
    this.skip();
  }

  return new Promise(async (resolve) => {
    const server = getMockPrincipalNode();
    await testUtils.sleep(150);
    const port = server.address().port;

    const nodeConfig = {principalUri: uri + port, withTasksDb: false, bootstrapNodes: []};
    const controllers = await ControllerBuilder.createNode(nodeConfig);
    const mainController = controllers.mainController;

    await mainController.getNode().asyncExecCmd(
        constants.NODE_NOTIFICATIONS.GET_STATE_KEYS,
        {addresses: addresses},
    );
    await testUtils.sleep(1500);
    await mainController.shutdownSystem();
    controllers.coreServer.disconnect();
    server.close();
    assert(recivedRequest, 'The principal mock never recived a message');
    resolve();
  });
});

function getMockPrincipalNode() {
  const server = jayson.server({
    getStateKeys: function(args, callback) {
      if (args.requestMessage && args.workerSig) {
        recivedRequest = true;
        const result = {data: fakeResponse, sig: fakeSig};
        callback(null, result);
      } else {
        assert(false);
        callback('Missing requestMessage', null);
      }
    },
  }).http().setTimeout(500000);
  server.listen(0, '127.0.0.1');
  return server;
}
