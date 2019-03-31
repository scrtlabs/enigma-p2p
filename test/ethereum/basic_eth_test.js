const path = require('path');
const assert = require('assert');
const TEST_TREE = require(path.join(__dirname, '../test_tree')).TEST_TREE;
const EnigmaContractAPIBuilder = require(path.join(__dirname, '../../src/ethereum/EnigmaContractAPIBuilder'));
const EthereumServices = require(path.join(__dirname, '../../src/ethereum/EthereumServices'));

const StateSync = require(path.join(__dirname, '../../src/ethereum/StateSync'));

const testParameters = require('./test_parameters.json');
const Logger = require('../../src/common/logger');

describe('Ethereum tests', function() {
  function eventSubscribe(api, eventName, filter, callback) {
    api.subscribe(eventName, filter, callback);
  }

  function getEventRecievedFunc(eventName, resolve) {
    return (err, event)=> {
      resolve(event);
    };
  }

  it('Register a worker, deposit, withdraw and deploy a secret contract using the BUILDER ', async function() {
    const tree = TEST_TREE.ethereum;
    if (!tree['all'] || !tree['#1']) {
      this.skip();
    }
    return new Promise(async function(resolve) {
      const builder = new EnigmaContractAPIBuilder();
      const res = await builder.createNetwork().deploy().build();
      const api = res.api;
      const web3 = api.w3();

      const accounts = await api.w3().eth.getAccounts();
      const workerEnclaveSigningAddress = accounts[3];
      const workerAddress = accounts[4];
      const workerReport = JSON.stringify(testParameters.report);// "0x123456";
      const depositValue = 1000;
      const secretContractAddress = api.w3().utils.randomHex(32); // accounts[5];
      const secretContractAddress2 = api.w3().utils.randomHex(32); // accounts[6];
      const codeHash = web3.utils.sha3(JSON.stringify(testParameters.bytecode));
      const signature = api.w3().utils.randomHex(32);
      const initStateDeltaHash = api.w3().utils.randomHex(32);
      const gasUsed = 10;
      const zeroAddress = '0x0000000000000000000000000000000000000000';

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

      eventSubscribe(api, 'WithdrawSuccessful', {}, getEventRecievedFunc('WithdrawSuccessful',
          (result)=> {
            assert.strictEqual(result.to, workerAddress);
            assert.strictEqual(result.value, depositValue);
          }));

      await api.register(workerEnclaveSigningAddress, workerReport, signature, {from: workerAddress});
      await api.deposit(workerAddress, depositValue, {from: workerAddress});
      await api.login({from: workerAddress});

      // Verify worker's report
      const result = await api.getReport(workerAddress);
      assert.strictEqual(result.report, workerReport);

      // Verify the number of secret-accounts before deploying one
      const countBefore = await api.countSecretContracts();
      assert.strictEqual(countBefore, 0);

      await api.deploySecretContract(secretContractAddress, codeHash, codeHash, initStateDeltaHash, "0x00", zeroAddress, gasUsed, workerEnclaveSigningAddress, {from: workerAddress});

      // Verify the number of secret-accounts after deploying one
      const countAfter = await api.countSecretContracts();
      assert.strictEqual(countAfter, 1);

      let observedCodeHash = await api.getContractParams(secretContractAddress);
      observedCodeHash = observedCodeHash.codeHash;
      assert.strictEqual(observedCodeHash, codeHash);

      const observedAddresses = await api.getSecretContractAddresses(0, 1);
      assert.strictEqual(observedAddresses[0], secretContractAddress);

      api.unsubscribeAll();

      await api.deploySecretContract(secretContractAddress2, codeHash, codeHash, initStateDeltaHash, "0x00", zeroAddress, gasUsed, workerEnclaveSigningAddress, {from: workerAddress});

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

      await api.logout({from: workerAddress});
      await api.withdraw(workerAddress, depositValue/10, {from: workerAddress});

      await res.environment.destroy();
      resolve();
    }).catch(console.log);
  });

  it('Register, login, deploy secret contract, create tasks and commit receipts/failure using the BUILDER ', async function() {
    const tree = TEST_TREE.ethereum;
    if (!tree['all'] || !tree['#2']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      const builder1 = new EnigmaContractAPIBuilder();
      let res1 = await builder1.createNetwork().deploy().build();

      const config = {enigmaContractAddress: builder1.enigmaContractAddress, enigmaContractABI: builder1.enigmaContractABI};
      const builder2 = new EnigmaContractAPIBuilder();
      let res2 = await builder2.useDeployed(config).build();

      const api = res2.api;
      const web3 = api.w3();

      const accounts = await web3.eth.getAccounts();
      const workerEnclaveSigningAddress = accounts[3];
      const workerAddress = accounts[4];
      const workerReport = JSON.stringify(testParameters.report);// "0x123456";
      const secretContractAddress = web3.utils.randomHex(32);// accounts[5];
      const codeHash = web3.utils.sha3(JSON.stringify(testParameters.bytecode));
      const signature = web3.utils.randomHex(32);
      const initStateDeltaHash = web3.utils.randomHex(32);
      const gasUsed = 10;
      const depositValue = 1000;
      const optionalEthereumData = '0x00';
      const optionalEthereumContractAddress = '0x0000000000000000000000000000000000000000';

      await api.register(workerEnclaveSigningAddress, workerReport, signature, {from: workerAddress});
      await api.deposit(workerAddress, depositValue, {from: workerAddress});
      await api.login({from: workerAddress});

      await api.deploySecretContract(secretContractAddress, codeHash, codeHash, initStateDeltaHash, optionalEthereumData,
        optionalEthereumContractAddress, gasUsed, workerEnclaveSigningAddress, {from: workerAddress});


      let contractParams = await api.getContractParams(secretContractAddress);
      //assert.strictEqual(contractParams.owner, workerAddress);
      assert.strictEqual(contractParams.preCodeHash, codeHash);
      assert.strictEqual(contractParams.codeHash, codeHash);
      assert.strictEqual(contractParams.deltaHashes.length, 1);
      assert.strictEqual(contractParams.deltaHashes[0], initStateDeltaHash);
      assert.strictEqual(contractParams.status, 1);

      const taskId1 = web3.utils.randomHex(32);
      const taskId2 = web3.utils.randomHex(32);
      const taskId3 = web3.utils.randomHex(32);
      const taskId4 = web3.utils.randomHex(32);

      //
      // eventSubscribe(api2, 'TaskRecordsCreated', {}, getEventRecievedFunc('TaskRecordsCreated',
      //     (result)=> {
      //       assert.strictEqual(result.taskIds[0], taskId2);
      //       assert.strictEqual(result.taskIds[1], taskId3);
      //       assert.strictEqual(result.taskIds.length, 2);
      //
      //       assert.strictEqual(result.fees[0], taskFee2);
      //       assert.strictEqual(result.fees[1], taskFee3);
      //       assert.strictEqual(result.fees.length, 2);
      //
      //       assert.strictEqual(result.senderAddress, workerAddress);
      //     }));

      // await api2.createTaskRecord(taskId1, taskFee1, {from: taskSenderAddress1});
      //
      // await api2.createTaskRecords([taskId2, taskId3], [taskFee2, taskFee3], {from: workerAddress});


      const inputsHash = web3.utils.randomHex(32);
      const gasLimit = 7;
      const gasPrice = 10;
      const firstBlockNumber = 17;
      const nonce = 0;

      const mock_taskId ="0xf29647ec8920b552fa96de8cc3129b5ba70471b190c8ec5a4793467f12ad84e9";

      eventSubscribe(api, 'TaskRecordCreated', {}, getEventRecievedFunc('TaskRecordCreated',
        (result)=> {
          assert.strictEqual(result.taskId, mock_taskId);
          assert.strictEqual(result.gasLimit, gasLimit);
          assert.strictEqual(result.gasPrice, gasPrice);
          assert.strictEqual(result.senderAddress, workerAddress);
        }));

      await api.createDeploymentTaskRecord(inputsHash, gasLimit, gasPrice, firstBlockNumber, nonce, {from: workerAddress});

      const taskParams = await api.getTaskParams(mock_taskId);
      assert.strictEqual(inputsHash, taskParams.inputsHash);
      assert.strictEqual(gasLimit, taskParams.gasLimit);
      assert.strictEqual(gasPrice, taskParams.gasPrice);
      assert.strictEqual(workerAddress, taskParams.senderAddress);
      //assert.strictEqual(8, taskParams.blockNumber);
      assert.strictEqual(1, taskParams.status);

      const stateDeltaHash1 = web3.utils.randomHex(32);
      const stateDeltaHash2 = web3.utils.randomHex(32);
      const stateDeltaHash3 = web3.utils.randomHex(32);
      const outputHash1 = web3.utils.randomHex(32);
      const outputHash2 = web3.utils.randomHex(32);
      const outputHash3 = web3.utils.randomHex(32);

      eventSubscribe(api, 'ReceiptVerified', {}, getEventRecievedFunc('ReceiptVerified',
          (result)=> {
            assert.strictEqual(result.taskId, taskId1);
            assert.strictEqual(result.stateDeltaHash, stateDeltaHash1);
            assert.strictEqual(result.outputHash, outputHash1);
            assert.strictEqual(result.optionalEthereumData, optionalEthereumData);
            assert.strictEqual(result.optionalEthereumContractAddress, optionalEthereumContractAddress);
            assert.strictEqual(result.signature, signature);
          }));

      eventSubscribe(api, 'ReceiptsVerified', {}, getEventRecievedFunc('ReceiptsVerified',
          (result)=> {
            assert.strictEqual(result.taskIds[0], taskId2);
            assert.strictEqual(result.taskIds[1], taskId3);
            assert.strictEqual(result.outputHashes.length, 2);
            assert.strictEqual(result.outputHashes[0], outputHash2);
            assert.strictEqual(result.outputHashes[1], outputHash3);
            assert.strictEqual(result.stateDeltaHashes.length, 2);
            assert.strictEqual(result.stateDeltaHashes[0], stateDeltaHash2);
            assert.strictEqual(result.stateDeltaHashes[1], stateDeltaHash3);
            assert.strictEqual(result.optionalEthereumData, optionalEthereumData);
            assert.strictEqual(result.optionalEthereumContractAddress, optionalEthereumContractAddress);
            assert.strictEqual(result.signature, signature);
          }));

      eventSubscribe(api, 'ReceiptFailed', {}, getEventRecievedFunc('ReceiptFailed',
          (result)=> {
            assert.strictEqual(result.taskId, taskId4);
            assert.strictEqual(result.signature, signature);
          }));


      // Login the worker before commmitting receipts
      await api.commitReceipt(secretContractAddress, taskId1, stateDeltaHash1, outputHash1,
        optionalEthereumData, optionalEthereumContractAddress, gasUsed, signature, {from: workerAddress});


      await api.commitReceipts(secretContractAddress, [taskId2, taskId3], [stateDeltaHash2, stateDeltaHash3],
        [outputHash2, outputHash3], optionalEthereumData, optionalEthereumContractAddress, [gasUsed, gasUsed], signature, {from: workerAddress});

      await api.commitTaskFailure(secretContractAddress, taskId4, gasUsed, signature, {from: workerAddress});

      api.unsubscribeAll();
      await api.logout({from: workerAddress});
      await res2.environment.destroy();
      await res1.environment.destroy();
      resolve();
    });
  });

  it('State sync: empty local tips, partial local tips, partial local tips 2, full local tips', async function() {
    const tree = TEST_TREE.ethereum;
    if (!tree['all'] || !tree['#3']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      const builder = new EnigmaContractAPIBuilder();
      let res = await builder.createNetwork().deploy().build();
      const api = res.api;
      const web3 = api.w3();

      const accounts = await web3.eth.getAccounts();
      const workerEnclaveSigningAddress = accounts[3];
      const workerAddress = accounts[4];
      const workerReport = JSON.stringify(testParameters.report);// "0x123456";
      const secretContractAddress1 = web3.utils.randomHex(32); // accounts[5];
      const secretContractAddress2 = web3.utils.randomHex(32); // accounts[4];
      const codeHash = web3.utils.sha3(JSON.stringify(testParameters.bytecode));
      const codeHash2 = web3.utils.sha3(web3.utils.randomHex(32));
      const signature = api.w3().utils.randomHex(32);
      const initStateDeltaHash = api.w3().utils.randomHex(32);
      const gasUsed = 10;
      const depositValue = 1000;
      const optionalEthereumData = '0x00';
      const optionalEthereumContractAddress = '0x0000000000000000000000000000000000000000';

      await api.register(workerEnclaveSigningAddress, workerReport, signature, {from: workerAddress});
      await api.deposit(workerAddress, depositValue, {from: workerAddress});
      await api.login({from: workerAddress});

      await api.deploySecretContract(secretContractAddress1, codeHash, codeHash, initStateDeltaHash, optionalEthereumData,
        optionalEthereumContractAddress, gasUsed, workerEnclaveSigningAddress, {from: workerAddress});
      await api.deploySecretContract(secretContractAddress2, codeHash2, codeHash2, initStateDeltaHash, optionalEthereumData,
        optionalEthereumContractAddress, gasUsed, workerEnclaveSigningAddress, {from: workerAddress});

      const taskId1 = web3.utils.randomHex(32);
      const taskId2 = web3.utils.randomHex(32);
      const taskId3 = web3.utils.randomHex(32);
      const taskId4 = web3.utils.randomHex(32);

      // await api.createTaskRecord(taskId1, taskFee1, {from: taskSenderAddress1});
      //
      // await api.createTaskRecords([taskId2, taskId3], [taskFee2, taskFee3], {from: workerAddress});
      //
      // await api.createTaskRecord(taskId4, taskFee4, {from: workerAddress});

      const stateDeltaHash1 = web3.utils.randomHex(32);
      const stateDeltaHash2 = web3.utils.randomHex(32);
      const stateDeltaHash3 = web3.utils.randomHex(32);
      const stateDeltaHash4 = web3.utils.randomHex(32);
      const outputHash1 = web3.utils.randomHex(32);
      const outputHash2 = web3.utils.randomHex(32);
      const outputHash3 = web3.utils.randomHex(32);
      const outputHash4 = web3.utils.randomHex(32);

      const logger = new Logger();

      await api.commitReceipt(secretContractAddress1, taskId1, stateDeltaHash1, outputHash1, optionalEthereumData, optionalEthereumContractAddress,
        gasUsed, signature, {from: workerAddress});

      await api.commitReceipts(secretContractAddress1, [taskId2, taskId3], [stateDeltaHash2, stateDeltaHash3],
        [outputHash2, outputHash3],
        optionalEthereumData, optionalEthereumContractAddress, [gasUsed, gasUsed], signature, {from: workerAddress});

      await api.commitReceipt(secretContractAddress2, taskId4, stateDeltaHash4, outputHash4, optionalEthereumData, optionalEthereumContractAddress, gasUsed,
        signature, {from: workerAddress});

      StateSync.getRemoteMissingStates(api, [], logger, (err, results)=>{
        // DONE results == [{address, deltas : [deltaHash, index]}]
        assert.strictEqual(results.length, 2);

        assert.strictEqual(results[0].address, secretContractAddress1.slice(2, secretContractAddress1.length));
        assert.strictEqual(results[0].deltas[0].index, 0);
        assert.strictEqual(results[0].deltas[0].deltaHash, initStateDeltaHash);
        assert.strictEqual(results[0].deltas[1].index, 1);
        assert.strictEqual(results[0].deltas[1].deltaHash, stateDeltaHash1);
        assert.strictEqual(results[0].deltas[2].index, 2);
        assert.strictEqual(results[0].deltas[2].deltaHash, stateDeltaHash2);
        assert.strictEqual(results[0].deltas[3].index, 3);
        assert.strictEqual(results[0].deltas[3].deltaHash, stateDeltaHash3);
        assert.strictEqual(results[0].deltas.length, 4);
        assert.strictEqual(results[0].bytecodeHash, codeHash, 'the bytecode is not equal to the codeHash');

        assert.strictEqual(results[1].address, secretContractAddress2.slice(2, secretContractAddress2.length));
        assert.strictEqual(results[1].deltas[0].index, 0);
        assert.strictEqual(results[1].deltas[0].deltaHash, initStateDeltaHash);
        assert.strictEqual(results[1].deltas[1].index, 1);
        assert.strictEqual(results[1].deltas[1].deltaHash, stateDeltaHash4);
        assert.strictEqual(results[1].deltas.length, 2);
        assert.strictEqual(results[1].bytecodeHash, codeHash2);

        StateSync.getRemoteMissingStates(api, [{address: secretContractAddress1, key: 0}], logger, (err, results)=>{
          // DONE results == [{address, deltas : [deltaHash, index]}]
          assert.strictEqual(results.length, 2);

          assert.strictEqual(results[0].address, secretContractAddress1.slice(2, secretContractAddress1.length));
          assert.strictEqual(results[0].deltas[0].index, 1);
          assert.strictEqual(results[0].deltas[0].deltaHash, stateDeltaHash1);
          assert.strictEqual(results[0].deltas[1].index, 2);
          assert.strictEqual(results[0].deltas[1].deltaHash, stateDeltaHash2);
          assert.strictEqual(results[0].deltas[2].index, 3);
          assert.strictEqual(results[0].deltas[2].deltaHash, stateDeltaHash3);
          assert.strictEqual(results[0].deltas.length, 3);
          assert.strictEqual('bytecodeHash' in results[0], false);

          assert.strictEqual(results[1].address, secretContractAddress2.slice(2, secretContractAddress2.length));
          assert.strictEqual(results[1].deltas[0].index, 0);
          assert.strictEqual(results[1].deltas[0].deltaHash, initStateDeltaHash);
          assert.strictEqual(results[1].deltas[1].index, 1);
          assert.strictEqual(results[1].deltas[1].deltaHash, stateDeltaHash4);
          assert.strictEqual(results[1].deltas.length, 2);
          assert.strictEqual(results[1].bytecodeHash, codeHash2);

          StateSync.getRemoteMissingStates(api, [{address: secretContractAddress1, key: 1}, {address: secretContractAddress2, key: 1}], logger, (err, results)=>{
            // DONE results == [{address, deltas : [deltaHash, index]}]
            assert.strictEqual(results.length, 1);

            assert.strictEqual(results[0].address, secretContractAddress1.slice(2, secretContractAddress1.length));
            assert.strictEqual(results[0].deltas[0].index, 2);
            assert.strictEqual(results[0].deltas[0].deltaHash, stateDeltaHash2);
            assert.strictEqual(results[0].deltas[1].index, 3);
            assert.strictEqual(results[0].deltas[1].deltaHash, stateDeltaHash3);
            assert.strictEqual(results[0].deltas.length, 2);
            assert.strictEqual('bytecodeHash' in results[0], false);

            StateSync.getRemoteMissingStates(api, [{address: secretContractAddress1, key: 3}, {address: secretContractAddress2, key: 1}], logger,
              async (err, results)=>{
              // DONE results == [{address, deltas : [deltaHash, index]}]
              assert.strictEqual(results.length, 0);

              api.unsubscribeAll();
              await res.environment.destroy();
              resolve();
            });
          });
        });
      });
    });
  });

  it('State sync - failure', async function() {
    const tree = TEST_TREE.ethereum;
    if (!tree['all'] || !tree['#4']) {
      this.skip();
    }
    const logger = new Logger();

    return new Promise(async function(resolve) {
      const builder = new EnigmaContractAPIBuilder();
      let res = await builder.createNetwork().deploy().build();
      const api = res.api;
      await res.environment.destroy();

      StateSync.getRemoteMissingStates(api, [], logger, (err, results)=>{
        assert.notStrictEqual(err, null);
        resolve();
      });
    });
  });

  it('Test Ethereum services ', async function() {
    const tree = TEST_TREE.ethereum;
    if (!tree['all'] || !tree['#5']) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      const builder = new EnigmaContractAPIBuilder();
      let res = await builder.createNetwork().deploy().build();
      const api = res.api;
      const web3 = api.w3();

      const services = new EthereumServices(api);
      const accounts = await web3.eth.getAccounts();
      const workerEnclaveSigningAddress = accounts[3];
      const workerAddress = accounts[4];
      const workerReport = JSON.stringify(testParameters.report);// "0x123456";
      const secretContractAddress = web3.utils.randomHex(32); // accounts[5];
      const codeHash = web3.utils.sha3(JSON.stringify(testParameters.bytecode));
      const signature = web3.utils.randomHex(32);
      const initStateDeltaHash = web3.utils.randomHex(32);
      const gasUsed = 10;
      const outputHash1 = web3.utils.randomHex(32);
      const outputHash2 = web3.utils.randomHex(32);
      const outputHash3 = web3.utils.randomHex(32);
      const depositValue = 1000;
      const optionalEthereumData = '0x00';
      const optionalEthereumContractAddress = '0x0000000000000000000000000000000000000000';

      await api.register(workerEnclaveSigningAddress, workerReport, signature, {from: workerAddress});
      await api.deposit(workerAddress, depositValue, {from: workerAddress});
      await api.login({from: workerAddress});

      await api.deploySecretContract(secretContractAddress, codeHash, codeHash, initStateDeltaHash, optionalEthereumData,
        optionalEthereumContractAddress, gasUsed, workerEnclaveSigningAddress, {from: workerAddress});

      const taskId1 = web3.utils.randomHex(32);

      const taskId2 = web3.utils.randomHex(32);
      const taskId3 = web3.utils.randomHex(32);

      let taskIndex = 0;

      services.initServices(['TaskCreation', 'TaskSuccessSubmission']);

      // services.on('TaskCreation', (err, result)=> {
      //   if (taskIndex === 0) {
      //     assert.strictEqual(result.taskId, taskId1);
      //     assert.strictEqual(result.fee, taskFee1);
      //     assert.strictEqual(result.senderAddress, taskSenderAddress1);
      //
      //     taskIndex += 1;
      //   } else if (taskIndex === 1) {
      //     assert.strictEqual(result.taskIds[0], taskId2);
      //     assert.strictEqual(result.taskIds[1], taskId3);
      //     assert.strictEqual(result.taskIds.length, 2);
      //
      //     assert.strictEqual(result.fees[0], taskFee2);
      //     assert.strictEqual(result.fees[1], taskFee3);
      //     assert.strictEqual(result.fees.length, 2);
      //
      //     assert.strictEqual(result.senderAddress, workerAddress);
      //   }
      // });

      // await api2.createTaskRecord(taskId1, taskFee1, {from: taskSenderAddress1});
      // await api2.createTaskRecords([taskId2, taskId3], [taskFee2, taskFee3], {from: workerAddress});

      const stateDeltaHash1 = web3.utils.randomHex(32);
      const stateDeltaHash2 = web3.utils.randomHex(32);
      const stateDeltaHash3 = web3.utils.randomHex(32);

      const recieptIndex = 0;

      services.on('TaskSuccessSubmission', (err, result)=> {
        if (recieptIndex === 0) {
          assert.strictEqual(result.taskId, taskId1);
          assert.strictEqual(result.stateDeltaHash, stateDeltaHash1);
          assert.strictEqual(result.outputHash, outputHash1);
          assert.strictEqual(result.optionalEthereumData, optionalEthereumData);
          assert.strictEqual(result.optionalEthereumContractAddress, optionalEthereumContractAddress);
          assert.strictEqual(result.signature, signature);

          taskIndex += 1;
        } else if (recieptIndex === 1) {
          assert.strictEqual(result.taskIds[0], taskId2);
          assert.strictEqual(result.taskIds[1], taskId3);
          assert.strictEqual(result.outputHashes.length, 2);
          assert.strictEqual(result.outputHashes[0], outputHash2);
          assert.strictEqual(result.outputHashes[1], outputHash3);
          assert.strictEqual(result.stateDeltaHashes.length, 2);
          assert.strictEqual(result.stateDeltaHash[0], stateDeltaHash2);
          assert.strictEqual(result.stateDeltaHash[1], stateDeltaHash3);
          assert.strictEqual(result.optionalEthereumData, optionalEthereumData);
          assert.strictEqual(result.optionalEthereumContractAddress, optionalEthereumContractAddress);
          assert.strictEqual(result.signature, signature);
        }
      });

      await api.commitReceipt(secretContractAddress, taskId1, stateDeltaHash1, outputHash1, optionalEthereumData,
        optionalEthereumContractAddress, gasUsed, signature, {from: workerAddress});

      await api.commitReceipts(secretContractAddress, [taskId2, taskId3], [stateDeltaHash2, stateDeltaHash3], [outputHash2, outputHash3],
        optionalEthereumData, optionalEthereumContractAddress,[gasUsed, gasUsed], signature, {from: workerAddress});

      api.unsubscribeAll();

      await res.environment.destroy();

      resolve();
    });
  });
});
