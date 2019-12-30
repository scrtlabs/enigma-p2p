const path = require("path");
const assert = require("assert");
const EnigmaContractAPIBuilder = require(path.join(__dirname, "../../src/ethereum/EnigmaContractAPIBuilder"));
const Logger = require(path.join(__dirname, "../../src/common/logger"));
const EthereumServices = require(path.join(__dirname, "../../src/ethereum/EthereumServices"));
const StateSync = require(path.join(__dirname, "../../src/ethereum/StateSync"));
const EthereumAPI = require(path.join(__dirname, "../../src/ethereum/EthereumAPI"));
const testParameters = require("./test_parameters.json");
const utils = require("../../src/common/utils");
const TEST_TREE = require("../test_tree").TEST_TREE;
const Web3 = require("web3");

const WORKER_WEI_VALUE = 100000000000000000;

describe("Ethereum advanced", function() {
  async function init() {
    const w3 = new Web3();

    const workerAccount = w3.eth.accounts.create();
    const stakingAccount = w3.eth.accounts.create();
    const builder = new EnigmaContractAPIBuilder();
    const res = await builder
      .setOperationalKey(workerAccount.privateKey)
      .setStakingAddress(stakingAccount.address)
      .setMinimunConfirmations(0)
      .createNetwork()
      .deploy()
      .build();
    const web3 = res.api.w3();
    const accounts = await web3.eth.getAccounts();
    // transfer money to worker address
    await web3.eth.sendTransaction({
      from: accounts[4],
      to: workerAccount.address,
      value: WORKER_WEI_VALUE
    });
    return { res, workerAccount, builder };
  }

  let res, workerAccount;
  let accounts, api;
  let workerEnclaveSigningAddress, workerAddress;
  let workerReport, signature;
  let enigmaContractAddress;

  async function start() {
    const x = await init();
    res = x.res;
    workerAccount = x.workerAccount;

    api = res.api;
    accounts = await api.w3().eth.getAccounts();
    workerEnclaveSigningAddress = accounts[3];
    workerAddress = workerAccount.address;
    workerReport = testParameters.report;
    signature = api.w3().utils.randomHex(32);
    enigmaContractAddress = x.builder.enigmaContractAddress;
  }

  async function stop() {
    api.unsubscribeAll();
    await res.environment.destroy();
  }

  it("test compareLocalStateToRemote", async function() {
    const tree = TEST_TREE.ethereum_advanced;
    if (!tree["all"] || !tree["#1"]) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      await start();
      const web3 = api.w3();

      const secretContractAddress1 = utils.remove0x(web3.utils.randomHex(32));
      const secretContractAddress2 = utils.remove0x(web3.utils.randomHex(32));
      const secretContractAddress3 = utils.remove0x(web3.utils.randomHex(32));
      const codeHash = api.w3().utils.sha3(JSON.stringify(testParameters.bytecode));
      const codeHash2 = api.w3().utils.sha3(web3.utils.randomHex(32));
      const initStateDeltaHash = api.w3().utils.randomHex(32);
      const gasUsed = 10;
      const optionalEthereumData = "0x00";
      const optionalEthereumContractAddress = "0x0000000000000000000000000000000000000000";

      await api.register(workerEnclaveSigningAddress, workerReport, signature, {
        from: workerAddress
      });
      await api.login({ from: workerAddress });

      await api.deploySecretContract(
        secretContractAddress1,
        codeHash,
        codeHash,
        initStateDeltaHash,
        optionalEthereumData,
        optionalEthereumContractAddress,
        gasUsed,
        workerEnclaveSigningAddress,
        { from: workerAddress }
      );
      await api.deploySecretContract(
        secretContractAddress2,
        codeHash2,
        codeHash2,
        initStateDeltaHash,
        optionalEthereumData,
        optionalEthereumContractAddress,
        gasUsed,
        workerEnclaveSigningAddress,
        { from: workerAddress }
      );

      const taskId1 = utils.remove0x(web3.utils.randomHex(32));
      const taskId2 = utils.remove0x(web3.utils.randomHex(32));
      const taskId3 = utils.remove0x(web3.utils.randomHex(32));
      const taskId4 = utils.remove0x(web3.utils.randomHex(32));

      const stateDeltaHash1 = web3.utils.randomHex(32);
      const stateDeltaHash2 = web3.utils.randomHex(32);
      const stateDeltaHash3 = web3.utils.randomHex(32);
      const stateDeltaHash4 = web3.utils.randomHex(32);
      const outputHash1 = web3.utils.randomHex(32);
      const outputHash2 = web3.utils.randomHex(32);
      const outputHash3 = web3.utils.randomHex(32);
      const outputHash4 = web3.utils.randomHex(32);

      await api.commitReceipt(
        secretContractAddress1,
        taskId1,
        stateDeltaHash1,
        outputHash1,
        optionalEthereumData,
        optionalEthereumContractAddress,
        gasUsed,
        signature,
        { from: workerAddress }
      );

      await api.commitReceipt(
        secretContractAddress1,
        taskId2,
        stateDeltaHash2,
        outputHash2,
        optionalEthereumData,
        optionalEthereumContractAddress,
        gasUsed,
        signature,
        { from: workerAddress }
      );

      await api.commitReceipt(
        secretContractAddress1,
        taskId3,
        stateDeltaHash3,
        outputHash3,
        optionalEthereumData,
        optionalEthereumContractAddress,
        gasUsed,
        signature,
        { from: workerAddress }
      );

      await api.commitReceipt(
        secretContractAddress2,
        taskId4,
        stateDeltaHash4,
        outputHash4,
        optionalEthereumData,
        optionalEthereumContractAddress,
        gasUsed,
        signature,
        { from: workerAddress }
      );

      // Test empty local tips
      let results = await StateSync.compareLocalStateToRemote(api, []);
      // DONE results == [{address, deltas : [deltaHash, index]}]
      assert.strictEqual(results.excessList.length, 0);
      assert.strictEqual(results.missingList.length, 2);

      assert.strictEqual(results.missingList[0].address, secretContractAddress1);
      assert.strictEqual(results.missingList[0].deltas[0].index, 0);
      assert.strictEqual(results.missingList[0].deltas[0].deltaHash, initStateDeltaHash);
      assert.strictEqual(results.missingList[0].deltas[1].index, 1);
      assert.strictEqual(results.missingList[0].deltas[1].deltaHash, stateDeltaHash1);
      assert.strictEqual(results.missingList[0].deltas[2].index, 2);
      assert.strictEqual(results.missingList[0].deltas[2].deltaHash, stateDeltaHash2);
      assert.strictEqual(results.missingList[0].deltas[3].index, 3);
      assert.strictEqual(results.missingList[0].deltas[3].deltaHash, stateDeltaHash3);
      assert.strictEqual(results.missingList[0].deltas.length, 4);
      assert.strictEqual(results.missingList[0].bytecodeHash, codeHash, "the bytecode is not equal to the codeHash");

      assert.strictEqual(results.missingList[1].address, secretContractAddress2);
      assert.strictEqual(results.missingList[1].deltas[0].index, 0);
      assert.strictEqual(results.missingList[1].deltas[0].deltaHash, initStateDeltaHash);
      assert.strictEqual(results.missingList[1].deltas[1].index, 1);
      assert.strictEqual(results.missingList[1].deltas[1].deltaHash, stateDeltaHash4);
      assert.strictEqual(results.missingList[1].deltas.length, 2);
      assert.strictEqual(results.missingList[1].bytecodeHash, codeHash2);

      // Test partial local tips
      results = await StateSync.compareLocalStateToRemote(api, [{ address: secretContractAddress1, key: 0 }]);
      assert.strictEqual(results.excessList.length, 0);
      assert.strictEqual(results.missingList.length, 2);

      assert.strictEqual(results.missingList[0].address, secretContractAddress1);
      assert.strictEqual(results.missingList[0].deltas[0].index, 1);
      assert.strictEqual(results.missingList[0].deltas[0].deltaHash, stateDeltaHash1);
      assert.strictEqual(results.missingList[0].deltas[1].index, 2);
      assert.strictEqual(results.missingList[0].deltas[1].deltaHash, stateDeltaHash2);
      assert.strictEqual(results.missingList[0].deltas[2].index, 3);
      assert.strictEqual(results.missingList[0].deltas[2].deltaHash, stateDeltaHash3);
      assert.strictEqual(results.missingList[0].deltas.length, 3);
      assert.strictEqual("bytecodeHash" in results.missingList[0], false);

      assert.strictEqual(results.missingList[1].address, secretContractAddress2);
      assert.strictEqual(results.missingList[1].deltas[0].index, 0);
      assert.strictEqual(results.missingList[1].deltas[0].deltaHash, initStateDeltaHash);
      assert.strictEqual(results.missingList[1].deltas[1].index, 1);
      assert.strictEqual(results.missingList[1].deltas[1].deltaHash, stateDeltaHash4);
      assert.strictEqual(results.missingList[1].deltas.length, 2);
      assert.strictEqual(results.missingList[1].bytecodeHash, codeHash2);

      // Test partial local tips 2
      results = await StateSync.compareLocalStateToRemote(api, [
        { address: secretContractAddress1, key: 1 },
        { address: secretContractAddress2, key: 1 }
      ]);
      assert.strictEqual(results.excessList.length, 0);
      assert.strictEqual(results.missingList.length, 1);

      assert.strictEqual(results.missingList[0].address, secretContractAddress1);
      assert.strictEqual(results.missingList[0].deltas[0].index, 2);
      assert.strictEqual(results.missingList[0].deltas[0].deltaHash, stateDeltaHash2);
      assert.strictEqual(results.missingList[0].deltas[1].index, 3);
      assert.strictEqual(results.missingList[0].deltas[1].deltaHash, stateDeltaHash3);
      assert.strictEqual(results.missingList[0].deltas.length, 2);
      assert.strictEqual("bytecodeHash" in results.missingList[0], false);

      // Test full local tips
      results = await StateSync.compareLocalStateToRemote(api, [
        { address: secretContractAddress1, key: 3 },
        { address: secretContractAddress2, key: 1 }
      ]);

      // Test excessive deltas local tips
      results = await StateSync.compareLocalStateToRemote(api, [
        { address: secretContractAddress1, key: 5 },
        { address: secretContractAddress2, key: 1 }
      ]);

      assert.strictEqual(results.excessList.length, 1);
      assert.strictEqual(results.missingList.length, 0);

      assert.strictEqual(results.excessList[0].address, secretContractAddress1);
      assert.strictEqual(results.excessList[0].remoteTip, 3);

      // Test excessive deltas local tips 2
      results = await StateSync.compareLocalStateToRemote(api, [
        { address: secretContractAddress1, key: 5 },
        { address: secretContractAddress2, key: 6 },
        { address: secretContractAddress3, key: 7 }
      ]);

      assert.strictEqual(results.excessList.length, 3);
      assert.strictEqual(results.missingList.length, 0);

      assert.strictEqual(results.excessList[0].address, secretContractAddress1);
      assert.strictEqual(results.excessList[0].remoteTip, 3);
      assert.strictEqual(results.excessList[1].address, secretContractAddress2);
      assert.strictEqual(results.excessList[1].remoteTip, 1);
      assert.strictEqual(results.excessList[2].address, secretContractAddress3);
      assert.strictEqual(results.excessList[2].remoteTip, -1);

      api.unsubscribeAll();
      await res.environment.destroy();
      await stop();
      resolve();
    });
  });

  it("failure", async function() {
    const tree = TEST_TREE.ethereum_advanced;
    if (!tree["all"] || !tree["#2"]) {
      this.skip();
    }

    return new Promise(async resolve => {
      await start();
      await res.environment.destroy();

      StateSync.getRemoteMissingStates(api, [], async (err, results) => {
        assert.notStrictEqual(err, null);
        await stop();
        resolve();
      });
    });
  });

  it("Test Ethereum services", async function() {
    const tree = TEST_TREE.ethereum_advanced;
    if (!tree["all"] || !tree["#3"]) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      await start();
      const web3 = api.w3();

      const services = new EthereumServices(api);
      const secretContractAddress = utils.remove0x(web3.utils.randomHex(32)); // accounts[5];
      const codeHash = web3.utils.sha3(JSON.stringify(testParameters.bytecode));
      const initStateDeltaHash = web3.utils.randomHex(32);
      const gasUsed = 10;
      const outputHash1 = web3.utils.randomHex(32);
      const outputHash2 = web3.utils.randomHex(32);
      const outputHash3 = web3.utils.randomHex(32);
      const optionalEthereumData = "0x00";
      const optionalEthereumContractAddress = "0x0000000000000000000000000000000000000000";

      await api.register(workerEnclaveSigningAddress, workerReport, signature, {
        from: workerAddress
      });
      await api.login({ from: workerAddress });

      await api.deploySecretContract(
        secretContractAddress,
        codeHash,
        codeHash,
        initStateDeltaHash,
        optionalEthereumData,
        optionalEthereumContractAddress,
        gasUsed,
        workerEnclaveSigningAddress,
        { from: workerAddress }
      );

      const taskId1 = utils.remove0x(web3.utils.randomHex(32));
      const taskId2 = utils.remove0x(web3.utils.randomHex(32));
      const taskId3 = utils.remove0x(web3.utils.randomHex(32));

      services.initServices(["TaskCreation", "TaskSuccessSubmission"]);

      const stateDeltaHash1 = web3.utils.randomHex(32);
      const stateDeltaHash2 = web3.utils.randomHex(32);
      const stateDeltaHash3 = web3.utils.randomHex(32);

      let recieptIndex = 0;

      services.on("TaskSuccessSubmission", (err, result) => {
        if (recieptIndex === 0) {
          assert.strictEqual(result.taskId, taskId1);
          assert.strictEqual(result.stateDeltaHash, stateDeltaHash1);
          assert.strictEqual(result.outputHash, outputHash1);
        } else if (recieptIndex === 1) {
          assert.strictEqual(result.taskId, taskId2);
          assert.strictEqual(result.stateDeltaHash, stateDeltaHash2);
          assert.strictEqual(result.outputHash, outputHash2);
        } else if (recieptIndex === 2) {
          assert.strictEqual(result.taskId, taskId3);
          assert.strictEqual(result.stateDeltaHash, stateDeltaHash3);
          assert.strictEqual(result.outputHash, outputHash3);
        }
        recieptIndex += 1;
      });

      await api.commitReceipt(
        secretContractAddress,
        taskId1,
        stateDeltaHash1,
        outputHash1,
        optionalEthereumData,
        optionalEthereumContractAddress,
        gasUsed,
        signature,
        { from: workerAddress }
      );

      await api.commitReceipt(
        secretContractAddress,
        taskId2,
        stateDeltaHash2,
        outputHash2,
        optionalEthereumData,
        optionalEthereumContractAddress,
        gasUsed,
        signature,
        { from: workerAddress }
      );

      await api.commitReceipt(
        secretContractAddress,
        taskId3,
        stateDeltaHash3,
        outputHash3,
        optionalEthereumData,
        optionalEthereumContractAddress,
        gasUsed,
        signature,
        { from: workerAddress }
      );

      await stop();
      resolve();
    });
  });

  it("Test health check ", async function() {
    const tree = TEST_TREE.ethereum_advanced;
    if (!tree["all"] || !tree["#4"]) {
      this.skip();
    }

    return new Promise(async function(resolve) {
      await start();
      let ethereumApi = new EthereumAPI(new Logger({ cli: true }));
      await ethereumApi.init({ enigmaContractAddress: enigmaContractAddress, minConfirmations: 0 });

      // sunny day
      let data = await ethereumApi.healthCheck();
      assert.strictEqual(data.isConnected, true);
      assert.strictEqual(data.url, "ws://127.0.0.1:9545");
      assert.strictEqual(data.enigmaContractAddress, enigmaContractAddress);

      // rainy day
      await ethereumApi.destroy();

      data = await ethereumApi.healthCheck();
      assert.strictEqual(data.isConnected, false);
      assert.strictEqual(data.url, "ws://127.0.0.1:9545");
      assert.strictEqual(data.enigmaContractAddress, enigmaContractAddress);

      await res.environment.destroy();
      resolve();
    });
  });
});
