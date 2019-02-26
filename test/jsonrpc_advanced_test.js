const testBuilder = require('./testUtils/quickBuilderUtil');
const TEST_TREE = require('./test_tree').TEST_TREE;
const tree = TEST_TREE.jsonrpc_advanced;
const testUtils = require('./testUtils/utils');
const assert = require('assert');
const EngCid = require('../src/common/EngCID');
const EncoderUtil = require('../src/common/EncoderUtil');
const CidUtil = require('../src/common/CIDUtil');
const constants = require('../src/common/constants');
const jayson = require('jayson');

describe('jsonrpc_advanced',()=>{

  it('#1 Should deployTask and get output via getStatus Action', async function(){
    if(!tree['all'] || !tree['#1']){
      this.skip();
    }
    return new Promise(async resolve => {
      // create all the boring stuff
      let {bNode,peer} = await testBuilder.createTwo({bOpts:{withProxy : true,proxyPort : 3346}});
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
        await testUtils.rm_Minus_Rf(pPath);
        await testUtils.rm_Minus_Rf(bPath);
        resolve();
      };
      const client = jayson.client.http('http://localhost:3346');
      let signKey = await peerController.getNode().selfSubscribeAction();
      await testUtils.sleep(1000);
      const deployInput = getDeployRequest(signKey);
      client.request('deploySecretContract',deployInput,async (err,res)=>{
        assert.strictEqual(true,res.result.sendTaskResult, "sendTaskResult not true");
        await testUtils.sleep(5000);
        client.request('getTaskStatus' ,
            {"workerAddress":deployInput.workerAddress,"taskId":deployInput.contractAddress, "withResult" : true},
            async (err,res)=>{
              if(err) assert.strictEqual(true,false,"err" + err);
              assert.strictEqual(constants.TASK_STATUS.SUCCESS, res.result.result, "result not success");
              // the output result comes from core_mock hardcoded data which might brake in the future
              assert.deepStrictEqual([ 22, 22, 22, 22, 22, 33, 44, 44, 44, 44, 44, 44, 44, 55, 66, 77, 88, 99 ],res.result.output, "output don't match");
              // assert.strictEqual(deployInput.preCode,res.result.output, "output don't match");
              await stopTest();
            });
      });
    });
  });
});

function getDeployRequest(signKey){
  return {
    contractAddress : '0x4409b216c78f20a2755240a73b7903825db9a6f985bcce798381aef58d740521',
    preCode : [22,33,100,202,111,223,211,22],
    workerAddress : signKey,
    encryptedFn : 'be3e4462e79ccdf05b02e0921731c5f9dc8dce554b861cf5a05a5162141d63e1f4b1fac190828367052b198857aba9e10cdad79d95',
    encryptedArgs : 'fd50f5f6cd8b7e2b30547e70a84b61faaebf445927b70a743f23bf10342da00b7d8a20948c6c3aec7c54edba52298d90',
    userDHKey : '5587fbc96b01bfe6482bf9361a08e84810afcc0b1af72a8e4520f98771ea1080681e8a2f9546e5924e18c047fa948591dba098bffaced50f97a41b0050bdab99',
  };
}


// var jayson = require('jayson');
// var client = jayson.client.http('http://localhost:3346');
//
// const taskInput = {
//   taskId: '0xb79ebb25f2469cd6cabf8600c18d4f34c0d09ebb1f64f4cde141f6a2b3678a4d',
//   contractAddress: '0x9209b216c78f20a2755240a73b7903825db9a6f985bcce798381aef58d74059e',
//   workerAddress: '0x121553ec6a76d470461d27341b957b05c2f2f250',
//   encryptedFn: 'be3e4462e79ccdf05b02e0921731c5f9dc8dce554b861cf5a05a5162141d63e1f4b1fac190828367052b198857aba9e10cdad79d95',
//   encryptedArgs: 'fd50f5f6cd8b7e2b30547e70a84b61faaebf445927b70a743f23bf10342da00b7d8a20948c6c3aec7c54edba52298d90',
//   userDHKey: '5587fbc96b01bfe6482bf9361a08e84810afcc0b1af72a8e4520f98771ea1080681e8a2f9546e5924e18c047fa948591dba098bffaced50f97a41b0050bdab99',
// };
// client.request('sendTaskInput',taskInput,(err,res)=>{
//   console.log(res);
// });
