const path = require('path');
const axios = require('axios');
const capcon = require('capture-console');
const jaysonBrowserClient = require('jayson/lib/client/browser');
const testUtils = require('./testUtils/utils');
const waterfall = require('async/waterfall');
// const TEST_TREE = require('./test_tree').TEST_TREE;
const EnvironmentBuilder = require('../src/main_controller/EnvironmentBuilder');
const CoreServer = require('../src/core/core_server_mock/core_server');

// const B1Path = path.join(__dirname, 'testUtils/id-l');
// const B1Port = '10300';
const B2Path = '../../test/testUtils/id-d';
const B2Port = '10301';                           
const bootstrapNodes = ['/ip4/0.0.0.0/tcp/10301/ipfs/Qma3GsJmB47xYuyahPZPSadh1avvxfyYQwk8R3UnFrQ6aP'];
const proxyConfig = {
  'bootstrapNodes': bootstrapNodes,
  'port': B2Port,
  'nickname': 'proxy',
  'idPath': B2Path,
};
const workerConfig = {
  'bootstrapNodes': bootstrapNodes,
  'nickname': 'worker',
};
const JsonRpcPort = 40000;

describe('JsonRPC tests', () => {
  let proxyController;
  let workerController;
  let JsonRpcClient;

  beforeAll(() => {
    const callServer = function(request, callback) {
      const config = {
        headers: {
          'Content-Type': 'application/json',
          'credentials': 'include',
          'Access-Control-Allow-Origin': '*',
        },
      };
      axios.post('http://localhost:'+JsonRpcPort, JSON.parse(request), config)
          .then((response) => {
            return JSON.stringify(response.data.result);
          })
          .then((text) => {
            callback(null, text);
          })
          .catch(function(err) {
            callback(err, null);
          });
    };

    JsonRpcClient = jaysonBrowserClient(callServer, {});

    // JsonRpcClient = jayson.client.http('http://localhost:'+JsonRpcPort);

    return new Promise(async (resolve)=>{
      const workerCoreUri = 'tcp://127.0.0.1:8978';
      waterfall([
        (cb)=>{
          // start the mock server first
          CoreServer.setProvider(true);
          CoreServer.runServer(workerCoreUri);
          cb(null);
        },
        (cb)=>{
          // start the Proxy Node
          const builder = new EnvironmentBuilder();
          builder
              .setNodeConfig(proxyConfig)
              .setIpcConfig({uri: workerCoreUri})
              .build().then((instance)=>{
                workerController = instance;
                cb(null);
              });
        },
        (cb)=>{
          // start the Worker Node
          const builder = new EnvironmentBuilder();
          builder
              .setNodeConfig(workerConfig)
              .setJsonRpcConfig({port: JsonRpcPort, peerId: 'no_id_yet'})
              .build().then((instance)=>{
                proxyController = instance;
                cb(null);
              });
        },
      ], async function(err, result) {
        if (err) {
          throw err;
        }
        await testUtils.sleep(5000);
        resolve();
      });
    });
  }, 15000);

  afterAll(() => {
    return new Promise(async (resolve)=>{
      proxyController.getJsonRpcServer().close();
      await proxyController.getNode().stop();
      workerController.getIpcClient().disconnect();
      await workerController.getNode().stop();
      CoreServer.disconnect();
      resolve();
    });
  });

  it('#1 Should retrieve EncryptionWorker from Core via JSON RPC', async function() {
    // const tree = TEST_TREE['basic'];
    // if (!tree['all'] || !tree['#2']) {
    //   this.skip();
    // }

    // This block captures stdout for console.log to get the_worker_sign_key
    let output = '';
    capcon.startCapture(process.stdout, function(stdout) {
      output += stdout;
    });
    workerController.getNode().selfSubscribeAction();
    await testUtils.sleep(1000);
    capcon.stopCapture(process.stdout);
    id = output.match(/DEBUG subscribed to \[(.*)\]/)[1];

    const response = await new Promise((resolve, reject) => {
      JsonRpcClient.request('getWorkerEncryptionKey', [id], (err, res) => {
        if (err) {
          reject(err);
        }
        resolve(res);
      });
    });

    expect(response.targetWorkerKey).toBe(id);
    expect(response.workerEncryptionKey).toMatch(/[0-9a-f]{128}/); // 128 hex digits
    expect(response.workerSig).toBeDefined();
    expect(response.msgId).toBeDefined();
  }, 10000);
});
