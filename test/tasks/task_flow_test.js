const constants = require('../../src/common/constants');
const testBuilder = require('../testUtils/quickBuilderUtil');
const testUtils = require('../testUtils/utils');
const assert = require('assert');
const tree = require('../test_tree').TEST_TREE.task_flow;
const utils = require('./utils');
const VerifyAndStoreResultAction = require('../../src/worker/controller/actions/tasks/VerifyAndStoreResultAction');


//function createVerifyAndStoreResultActionMock (callback){
//  exe
//}

class VerifyAndStoreResultActionMock extends VerifyAndStoreResultAction {
  constructor(controller, callback) {
    super(controller);
    this._callback = callback;
  }
  execute(params) {
    params.callback = this._callback;
    super.execute(params);
  }
}

describe('task_flow_tests',()=>{
  it('#1 Should test w1 Publish a successful deploy task and w2 receive it', async function(){
    if(!tree['#1'] || !tree['all'] )
      this.skip();
    return new Promise(async resolve => {
      // craete deploy task
      let {task, result} = utils.generateDeployBundle(1,true)[0];
      task.setResult(result);
      // create all the boring stuff
      let {bNode,peer} = await testBuilder.createTwo();
      await testUtils.sleep(5000);
      let bNodeController = bNode.mainController;
      let bNodeCoreServer = bNode.coreServer;
      let peerController = peer.mainController;
      let peerCoreServer = peer.coreServer;

      const stopTest = async ()=>{
        await peerController.shutdownSystem();
        peerCoreServer.disconnect();
        await bNodeController.shutdownSystem();
        bNodeCoreServer.disconnect();
        resolve();
      };

      const verifyResultPropagation = async (err) => {
        assert.strictEqual(err, null);
        const status = await peerController.getNode().taskManager().asyncGetTaskStatus(task.getTaskId());
        assert.strictEqual(status, task.getStatus());
        stopTest();
      }

      // override the action response
      const newAction = new VerifyAndStoreResultActionMock(peerController.getNode(), verifyResultPropagation);
      peerController.getNode().overrideAction(constants.NODE_NOTIFICATIONS.RECEIVED_NEW_RESULT, newAction);
      // run the test
      // publish the task result
      bNodeController.getNode().execCmd(constants.NODE_NOTIFICATIONS.TASK_FINISHED, { task : task});
    });
  });

  it('#2 Should test w1 Publish a failed deploy task and w2 receive it', async function(){
    if(!tree['#2'] || !tree['all'] )
      this.skip();
    return new Promise(async resolve => {
      // craete deploy task
      let {task, result} = utils.generateDeployBundle(1,false)[0];
      task.setResult(result);
      // create all the boring stuff
      let {bNode,peer} = await testBuilder.createTwo();
      await testUtils.sleep(5000);
      let bNodeController = bNode.mainController;
      let bNodeCoreServer = bNode.coreServer;
      let peerController = peer.mainController;
      let peerCoreServer = peer.coreServer;

      const stopTest = async ()=>{
        await peerController.shutdownSystem();
        peerCoreServer.disconnect();
        await bNodeController.shutdownSystem();
        bNodeCoreServer.disconnect();
        resolve();
      };

      const verifyResultPropagation = async (err) => {
        assert.strictEqual(err, null);
        const status = await peerController.getNode().taskManager().asyncGetTaskStatus(task.getTaskId());
        assert.strictEqual(status, task.getStatus());
        stopTest();
      }

      // override the action response
      const newAction = new VerifyAndStoreResultActionMock(peerController.getNode(), verifyResultPropagation);
      peerController.getNode().overrideAction(constants.NODE_NOTIFICATIONS.RECEIVED_NEW_RESULT, newAction);
      // run the test
      // publish the task result
      bNodeController.getNode().execCmd(constants.NODE_NOTIFICATIONS.TASK_FINISHED, { task : task});
    });
  });

  it('#3 Should test w1 Publish a successful compute task and w2 receive it', async function(){
    if(!tree['#3'] || !tree['all'] )
      this.skip();
    return new Promise(async resolve => {
      // craete deploy task
      let {task, result} = utils.generateComputeBundle(1,true)[0];
      task.setResult(result);
      // create all the boring stuff
      let {bNode,peer} = await testBuilder.createTwo();
      await testUtils.sleep(5000);
      let bNodeController = bNode.mainController;
      let bNodeCoreServer = bNode.coreServer;
      let peerController = peer.mainController;
      let peerCoreServer = peer.coreServer;

      const stopTest = async ()=>{
        await peerController.shutdownSystem();
        peerCoreServer.disconnect();
        await bNodeController.shutdownSystem();
        bNodeCoreServer.disconnect();
        resolve();
      };

      const verifyResultPropagation = async (err) => {
        assert.strictEqual(err, null);
        const status = await peerController.getNode().taskManager().asyncGetTaskStatus(task.getTaskId());
        assert.strictEqual(status, task.getStatus());
        stopTest();
      }

      // override the action response
      const newAction = new VerifyAndStoreResultActionMock(peerController.getNode(), verifyResultPropagation);
      peerController.getNode().overrideAction(constants.NODE_NOTIFICATIONS.RECEIVED_NEW_RESULT, newAction);
      // run the test
      // publish the task result
      bNodeController.getNode().execCmd(constants.NODE_NOTIFICATIONS.TASK_FINISHED, { task : task});
    });
  });

  it('#4 Should test w1 Publish a failed compute task and w2 receive it', async function(){
    if(!tree['#4'] || !tree['all'] )
      this.skip();
    return new Promise(async resolve => {
      // craete deploy task
      let {task, result} = utils.generateComputeBundle(1,false)[0];
      task.setResult(result);
      // create all the boring stuff
      let {bNode,peer} = await testBuilder.createTwo();
      await testUtils.sleep(5000);
      let bNodeController = bNode.mainController;
      let bNodeCoreServer = bNode.coreServer;
      let peerController = peer.mainController;
      let peerCoreServer = peer.coreServer;

      const stopTest = async ()=>{
        await peerController.shutdownSystem();
        peerCoreServer.disconnect();
        await bNodeController.shutdownSystem();
        bNodeCoreServer.disconnect();
        resolve();
      };

      const verifyResultPropagation = async (err) => {
        assert.strictEqual(err, null);
        const status = await peerController.getNode().taskManager().asyncGetTaskStatus(task.getTaskId());
        assert.strictEqual(status, task.getStatus());
        stopTest();
      }

      // override the action response
      const newAction = new VerifyAndStoreResultActionMock(peerController.getNode(), verifyResultPropagation);
      peerController.getNode().overrideAction(constants.NODE_NOTIFICATIONS.RECEIVED_NEW_RESULT, newAction);
      // run the test
      // publish the task result
      bNodeController.getNode().execCmd(constants.NODE_NOTIFICATIONS.TASK_FINISHED, { task : task});
    });
  });
});

