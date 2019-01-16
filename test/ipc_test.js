const TEST_TREE = require('./test_tree').TEST_TREE;
const IpcClient = require('../src/core/ipc');
const waterfall = require('async/waterfall');
const zmq = require('zeromq');
const CoreRuntime = require('../src/core/CoreRuntime');
const CoreServer = require('../src/core/core_server_mock/core_server');
const Envelop = require('../src/main_controller/channels/Envelop');
const Channel = require('../src/main_controller/channels/Channel');
const constants = require('../src/common/constants');
const nodeUtils = require('../src/common/utils');
const EnvironmentBuilder = require('../src/main_controller/EnvironmentBuilder');
const expect = require('expect');
it('#1 send acks to each other', async function() {
  const tree = TEST_TREE['ipc'];
  if (!tree['all'] || !tree['#1']) {
    this.skip();
  }

  return new Promise(async (resolve)=>{
    const uri = 'tcp://127.0.0.1:5555';
    let serverSocket;
    let ipcClient;
    let serverOk = false; let clientOk = false;

    waterfall([
      /** run the server - simulate core */
      (cb)=>{
        serverSocket = zmq.socket('rep');
        serverSocket.bindSync(uri);

        serverSocket.on('message', (msg)=>{
          serverOk = JSON.parse(msg).clientOk;
          serverSocket.send(JSON.stringify({'serverOk': true}));
        });
        cb(null);
      },
      /** run the client */
      (cb)=>{
        ipcClient = new IpcClient(uri);
        ipcClient.setResponseHandler((msg)=>{
          clientOk = msg.serverOk;
          cb(null);
        });

        ipcClient.connect();
        ipcClient.sendJson({'clientOk': true});
      },
    ], (err)=>{
      ipcClient.disconnect();
      serverSocket.disconnect(uri);
      if (err) {
        expect(err).toBeFalsy();
      } else {
        expect(serverOk).toBeTruthy();
        expect(clientOk).toBeTruthy();
        // assert.strictEqual(true,serverOk);
        // assert.strictEqual(true,clientOk);

        resolve();
      }
    });
  });
});

it('#2 GetRegistrationParams - mock server', async function() {
  const tree = TEST_TREE['ipc'];
  if (!tree['all'] || !tree['#2']) {
    this.skip();
  }
  const quote = 'AgAAANoKAAAHAAYAAAAAABYB+Vw5ueowf+qruQGtw+54eaWW7MiyrIAooQw/uU3eBAT/////AAAAAAAAAAAAAAAAAAAAAAAAAAAAA'+
              'AAAAAAAAAAAAAAAAAAAAAAAAAAABwAAAAAAAAAHAAAAAAAAALcVy53ugrfvYImaDi1ZW5RueQiEekyu/HmLIKYvg6OxAAAAAAAAAA'+
              'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACD1xnnferKFHD2uvYqTXdDA8iZ22kCD5xw7h38CMfOngAAAAAAAAAAAAAAAAAAAAAAAAA'+
              'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'+
              'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACGcCDM4cgbYe6zQ'+
              'SwWQINFsDvd21kXGeteDakovCXPDwjJ31WG0K+wyDDRo8PFi293DtIr6DgNqS/guQSkglPJqAIAALbvs91Ugh9/yhBpAyGQPth+UW'+
              'XRboGkTaZ3DY8U+Upkb2NWbLPkXbcMbB7c3SAfV4ip/kPswyq0OuTTiJijsUyOBOV3hVLIWM4f2wVXwxiVRXrfeFs/CGla6rGdRQp'+
              'Fzi4wWtrdKisVK5+Cyrt2y38Ialm0NqY9FIjxlodD9D7TC8fv0Xog29V1HROlY+PvRNa+f2qp858w8j+9TshkvOAdE1oVzu0F8Kyl'+
              'bXfsSXhH7d+n0c8fqSBoLLEjedoDBp3KSO0bof/uzX2lGQJkZhJ/RSPPvND/1gVj9q1lTM5ccbfVfkmwdN0B5iDA5fMJaRz5o8SVI'+
              'Lr3uWoBiwx7qsUceyGX77tCn2gZxfiOICNrpy3vv384TO2ovkwvhq1Lg071eXAlxQVtPvRYOGgBAABydn7bEWdP2htRd46nBkGIAo'+
              'NAnhMvbGNbGCKtNVQAU0N9f7CROLPOTrlw9gVlKK+G5vM1X95KTdcOjs8gKtTkgEos021zBs9R+whyUcs9npo1SJ8GzowVwTwWfVz'+
              '9adw2jL95zwJ/qz+y5x/IONw9iXspczf7W+bwyQpNaetO9xapF6aHg2/1w7st9yJOd0OfCZsowikJ4JRhAMcmwj4tiHovLyo2fpP3'+
              'SiNGzDfzrpD+PdvBpyQgg4aPuxqGW8z+4SGn+vwadsLr+kIB4z7jcLQgkMSAplrnczr0GQZJuIPLxfk9mp8oi5dF3+jqvT1d4CWhR'+
              'wocrs7Vm1tAKxiOBzkUElNaVEoFCPmUYE7uZhfMqOAUsylj3Db1zx1F1d5rPHgRhybpNpxThVWWnuT89I0XLO0WoQeuCSRT0Y9em1'+
              'lsozSu2wrDKF933GL7YL0TEeKw3qFTPKsmUNlWMIow0jfWrfds/Lasz4pbGA7XXjhylwum8e/I';
  const signingKey = '0x4910f5dce2e9C7395691344d8d2c71349B14F924';
  return new Promise(async (resolve) => {
    // start the server
    const uri = 'tcp://127.0.0.1:5556';
    CoreServer.runServer(uri);
    await nodeUtils.sleep(1000);
    // start the client
    const channels = Channel.biDirectChannel();
    const c1 = channels.channel1;
    const c2 = channels.channel2;
    const coreRuntime = new CoreRuntime({uri: uri});
    coreRuntime.setChannel(c2);
    await nodeUtils.sleep(1000);
    const reqEnv = new Envelop(true, {type: constants.CORE_REQUESTS.GetRegistrationParams},
        constants.CORE_REQUESTS.GetRegistrationParams );
    c1.sendAndReceive(reqEnv)
        .then((resEnv)=>{
          expect(resEnv.content().result.quote).toBe(quote);
          // assert.strictEqual(resEnv.content().result.quote. quote);
          expect(resEnv.content().result.signingKey.length).toBe(signingKey.length);
          // assert.strictEqual(resEnv.content().result.signingKey.length, signingKey.length);
          coreRuntime.disconnect();
          CoreServer.disconnect();
          resolve();
        });
  });
}, 20000);

