const jayson = require('jayson');
const assert = require('assert');
const PrincipalNode = require('../src/worker/handlers/PrincipalNode');
const MsgPrincipal = require('../src/policy/p2p_messages/principal_messages');
const CoreServer = require('../src/core/core_server_mock/core_server');
const EnvironmentBuilder = require('../src/main_controller/EnvironmentBuilder');
const constants = require('../src/common/constants');

const fakeResponse = '0061d93b5412c0c9';
const fakeRequest = '84a46461746181a';
const fakeSig = 'deadbeaf';
const addresses = ['0xdeadbeaf'];

it('#1 Should Recieve Encrypted response message from mock principal', async function() {
  const port = 11700;

  return new Promise(async (resolve)=>{
    const server = jayson.server({
      getStateKeys: function(args, callback) {
        if (args.requestMessage) {
          const result = {encryptedResponseMessage: fakeResponse};
          callback(null, result);
        } else {
          callback('Missing requestMessage', null);
        }
      },
    }).http();

    server.listen(port, '127.0.0.1');
    const principalClient = new PrincipalNode({uri: 'http://127.0.0.1:' + port});
    const msg = MsgPrincipal.build({request: fakeRequest, sig: fakeSig});
    const result = await principalClient.getStateKeys(msg);
    assert.strictEqual(result, fakeResponse);
    resolve();
  });
});

it('#2 Should Simulate the principal node and run GetStateKeysAction', async function() {
  const port = 11701;
  const uri ='tcp://127.0.0.1:6113';
  const coreServer = new CoreServer();
  const peerConfig = {
    'bootstrapNodes': [],
    'port': '0',
    'nickname': 'peer',
    'idPath': null,
  };


  return new Promise(async (resolve)=>{
    const server = jayson.server({
      getStateKeys: function(args, callback) {
        if (args.requestMessage) {
          const result = {encryptedResponseMessage: fakeResponse};
          callback(null, result);
        } else {
          callback('Missing requestMessage', null);
        }
      },
    }).http();
    server.listen(port, '127.0.0.1');


    coreServer.setProvider(true);
    coreServer.runServer(uri);
    const mainController = await new EnvironmentBuilder()
        .setNodeConfig(peerConfig)
        .setIpcConfig({uri: uri})
        .build();

    mainController.getNode().execCmd(
        constants.NODE_NOTIFICATIONS.GET_STATE_KEYS,
        {addresses: addresses}
    );
    await mainController.getNode().stop();
    coreServer.disconnect();
    resolve();
  });
});
