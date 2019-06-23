const TEST_TREE = require('./test_tree').TEST_TREE;
const IpcClient = require('../src/core/ipc');
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

  return new Promise(async (resolve) => {
    const uri = 'tcp://127.0.0.1:5555';
    let serverOk = false;
    let clientOk = false;
    const fakeMessage = {id: 'deadbeaf', type: 'GetRegistrationParams'};

    const serverSocket = zmq.socket('rep');
    serverSocket.bindSync(uri);

    serverSocket.on('message', (msg) => {
      if (JSON.parse(msg).type === 'GetRegistrationParams') {
        serverOk = true;
      }
      serverSocket.send(JSON.stringify({'serverOk': true}));
    });

    const ipcClient = new IpcClient(uri);
    ipcClient.setResponseHandler((msg) => {
      clientOk = msg.serverOk;
      ipcClient.disconnect();
      serverSocket.disconnect(uri);
      expect(serverOk).toBeTruthy();
      expect(clientOk).toBeTruthy();
      resolve();
    });

    ipcClient.connect();
    await ipcClient.sendJson(fakeMessage);
  });
});

it('#2 GetRegistrationParams - mock server', async function() {
  const tree = TEST_TREE['ipc'];
  if (!tree['all'] || !tree['#2']) {
    this.skip();
  }
  const report = '0x7b226964223a22313030333432373331303836343330353730363437323935303233313839373332373434323635222c2274696d657374616d70223a22323031382d30372d31355431363a30363a34372e393933323633222c22697376456e636c61766551756f7465537461747573223a2247524f55505f4f55545f4f465f44415445222c22706c6174666f726d496e666f426c6f62223a22313530323030363530343030303130303030303530353032303430313031303030303030303030303030303030303030303030373030303030363030303030303032303030303030303030303030304144414438354144453543383437343342394538414246323633383830384137353937413645454243454141364130343134323930383342334346323332443646373436433742313943383332313636443841424236304639304243453931373237303535353131354230303530463745363542383132353346373934463636354141222c22697376456e636c61766551756f7465426f6479223a2241674141414e6f4b414141484141594141414141414259422b56773575656f77662b717275514774772b3567624a736c684f58396557444e617a5770486842564241542f2f2f2f2f4141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141427741414141414141414148414141414141414141424968503233624c554e535a3179764649725a613070752f7a74362f6e335838714e6a4d566257674f4744414141414141414141414141414141414141414141414141414141414141414141414141414141414141434431786e6e6665724b4648443275765971545864444138695a32326b434435787737683338434d664f6e67414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141414141776544526c4e6d526b4d6a67304e7a646b4d324e6b5932517a4d5441334e544133596a59784e7a4d33595746684d5455354d5459774e7a414141414141414141414141414141414141414141414141414141414141227d';
  const reportSig = '0x9e6a05bf42a627e3066b0067dc98bc22670df0061e42eed6a5af51ffa2e3b41949b6b177980b68c43855d4df71b2817b30f54bc40566225e6b721eb21fc0aba9b58e043bfaaae320e8d9613d514c0694b36b3fe41588b15480a6f7a4d025c244af531c7145d37f8b28c223bfb46c157470246e3dbd4aa15681103df2c8fd47bb59f7b827de559992fd24260e1113912bd98ba5cd769504bb5f21471ecd4f7713f600ae5169761c9047c09d186ad91f5ff89893c13be15d11bb663099192bcf2ce81f3cbbc28c9db93ce1a4df1141372d0d738fd9d0924d1e4fe58a6e2d12a5d2f723e498b783a6355ca737c4b0feeae3285340171cbe96ade8d8b926b23a8c90';
  return new Promise(async (resolve) => {
    // start the server
    const uri = 'tcp://127.0.0.1:5556';
    const coreServer = new CoreServer();
    coreServer.runServer(uri);
    await nodeUtils.sleep(100);
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
          expect(resEnv.content().result.report).toBe(report);
          expect(resEnv.content().result.signature).toBe(reportSig);
          expect(resEnv.content().result.signingKey.length).toBe(42);

          coreRuntime.disconnect();
          coreServer.disconnect();
          resolve();
        });
  });
});

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
    const coreServer = new CoreServer();
    coreServer.runServer(uri);
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
      expect(err).not.toEqual(expect.anything()); // This should match against null/undefined
      expect(missingStates.length).toBe(3);
      expect(missingStates[0].key).toBe(10);
      expect(missingStates[1].key).toBe(34);
      expect(missingStates[2].key).toBe(0);
      await mainController.getNode().stop();
      mainController.getIpcClient().disconnect();
      coreServer.disconnect();
      resolve();
    });
  });
});

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
    const coreServer = new CoreServer();
    coreServer.runServer(uri);
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
          expect(resEnv.id()).toBe(reqEnv.id());
          expect(resEnv.content().id).toBe(reqEnv.content().id);
          expect(resEnv.content().result.workerEncryptionKey).toBeTruthy();
          expect(resEnv.content().result.workerSig).toBeTruthy();
          coreRuntime.disconnect();
          coreServer.disconnect();
          resolve();
        });
  });
});