it('#3 GetAllTips - mock server', async function() {
  const tree = TEST_TREE['ipc'];
  if (!tree['all'] || !tree['#3']) {
    this.skip();
  }
  const peerConfig = {
    'bootstrapNodes': [],
    'port': '0',
    'nickname': 'peer',
    'idPath': null,
  };
  const uri = 'tcp://127.0.0.1:5557';
  return new Promise(async (resolve) => {
    // start the server (core)
    CoreServer.runServer(uri);
    await nodeUtils.sleep(1500);
    // start the client (enigma-p2p)
    const builder = new EnvironmentBuilder();
    const mainController = await builder
        .setNodeConfig(peerConfig)
        .setIpcConfig({uri: uri})
        .build();
    await nodeUtils.sleep(2000);
    const fromCache = false;
    mainController.getNode().getAllLocalTips(fromCache, async (err, missingStates)=>{
      expect(err).toBeNull();
      // assert.strictEqual(err,null);
      expect(missingStates.tips.length).toBe(3);
      // assert.strictEqual(3,missingStates.tips.length);
      expect(missingStates.tips[0].key).toBe(10);
      // assert.strictEqual(10,missingStates.tips[0].key);
      expect(missingStates.tips[1].key).toBe(34);
      // assert.strictEqual(34,missingStates.tips[0].key);
      expect(missingStates.tips[2].key).toBe(0);
      // assert.strictEqual(0,missingStates.tips[0].key);
      await mainController.getNode().stop();
      mainController.getIpcClient().disconnect();
      CoreServer.disconnect();
      resolve();
    });
  });
}, 30000);

it('#4 getNewTaskEncryptionKey - mock server', async function() {
  const tree = TEST_TREE['ipc'];
  if (!tree['all'] || !tree['#4']) {
    this.skip();
  }
  const pubkey = '2ea8e4cefb78efd0725ed12b23b05079a0a433cc8a656f212accf58672fee44a20cfcaa50466237273e762e49ec912be613'+
    '58d5e90bff56a53a0ed42abfe27e3';
  return new Promise(async (resolve) => {
    // start the server
    const uri = 'tcp://127.0.0.1:5558';
    CoreServer.runServer(uri);
    await nodeUtils.sleep(1000);
    // start the client
    const channels = Channel.biDirectChannel();
    const c1 = channels.channel1;
    const c2 = channels.channel2;
    const coreRuntime = new CoreRuntime({uri: uri});
    coreRuntime.setChannel(c2);
    await nodeUtils.sleep(1000);
    const reqEnv = new Envelop(true, {type: constants.CORE_REQUESTS.NewTaskEncryptionKey, userPubKey: pubkey},
        constants.CORE_REQUESTS.NewTaskEncryptionKey );
    c1.sendAndReceive(reqEnv)
        .then((resEnv)=>{
          expect(resEnv.content().type).toBe(constants.CORE_REQUESTS.NewTaskEncryptionKey);
          // assert.strictEqual(resEnv.content().type, constants.CORE_REQUESTS.NewTaskEncryptionKey);
          expect(resEnv.content().id).toBe(reqEnv._id);
          // assert.strictEqual(resEnv.content().id,reqEnv._id);
          // expect(resEnv.content().result.workerEncryptionKey).toBeTruthy();

          expect(resEnv.content().result.workerSig).toBeTruthy();
          coreRuntime.disconnect();
          CoreServer.disconnect();
          resolve();
        });
  });
});
