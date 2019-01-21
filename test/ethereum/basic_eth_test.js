const path = require('path');
const assert = require('assert');
const TEST_TREE = require(path.join(__dirname, '../test_tree')).TEST_TREE;
const envInitializer = require('./scripts/env_initializer');
const EnigmaContractWriterAPI = require(path.join(__dirname, '../../src/ethereum/EnigmaContractWriterAPI'));
const EnigmaContractAPIBuilder = require(path.join(__dirname, '../../src/ethereum/EnigmaContractAPIBuilder'));
const EthereumServices = require(path.join(__dirname, '../../src/ethereum/EthereumServices'));

const StateSync = require(path.join(__dirname, '../../src/ethereum/StateSync'));

const truffleDir = path.join(__dirname, './scripts');

const testParameters = require('./test_parameters.json');

const testUtils = require('../testUtils/utils');

describe('Ethereum tests', function() {
  let web3;
  let api;
  let enigmaContractAddress;
  let enigmaContractABI;

  before(async function() {
    const tree = TEST_TREE.ethereum;
    if (!tree['all']) {
      this.skip();
    }
    // runs before all tests in this block
    await envInitializer.start(truffleDir);
  });

  after(async function() {
    const tree = TEST_TREE.ethereum;
    if (!tree['all']) {
      this.skip();
    }
    // runs after all tests in this block
    await envInitializer.stop(web3);
  });

  beforeEach(async function() {
    // runs before each test in this block
    const result = await envInitializer.init(truffleDir);
    enigmaContractAddress = result.contractAddress;
    enigmaContractABI = result.contractABI;

    web3 = result.web3;

    //     let web3 = new Web3(provider);
    api = await new EnigmaContractWriterAPI(enigmaContractAddress, enigmaContractABI, web3);
  }, 60000);

  afterEach(async function() {
    // runs after each test in this block
    await envInitializer.disconnect(web3);
  });

  function eventSubscribe(api, eventName, filter, callback) {
    api.subscribe(eventName, filter, callback);
    // console.log("subscribed to " + eventName);
  }

  // const util = require('util')

  // console.log(util.inspect(myObject, {showHidden: false, depth: null}))

  function getEventRecievedFunc(eventName, resolve) {
    return (err, event)=> {
      resolve(event);
    };
  }

  it('Register a worker, deposit and deploy a secret contract using the BUILDER ', async function() {
    const tree = TEST_TREE.ethereum;
    if (!tree['all'] || !tree['#1']) {
      await envInitializer.disconnect(web3);
      this.skip();
    }
    return new Promise(async function(resolve) {
      if (web3 === undefined) {
        console.log("web3 not yet initialized");
        await testUtils.sleep(2000);
      }
      await envInitializer.disconnect(web3);
      await envInitializer.stop(web3);

      await testUtils.sleep(3000);

      const builder = new EnigmaContractAPIBuilder();
      res = await builder.createNetwork().deploy().build();
      const api = res.api;

      const accounts = await api.w3().eth.getAccounts();
      const workerEnclaveSigningAddress = accounts[3];
      const workerAddress = accounts[4];
      const workerReport = JSON.stringify(testParameters.report);// "0x123456";
      const depositValue = 1000;
      const secretContractAddress = api.w3().utils.randomHex(32); // accounts[5];
      const secretContractAddress2 = api.w3().utils.randomHex(32); // accounts[6];
      const codeHash = web3.utils.sha3(JSON.stringify(testParameters.bytecode));

      eventSubscribe(api, 'Registered', {}, getEventRecievedFunc('Registered',
          (result)=> {
            assert.strictEqual(result.signer, workerEnclaveSigningAddress);
            assert.strictEqual(result.workerAddress, workerAddress);
          }));

      eventSubscribe(api, 'DepositSuccessful', {}, getEventRecievedFunc('DepositSuccessful',
          (result)=> {
            assert.strictEqual(result.from, workerAddress);
            assert.strictEqual(result.value, depositValue);
          }));

      eventSubscribe(api, 'SecretContractDeployed', {}, getEventRecievedFunc('SecretContractDeployed',
          (result)=> {
            assert.strictEqual(result.secretContractAddress, secretContractAddress);
            assert.strictEqual(result.codeHash, codeHash);
          }));

      await api.register(workerEnclaveSigningAddress, workerReport, {from: workerAddress});

      await api.deposit(workerAddress, depositValue, {from: workerAddress});

      // Verify worker's report
      const result = await api.getReport(workerAddress);
      assert.strictEqual(result.report, workerReport);

      // Verify the number of secret-accounts before deploying one
      const countBefore = await api.countSecretContracts();
      assert.strictEqual(countBefore, 0);

      await api.deploySecretContract(secretContractAddress, codeHash, workerAddress, workerEnclaveSigningAddress, {from: workerAddress});

      // Verify the number of secret-accounts after deploying one
      const countAfter = await api.countSecretContracts();
      assert.strictEqual(countAfter, 1);

      // Verify that the secret-accounts is deployed
      const isDeployed = await api.isDeployed(secretContractAddress);
      assert.strictEqual(isDeployed, true);

      const observedCodeHash = await api.getCodeHash(secretContractAddress);
      assert.strictEqual(observedCodeHash, codeHash);

      const observedAddresses = await api.getSecretContractAddresses(0, 1);
      assert.strictEqual(observedAddresses[0], secretContractAddress);

      api.unsubscribeAll();

      await api.deploySecretContract(secretContractAddress2, codeHash, workerAddress, workerEnclaveSigningAddress, {from: workerAddress});

      // Verify the number of secret-accounts after deploying another one
      const observedCount = await api.countSecretContracts();
      assert.strictEqual(observedCount, 2);

      const observedAddressesArray1 = await api.getSecretContractAddresses(0, 1);
      assert.strictEqual(observedAddressesArray1[0], secretContractAddress);

      const observedAddresses2 = await api.getSecretContractAddresses(1, 2);
      assert.strictEqual(observedAddresses2[0], secretContractAddress2);

      const observedAddressesArray = await api.getSecretContractAddresses(0, 2);
      assert.strictEqual(observedAddressesArray[0], secretContractAddress);
      assert.strictEqual(observedAddressesArray[1], secretContractAddress2);

      await res.environment.destroy();
      await envInitializer.start(truffleDir);
      resolve();
    }).catch(console.log);
  });

  it('Register, login, deploy secret contract, create tasks and commit reciepts using the BUILDER ', async function() {
    const tree = TEST_TREE.ethereum;
    if (!tree['all'] || !tree['#2']) {
      await envInitializer.disconnect(web3); // due to: https://github.com/mochajs/mocha/issues/2546
      this.skip();
    }

    return new Promise(async function(resolve) {
      const config = {enigmaContractAddress: enigmaContractAddress, enigmaContractABI: enigmaContractABI};
      const builder = new EnigmaContractAPIBuilder();
      res = await builder.useDeployed(config).build();

      const api2 = res.api;
      const web3_2 = api.w3();

      const accounts = await web3_2.eth.getAccounts();
      const workerEnclaveSigningAddress = accounts[3];
      const workerAddress = accounts[4];
      const workerReport = JSON.stringify(testParameters.report);// "0x123456";
      const secretContractAddress = web3_2.utils.randomHex(32);// accounts[5];
      const codeHash = web3_2.utils.sha3(JSON.stringify(testParameters.bytecode));

      await api2.register(workerEnclaveSigningAddress, workerReport, {from: workerAddress});

      await api.deploySecretContract(secretContractAddress, codeHash, workerAddress, workerEnclaveSigningAddress, {from: workerAddress});

      const taskId1 = web3_2.utils.randomHex(32);
      const taskFee1 = 5;
      const taskSenderAddress1 = accounts[9];

      const taskId2 = web3_2.utils.randomHex(32);
      const taskFee2 = 19;
      const taskId3 = web3_2.utils.randomHex(32);
      const taskFee3 = 58;

      eventSubscribe(api2, 'TaskRecordCreated', {}, getEventRecievedFunc('TaskRecordCreated',
          (result)=> {
            assert.strictEqual(result.taskId, taskId1);
            assert.strictEqual(result.fee, taskFee1);
            assert.strictEqual(result.senderAddress, taskSenderAddress1);
          }));

      eventSubscribe(api2, 'TaskRecordsCreated', {}, getEventRecievedFunc('TaskRecordsCreated',
          (result)=> {
            assert.strictEqual(result.taskIds[0], taskId2);
            assert.strictEqual(result.taskIds[1], taskId3);
            assert.strictEqual(result.taskIds.length, 2);

            assert.strictEqual(result.fees[0], taskFee2);
            assert.strictEqual(result.fees[1], taskFee3);
            assert.strictEqual(result.fees.length, 2);

            assert.strictEqual(result.senderAddress, workerAddress);
          }));

      await api2.createTaskRecord(taskId1, taskFee1, {from: taskSenderAddress1});

      await api2.createTaskRecords([taskId2, taskId3], [taskFee2, taskFee3], {from: workerAddress});

      const stateDeltaHash0 = '0x0000000000000000000000000000000000000000000000000000000000000000';
      const stateDeltaHash1 = web3_2.utils.randomHex(32);
      const stateDeltaHash2 = web3_2.utils.randomHex(32);
      const stateDeltaHash3 = web3_2.utils.randomHex(32);
      const ethCall = web3_2.utils.randomHex(32);


      eventSubscribe(api2, 'ReceiptVerified', {}, getEventRecievedFunc('ReceiptVerified',
          (result)=> {
            assert.strictEqual(result.taskId, taskId1);
            assert.strictEqual(result.inStateDeltaHash, stateDeltaHash0);
            assert.strictEqual(result.outStateDeltaHash, stateDeltaHash1);
            assert.strictEqual(result.ethCall, ethCall);
            assert.strictEqual(result.signature, workerEnclaveSigningAddress);
          }));


      eventSubscribe(api2, 'ReceiptsVerified', {}, getEventRecievedFunc('ReceiptsVerified',
          (result)=> {
            assert.strictEqual(result.taskIds[0], taskId2);
            assert.strictEqual(result.taskIds[1], taskId3);
            assert.strictEqual(result.inStateDeltaHashes[0], stateDeltaHash1);
            assert.strictEqual(result.inStateDeltaHashes[1], stateDeltaHash2);
            assert.strictEqual(result.outStateDeltaHashes[0], stateDeltaHash2);
            assert.strictEqual(result.outStateDeltaHashes[1], stateDeltaHash3);
            assert.strictEqual(result.ethCall, ethCall);
            assert.strictEqual(result.signature, workerEnclaveSigningAddress);
          }));


      // await testUtils.sleep(5000);

      // Verify the number of state deltas is 0 before any commit
      const count1 = await api2.countStateDeltas(secretContractAddress);
      assert.strictEqual(count1, 0);

      // Verify the input state delta is not valid before any commit
      const observedValidBefore = await api2.isValidDeltaHash(secretContractAddress, stateDeltaHash1);
      assert.strictEqual(observedValidBefore, false);

      // Login the worker before commmitting receipts
      await api2.login({from: workerAddress});
      await api2.commitReceipt(secretContractAddress, taskId1, stateDeltaHash0, stateDeltaHash1,
          ethCall, workerEnclaveSigningAddress, {from: workerAddress});

      // Verify the number of state deltas after one commit
      const count2 = await api2.countStateDeltas(secretContractAddress);
      assert.strictEqual(count2, 1);

      // Verify the input state delta is valid after the commit
      const observedValidAfter = await api2.isValidDeltaHash(secretContractAddress, stateDeltaHash1);
      assert.strictEqual(observedValidAfter, true);

      await api2.commitReceipts(secretContractAddress, [taskId2, taskId3], [stateDeltaHash1, stateDeltaHash2], [stateDeltaHash2, stateDeltaHash3],
          ethCall, workerEnclaveSigningAddress, {from: workerAddress});

      // Verify the number of state deltas after a batch commit
      const count3 = await api2.countStateDeltas(secretContractAddress);
      assert.strictEqual(count3, 3);

      const observedStateDeltaHash3 = await api2.getStateDeltaHash(secretContractAddress, 2);
      assert.strictEqual(observedStateDeltaHash3, stateDeltaHash3);

      const observedStateDeltaHashes = await api2.getStateDeltaHashes(secretContractAddress, 0, 3);
      assert.strictEqual(observedStateDeltaHashes[0], stateDeltaHash1);
      assert.strictEqual(observedStateDeltaHashes[1], stateDeltaHash2);
      assert.strictEqual(observedStateDeltaHashes[2], stateDeltaHash3);
      assert.strictEqual(observedStateDeltaHashes.length, 3);

      api2.unsubscribeAll();

      await api.logout({from: workerAddress});

      await res.environment.destroy();

      resolve();
    });
  });

  it('State sync - empty local tips', async function() {
    const tree = TEST_TREE.ethereum;
    if (!tree['all'] || !tree['#3']) {
      await envInitializer.disconnect(web3); // due to: https://github.com/mochajs/mocha/issues/2546
      this.skip();
    }

    return new Promise(async function(resolve) {
      const accounts = await web3.eth.getAccounts();
      const workerEnclaveSigningAddress = accounts[3];
      const workerAddress = accounts[4];
      const workerReport = JSON.stringify(testParameters.report);// "0x123456";
      const secretContractAddress1 = web3.utils.randomHex(32); // accounts[5];
      const secretContractAddress2 = web3.utils.randomHex(32); // accounts[4];
      const codeHash = web3.utils.sha3(JSON.stringify(testParameters.bytecode));

      await api.register(workerEnclaveSigningAddress, workerReport, {from: workerAddress});

      await api.login({from: workerAddress});

      await api.deploySecretContract(secretContractAddress1, codeHash, workerAddress, workerEnclaveSigningAddress, {from: workerAddress});
      await api.deploySecretContract(secretContractAddress2, codeHash, workerAddress, workerEnclaveSigningAddress, {from: workerAddress});

      const taskId1 = web3.utils.randomHex(32);
      const taskFee1 = 5;
      const taskSenderAddress1 = accounts[9];

      const taskId2 = web3.utils.randomHex(32);
      const taskFee2 = 19;
      const taskId3 = web3.utils.randomHex(32);
      const taskFee3 = 58;
      const taskId4 = web3.utils.randomHex(32);
      const taskFee4 = 580;

      await api.createTaskRecord(taskId1, taskFee1, {from: taskSenderAddress1});

      await api.createTaskRecords([taskId2, taskId3], [taskFee2, taskFee3], {from: workerAddress});

      await api.createTaskRecord(taskId4, taskFee4, {from: workerAddress});

      const stateDeltaHash0 = '0x0000000000000000000000000000000000000000000000000000000000000000';
      const stateDeltaHash1 = web3.utils.randomHex(32);
      const stateDeltaHash2 = web3.utils.randomHex(32);
      const stateDeltaHash3 = web3.utils.randomHex(32);
      const stateDeltaHash4 = web3.utils.randomHex(32);
      const ethCall = web3.utils.randomHex(32);

      await api.commitReceipt(secretContractAddress1, taskId1, stateDeltaHash0, stateDeltaHash1,
          ethCall, workerEnclaveSigningAddress, {from: workerAddress});

      await api.commitReceipts(secretContractAddress1, [taskId2, taskId3], [stateDeltaHash1, stateDeltaHash2], [stateDeltaHash2, stateDeltaHash3],
          ethCall, workerEnclaveSigningAddress, {from: workerAddress});

      await api.commitReceipt(secretContractAddress2, taskId4, stateDeltaHash0, stateDeltaHash4,
          ethCall, workerEnclaveSigningAddress, {from: workerAddress});

      StateSync.getRemoteMissingStates(api, [], (err, results)=>{
        // DONE results == [{address, deltas : [deltaHash, index]}]
        assert.strictEqual(results.length, 2);

        assert.strictEqual(results[0].address, secretContractAddress1.slice(2, secretContractAddress1.length));
        assert.strictEqual(results[0].deltas[0].index, 0);
        assert.strictEqual(results[0].deltas[0].deltaHash, stateDeltaHash1);
        assert.strictEqual(results[0].deltas[1].index, 1);
        assert.strictEqual(results[0].deltas[1].deltaHash, stateDeltaHash2);
        assert.strictEqual(results[0].deltas[2].index, 2);
        assert.strictEqual(results[0].deltas[2].deltaHash, stateDeltaHash3);
        assert.strictEqual(results[0].deltas.length, 3);

        assert.strictEqual(results[0].bytecodeHash, codeHash,'the bytecode is not equal to the codeHash');

        assert.strictEqual(results[1].address, secretContractAddress2.slice(2, secretContractAddress2.length));
        assert.strictEqual(results[1].deltas[0].index, 0);
        assert.strictEqual(results[1].deltas[0].deltaHash, stateDeltaHash4);
        assert.strictEqual(results[1].deltas.length, 1);
        assert.strictEqual(results[1].bytecodeHash, codeHash);

        api.unsubscribeAll();
        resolve();

      });
    });
  });

  it('State sync - partial local tips', async function() {
    const tree = TEST_TREE.ethereum;
    if (!tree['all'] || !tree['#4']) {
      await envInitializer.disconnect(web3); // due to: https://github.com/mochajs/mocha/issues/2546
      this.skip();
    }

    return new Promise(async function(resolve) {
      const accounts = await web3.eth.getAccounts();
      const workerEnclaveSigningAddress = accounts[3];
      const workerAddress = accounts[4];
      const workerReport = JSON.stringify(testParameters.report);// "0x123456";
      const secretContractAddress1 = web3.utils.randomHex(32);// accounts[5];
      const secretContractAddress2 = web3.utils.randomHex(32); // accounts[4];
      const codeHash1 = web3.utils.sha3(JSON.stringify(testParameters.bytecode));
      const codeHash2 = web3.utils.sha3(web3.utils.randomHex(32));

      await api.register(workerEnclaveSigningAddress, workerReport, {from: workerAddress});

      await api.login({from: workerAddress});

      await api.deploySecretContract(secretContractAddress1, codeHash1, workerAddress, workerEnclaveSigningAddress, {from: workerAddress});
      await api.deploySecretContract(secretContractAddress2, codeHash2, workerAddress, workerEnclaveSigningAddress, {from: workerAddress});

      const taskId1 = web3.utils.randomHex(32);
      const taskFee1 = 5;
      const taskSenderAddress1 = accounts[9];

      const taskId2 = web3.utils.randomHex(32);
      const taskFee2 = 19;
      const taskId3 = web3.utils.randomHex(32);
      const taskFee3 = 58;
      const taskId4 = web3.utils.randomHex(32);
      const taskFee4 = 580;

      await api.createTaskRecord(taskId1, taskFee1, {from: taskSenderAddress1});

      await api.createTaskRecords([taskId2, taskId3], [taskFee2, taskFee3], {from: workerAddress});

      await api.createTaskRecord(taskId4, taskFee4, {from: workerAddress});

      const stateDeltaHash0 = '0x0000000000000000000000000000000000000000000000000000000000000000';
      const stateDeltaHash1 = web3.utils.randomHex(32);
      const stateDeltaHash2 = web3.utils.randomHex(32);
      const stateDeltaHash3 = web3.utils.randomHex(32);
      const stateDeltaHash4 = web3.utils.randomHex(32);
      const ethCall = web3.utils.randomHex(32);

      await api.commitReceipt(secretContractAddress1, taskId1, stateDeltaHash0, stateDeltaHash1,
          ethCall, workerEnclaveSigningAddress, {from: workerAddress});

      await api.commitReceipts(secretContractAddress1, [taskId2, taskId3], [stateDeltaHash1, stateDeltaHash2], [stateDeltaHash2, stateDeltaHash3],
          ethCall, workerEnclaveSigningAddress, {from: workerAddress});

      await api.commitReceipt(secretContractAddress2, taskId4, stateDeltaHash0, stateDeltaHash4,
          ethCall, workerEnclaveSigningAddress, {from: workerAddress});

      StateSync.getRemoteMissingStates(api, [{address: secretContractAddress1, key: 0}], (err, results)=>{
        // DONE results == [{address, deltas : [deltaHash, index]}]
        assert.strictEqual(results.length, 2);

        assert.strictEqual(results[0].address, secretContractAddress1.slice(2, secretContractAddress1.length));
        assert.strictEqual(results[0].deltas[0].index, 1);
        assert.strictEqual(results[0].deltas[0].deltaHash, stateDeltaHash2);
        assert.strictEqual(results[0].deltas[1].index, 2);
        assert.strictEqual(results[0].deltas[1].deltaHash, stateDeltaHash3);
        assert.strictEqual(results[0].deltas.length, 2);
        assert.strictEqual('bytecodeHash' in results[0], false);

        assert.strictEqual(results[1].address, secretContractAddress2.slice(2, secretContractAddress2.length));
        assert.strictEqual(results[1].deltas[0].index, 0);
        assert.strictEqual(results[1].deltas[0].deltaHash, stateDeltaHash4);
        assert.strictEqual(results[1].deltas.length, 1);
        assert.strictEqual(results[1].bytecodeHash, codeHash2);

        api.unsubscribeAll();
        resolve();
      });
    });
  });

  it('State sync - partial local tips 2', async function() {
    const tree = TEST_TREE.ethereum;
    if (!tree['all'] || !tree['#5']) {
      await envInitializer.disconnect(web3); // due to: https://github.com/mochajs/mocha/issues/2546
      this.skip();
    }

    return new Promise(async function(resolve) {
      const accounts = await web3.eth.getAccounts();
      const workerEnclaveSigningAddress = accounts[3];
      const workerAddress = accounts[4];
      const workerReport = JSON.stringify(testParameters.report);// "0x123456";
      const secretContractAddress1 = web3.utils.randomHex(32); // accounts[5];
      const secretContractAddress2 = web3.utils.randomHex(32); // accounts[4];
      const codeHash = web3.utils.sha3(JSON.stringify(testParameters.bytecode));

      await api.register(workerEnclaveSigningAddress, workerReport, {from: workerAddress});

      await api.login({from: workerAddress});

      await api.deploySecretContract(secretContractAddress1, codeHash, workerAddress, workerEnclaveSigningAddress, {from: workerAddress});
      await api.deploySecretContract(secretContractAddress2, codeHash, workerAddress, workerEnclaveSigningAddress, {from: workerAddress});

      const taskId1 = web3.utils.randomHex(32);
      const taskFee1 = 5;
      const taskSenderAddress1 = accounts[9];

      const taskId2 = web3.utils.randomHex(32);
      const taskFee2 = 19;
      const taskId3 = web3.utils.randomHex(32);
      const taskFee3 = 58;
      const taskId4 = web3.utils.randomHex(32);
      const taskFee4 = 580;

      await api.createTaskRecord(taskId1, taskFee1, {from: taskSenderAddress1});

      await api.createTaskRecords([taskId2, taskId3], [taskFee2, taskFee3], {from: workerAddress});

      await api.createTaskRecord(taskId4, taskFee4, {from: workerAddress});

      const stateDeltaHash0 = '0x0000000000000000000000000000000000000000000000000000000000000000';
      const stateDeltaHash1 = web3.utils.randomHex(32);
      const stateDeltaHash2 = web3.utils.randomHex(32);
      const stateDeltaHash3 = web3.utils.randomHex(32);
      const stateDeltaHash4 = web3.utils.randomHex(32);
      const ethCall = web3.utils.randomHex(32);

      await api.commitReceipt(secretContractAddress1, taskId1, stateDeltaHash0, stateDeltaHash1,
          ethCall, workerEnclaveSigningAddress, {from: workerAddress});

      await api.commitReceipts(secretContractAddress1, [taskId2, taskId3], [stateDeltaHash1, stateDeltaHash2], [stateDeltaHash2, stateDeltaHash3],
          ethCall, workerEnclaveSigningAddress, {from: workerAddress});

      await api.commitReceipt(secretContractAddress2, taskId4, stateDeltaHash0, stateDeltaHash4,
          ethCall, workerEnclaveSigningAddress, {from: workerAddress});

      StateSync.getRemoteMissingStates(api, [{address: secretContractAddress1, key: 0}, {address: secretContractAddress2, key: 0}], (err, results)=>{
        // DONE results == [{address, deltas : [deltaHash, index]}]
        assert.strictEqual(results.length, 1);

        assert.strictEqual(results[0].address, secretContractAddress1.slice(2, secretContractAddress1.length));
        assert.strictEqual(results[0].deltas[0].index, 1);
        assert.strictEqual(results[0].deltas[0].deltaHash, stateDeltaHash2);
        assert.strictEqual(results[0].deltas[1].index, 2);
        assert.strictEqual(results[0].deltas[1].deltaHash, stateDeltaHash3);
        assert.strictEqual(results[0].deltas.length, 2);
        assert.strictEqual('bytecodeHash' in results[0], false);

        api.unsubscribeAll();
        resolve();
      });
    });
  });

  it('State sync - full local tips', async function() {
    const tree = TEST_TREE.ethereum;
    if (!tree['all'] || !tree['#6']) {
      await envInitializer.disconnect(web3); // due to: https://github.com/mochajs/mocha/issues/2546
      this.skip();
    }

    return new Promise(async function(resolve) {
      const accounts = await web3.eth.getAccounts();
      const workerEnclaveSigningAddress = accounts[3];
      const workerAddress = accounts[4];
      const workerReport = JSON.stringify(testParameters.report);// "0x123456";
      const secretContractAddress1 = web3.utils.randomHex(32);// accounts[5];
      const secretContractAddress2 = web3.utils.randomHex(32);// accounts[4];
      const codeHash = web3.utils.sha3(JSON.stringify(testParameters.bytecode));

      await api.register(workerEnclaveSigningAddress, workerReport, {from: workerAddress});

      await api.login({from: workerAddress});

      await api.deploySecretContract(secretContractAddress1, codeHash, workerAddress, workerEnclaveSigningAddress, {from: workerAddress});
      await api.deploySecretContract(secretContractAddress2, codeHash, workerAddress, workerEnclaveSigningAddress, {from: workerAddress});

      const taskId1 = web3.utils.randomHex(32);
      const taskFee1 = 5;
      const taskSenderAddress1 = accounts[9];

      const taskId2 = web3.utils.randomHex(32);
      const taskFee2 = 19;
      const taskId3 = web3.utils.randomHex(32);
      const taskFee3 = 58;
      const taskId4 = web3.utils.randomHex(32);
      const taskFee4 = 580;

      await api.createTaskRecord(taskId1, taskFee1, {from: taskSenderAddress1});

      await api.createTaskRecords([taskId2, taskId3], [taskFee2, taskFee3], {from: workerAddress});

      await api.createTaskRecord(taskId4, taskFee4, {from: workerAddress});

      const stateDeltaHash0 = '0x0000000000000000000000000000000000000000000000000000000000000000';
      const stateDeltaHash1 = web3.utils.randomHex(32);
      const stateDeltaHash2 = web3.utils.randomHex(32);
      const stateDeltaHash3 = web3.utils.randomHex(32);
      const stateDeltaHash4 = web3.utils.randomHex(32);
      const ethCall = web3.utils.randomHex(32);

      await api.commitReceipt(secretContractAddress1, taskId1, stateDeltaHash0, stateDeltaHash1,
          ethCall, workerEnclaveSigningAddress, {from: workerAddress});

      await api.commitReceipts(secretContractAddress1, [taskId2, taskId3], [stateDeltaHash1, stateDeltaHash2], [stateDeltaHash2, stateDeltaHash3],
          ethCall, workerEnclaveSigningAddress, {from: workerAddress});

      await api.commitReceipt(secretContractAddress2, taskId4, stateDeltaHash0, stateDeltaHash4,
          ethCall, workerEnclaveSigningAddress, {from: workerAddress});

      StateSync.getRemoteMissingStates(api, [{address: secretContractAddress1, key: 2}, {address: secretContractAddress2, key: 0}], (err, results)=>{
        // DONE results == [{address, deltas : [deltaHash, index]}]
        assert.strictEqual(results.length, 0);

        api.unsubscribeAll();
        resolve();
      });
    });
  });

  it('State sync - failure', async function() {
    const tree = TEST_TREE.ethereum;
    if (!tree['all'] || !tree['#7']) {
      await envInitializer.disconnect(web3); // due to: https://github.com/mochajs/mocha/issues/2546
      this.skip();
    }

    return new Promise(async function(resolve) {
      await envInitializer.disconnect(web3);

      StateSync.getRemoteMissingStates(api, [], (err, results)=>{
        assert.notStrictEqual(err, null);
        resolve();
      });
    });
  });

  it('Test ethereum services ', async function() {
    const tree = TEST_TREE.ethereum;
    if (!tree['all'] || !tree['#8']) {
      await envInitializer.disconnect(web3); // due to: https://github.com/mochajs/mocha/issues/2546
      this.skip();
    }

    return new Promise(async function(resolve) {
      const config = {enigmaContractAddress: enigmaContractAddress, enigmaContractABI: enigmaContractABI};
      const builder = new EnigmaContractAPIBuilder();
      res = await builder.useDeployed(config).build();

      const api2 = res.api;
      const web3_2 = api.w3();

      const services = new EthereumServices(api2);

      const accounts = await web3_2.eth.getAccounts();
      const workerEnclaveSigningAddress = accounts[3];
      const workerAddress = accounts[4];
      const workerReport = JSON.stringify(testParameters.report);// "0x123456";
      const secretContractAddress = web3.utils.randomHex(32); // accounts[5];
      const codeHash = web3_2.utils.sha3(JSON.stringify(testParameters.bytecode));

      await api2.register(workerEnclaveSigningAddress, workerReport, {from: workerAddress});
      // Login the worker before commmitting receipts
      await api2.login({from: workerAddress});

      await api2.deploySecretContract(secretContractAddress, codeHash, workerAddress, workerEnclaveSigningAddress, {from: workerAddress});

      const taskId1 = web3_2.utils.randomHex(32);
      const taskFee1 = 5;
      const taskSenderAddress1 = accounts[9];

      const taskId2 = web3_2.utils.randomHex(32);
      const taskFee2 = 19;
      const taskId3 = web3_2.utils.randomHex(32);
      const taskFee3 = 58;

      let taskIndex = 0;

      services.initServices(['TaskCreation', 'TaskSubmission']);

      services.on('TaskCreation', (err, result)=> {
        if (taskIndex === 0) {
          assert.strictEqual(result.taskId, taskId1);
          assert.strictEqual(result.fee, taskFee1);
          assert.strictEqual(result.senderAddress, taskSenderAddress1);

          taskIndex += 1;
        } else if (taskIndex === 1) {
          assert.strictEqual(result.taskIds[0], taskId2);
          assert.strictEqual(result.taskIds[1], taskId3);
          assert.strictEqual(result.taskIds.length, 2);

          assert.strictEqual(result.fees[0], taskFee2);
          assert.strictEqual(result.fees[1], taskFee3);
          assert.strictEqual(result.fees.length, 2);

          assert.strictEqual(result.senderAddress, workerAddress);
        }
      });

      await api2.createTaskRecord(taskId1, taskFee1, {from: taskSenderAddress1});
      await api2.createTaskRecords([taskId2, taskId3], [taskFee2, taskFee3], {from: workerAddress});

      const stateDeltaHash0 = '0x0000000000000000000000000000000000000000000000000000000000000000';
      const stateDeltaHash1 = web3_2.utils.randomHex(32);
      const stateDeltaHash2 = web3_2.utils.randomHex(32);
      const stateDeltaHash3 = web3_2.utils.randomHex(32);
      const ethCall = web3_2.utils.randomHex(32);

      const recieptIndex = 0;

      services.on('TaskSubmission', (err, result)=> {
        if (recieptIndex === 0) {
          assert.strictEqual(result.taskId, taskId1);
          assert.strictEqual(result.inStateDeltaHash, stateDeltaHash0);
          assert.strictEqual(result.outStateDeltaHash, stateDeltaHash1);
          assert.strictEqual(result.ethCall, ethCall);
          assert.strictEqual(result.signature, workerEnclaveSigningAddress);

          taskIndex += 1;
        } else if (recieptIndex === 1) {
          assert.strictEqual(result.taskIds[0], taskId2);
          assert.strictEqual(result.taskIds[1], taskId3);
          assert.strictEqual(result.inStateDeltaHashes[0], stateDeltaHash1);
          assert.strictEqual(result.inStateDeltaHashes[1], stateDeltaHash2);
          assert.strictEqual(result.outStateDeltaHashes[0], stateDeltaHash2);
          assert.strictEqual(result.outStateDeltaHashes[1], stateDeltaHash3);
          assert.strictEqual(result.ethCall, ethCall);
          assert.strictEqual(result.signature, workerEnclaveSigningAddress);
        }
      });

      await api2.commitReceipt(secretContractAddress, taskId1, stateDeltaHash0, stateDeltaHash1,
          ethCall, workerEnclaveSigningAddress, {from: workerAddress});

      await api2.commitReceipts(secretContractAddress, [taskId2, taskId3], [stateDeltaHash1, stateDeltaHash2], [stateDeltaHash2, stateDeltaHash3],
          ethCall, workerEnclaveSigningAddress, {from: workerAddress});

      api2.unsubscribeAll();

      await res.environment.destroy();

      resolve();
    });
  });
});
