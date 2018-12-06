const path = require('path');
const assert = require('assert');
const TEST_TREE = require(path.join(__dirname, '../test_tree')).TEST_TREE;
const envInitializer = require('./scripts/env_initializer');
const EnigmaContractWriterAPI = require(path.join(__dirname, '../../src/ethereum/EnigmaContractWriterAPI'));
const EnigmaContractAPIBuilder = require(path.join(__dirname, '../../src/ethereum/EnigmaContractAPIBuilder'));;
const EthereumServices = require(path.join(__dirname, '../../src/ethereum/EthereumServices'));;

const StateSync = require(path.join(__dirname, '../../src/ethereum/StateSync'));

const truffleDir = path.join(__dirname, './scripts');

const testParameters = require('./test_parameters.json')

const testUtils = require('../testUtils/utils');

describe('Ethereum tests', function() {
    let web3;
    let api;
    let enigmaContractAddress;
    let enigmaContractABI;

    before(async function() {
      let tree = TEST_TREE.ethereum;
      if(!tree['all']){
        this.skip();
      }
      // runs before all tests in this block
      await envInitializer.start(truffleDir);

    });

    after(async function() {
      let tree = TEST_TREE.ethereum;
      if(!tree['all']){
        this.skip();
      }
      //runs after all tests in this block
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
    });

    afterEach(async function() {
        // runs after each test in this block
        await envInitializer.disconnect(web3);
    });

    function eventSubscribe(api, eventName, filter, callback) {
        api.subscribe(eventName, filter, callback);
        //console.log("subscribed to " + eventName);
    }

    //const util = require('util')

    //console.log(util.inspect(myObject, {showHidden: false, depth: null}))

    function getEventRecievedFunc(eventName, resolve) {
        return (err, event)=> {
            resolve(event);
        }
    }

    async function registerWorker(api, workerEnclaveSigningAddress, workerReport, workerAddress) {
        let regTx = await api.register(workerEnclaveSigningAddress, workerReport, {from : workerAddress});
        //console.log("worker " + workerAddress + " registred; reciept=" + regTx);
    }

    async function deposit(api, workerAddress, amount) {
        let reciept = await api.deposit(workerAddress, amount, {from : workerAddress});
        //console.log("worker " + workerAddress + " deposited; reciept=" + reciept);
    }

    async function deploySecretContract(api, secretContractAddress, workerEnclaveSigningAddress, codeHash, workerAddress) {
        let depTx = await api.deploySecretContract(secretContractAddress, codeHash, workerAddress, workerEnclaveSigningAddress, {from : workerAddress});
        //console.log("secret contracts " + secretContractAddress + " deployed. reciept=" + depTx);
    }

    async function createTaskRecord(api, taskId, fee, senderAddress) {
        let reciept = await api.createTaskRecord(taskId, fee, {from : senderAddress});
        //console.log("task record created. reciept=" + reciept);
    }

    async function createTaskRecords(api, taskIds, fees, senderAddress) {
        let reciept = await api.createTaskRecords(taskIds, fees, {from : senderAddress});
        //console.log("task records created. reciept=" + reciept);
    }

    async function commitReceipt(api, secretContractAddress, taskId, inStateDeltaHash, outStateDeltaHash,
        ethCall, signature, senderAddress) {
        let reciept = await api.commitReceipt(secretContractAddress, taskId, inStateDeltaHash, outStateDeltaHash,
            ethCall, signature, {from : senderAddress});
        //console.log("task records created. reciept=" + reciept);
    }

    async function commitReceipts(api, secretContractAddress, taskIds, inStateDeltaHashes, outStateDeltaHashes,
        ethCall, signature, senderAddress) {
        let reciept = await api.commitReceipts(secretContractAddress, taskIds, inStateDeltaHashes, outStateDeltaHashes,
            ethCall, signature, {from : senderAddress});
        //console.log("task records created. reciept=" + reciept);
    }

    it('Register a worker, deposit and deploy a secret contract using the BUILDER ', async function(){
        let tree = TEST_TREE.ethereum;
        if(!tree['all'] || !tree['#1']){
            await envInitializer.disconnect(web3); 
            this.skip();
        }
        return new Promise(async function (resolve) {
            await envInitializer.disconnect(web3);
            await envInitializer.stop(web3);

            await testUtils.sleep(3000);

            let builder = new EnigmaContractAPIBuilder();
            res = await builder.createNetwork().deploy().build();
            let api = res.api;
            
            const accounts = await api.w3().eth.getAccounts();
            const workerEnclaveSigningAddress = accounts[3];
            const workerAddress = accounts[4];
            const workerReport = JSON.stringify(testParameters.report);//"0x123456";
            const depositValue = 1000;
            const secretContractAddress = accounts[5];
            const secretContractAddress2 = accounts[6];
            const codeHash = web3.utils.sha3(JSON.stringify(testParameters.bytecode));

            eventSubscribe(api, "Registered", {}, getEventRecievedFunc("Registered",
                (result)=> {
                    assert.strictEqual(result.signer, workerEnclaveSigningAddress);
                    assert.strictEqual(result.workerAddress, workerAddress);
                }));

            eventSubscribe(api, "DepositSuccessful", {}, getEventRecievedFunc("DepositSuccessful",
                (result)=> {
                    assert.strictEqual(result.from, workerAddress);
                    assert.strictEqual(result.value, depositValue);
                }));

            eventSubscribe(api, "SecretContractDeployed", {}, getEventRecievedFunc("SecretContractDeployed",
                (result)=> {
                    assert.strictEqual(result.secretContractAddress, secretContractAddress);
                    assert.strictEqual(result.codeHash, codeHash);
                }));

            await registerWorker(api, workerEnclaveSigningAddress, workerReport, workerAddress);
            await deposit(api, workerAddress, depositValue);

            // Verify worker's report
            let result = await api.getReport(workerAddress);
            assert.strictEqual(result.report, workerReport);

            // Verify the number of secret-accounts before deploying one
            let countBefore = await api.countSecretContracts();
            assert.strictEqual(countBefore, 0);

            await deploySecretContract(api, secretContractAddress, workerEnclaveSigningAddress,
                codeHash, workerAddress);

            // Verify the number of secret-accounts after deploying one
            let countAfter = await api.countSecretContracts();
            assert.strictEqual(countAfter, 1);

            // Verify that the secret-accounts is deployed
            let isDeployed = await api.isDeployed(secretContractAddress);
            assert.strictEqual(isDeployed, true);

            let observedCodeHash = await api.getCodeHash(secretContractAddress);
            assert.strictEqual(observedCodeHash, codeHash);

            let observedAddresses = await api.getSecretContractAddresses(0, 1);
            assert.strictEqual(observedAddresses[0], secretContractAddress);

            api.unsubscribeAll();

            await deploySecretContract(api, secretContractAddress2, workerEnclaveSigningAddress,
                codeHash, workerAddress);

            // Verify the number of secret-accounts after deploying another one
            let observedCount = await api.countSecretContracts();
            assert.strictEqual(observedCount, 2);

            let observedAddressesArray1 = await api.getSecretContractAddresses(0, 1);
            assert.strictEqual(observedAddressesArray1[0], secretContractAddress);

            let observedAddresses2 = await api.getSecretContractAddresses(1, 2);
            assert.strictEqual(observedAddresses2[0], secretContractAddress2);

            let observedAddressesArray = await api.getSecretContractAddresses(0, 2);
            assert.strictEqual(observedAddressesArray[0], secretContractAddress);
            assert.strictEqual(observedAddressesArray[1], secretContractAddress2);
  
            await res.environment.destroy();
            await envInitializer.start(truffleDir);
            resolve();
        }).catch(console.log);
    });

    it('Register, login, deploy secret contract, create tasks and commit reciepts using the BUILDER ', async function(){
        let tree = TEST_TREE.ethereum;
        if(!tree['all'] || !tree['#2']){
            await envInitializer.disconnect(web3); //due to: https://github.com/mochajs/mocha/issues/2546
            this.skip();
        }
        
        return new Promise(async function (resolve) {
            const config = {enigmaContractAddress: enigmaContractAddress, enigmaContractABI: enigmaContractABI}
            let builder = new EnigmaContractAPIBuilder();
            res = await builder.useDeployed(config).build();

            let api2 = res.api;
            let web3_2 = api.w3();

            const accounts = await web3_2.eth.getAccounts();
            const workerEnclaveSigningAddress = accounts[3];
            const workerAddress = accounts[4];
            const workerReport = JSON.stringify(testParameters.report);//"0x123456";
            const secretContractAddress = accounts[5];
            const codeHash = web3_2.utils.sha3(JSON.stringify(testParameters.bytecode));

            await registerWorker(api2, workerEnclaveSigningAddress, workerReport, workerAddress);
            await deploySecretContract(api2, secretContractAddress, workerEnclaveSigningAddress,
                codeHash, workerAddress);

            const taskId1 = web3_2.utils.randomHex(32);
            const taskFee1 = 5;
            //const taskTokenValue1 = 10;
            //const taskTokenAddress1 = accounts[6];
            const taskSenderAddress1 = accounts[9];

            const taskId2 = web3_2.utils.randomHex(32);
            const taskFee2 = 19;
            //const taskTokenValue2 = 100;
            //const taskTokenAddress2 = accounts[7];
            const taskId3 = web3_2.utils.randomHex(32);
            const taskFee3 = 58;
            //const taskTokenValue3 = 1000;
            //const taskTokenAddress3 = accounts[8];

            eventSubscribe(api2, "TaskRecordCreated", {}, getEventRecievedFunc("TaskRecordCreated",
                (result)=> {
                    assert.strictEqual(result.taskId, taskId1);
                    assert.strictEqual(result.fee, taskFee1);
                    //assert.strictEqual(result.tokenAddress, taskTokenAddress1);
                    assert.strictEqual(result.senderAddress, taskSenderAddress1);
                    //assert.strictEqual(result.tokenValue, taskTokenValue1);
                }));

            eventSubscribe(api2, "TaskRecordsCreated", {}, getEventRecievedFunc("TaskRecordsCreated",
                (result)=> {
                    assert.strictEqual(result.taskIds[0], taskId2);
                    assert.strictEqual(result.taskIds[1], taskId3);
                    assert.strictEqual(result.taskIds.length, 2);

                    //assert.strictEqual(result.tokenValues[0], taskTokenValue2);
                    //assert.strictEqual(result.tokenValues[1], taskTokenValue3);
                    //assert.strictEqual(result.tokenValues.length, 2);

                    assert.strictEqual(result.fees[0], taskFee2);
                    assert.strictEqual(result.fees[1], taskFee3);
                    assert.strictEqual(result.fees.length, 2);

                    //assert.strictEqual(result.tokenAddresses[0], taskTokenAddress2);
                    //assert.strictEqual(result.tokenAddresses[1], taskTokenAddress3);
                    //assert.strictEqual(result.tokenAddresses.length, 2);

                    assert.strictEqual(result.senderAddress, workerAddress);
                }));


            await createTaskRecord(api2, taskId1, taskFee1, taskSenderAddress1);
            await createTaskRecords(api2, [taskId2, taskId3], [taskFee2, taskFee3], workerAddress);

            let stateDeltaHash0 = "0x0000000000000000000000000000000000000000000000000000000000000000";
            let stateDeltaHash1 = web3_2.utils.randomHex(32);
            let stateDeltaHash2 = web3_2.utils.randomHex(32);
            let stateDeltaHash3 = web3_2.utils.randomHex(32);
            let ethCall = web3_2.utils.randomHex(32);


            eventSubscribe(api2, "ReceiptVerified", {}, getEventRecievedFunc("ReceiptVerified",
                (result)=> {
                    assert.strictEqual(result.taskId, taskId1);
                    assert.strictEqual(result.inStateDeltaHash, stateDeltaHash0);
                    assert.strictEqual(result.outStateDeltaHash, stateDeltaHash1);
                    assert.strictEqual(result.ethCall, ethCall);
                    assert.strictEqual(result.signature, workerEnclaveSigningAddress);
                }));


            eventSubscribe(api2, "ReceiptsVerified", {}, getEventRecievedFunc("ReceiptsVerified",
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


            //await testUtils.sleep(5000);

            // Verify the number of state deltas is 0 before any commit
            let count1 = await api2.countStateDeltas(secretContractAddress);
            assert.strictEqual(count1, 0);

            // Verify the input state delta is not valid before any commit
            let observedValidBefore = await api2.isValidDeltaHash(secretContractAddress, stateDeltaHash1);
            assert.strictEqual(observedValidBefore, false);

            // Login the worker before commmitting receipts
            await api2.login({from : workerAddress});
            await commitReceipt(api2, secretContractAddress, taskId1, stateDeltaHash0, stateDeltaHash1,
                ethCall, workerEnclaveSigningAddress, workerAddress);

            // Verify the number of state deltas after one commit
            let count2 = await api2.countStateDeltas(secretContractAddress);
            assert.strictEqual(count2, 1);

            // Verify the input state delta is valid after the commit
            let observedValidAfter = await api2.isValidDeltaHash(secretContractAddress, stateDeltaHash1);
            assert.strictEqual(observedValidAfter, true);

            await commitReceipts(api2, secretContractAddress, [taskId2, taskId3], [stateDeltaHash1, stateDeltaHash2],
                [stateDeltaHash2, stateDeltaHash3], ethCall, workerEnclaveSigningAddress, workerAddress);

            // Verify the number of state deltas after a batch commit
            let count3 = await api2.countStateDeltas(secretContractAddress);
            assert.strictEqual(count3, 3);

            let observedStateDeltaHash3 = await api2.getStateDeltaHash(secretContractAddress, 2);
            assert.strictEqual(observedStateDeltaHash3, stateDeltaHash3);

            let observedStateDeltaHashes = await api2.getStateDeltaHashes(secretContractAddress, 0, 3);
            assert.strictEqual(observedStateDeltaHashes[0], stateDeltaHash1);
            assert.strictEqual(observedStateDeltaHashes[1], stateDeltaHash2);
            assert.strictEqual(observedStateDeltaHashes[2], stateDeltaHash3);
            assert.strictEqual(observedStateDeltaHashes.length, 3);

            api2.unsubscribeAll();

            await api.logout({from : workerAddress});

            await res.environment.destroy();

            resolve();

        });
    });

    it('State sync - empty local tips', async function(){
        let tree = TEST_TREE.ethereum;
        if(!tree['all'] || !tree['#3']){
            await envInitializer.disconnect(web3); //due to: https://github.com/mochajs/mocha/issues/2546
            this.skip();
        }

        return new Promise(async function (resolve) {
            const accounts = await web3.eth.getAccounts();
            const workerEnclaveSigningAddress = accounts[3];
            const workerAddress = accounts[4];
            const workerReport = JSON.stringify(testParameters.report);//"0x123456";
            const secretContractAddress1 = accounts[5];
            const secretContractAddress2 = accounts[4];
            const codeHash = web3.utils.sha3(JSON.stringify(testParameters.bytecode));

            await registerWorker(api, workerEnclaveSigningAddress, workerReport, workerAddress);

            await api.login({from: workerAddress});
            
            await deploySecretContract(api, secretContractAddress1, workerEnclaveSigningAddress, 
                codeHash, workerAddress);
            await deploySecretContract(api, secretContractAddress2, workerEnclaveSigningAddress,
                codeHash, workerAddress);

            const taskId1 = web3.utils.randomHex(32);
            const taskFee1 = 5;
            const taskSenderAddress1 = accounts[9];

            const taskId2 = web3.utils.randomHex(32);
            const taskFee2 = 19;
            const taskId3 = web3.utils.randomHex(32);
            const taskFee3 = 58;
            const taskId4 = web3.utils.randomHex(32);
            const taskFee4 = 580;

            await createTaskRecord(api, taskId1, taskFee1, taskSenderAddress1);
            await createTaskRecords(api, [taskId2, taskId3], [taskFee2, taskFee3], workerAddress);
            await createTaskRecord(api, taskId4, taskFee4, workerAddress);

            let stateDeltaHash0 = "0x0000000000000000000000000000000000000000000000000000000000000000";
            let stateDeltaHash1 = web3.utils.randomHex(32);
            let stateDeltaHash2 = web3.utils.randomHex(32);
            let stateDeltaHash3 = web3.utils.randomHex(32);
            let stateDeltaHash4 = web3.utils.randomHex(32);
            let ethCall = web3.utils.randomHex(32);

            await commitReceipt(api, secretContractAddress1, taskId1, stateDeltaHash0, stateDeltaHash1,
                ethCall, workerEnclaveSigningAddress, workerAddress);

            await commitReceipts(api, secretContractAddress1, [taskId2, taskId3], [stateDeltaHash1, stateDeltaHash2],
                [stateDeltaHash2, stateDeltaHash3], ethCall, workerEnclaveSigningAddress, workerAddress);

            await commitReceipt(api, secretContractAddress2, taskId4, stateDeltaHash0, stateDeltaHash4,
                ethCall, workerEnclaveSigningAddress, workerAddress);


            StateSync.getRemoteMissingStates(api, [], (err, results)=>{
                //DONE results == [{address, deltas : [deltaHash, index]}]
                assert.strictEqual(results.length, 2);

                assert.strictEqual(results[0].address, secretContractAddress1);
                assert.strictEqual(results[0].deltas[0].index, 0);
                assert.strictEqual(results[0].deltas[0].deltaHash, stateDeltaHash1);
                assert.strictEqual(results[0].deltas[1].index, 1);
                assert.strictEqual(results[0].deltas[1].deltaHash, stateDeltaHash2);
                assert.strictEqual(results[0].deltas[2].index, 2);
                assert.strictEqual(results[0].deltas[2].deltaHash, stateDeltaHash3);
                assert.strictEqual(results[0].deltas.length, 3);

                assert.strictEqual(results[1].address, secretContractAddress2);
                assert.strictEqual(results[1].deltas[0].index, 0);
                assert.strictEqual(results[1].deltas[0].deltaHash, stateDeltaHash4);
                assert.strictEqual(results[1].deltas.length, 1);

                api.unsubscribeAll();
                resolve();
            });
        });
    });

    it('State sync - partial local tips', async function(){
        let tree = TEST_TREE.ethereum;
        if(!tree['all'] || !tree['#4']) {
            await envInitializer.disconnect(web3); //due to: https://github.com/mochajs/mocha/issues/2546
            this.skip();
        }

        return new Promise(async function (resolve) {
            const accounts = await web3.eth.getAccounts();
            const workerEnclaveSigningAddress = accounts[3];
            const workerAddress = accounts[4];
            const workerReport = JSON.stringify(testParameters.report);//"0x123456";
            const secretContractAddress1 = accounts[5];
            const secretContractAddress2 = accounts[4];
            const codeHash = web3.utils.sha3(JSON.stringify(testParameters.bytecode));

            await registerWorker(api, workerEnclaveSigningAddress, workerReport, workerAddress);

            await api.login({from: workerAddress});
            
            await deploySecretContract(api, secretContractAddress1, workerEnclaveSigningAddress, 
                codeHash, workerAddress);
            await deploySecretContract(api, secretContractAddress2, workerEnclaveSigningAddress,
                codeHash, workerAddress);

            const taskId1 = web3.utils.randomHex(32);
            const taskFee1 = 5;
            const taskSenderAddress1 = accounts[9];

            const taskId2 = web3.utils.randomHex(32);
            const taskFee2 = 19;
            const taskId3 = web3.utils.randomHex(32);
            const taskFee3 = 58;
            const taskId4 = web3.utils.randomHex(32);
            const taskFee4 = 580;

            await createTaskRecord(api, taskId1, taskFee1, taskSenderAddress1);
            await createTaskRecords(api, [taskId2, taskId3], [taskFee2, taskFee3], workerAddress);
            await createTaskRecord(api, taskId4, taskFee4, workerAddress);

            let stateDeltaHash0 = "0x0000000000000000000000000000000000000000000000000000000000000000";
            let stateDeltaHash1 = web3.utils.randomHex(32);
            let stateDeltaHash2 = web3.utils.randomHex(32);
            let stateDeltaHash3 = web3.utils.randomHex(32);
            let stateDeltaHash4 = web3.utils.randomHex(32);
            let ethCall = web3.utils.randomHex(32);

            await commitReceipt(api, secretContractAddress1, taskId1, stateDeltaHash0, stateDeltaHash1,
                ethCall, workerEnclaveSigningAddress, workerAddress);

            await commitReceipts(api, secretContractAddress1, [taskId2, taskId3], [stateDeltaHash1, stateDeltaHash2],
                [stateDeltaHash2, stateDeltaHash3], ethCall, workerEnclaveSigningAddress, workerAddress);

            await commitReceipt(api, secretContractAddress2, taskId4, stateDeltaHash0, stateDeltaHash4,
                ethCall, workerEnclaveSigningAddress, workerAddress);

            StateSync.getRemoteMissingStates(api, [{address: secretContractAddress1, key : 0}], (err, results)=>{
                //DONE results == [{address, deltas : [deltaHash, index]}]
                assert.strictEqual(results.length, 2);

                assert.strictEqual(results[0].address, secretContractAddress1);
                assert.strictEqual(results[0].deltas[0].index, 1);
                assert.strictEqual(results[0].deltas[0].deltaHash, stateDeltaHash2);
                assert.strictEqual(results[0].deltas[1].index, 2);
                assert.strictEqual(results[0].deltas[1].deltaHash, stateDeltaHash3);
                assert.strictEqual(results[0].deltas.length, 2);

                assert.strictEqual(results[1].address, secretContractAddress2);
                assert.strictEqual(results[1].deltas[0].index, 0);
                assert.strictEqual(results[1].deltas[0].deltaHash, stateDeltaHash4);
                assert.strictEqual(results[1].deltas.length, 1);

                api.unsubscribeAll();
                resolve();
            });
        });
    });

    it('State sync - partial local tips 2', async function(){
        let tree = TEST_TREE.ethereum;
        if(!tree['all'] || !tree['#5']){
            await envInitializer.disconnect(web3); //due to: https://github.com/mochajs/mocha/issues/2546
            this.skip();
        }

        return new Promise(async function (resolve) {
            const accounts = await web3.eth.getAccounts();
            const workerEnclaveSigningAddress = accounts[3];
            const workerAddress = accounts[4];
            const workerReport = JSON.stringify(testParameters.report);//"0x123456";
            const secretContractAddress1 = accounts[5];
            const secretContractAddress2 = accounts[4];
            const codeHash = web3.utils.sha3(JSON.stringify(testParameters.bytecode));

            await registerWorker(api, workerEnclaveSigningAddress, workerReport, workerAddress);

            await api.login({from: workerAddress});
            
            await deploySecretContract(api, secretContractAddress1, workerEnclaveSigningAddress, 
                codeHash, workerAddress);
            await deploySecretContract(api, secretContractAddress2, workerEnclaveSigningAddress,
                codeHash, workerAddress);

            const taskId1 = web3.utils.randomHex(32);
            const taskFee1 = 5;
            const taskSenderAddress1 = accounts[9];

            const taskId2 = web3.utils.randomHex(32);
            const taskFee2 = 19;
            const taskId3 = web3.utils.randomHex(32);
            const taskFee3 = 58;
            const taskId4 = web3.utils.randomHex(32);
            const taskFee4 = 580;

            await createTaskRecord(api, taskId1, taskFee1, taskSenderAddress1);
            await createTaskRecords(api, [taskId2, taskId3], [taskFee2, taskFee3], workerAddress);
            await createTaskRecord(api, taskId4, taskFee4, workerAddress);

            let stateDeltaHash0 = "0x0000000000000000000000000000000000000000000000000000000000000000";
            let stateDeltaHash1 = web3.utils.randomHex(32);
            let stateDeltaHash2 = web3.utils.randomHex(32);
            let stateDeltaHash3 = web3.utils.randomHex(32);
            let stateDeltaHash4 = web3.utils.randomHex(32);
            let ethCall = web3.utils.randomHex(32);

            await commitReceipt(api, secretContractAddress1, taskId1, stateDeltaHash0, stateDeltaHash1,
                ethCall, workerEnclaveSigningAddress, workerAddress);

            await commitReceipts(api, secretContractAddress1, [taskId2, taskId3], [stateDeltaHash1, stateDeltaHash2],
                [stateDeltaHash2, stateDeltaHash3], ethCall, workerEnclaveSigningAddress, workerAddress);

            await commitReceipt(api, secretContractAddress2, taskId4, stateDeltaHash0, stateDeltaHash4,
                ethCall, workerEnclaveSigningAddress, workerAddress);


            StateSync.getRemoteMissingStates(api, [{address: secretContractAddress1, key: 0}, {address: secretContractAddress2, key: 0}], (err, results)=>{
                //DONE results == [{address, deltas : [deltaHash, index]}]
                assert.strictEqual(results.length, 1);

                assert.strictEqual(results[0].address, secretContractAddress1);
                assert.strictEqual(results[0].deltas[0].index, 1);
                assert.strictEqual(results[0].deltas[0].deltaHash, stateDeltaHash2);
                assert.strictEqual(results[0].deltas[1].index, 2);
                assert.strictEqual(results[0].deltas[1].deltaHash, stateDeltaHash3);
                assert.strictEqual(results[0].deltas.length, 2);

                api.unsubscribeAll();
                resolve();
            });
        });
    });

    it('State sync - full local tips', async function(){
        let tree = TEST_TREE.ethereum;
        if(!tree['all'] || !tree['#6']){
            await envInitializer.disconnect(web3); //due to: https://github.com/mochajs/mocha/issues/2546
            this.skip();
        }

        return new Promise(async function (resolve) {
            const accounts = await web3.eth.getAccounts();
            const workerEnclaveSigningAddress = accounts[3];
            const workerAddress = accounts[4];
            const workerReport = JSON.stringify(testParameters.report);//"0x123456";
            const secretContractAddress1 = accounts[5];
            const secretContractAddress2 = accounts[4];
            const codeHash = web3.utils.sha3(JSON.stringify(testParameters.bytecode));

            await registerWorker(api, workerEnclaveSigningAddress, workerReport, workerAddress);

            await api.login({from: workerAddress});
            
            await deploySecretContract(api, secretContractAddress1, workerEnclaveSigningAddress, 
                codeHash, workerAddress);
            await deploySecretContract(api, secretContractAddress2, workerEnclaveSigningAddress,
                codeHash, workerAddress);

            const taskId1 = web3.utils.randomHex(32);
            const taskFee1 = 5;
            const taskSenderAddress1 = accounts[9];

            const taskId2 = web3.utils.randomHex(32);
            const taskFee2 = 19;
            const taskId3 = web3.utils.randomHex(32);
            const taskFee3 = 58;
            const taskId4 = web3.utils.randomHex(32);
            const taskFee4 = 580;

            await createTaskRecord(api, taskId1, taskFee1, taskSenderAddress1);
            await createTaskRecords(api, [taskId2, taskId3], [taskFee2, taskFee3], workerAddress);
            await createTaskRecord(api, taskId4, taskFee4, workerAddress);

            let stateDeltaHash0 = "0x0000000000000000000000000000000000000000000000000000000000000000";
            let stateDeltaHash1 = web3.utils.randomHex(32);
            let stateDeltaHash2 = web3.utils.randomHex(32);
            let stateDeltaHash3 = web3.utils.randomHex(32);
            let stateDeltaHash4 = web3.utils.randomHex(32);
            let ethCall = web3.utils.randomHex(32);

            await commitReceipt(api, secretContractAddress1, taskId1, stateDeltaHash0, stateDeltaHash1,
                ethCall, workerEnclaveSigningAddress, workerAddress);

            await commitReceipts(api, secretContractAddress1, [taskId2, taskId3], [stateDeltaHash1, stateDeltaHash2],
                [stateDeltaHash2, stateDeltaHash3], ethCall, workerEnclaveSigningAddress, workerAddress);

            await commitReceipt(api, secretContractAddress2, taskId4, stateDeltaHash0, stateDeltaHash4,
                ethCall, workerEnclaveSigningAddress, workerAddress);


            StateSync.getRemoteMissingStates(api, [{address: secretContractAddress1, key: 2}, {address: secretContractAddress2, key: 0}], (err, results)=>{
                //DONE results == [{address, deltas : [deltaHash, index]}]
                assert.strictEqual(results.length, 0);

                api.unsubscribeAll();
                resolve();
            });
        });
    });

    it('Test ethereum services ', async function(){
        let tree = TEST_TREE.ethereum;
        if(!tree['all'] || !tree['#7']){
            await envInitializer.disconnect(web3); //due to: https://github.com/mochajs/mocha/issues/2546
            this.skip();
        }
        
        return new Promise(async function (resolve) {
            const config = {enigmaContractAddress: enigmaContractAddress, enigmaContractABI: enigmaContractABI}
            let builder = new EnigmaContractAPIBuilder();
            res = await builder.useDeployed(config).build();

            let api2 = res.api;
            let web3_2 = api.w3();
            
            let services = new EthereumServices(api2);

            const accounts = await web3_2.eth.getAccounts();
            const workerEnclaveSigningAddress = accounts[3];
            const workerAddress = accounts[4];
            const workerReport = JSON.stringify(testParameters.report);//"0x123456";
            const secretContractAddress = accounts[5];
            const codeHash = web3_2.utils.sha3(JSON.stringify(testParameters.bytecode));

            await registerWorker(api2, workerEnclaveSigningAddress, workerReport, workerAddress);
            // Login the worker before commmitting receipts
            await api2.login({from : workerAddress});
            await deploySecretContract(api2, secretContractAddress, workerEnclaveSigningAddress,
                codeHash, workerAddress);

            const taskId1 = web3_2.utils.randomHex(32);
            const taskFee1 = 5;
            const taskSenderAddress1 = accounts[9];

            const taskId2 = web3_2.utils.randomHex(32);
            const taskFee2 = 19;
            const taskId3 = web3_2.utils.randomHex(32);
            const taskFee3 = 58;

            let taskIndex = 0;

            services.initServices(["TaskCreation", "TaskSubmission"]);

            services.on("TaskCreation", (err, result)=> {
                if (taskIndex === 0) {
                    assert.strictEqual(result.taskId, taskId1);
                    assert.strictEqual(result.fee, taskFee1);
                    assert.strictEqual(result.senderAddress, taskSenderAddress1);

                    taskIndex += 1;
                }
                else if (taskIndex === 1) {
                    assert.strictEqual(result.taskIds[0], taskId2);
                    assert.strictEqual(result.taskIds[1], taskId3);
                    assert.strictEqual(result.taskIds.length, 2);

                    assert.strictEqual(result.fees[0], taskFee2);
                    assert.strictEqual(result.fees[1], taskFee3);
                    assert.strictEqual(result.fees.length, 2);

                    assert.strictEqual(result.senderAddress, workerAddress);
                }
            })

            await createTaskRecord(api2, taskId1, taskFee1, taskSenderAddress1);
            await createTaskRecords(api2, [taskId2, taskId3], [taskFee2, taskFee3], workerAddress);

            let stateDeltaHash0 = "0x0000000000000000000000000000000000000000000000000000000000000000";
            let stateDeltaHash1 = web3_2.utils.randomHex(32);
            let stateDeltaHash2 = web3_2.utils.randomHex(32);
            let stateDeltaHash3 = web3_2.utils.randomHex(32);
            let ethCall = web3_2.utils.randomHex(32);

            let recieptIndex = 0;

            services.on("TaskSubmission", (err, result)=> {
                if (recieptIndex === 0) {
                    assert.strictEqual(result.taskId, taskId1);
                    assert.strictEqual(result.inStateDeltaHash, stateDeltaHash0);
                    assert.strictEqual(result.outStateDeltaHash, stateDeltaHash1);
                    assert.strictEqual(result.ethCall, ethCall);
                    assert.strictEqual(result.signature, workerEnclaveSigningAddress);

                    taskIndex += 1;
                }
                else if (recieptIndex === 1) {
                    assert.strictEqual(result.taskIds[0], taskId2);
                    assert.strictEqual(result.taskIds[1], taskId3);
                    assert.strictEqual(result.inStateDeltaHashes[0], stateDeltaHash1);
                    assert.strictEqual(result.inStateDeltaHashes[1], stateDeltaHash2);
                    assert.strictEqual(result.outStateDeltaHashes[0], stateDeltaHash2);
                    assert.strictEqual(result.outStateDeltaHashes[1], stateDeltaHash3);
                    assert.strictEqual(result.ethCall, ethCall);
                    assert.strictEqual(result.signature, workerEnclaveSigningAddress);
                }
            })

            await commitReceipt(api2, secretContractAddress, taskId1, stateDeltaHash0, stateDeltaHash1,
                ethCall, workerEnclaveSigningAddress, workerAddress);

            await commitReceipts(api2, secretContractAddress, [taskId2, taskId3], [stateDeltaHash1, stateDeltaHash2],
                [stateDeltaHash2, stateDeltaHash3], ethCall, workerEnclaveSigningAddress, workerAddress);

            api2.unsubscribeAll();

            await res.environment.destroy();

            resolve();

        });
    });
});
