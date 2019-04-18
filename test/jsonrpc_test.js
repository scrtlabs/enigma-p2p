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
const assert = require('assert');
const nodeUtils = require('../src/common/utils');
const constants = require('../src/common/constants');
// const B1Path = path.join(__dirname, 'testUtils/id-l');
// const B1Port = '10300';
const B2Path = '../../test/testUtils/id-d';
const B2Port = '10301';
const bootstrapNodes = ['/ip4/0.0.0.0/tcp/10301/ipfs/Qma3GsJmB47xYuyahPZPSadh1a' +
'vvxfyYQwk8R3UnFrQ6aP'];
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
          proxyConfig.extraConfig= {};
          proxyConfig.extraConfig.tm = {
            dbPath : path.join(__dirname, '/'+nodeUtils.randId()+".deletedb")
          };
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
          workerConfig.extraConfig= {};
          workerConfig.extraConfig.tm = {
            dbPath : path.join(__dirname, '/'+nodeUtils.randId()+".deletedb")
          };
          const builder = new EnvironmentBuilder();
          builder
              .setNodeConfig(workerConfig)
              .setJsonRpcConfig({port: JsonRpcPort, peerId: null})
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
    expect(response.peerId).toBeDefined();
    expect(response.status).toBe('ok');
  });

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

  it("#3 should sendTaskInput",async function(){
    if(!tree['all'] || !tree['#3']){
      this.skip();
    }
    return new Promise(resolve => {
      const taskInput = {
        taskId: '0xb79ebb25f2469cd6cabf8600c18d4f34c0d09ebb1f64f4cde141f6a2b3678a4d',
        contractAddress: '0x9209b216c78f20a2755240a73b7903825db9a6f985bcce798381aef58d74059e',
        workerAddress: '5a29b216c78f20a2755240a73b7903825db9a6f985bcce798381aef58d74998a',
        encryptedFn: 'be3e4462e79ccdf05b02e0921731c5f9dc8dce554b861cf5a05a5162141d63e1f4b1fac190828367052b198857aba9e10cdad79d95',
        encryptedArgs: 'fd50f5f6cd8b7e2b30547e70a84b61faaebf445927b70a743f23bf10342da00b7d8a20948c6c3aec7c54edba52298d90',
        userDHKey: '5587fbc96b01bfe6482bf9361a08e84810afcc0b1af72a8e4520f98771ea1080681e8a2f9546e5924e18c047fa948591dba098bffaced50f97a41b0050bdab99',
      };
      JsonRpcClient.request('sendTaskInput',taskInput,(err,res)=>{
        assert.strictEqual(true,res.sendTaskResult, "sendTaskResult not true");
        resolve();
      });
    });
  });
  it("#4 should deploySecretContract",async function(){
    if(!tree['all'] || !tree['#4']){
      this.skip();
    }
    return new Promise(resolve => {
      const deployInput = {
        taskId: '0xb79ebb25f2469cd6cabf8600c18d4f34c0d09ebb1f64f4cde141f6a2b3678a4d',
        contractAddress: '0x9209b216c78f20a2755240a73b7903825db9a6f985bcce798381aef58d74059e',
        workerAddress: '5a29b216c78f20a2755240a73b7903825db9a6f985bcce798381aef58d74998a',
        encryptedFn: 'be3e4462e79ccdf05b02e0921731c5f9dc8dce554b861cf5a05a5162141d63e1f4b1fac190828367052b198857aba9e10cdad79d95',
        encryptedArgs: 'fd50f5f6cd8b7e2b30547e70a84b61faaebf445927b70a743f23bf10342da00b7d8a20948c6c3aec7c54edba52298d90',
        userDHKey: '5587fbc96b01bfe6482bf9361a08e84810afcc0b1af72a8e4520f98771ea1080681e8a2f9546e5924e18c047fa948591dba098bffaced50f97a41b0050bdab99',
        preCode : '162164ca6fdfd316'
      };
      JsonRpcClient.request('deploySecretContract',deployInput,(err,res)=>{
        assert.strictEqual(true,res.sendTaskResult, "sendTaskResult not true");
        resolve();
      });
    });
  });
  it("#5 should Fail deploySecretContract",async function(){
    if(!tree['all'] || !tree['#5']){
      this.skip();
    }
    return new Promise(resolve => {
      const deployInput = {
        taskId: '0xb79ebb25f2469cd6cabf8600c18d4f34c0d09ebb1f64f4cde141f6a2b3678a4d',
        workerAddress: '5a29b216c78f20a2755240a73b7903825db9a6f985bcce798381aef58d74998a',
        encryptedFn: 'be3e4462e79ccdf05b02e0921731c5f9dc8dce554b861cf5a05a5162141d63e1f4b1fac190828367052b198857aba9e10cdad79d95',
        encryptedArgs: 'fd50f5f6cd8b7e2b30547e70a84b61faaebf445927b70a743f23bf10342da00b7d8a20948c6c3aec7c54edba52298d90',
        userDHKey: '5587fbc96b01bfe6482bf9361a08e84810afcc0b1af72a8e4520f98771ea1080681e8a2f9546e5924e18c047fa948591dba098bffaced50f97a41b0050bdab99',
        preCode : '162164ca6fdfd316'
      };
      JsonRpcClient.request('deploySecretContract',deployInput,(err,res)=>{
        assert.strictEqual(-32602, err.code, "code dont match");
        resolve();
      });
    });
  });
  it("#6 should getTaskStatus", async function(){
    if(!tree['all'] || !tree['#6']){
      this.skip();
    }
    return new Promise(async resolve => {
      let signKey = await workerController.getNode().getSelfSubscriptionKey();
      await testUtils.sleep(1500);
      const deployInput = {
        contractAddress: '0x9209b216c78f20a2755240a73b7903825db9a6f985bcce798381aef58d74059e',
        preCode : '162164ca6fdfd316',
        workerAddress: signKey,
        encryptedFn: 'be3e4462e79ccdf05b02e0921731c5f9dc8dce554b861cf5a05a5162141d63e1f4b1fac190828367052b198857aba9e10cdad79d95',
        encryptedArgs: 'fd50f5f6cd8b7e2b30547e70a84b61faaebf445927b70a743f23bf10342da00b7d8a20948c6c3aec7c54edba52298d90',
        userDHKey: '5587fbc96b01bfe6482bf9361a08e84810afcc0b1af72a8e4520f98771ea1080681e8a2f9546e5924e18c047fa948591dba098bffaced50f97a41b0050bdab99',
      };
      JsonRpcClient.request('deploySecretContract',deployInput,async (err,res)=>{
        await testUtils.sleep(1500);
        assert.strictEqual(true,res.sendTaskResult, "sendTaskResult not true");
        JsonRpcClient.request('getTaskStatus' ,
            {"workerAddress":deployInput.workerAddress,"taskId":deployInput.contractAddress},
            (err,res)=>{
              if(err) assert.strictEqual(true,false,"err" + err);
              assert.strictEqual(constants.TASK_STATUS.SUCCESS, res.result, "result not success");
              resolve();
        });
      });
    });
  });
});
