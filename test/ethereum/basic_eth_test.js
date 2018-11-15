const path = require('path');
const assert = require('assert');
const TEST_TREE = require(path.join(__dirname, '../test_tree')).TEST_TREE;
const envInitializer = require('./scripts/env_initializer');
const EnigmaContractWriterAPI = require(path.join(__dirname, '../../src/ethereum/EnigmaContractWriterAPI'));

const truffleDir = path.join(__dirname, './scripts');

const testParameters = require('./test_parameters.json')

describe('Ethereum tests', function() {
    let web3;
    let api;

    before(async function() {
        // runs before all tests in this block
        await envInitializer.start(truffleDir);

    });

    after(async function() {
        //runs after all tests in this block
        await envInitializer.stop(web3);
    });

    beforeEach(async function() {
        // runs before each test in this block
        const result = await envInitializer.init(truffleDir);
        let enigmaContractAddress = result.contractAddress;
        let enigmaContractABI = result.contractABI;
        
        web3 = result.web3;

        //     let web3 = new Web3(provider);
        api = await new EnigmaContractWriterAPI(enigmaContractAddress, enigmaContractABI, web3);
    });

    function eventSubscribe(api, eventName, filter, callback) {
        api.subscribe(eventName, filter, callback);
        //console.log("subscribed to " + eventName);   
    }

    const util = require('util')

    //console.log(util.inspect(myObject, {showHidden: false, depth: null}))

    function getEventRecievedFunc(eventName, resolve) {
        return (err, event)=> {
            //console.log("recieved " + eventName, "event: " + util.inspect(event));
            //console.log("recieved ", event.returnValues.custodian);
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

    async function createTaskRecord(api, taskId, fee, token, tokenValue, senderAddress) {
        let reciept = await api.createTaskRecord(taskId, fee, token, tokenValue, {from : senderAddress});
        //console.log("task record created. reciept=" + reciept);   
    }

    async function createTaskRecords(api, taskIds, fees, tokens, tokenValues, senderAddress) {
        let reciept = await api.createTaskRecords(taskIds, fees, tokens, tokenValues, {from : senderAddress});
        //console.log("task records created. reciept=" + reciept);   
    }

    // afterEach(function() {
    //     // runs after each test in this block
    // });

    // test cases
    // it('ethereum #2 it works with done()', function (done){
    //     let tree = TEST_TREE.ethereum;
    //     if(!tree['all'] || !tree['#2']){
    //         this.skip();
    //     }
    //     done();
    // });

    it('Register a worker, deposit, deploy secret contract and create tasks! ', async function(){
        let tree = TEST_TREE.ethereum;
        if(!tree['all'] || !tree['#1']){
            this.skip();
        }
        return new Promise(async function (resolve) {
            const accounts = await web3.eth.getAccounts();
            const workerEnclaveSigningAddress = accounts[3];
            const workerAddress = accounts[4];
            const workerReport = JSON.stringify(testParameters.report);//"0x123456";
            const depositValue = 1000;
            const secretContractAddress = accounts[5];
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

            const taskId1 = web3.utils.randomHex(32);
            const taskFee1 = 5;
            const taskTokenValue1 = 10;
            const taskTokenAddress1 = accounts[6];
            const taskSenderAddress1 = accounts[9];

            const taskId2 = web3.utils.randomHex(32);
            const taskFee2 = 19;
            const taskTokenValue2 = 100;
            const taskTokenAddress2 = accounts[7];
            const taskId3 = web3.utils.randomHex(32);
            const taskFee3 = 58;
            const taskTokenValue3 = 1000;
            const taskTokenAddress3 = accounts[8];

            
            eventSubscribe(api, "TaskRecordCreated", {}, getEventRecievedFunc("TaskRecordCreated", 
                (result)=> {
                    assert.strictEqual(result.taskId, taskId1);
                    assert.strictEqual(result.fee, taskFee1);
                    assert.strictEqual(result.tokenAddress, taskTokenAddress1);
                    assert.strictEqual(result.senderAddress, taskSenderAddress1);
                    assert.strictEqual(result.tokenValue, taskTokenValue1);
                }));

            eventSubscribe(api, "TaskRecordsCreated", {}, getEventRecievedFunc("TaskRecordsCreated", 
                (result)=> {
                    assert.strictEqual(result.taskIds[0], taskId2);
                    assert.strictEqual(result.taskIds[1], taskId3);
                    assert.strictEqual(result.taskIds.length, 2);

                    assert.strictEqual(result.tokenValues[0], taskTokenValue2);
                    assert.strictEqual(result.tokenValues[1], taskTokenValue3);
                    assert.strictEqual(result.tokenValues.length, 2);
                    
                    assert.strictEqual(result.fees[0], taskFee2);
                    assert.strictEqual(result.fees[1], taskFee3);
                    assert.strictEqual(result.fees.length, 2);

                    assert.strictEqual(result.tokenAddresses[0], taskTokenAddress2);
                    assert.strictEqual(result.tokenAddresses[1], taskTokenAddress3);
                    assert.strictEqual(result.tokenAddresses.length, 2);

                    assert.strictEqual(result.senderAddress, workerAddress);
                }));


            await createTaskRecord(api, taskId1, taskFee1, taskTokenAddress1, 
                taskTokenValue1, taskSenderAddress1);
            await createTaskRecords(api, [taskId2, taskId3], [taskFee2, taskFee3], 
                [taskTokenAddress2, taskTokenAddress3], [taskTokenValue2, taskTokenValue3], workerAddress);

            
            resolve();

        });
    });

});




// async function registerWorker(api, workerEnclaveSigningAddress, workerReport, workerAddress) {
//     let regTx = await api.register(workerEnclaveSigningAddress, workerReport, {from : workerAddress});
//     console.log("worker " + workerAddress + " registred; reciept=" + regTx);
// }

// async function deposit(api, workerAddress, amount) {
//     let reciept = await api.deposit(workerAddress, amount, {from : workerAddress});
//     console.log("worker " + workerAddress + " deposited; reciept=" + reciept);
// }

// async function deploySecretContract(api, secretContractAddress, workerEnclaveSigningAddress, codeHash, workerAddress) { 
//     let depTx = await api.deploySecretContract(secretContractAddress, codeHash, workerAddress, workerEnclaveSigningAddress, {from : workerAddress});
//     console.log("secret contracts " + secretContractAddress + " deployed. reciept=" + depTx);    
// }

// async function createTaskRecord(api, taskId, fee, token, tokenValue, workerAddress) {
//     let reciept = await api.createTaskRecord(taskId, fee, token, tokenValue, {from : workerAddress});
//     console.log("task record created. reciept=" + reciept);   

// }

// async function createTaskRecords(api, taskIds, fees, tokens, tokenValues, workerAddress) {
//     let reciept = await api.createTaskRecords(taskIds, fees, tokens, tokenValues, {from : workerAddress});
//     console.log("task records created. reciept=" + reciept);   

// }

// function eventSubscribe(api, eventName, filter, callback) {
//     api.subscribe(eventName, filter, callback);
//     console.log("subscribed to " + eventName);   

// }

// async function readInfo(api, secretContractAddress, scStart, scStop, deltaStart, delatStop, workerAddress) {
//     let count = await api.countSecretContracts();
//     console.log("secret contracts count=" + count);

//     let isDeployed = await api.isDeployed(secretContractAddress);
//     console.log("secret contract " + secretContractAddress + " is deployed=" + isDeployed);

//     let codeHash = await api.getCodeHash(secretContractAddress);
//     console.log("secret contract " + secretContractAddress + " code Hash=" + codeHash);

//     let addresses = await api.getSecretContractAddresses(scStart, scStop);
//     console.log("secret contract array from " + scStart + " to " + scStop + " =" + addresses);

//     let countStateDeltas = await api.countStateDeltas(secretContractAddress);
//     console.log("secret contract " + secretContractAddress + " state deltas count=" + countStateDeltas);

//     let report = await api.getReport(workerAddress);
//     console.log("worker " + workerAddress + " report=" + JSON.stringify(report));

//     // let delatHash = await api.getStateDeltaHash(secretContractAddress);
//     // console.log("secret contract " + secretContractAddress + " delta hash=" + delatHash);

//     // let delatHashes = await api.getStateDeltaHashes(secretContractAddress, deltaStart, delatStop);
//     // console.log("secret contract " + secretContractAddress + " delta hashes=" + delatHashes);

//     // let validDeltaHash = await api.isValidDeltaHash(secretContractAddress, delatHash);
//     // console.log("secret contract " + secretContractAddress + " valid delta hash=" + validDeltaHash);

//     // TODO: 
//     // getWorkerParams
//     // getWorkersParams
//     // getWorkerGroup
// }

// function getEventRecievedFunc(eventName) {
//     return (event)=> {console.log("recieved " + eventName + " event: ", event)}
// }

// const enigmaContractAddress = "0xec33dd5584b4542444542e0c4928597f613c5659";
// const EnigmaContractABI = require("/Users/lena/stuff/contract_learning/enigma_contract/build/contracts/Enigma.json");

// async function runTest() {
//     let api = init(enigmaContractAddress, EnigmaContractABI['abi']);
//     const accounts = await api.w3().eth.getAccounts();
//     const workerAddress = accounts[0];
//     const tokenAddress = accounts[1];
//     const secretContractAddress = "0x821aea9a577a9b44299b9c15c88cf3087f3b5544";
//     const workerEnclaveSigningAddress = "0xc5fdf4076b8f3a5357c5e395ab970b5b54098fef";

//     eventSubscribe(api, "Registered", {}, getEventRecievedFunc("Registered"));
//     eventSubscribe(api, "DepositSuccessful", {}, getEventRecievedFunc("DepositSuccessful"));
    
//     await registerWorker(api, workerEnclaveSigningAddress, "0x123456", workerAddress);
//     await deposit(api, workerAddress, 1000);
//     await deploySecretContract(api, secretContractAddress, workerEnclaveSigningAddress, "0x7890", workerAddress);
//     await readInfo(api, secretContractAddress, 0, 0, 0, 0, workerAddress);
//     await createTaskRecord(api, "0x555", 50, tokenAddress, 100, workerAddress);
//     await createTaskRecords(api, ["0x111", "0x222"], [50, 20], [tokenAddress, tokenAddress], [100, 200], workerAddress);

//     api.unsubscribeAll();
//     api.w3().currentProvider.disconnect(); // same as: api.w3().currentProvider.connection.close()


// }

