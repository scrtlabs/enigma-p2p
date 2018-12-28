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
          //'Access-Control-Allow-Origin': '*',
        },
      };
      axios.post('http://localhost:'+JsonRpcPort, JSON.parse(request), config)
          .then((response) => {
            if ('error' in response.data) {
              throw (response.data.error);
            }
            return JSON.stringify(response.data.result);
          })
          .then((text) => {
            callback(null, text);
          })
          .catch((error) => {
            callback(error, null);
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

  it('#1 Should getInfo', async function() {
    const response = await new Promise((resolve, reject) => {
      JsonRpcClient.request('getInfo', [], (err, res) => {
        if (err) {
          reject(err);
        }
        resolve(res);
      });
    });
    expect(response.peerId).toBeDefined();
    expect(response.status).toBe('ok');
  })

  it('#2 Should retrieve EncryptionWorker from Core via JSON RPC', async function() {
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

  it('#3 Should fail sendTaskInput', async function(){
    expect.assertions(2);
    // JSON RPC fails with no taskInput parameter
    await expect(new Promise((resolve, reject) => {
      JsonRpcClient.request('sendTaskInput', {}, (err, res) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    })).rejects.toEqual({code: -32602, message: "Invalid params"});
    // JSON RPC fails with taskInput but missing properties
    await expect(new Promise((resolve, reject) => {
      JsonRpcClient.request('sendTaskInput', {taskId:'0x0', creationBlockNumber: 0}, (err, res) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    })).rejects.toEqual({code: -32602, message: "Invalid params"});
  });


  it('#4 Should sendTaskInput', async function(){
    const taskInput = { taskId: '0xb79ebb25f2469cd6cabf8600c18d4f34c0d09ebb1f64f4cde141f6a2b3678a4d',
      creationBlockNumber: 189,
      sender: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
      scAddr: '0x9209b216c78f20a2755240a73b7903825db9a6f985bcce798381aef58d74059e',
      encryptedFn:
       'be3e4462e79ccdf05b02e0921731c5f9dc8dce554b861cf5a05a5162141d63e1f4b1fac190828367052b198857aba9e10cdad79d95',
      encryptedEncodedArgs:
       'fd50f5f6cd8b7e2b30547e70a84b61faaebf445927b70a743f23bf10342da00b7d8a20948c6c3aec7c54edba52298d90',
      userTaskSig:
       '0x0e8164325637767bea77b5615f174a67ec055bdf7cca3c8f696020b0cf2928a32a69a66d378e853f909e1f8d57d05e9a103467771756cabbe7577ee7329ad3fa01',
      userPubKey:
       '5587fbc96b01bfe6482bf9361a08e84810afcc0b1af72a8e4520f98771ea1080681e8a2f9546e5924e18c047fa948591dba098bffaced50f97a41b0050bdab99',
      fee: 30000000000,
      msgId: 'ldotj6nghv7a' }

    const response = await new Promise((resolve, reject) => {
      JsonRpcClient.request('sendTaskInput', taskInput, (err, res) => {
        if (err) {
          reject(err);
        }
        resolve(res);
      });
    });
    expect(response).toBe(true);
  });
});
