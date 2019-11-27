const testUtils = require("./testUtils/utils");
const principalMock = require("./testUtils/principal_mock");
const ControllerBuilder = require("./testUtils/quickBuilderUtil");

const assert = require("assert");
const PrincipalNode = require("../src/worker/handlers/PrincipalNode");
const MsgPrincipal = require("../src/policy/p2p_messages/principal_messages");
const MockCoreServer = require("../src/core/core_server_mock/core_server");
const constants = require("../src/common/constants");
const Logger = require("../src//common/logger");
const expect = require("expect");

const fakeResponse = "0061d93b5412c0c9";
const fakeRequest = "84a46461746181a";
const fakeSig = "deadbeaf";
const uri = "http://127.0.0.1:";
const TEST_TREE = require("./test_tree").TEST_TREE;

let receivedRequest = false;
let response = null;
let fakeAddresses = null;
let fakeBlockNumber = null;

it("#1 Should Receive Encrypted response message from mock principal", async function() {
  const tree = TEST_TREE.principal;
  if (!tree["all"] || !tree["#1"]) {
    this.skip();
  }
  return new Promise(async resolve => {
    const server = principalMock.create(getStateKeysCallback);
    await testUtils.sleep(500);
    const port = principalMock.getPort(server);

    const principalClient = new PrincipalNode({ uri: uri + port });
    const msg = MsgPrincipal.build({ request: fakeRequest, sig: fakeSig });
    response = fakeRequest;

    const result = await principalClient.getStateKeys(msg);
    assert.strictEqual(result.data, fakeResponse);
    assert.strictEqual(result.sig, fakeSig);
    server.close(resolve);
  });
});

it("#2 Should Simulate the principal node and run GetStateKeysAction", async function() {
  receivedRequest = false;
  const tree = TEST_TREE.principal;
  if (!tree["all"] || !tree["#2"]) {
    this.skip();
  }

  return new Promise(async resolve => {
    const server = principalMock.create(getStateKeysCallback);
    await testUtils.sleep(150);
    const port = principalMock.getPort(server);

    const nodeConfig = {
      principalUri: uri + port,
      withTasksDb: false,
      bootstrapNodes: []
    };
    const controllers = await ControllerBuilder.createNode(nodeConfig);
    const mainController = controllers.mainController;

    fakeAddresses = ["0xdeadbeaf"];
    fakeBlockNumber = 200;

    response = MockCoreServer.GET_PTT_REQUEST_MOCK;

    await mainController.getNode().asyncExecCmd(constants.NODE_NOTIFICATIONS.GET_STATE_KEYS, {
      addresses: fakeAddresses,
      blockNumber: fakeBlockNumber
    });
    await testUtils.sleep(1500);
    await mainController.shutdownSystem();
    controllers.coreServer.disconnect();
    principalMock.destroy(server);
    assert(receivedRequest, "The principal mock never received a message");
    resolve();
  });
});

it("#3 Should test PTT flag", async function() {
  const tree = TEST_TREE.principal;
  if (!tree["all"] || !tree["#3"]) {
    this.skip();
  }
  return new Promise(async resolve => {
    const dummyPort = 100; // will not be used, just for initializing
    const logger = new Logger({ cli: false });
    const principalClient = new PrincipalNode({ uri: uri + dummyPort }, logger);

    principalClient.on(constants.PTT_END_EVENT, () => {
      expect(principalClient.isInPTT()).toEqual(false);
      resolve();
    });

    let res = principalClient.startPTT();
    expect(res).toEqual(true);
    expect(principalClient.isInPTT()).toEqual(true);
    res = principalClient.startPTT();
    expect(res).toEqual(false);
    expect(principalClient.isInPTT()).toEqual(true);
    principalClient.onPTTEnd();
  });
});

function getStateKeysCallback(args, callback) {
  if (args.data && args.sig) {
    receivedRequest = true;
    expect(args.data).toEqual(response);
    if (args.addresses) {
      expect(args.addresses).toEqual(fakeAddresses);
    }
    if (args.block_number) {
      expect(args.block_number).toEqual(fakeBlockNumber.toString());
    }
    const result = { data: fakeResponse, sig: fakeSig };
    callback(null, result);
  } else {
    assert(false);
    callback("Missing data", null);
  }
}
