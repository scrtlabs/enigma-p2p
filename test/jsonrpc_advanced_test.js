const testBuilder = require('./testUtils/quickBuilderUtil');
const TEST_TREE = require('./test_tree').TEST_TREE;
const tree = TEST_TREE.jsonrpc_advanced;
const testUtils = require('./testUtils/utils');
const principalMock = require('./testUtils/principal_mock');
const assert = require('assert');
const constants = require('../src/common/constants');
const jayson = require('jayson');
const utils = require('../src/common/utils');
const MockCoreServer = require('../src/core/core_server_mock/core_server')

const fakeResponse = '0061d93b5412c0c9';
const fakeSig = 'deadbeaf';

function getStateKeysCallback(args, callback) {
  if (args.data && args.sig) {
    const result = {data: fakeResponse, sig: fakeSig};
    callback(null, result);
  } else {
    assert(false);
    callback('Missing data', null);
  }
}

describe('jsonrpc_advanced',()=>{

  it('#1 Should deployTask and get output via getStatus Action', async function(){
    if(!tree['all'] || !tree['#1']){
      this.skip();
    }
    return new Promise(async resolve => {
      // create all the boring stuff
      const principalServer = principalMock.create(getStateKeysCallback);
      await testUtils.sleep(150);
      const principalPort = principalMock.getPort(principalServer);
      const uri = 'http://127.0.0.1:';

      let {bNode,peer} = await testBuilder.createTwo({
        bOpts : { withProxy :true ,proxyPort :3346, withLogger: false},
        pOpts : { withLogger :false, principalUri :uri + principalPort}});

      await testUtils.sleep(3000);
      let bNodeController = bNode.mainController;
      let bNodeCoreServer = bNode.coreServer;
      let peerController = peer.mainController;
      let peerCoreServer = peer.coreServer;
      let pPath = peer.tasksDbPath;
      let bPath = bNode.tasksDbPath;
      // stop the test
      const stopTest = async ()=>{
        await peerController.shutdownSystem();
        peerCoreServer.disconnect();
        await bNodeController.shutdownSystem();
        bNodeCoreServer.disconnect();
        principalMock.destroy(principalServer);
        // await testUtils.rm_Minus_Rf(pPath);
        // await testUtils.rm_Minus_Rf(bPath);
        resolve();
      };
      const client = jayson.client.http('http://localhost:3346');
      let signKey = await peerController.getNode().selfSubscribeAction();
      await testUtils.sleep(1000);
      const deployInput = await getDeployRequest(signKey);
      client.request('deploySecretContract',deployInput,async (err,res)=>{
        assert.strictEqual(true,res.result.sendTaskResult, "sendTaskResult not true");
        await testUtils.sleep(5000);
        client.request('getTaskStatus' ,
            {"workerAddress":deployInput.workerAddress,"taskId":deployInput.contractAddress, "withResult" : true},
            async (err,res)=>{
              if(err) assert.strictEqual(true,false,"err" + err);
              assert.strictEqual(constants.TASK_STATUS.SUCCESS, res.result.result, "result not success");
              // the output result comes from core_mock hardcoded data which might brake in the future
              assert.deepStrictEqual(MockCoreServer.GET_DEPLOY_BYTECODE_MOCK,res.result.output, "output don't match");
              // assert.strictEqual(deployInput.preCode,res.result.output, "output don't match");
              await stopTest();
            });
      });
    });
  });

  it('#2 Should deployTask and GetTaskResult endpoint', async function(){
    if(!tree['all'] || !tree['#2']){
      this.skip();
    }
    return new Promise(async resolve => {
      // create all the boring stuff
      const principalServer = principalMock.create(getStateKeysCallback);
      await testUtils.sleep(150);
      const principalPort = principalMock.getPort(principalServer);
      const uri = 'http://127.0.0.1:';

      let {bNode,peer} = await testBuilder.createTwo({
        bOpts:{withProxy : true,proxyPort : 3346,withLogger : false},
        pOpts :{withLogger : false, principalUri :uri + principalPort}});

      await testUtils.sleep(3000);
      let bNodeController = bNode.mainController;
      let bNodeCoreServer = bNode.coreServer;
      let peerController = peer.mainController;
      let peerCoreServer = peer.coreServer;
      let pPath = peer.tasksDbPath;
      let bPath = bNode.tasksDbPath;
      // stop the test
      const stopTest = async ()=>{
        await peerController.shutdownSystem();
        peerCoreServer.disconnect();
        await bNodeController.shutdownSystem();
        bNodeCoreServer.disconnect();
        // await testUtils.rm_Minus_Rf(pPath);
        // await testUtils.rm_Minus_Rf(bPath);
        principalMock.destroy(principalServer);
        resolve();
      };
      const client = jayson.client.http('http://localhost:3346');
      let signKey = await peerController.getNode().selfSubscribeAction();
      await testUtils.sleep(1000);
      const deployInput = await getDeployRequest(signKey);
      client.request('deploySecretContract',deployInput,async (err,res)=>{
        assert.strictEqual(true,res.result.sendTaskResult, "sendTaskResult not true");
        await testUtils.sleep(5000);
        client.request('getTaskResult',
            {"taskId":deployInput.contractAddress},
            async (err,res)=>{
              if(err) assert.strictEqual(true,false,"err" + err);
              let status = res.result.result.status;
              let output = res.result.result.output;
              assert.strictEqual(constants.TASK_STATUS.SUCCESS, status, "result not success");
              // the output result comes from core_mock hardcoded data which might brake in the future
              assert.deepStrictEqual(MockCoreServer.GET_DEPLOY_BYTECODE_MOCK, output, "output don't match");
              // assert.strictEqual(deployInput.preCode,res.result.output, "output don't match");
              await stopTest();
            });
      });
    });
  });
});

async function getDeployRequest(signKey){
  const preCodeZip = await utils.gzip(Buffer.from([22,33,100,202,111,223,211,22]));

  return {
    contractAddress : '4409b216c78f20a2755240a73b7903825db9a6f985bcce798381aef58d740521',
    preCode : preCodeZip.toString('base64'),
    workerAddress : signKey,
    encryptedFn : 'be3e4462e79ccdf05b02e0921731c5f9dc8dce554b861cf5a05a5162141d63e1f4b1fac190828367052b198857aba9e10cdad79d95',
    encryptedArgs : 'fd50f5f6cd8b7e2b30547e70a84b61faaebf445927b70a743f23bf10342da00b7d8a20948c6c3aec7c54edba52298d90',
    userDHKey : '5587fbc96b01bfe6482bf9361a08e84810afcc0b1af72a8e4520f98771ea1080681e8a2f9546e5924e18c047fa948591dba098bffaced50f97a41b0050bdab99',
  };
}