it('#5 GetPTTRequest without addresses - mock server', async function() {
  const tree = TEST_TREE['ipc'];
  if (!tree['all'] || !tree['#5']) {
    this.skip();
  }

  return new Promise(async (resolve) => {
    // start the server
    const uri = 'tcp://127.0.0.1:6785';
    const coreServer = new CoreServer();
    coreServer.runServer(uri);
    await nodeUtils.sleep(1000);
    // start the client
    const channels = Channel.biDirectChannel();
    const c1 = channels.channel1;
    const c2 = channels.channel2;
    const coreRuntime = new CoreRuntime({uri: uri});
    coreRuntime.setChannel(c2);
    await nodeUtils.sleep(1000);
    const reqEnv = new Envelop(true, {type: constants.CORE_REQUESTS.GetPTTRequest},
        constants.CORE_REQUESTS.GetPTTRequest);
    c1.sendAndReceive(reqEnv)
        .then((resEnv) => {
          expect(resEnv.content().type).toBe(constants.CORE_REQUESTS.GetPTTRequest);
          expect(resEnv.id()).toBe(reqEnv.id());
          expect(resEnv.content().id).toBe(reqEnv.content().id);
          expect(resEnv.content().result.request).toBe(CoreServer.GET_PTT_NO_ADDRESSES_REQUEST_MOCK);
          expect(resEnv.content().result.workerSig).toBeTruthy();
          coreRuntime.disconnect();
          coreServer.disconnect();
          resolve();
        });
  });
});


it('#6 GetPTTRequest *with* addresses - mock server', async function() {
  const tree = TEST_TREE['ipc'];
  if (!tree['all'] || !tree['#6']) {
    this.skip();
  }

  return new Promise(async (resolve) => {
    // start the server
    const uri = 'tcp://127.0.0.1:7890';
    const coreServer = new CoreServer();
    coreServer.runServer(uri);
    await nodeUtils.sleep(1000);
    // start the client
    const channels = Channel.biDirectChannel();
    const c1 = channels.channel1;
    const c2 = channels.channel2;
    const coreRuntime = new CoreRuntime({uri: uri});
    coreRuntime.setChannel(c2);
    await nodeUtils.sleep(1000);
    const addresses = [{address: '0x1203', blockNumber: 100},
      {address: '0xdeadbeaf', blockNumber: 200}];
    const input = {addresses: addresses};
    const reqEnv = new Envelop(true, {type: constants.CORE_REQUESTS.GetPTTRequest, input: input},
        constants.CORE_REQUESTS.GetPTTRequest);
    c1.sendAndReceive(reqEnv)
        .then((resEnv) => {
          expect(resEnv.content().type).toBe(constants.CORE_REQUESTS.GetPTTRequest);
          expect(resEnv.id()).toBe(reqEnv.id());
          expect(resEnv.content().id).toBe(reqEnv.content().id);
          expect(resEnv.content().result.request).toEqual(input.addresses);
          expect(resEnv.content().result.workerSig).toBeTruthy();
          coreRuntime.disconnect();
          coreServer.disconnect();
          resolve();
        });
  });
});

it('#7 GetTips - mock server', async function() {
  const tree = TEST_TREE['ipc'];
  if (!tree['all'] || !tree['#7']) {
    this.skip();
  }
  return new Promise(async (resolve) => {
    // start the server
    const uri = 'tcp://127.0.0.1:7896';
    const coreServer = new CoreServer();
    coreServer.runServer(uri);
    await nodeUtils.sleep(1000);
    // start the client
    const channels = Channel.biDirectChannel();
    const c1 = channels.channel1;
    const c2 = channels.channel2;
    const coreRuntime = new CoreRuntime({uri: uri});
    coreRuntime.setChannel(c2);
    await nodeUtils.sleep(1000);
    const input = ['0x98456a', '0xdeadbeaf'];
    const reqEnv = new Envelop(true, {type: constants.CORE_REQUESTS.GetTips, input: input},
      constants.CORE_REQUESTS.GetTips);
    c1.sendAndReceive(reqEnv)
      .then((resEnv) => {
        expect(resEnv.content().type).toBe(constants.CORE_REQUESTS.GetTips);
        expect(resEnv.id()).toBe(reqEnv.id());
        expect(resEnv.content().id).toBe(reqEnv.content().id);
        for (let i=0; i<input.length; i++) {
          expect(resEnv.content().result.tips[i].address).toEqual(input[i]);
          expect(resEnv.content().result.tips[i].key).toBeTruthy();
          expect(resEnv.content().result.tips[i].data).toBeTruthy();
        }
        coreRuntime.disconnect();
        coreServer.disconnect();
        resolve();
      });
  });
});
