const TEST_TREE = require('./test_tree').TEST_TREE;
const IpcClient = require('../src/core/ipc');
const assert = require('assert');
const waterfall = require('async/waterfall');
const zmq = require('zeromq');
const CoreRuntime = require('../src/core/CoreRuntime');
const CoreServer = require('../src/core/core_server_mock/core_server');
const Envelop = require('../src/main_controller/channels/Envelop');
const Channel = require('../src/main_controller/channels/Channel');
const constants = require('../src/common/constants');
const nodeUtils = require('../src/common/utils');
const EnvironmentBuilder = require('../src/main_controller/EnvironmentBuilder');

it('#1 send acks to each other', async function(){
  let tree = TEST_TREE['ipc'];
  if(!tree['all'] || !tree['#1']){
    this.skip();
  }

  return new Promise(async (resolve)=>{
    const uri = 'tcp://127.0.0.1:5555';
    let serverSocket;
    let ipcClient;
    let serverOk = false, clientOk = false;

    waterfall([
      /** run the server - simulate core */
      cb=>{
        serverSocket = zmq.socket('rep');
        serverSocket.bindSync(uri);

        serverSocket.on('message', msg=>{
          serverOk = JSON.parse(msg).clientOk;
          serverSocket.send(JSON.stringify({"serverOk":true}));
        });
        cb(null);
      },
      /** run the client */
      cb=>{
        ipcClient = new IpcClient(uri);
        ipcClient.setResponseHandler((msg)=>{
           clientOk = msg.serverOk;
           cb(null);
        });

        ipcClient.connect();
        ipcClient.sendJson({"clientOk":true});
      }
    ],(err)=>{
      ipcClient.disconnect();
      serverSocket.disconnect(uri);
        if(err){
          assert.strictEqual(true,false,"error in waterfall");
        }else{
          assert.strictEqual(true, serverOk, "serverOk wrong");
          assert.strictEqual(true, clientOk, "clientOk wrong");
          resolve();
        }
    });
  });
});


it('#2 GetRegistrationParams - mock server', async function() {
  let tree = TEST_TREE['ipc'];
  if (!tree['all'] || !tree['#2']) {
    this.skip();
  }
  const Quote = 'AgAAANoKAAAHAAYAAAAAABYB+Vw5ueowf+qruQGtw+54eaWW7MiyrIAooQw/uU3eBAT/////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwAAAAAAAAAHAAAAAAAAALcVy53ugrfvYImaDi1ZW5RueQiEekyu/HmLIKYvg6OxAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACD1xnnferKFHD2uvYqTXdDA8iZ22kCD5xw7h38CMfOngAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACGcCDM4cgbYe6zQSwWQINFsDvd21kXGeteDakovCXPDwjJ31WG0K+wyDDRo8PFi293DtIr6DgNqS/guQSkglPJqAIAALbvs91Ugh9/yhBpAyGQPth+UWXRboGkTaZ3DY8U+Upkb2NWbLPkXbcMbB7c3SAfV4ip/kPswyq0OuTTiJijsUyOBOV3hVLIWM4f2wVXwxiVRXrfeFs/CGla6rGdRQpFzi4wWtrdKisVK5+Cyrt2y38Ialm0NqY9FIjxlodD9D7TC8fv0Xog29V1HROlY+PvRNa+f2qp858w8j+9TshkvOAdE1oVzu0F8KylbXfsSXhH7d+n0c8fqSBoLLEjedoDBp3KSO0bof/uzX2lGQJkZhJ/RSPPvND/1gVj9q1lTM5ccbfVfkmwdN0B5iDA5fMJaRz5o8SVILr3uWoBiwx7qsUceyGX77tCn2gZxfiOICNrpy3vv384TO2ovkwvhq1Lg071eXAlxQVtPvRYOGgBAABydn7bEWdP2htRd46nBkGIAoNAnhMvbGNbGCKtNVQAU0N9f7CROLPOTrlw9gVlKK+G5vM1X95KTdcOjs8gKtTkgEos021zBs9R+whyUcs9npo1SJ8GzowVwTwWfVz9adw2jL95zwJ/qz+y5x/IONw9iXspczf7W+bwyQpNaetO9xapF6aHg2/1w7st9yJOd0OfCZsowikJ4JRhAMcmwj4tiHovLyo2fpP3SiNGzDfzrpD+PdvBpyQgg4aPuxqGW8z+4SGn+vwadsLr+kIB4z7jcLQgkMSAplrnczr0GQZJuIPLxfk9mp8oi5dF3+jqvT1d4CWhRwocrs7Vm1tAKxiOBzkUElNaVEoFCPmUYE7uZhfMqOAUsylj3Db1zx1F1d5rPHgRhybpNpxThVWWnuT89I0XLO0WoQeuCSRT0Y9em1lsozSu2wrDKF933GL7YL0TEeKw3qFTPKsmUNlWMIow0jfWrfds/Lasz4pbGA7XXjhylwum8e/I';
  const signingKey = '4910f5dce2e9C7395691344d8d2c71349B14F924';
  return new Promise(async resolve => {
    //start the server
    const uri = 'tcp://127.0.0.1:5556';
    let coreServer = new CoreServer();
    coreServer.runServer(uri);
    await nodeUtils.sleep(1000);
// start the client
    let channels = Channel.biDirectChannel();
    let c1 = channels.channel1;
    let c2 = channels.channel2;
    let coreRuntime = new CoreRuntime({uri : uri});
    coreRuntime.setChannel(c2);
    await nodeUtils.sleep(1000);
    let reqEnv = new Envelop(true,{type : constants.CORE_REQUESTS.GetRegistrationParams}, constants.CORE_REQUESTS.GetRegistrationParams );
    c1.sendAndReceive(reqEnv)
    .then(resEnv=>{
      assert.strictEqual(Quote,resEnv.content().quote ,"quote don't match");
      assert.strictEqual(signingKey.length, resEnv.content().signingKey.length, 'signing key dont match');
      coreRuntime.disconnect();
      coreServer.disconnect();
      resolve();
    });
  });
});
it('#3 GetAllTips - mock server', async function() {
  let tree = TEST_TREE['ipc'];
  if (!tree['all'] || !tree['#3']) {
    this.skip();
  }
  const peerConfig = {
    'bootstrapNodes': [],
    'port': '0',
    'nickname': 'peer',
    'idPath': null,
  };
  const uri = 'tcp://127.0.0.1:5454';
  return new Promise(async resolve => {
    // start the server (core)
    let coreServer = new CoreServer();
    coreServer.runServer(uri);
    await nodeUtils.sleep(1500);
    // start the client (enigma-p2p)
    let builder = new EnvironmentBuilder();
    let mainController = await builder
    .setNodeConfig(peerConfig)
    .setIpcConfig({uri : uri})
    .build();
    await nodeUtils.sleep(2000);
    let fromCache = false;
    mainController.getNode().getAllLocalTips(fromCache,async (err,missingStates)=>{
      assert.strictEqual(null,err,'some error in response [' + err + ' ]');
      assert.strictEqual(3, missingStates.tips.length, 'len not 3');
      assert.strictEqual(10, missingStates.tips[0].key, 'key not 10');
      assert.strictEqual(34, missingStates.tips[1].key, 'key not 34');
      assert.strictEqual(0, missingStates.tips[2].key, 'key not 0');
      await mainController.getNode().stop();
      mainController.getIpcClient().disconnect();
      coreServer.disconnect();
      resolve();
    });
  });
});
