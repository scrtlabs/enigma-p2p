const path = require('path');
const axios = require('axios');
const capcon = require('capture-console');
const jaysonBrowserClient = require('jayson/lib/client/browser');
const testUtils = require('./testUtils/utils');
const waterfall = require('async/waterfall');
const TEST_TREE = require('./test_tree').TEST_TREE;
const tree = TEST_TREE.jsonrpc_basic;
const EnvironmentBuilder = require('../src/main_controller/EnvironmentBuilder');
const CoreServer = require('../src/core/core_server_mock/core_server');
const expect = require('expect');

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
const userPubKey = '5587fbc96b01bfe6482bf9361a08e84810afcc0b1af72a8e4520f9' +
  '8771ea1080681e8a2f9546e5924e18c047fa948591dba098bffaced50f97a41b0050bdab99';

describe('JsonRPC tests', () => {
  let proxyController;
  let workerController;
  let JsonRpcClient;
  let coreServer;

  before(() => {
    if(!tree['all']){
      return new Promise(res=>{res();});
    }
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
          coreServer = new CoreServer();
          coreServer.setProvider(true);
          coreServer.runServer(workerCoreUri);
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
  }, 30000);

  after(() => {
    return new Promise(async (resolve)=>{
      if(!tree['all']){
        return resolve();
      }
      proxyController.getJsonRpcServer().close();
      await proxyController.getNode().stop();
      workerController.getIpcClient().disconnect();
      await workerController.getNode().stop();
      coreServer.disconnect();
      resolve();
    });
  });

  it('#1 Should getInfo', async function() {
    if(!tree['all'] || !tree['#1']){
      this.skip();
    }
    const response = await new Promise((resolve, reject) => {
      JsonRpcClient.request('getInfo', [], (err, res) => {
        if (err) {
          reject(err);
        }
        resolve(res);
      });
    });
    // assert.strictEqual(response.status,'ok');
    // assert.notStrictEqual(response,peerId,undefined);
    // assert.notStrictEqual(response,peerId,null);
    expect(response.peerId).toBeDefined();
    expect(response.status).toBe('ok');
  })

  it('#2 Should retrieve EncryptionWorker from Core via JSON RPC', async function() {
    if(!tree['all'] || !tree['#2']){
      this.skip();
    }
    // This block captures stdout for console.log to get the_worker_sign_key
    let output = '';
    capcon.startCapture(process.stdout, function(stdout) {
      output += stdout;
    });
    workerController.getNode().selfSubscribeAction();
    await testUtils.sleep(1000);
    capcon.stopCapture(process.stdout);
    id = output.match(/DEBUG subscribed to \[(.*)\]/)[1];

    let response = await new Promise((resolve, reject) => {
      JsonRpcClient.request('getWorkerEncryptionKey', {workerAddress:id, userPubKey : userPubKey}, (err, res) => {
        if (err) {
          reject(err);
        }
        resolve(res);
      });
    });
    response = response.result;
    expect(response.workerEncryptionKey).toMatch(/[0-9a-f]{128}/); // 128 hex digits
    expect(response.workerSig).toBeDefined();
  }, 10000);
//TODO:: remove this test 
  it('#3 Should fail sendTaskInput', async function(){
    this.skip();
    if(!tree['all'] || !tree['#3']){
      this.skip();
    }
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

//TODO:: remove this test
  it('#4 Should sendTaskInput', async function(){
    this.skip();
    if(!tree['all'] || !tree['#4']){
      this.skip();
    }
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
    // assert.strictEqual(true,response);
    expect(response).toBe(true);
  });
});
