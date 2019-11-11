const path = require('path');
const assert = require('assert');
const EnigmaContractAPIBuilder = require(path.join(__dirname, '../../src/ethereum/EnigmaContractAPIBuilder'));
const EthereumServices = require(path.join(__dirname, '../../src/ethereum/EthereumServices'));
const StateSync = require(path.join(__dirname, '../../src/ethereum/StateSync'));
const testParameters = require('./test_parameters.json');
const constants = require('../../src/common/constants');
const utils = require('../../src/common/utils');
const Web3 = require('web3');
const testUtils = require('../testUtils/utils');
const ethTestUtils = require('./utils');

const WORKER_WEI_VALUE = 100000000000000000;

describe('Ethereum API tests (TODO: use enigmejs instead)', function () {
  function eventSubscribe(api, eventName, filter, callback) {
    api.subscribe(eventName, filter, callback);
  }

  function getEventRecievedFunc(eventName, resolve) {
    return (err, event) => {
      resolve(event);
    };
  }

  async function init() {
    const w3 = new Web3();

    const workerAccount = w3.eth.accounts.create();
    const builder = new EnigmaContractAPIBuilder();
    const res = await builder.setAccountKey(workerAccount.privateKey).setMinimunConfirmations(12).createNetwork().deploy().build();
    const web3 = res.api.w3();
    const accounts = await web3.eth.getAccounts();
    // transfer money to worker address
    await web3.eth.sendTransaction({ from: accounts[4], to: workerAccount.address, value: WORKER_WEI_VALUE });
    return { res, workerAccount, builder };
  }


  var res, workerAccount;
  var accounts,
    workerEnclaveSigningAddress,
    workerAddress,
    workerReport,
    signature,
    api;

  beforeEach(async () => {
    const x = await init();
    res = x.res;
    workerAccount = x.workerAccount;

    api = res.api;
    accounts = await api.w3().eth.getAccounts();
    workerEnclaveSigningAddress = accounts[3];
    workerAddress = workerAccount.address;
    workerReport = testParameters.report;
    signature = api.w3().utils.randomHex(32);
  })

  afterEach(async () => {
    api.unsubscribeAll();
    await res.environment.destroy();
  })

  it('worker register', async function () {
    const registerPromise = api.register(workerEnclaveSigningAddress, workerReport, signature, { from: workerAddress });
    ethTestUtils.advanceXConfirmations(api.w3())
    await registerPromise;

    const worker = await api.getWorker(workerAddress)
    assert.strictEqual(worker.status, constants.ETHEREUM_WORKER_STATUS.LOGGEDOUT)
  })

  it('worker register event', async () => {
    return new Promise(async resolve => {
      eventSubscribe(api, constants.RAW_ETHEREUM_EVENTS.Registered, {}, getEventRecievedFunc(constants.RAW_ETHEREUM_EVENTS.Registered,
        async result => {
          assert.strictEqual(result.signer, workerEnclaveSigningAddress);
          assert.strictEqual(result.workerAddress, workerAddress);

          const worker = await api.getWorker(workerAddress)
          assert.strictEqual(worker.status, constants.ETHEREUM_WORKER_STATUS.LOGGEDOUT)
          resolve();
        }));

      api.register(workerEnclaveSigningAddress, workerReport, signature, { from: workerAddress });
      ethTestUtils.advanceXConfirmations(api.w3())
    });
  })

  it('worker deposit', async function () {
    const registerPromise = api.register(workerEnclaveSigningAddress, workerReport, signature, { from: workerAddress });
    ethTestUtils.advanceXConfirmations(api.w3())
    await registerPromise;

    const depositValue = 1000;
    const depositPromise = api.deposit(workerAddress, depositValue, { from: workerAddress });
    ethTestUtils.advanceXConfirmations(api.w3())
    await depositPromise;

    const worker = await api.getWorker(workerAddress)
    assert.strictEqual(worker.balance, depositValue)
  })

  it('worker deposit event', async function () {
    return new Promise(async resolve => {
      const registerPromise = api.register(workerEnclaveSigningAddress, workerReport, signature, { from: workerAddress });
      ethTestUtils.advanceXConfirmations(api.w3())
      await registerPromise;

      const depositValue = 1000;

      eventSubscribe(api, constants.RAW_ETHEREUM_EVENTS.DepositSuccessful, {}, getEventRecievedFunc(constants.RAW_ETHEREUM_EVENTS.DepositSuccessful,
        async (result) => {
          assert.strictEqual(result.from, workerAddress);
          assert.strictEqual(result.value, depositValue);

          const worker = await api.getWorker(workerAddress)
          assert.strictEqual(worker.balance, depositValue)
          resolve();
        }));

      api.deposit(workerAddress, depositValue, { from: workerAddress });
      ethTestUtils.advanceXConfirmations(api.w3())
    })
  })

  it('worker login', async function () {
    const registerPromise = api.register(workerEnclaveSigningAddress, workerReport, signature, { from: workerAddress });
    ethTestUtils.advanceXConfirmations(api.w3())
    await registerPromise;

    const depositPromise = api.deposit(workerAddress, 1000, { from: workerAddress });
    ethTestUtils.advanceXConfirmations(api.w3())
    await depositPromise;

    const loginPromise = api.login({ from: workerAddress });
    ethTestUtils.advanceXConfirmations(api.w3())
    await loginPromise;

    const worker = await api.getWorker(workerAddress)
    assert.strictEqual(worker.status, constants.ETHEREUM_WORKER_STATUS.LOGGEDIN)
  })

  it('worker login event', async function () {
    return new Promise(async resolve => {
      const registerPromise = api.register(workerEnclaveSigningAddress, workerReport, signature, { from: workerAddress });
      ethTestUtils.advanceXConfirmations(api.w3())
      await registerPromise;

      eventSubscribe(api, constants.RAW_ETHEREUM_EVENTS.LoggedIn, {}, getEventRecievedFunc(constants.RAW_ETHEREUM_EVENTS.LoggedIn,
        async (result) => {
          assert.strictEqual(result.workerAddress, workerAddress);
          const worker = await api.getWorker(workerAddress)
          assert.strictEqual(worker.status, constants.ETHEREUM_WORKER_STATUS.LOGGEDIN)
          resolve();
        }));

      const depositePromise = api.deposit(workerAddress, 1000, { from: workerAddress });
      ethTestUtils.advanceXConfirmations(api.w3())
      await depositePromise;

      api.login({ from: workerAddress });
      ethTestUtils.advanceXConfirmations(api.w3())
    })
  })

  it('"verify" worker enclave report', async function () {
    const registerPromise = api.register(workerEnclaveSigningAddress, workerReport, signature, { from: workerAddress });
    ethTestUtils.advanceXConfirmations(api.w3())
    await registerPromise;

    const worker = await api.getWorker(workerAddress)
    const { report } = await api.getReport(workerAddress);
    assert.strictEqual(worker.report, report)
    assert.strictEqual(worker.report, workerReport)
  })

  it('worker deploy secret contract', async function () {
    const registerPromise = api.register(workerEnclaveSigningAddress, workerReport, signature, { from: workerAddress });
    ethTestUtils.advanceXConfirmations(api.w3())
    await registerPromise;

    const depositPromise = api.deposit(workerAddress, 1000, { from: workerAddress });
    ethTestUtils.advanceXConfirmations(api.w3())
    await depositPromise;

    const loginPromise = api.login({ from: workerAddress });
    ethTestUtils.advanceXConfirmations(api.w3())
    await loginPromise;

    const countSCsBefore = await api.countSecretContracts();
    assert.strictEqual(countSCsBefore, 0);

    const secretContractAddress = utils.remove0x(api.w3().utils.randomHex(32));
    const codeHash = api.w3().utils.sha3(JSON.stringify(testParameters.bytecode));
    const initStateDeltaHash = api.w3().utils.randomHex(32);
    const zeroAddress = '0x0000000000000000000000000000000000000000';
    const gasUsed = 10;

    const deployPromise = api.deploySecretContract(secretContractAddress, codeHash, codeHash, initStateDeltaHash, "0x00", zeroAddress, gasUsed, workerEnclaveSigningAddress, { from: workerAddress });
    ethTestUtils.advanceXConfirmations(api.w3())
    const event = await deployPromise;

    assert.strictEqual(event.SecretContractDeployed.codeHash, codeHash);

    const countSCsAfter = await api.countSecretContracts();
    assert.strictEqual(countSCsAfter, 1);

    const observedCodeHash = await api.getContractParams(secretContractAddress);
    assert.strictEqual(observedCodeHash.codeHash, codeHash);
  })

  it('worker deploy secret contract event', async function () {
    return new Promise(async resolve => {
      const registerPromise = api.register(workerEnclaveSigningAddress, workerReport, signature, { from: workerAddress });
      ethTestUtils.advanceXConfirmations(api.w3())
      await registerPromise;

      const depositPromise = api.deposit(workerAddress, 1000, { from: workerAddress });
      ethTestUtils.advanceXConfirmations(api.w3())
      await depositPromise;

      const loginPromise = api.login({ from: workerAddress });
      ethTestUtils.advanceXConfirmations(api.w3())
      await loginPromise;

      const countSCsBefore = await api.countSecretContracts();
      assert.strictEqual(countSCsBefore, 0);

      const secretContractAddress = utils.remove0x(api.w3().utils.randomHex(32));
      const codeHash = api.w3().utils.sha3(JSON.stringify(testParameters.bytecode));
      const initStateDeltaHash = api.w3().utils.randomHex(32);
      const zeroAddress = '0x0000000000000000000000000000000000000000';
      const gasUsed = 10;

      eventSubscribe(api, constants.RAW_ETHEREUM_EVENTS.SecretContractDeployed, {}, getEventRecievedFunc(constants.RAW_ETHEREUM_EVENTS.SecretContractDeployed,
        async event => {
          assert.strictEqual(event.codeHash, codeHash);

          const countSCsAfter = await api.countSecretContracts();
          assert.strictEqual(countSCsAfter, 1);

          const observedCodeHash = await api.getContractParams(secretContractAddress);
          assert.strictEqual(observedCodeHash.codeHash, codeHash);

          resolve();
        })
      );

      api.deploySecretContract(secretContractAddress, codeHash, codeHash, initStateDeltaHash, "0x00", zeroAddress, gasUsed, workerEnclaveSigningAddress, { from: workerAddress });
      ethTestUtils.advanceXConfirmations(api.w3())
    })
  })

  it('worker deploy secret contract failure', async function () {
    const registerPromise = api.register(workerEnclaveSigningAddress, workerReport, signature, { from: workerAddress });
    ethTestUtils.advanceXConfirmations(api.w3())
    await registerPromise;

    const depositPromise = api.deposit(workerAddress, 1000, { from: workerAddress });
    ethTestUtils.advanceXConfirmations(api.w3())
    await depositPromise;

    const loginPromise = api.login({ from: workerAddress });
    ethTestUtils.advanceXConfirmations(api.w3())
    await loginPromise;

    const countSCsBefore = await api.countSecretContracts();
    assert.strictEqual(countSCsBefore, 0);

    const codeHash = api.w3().utils.sha3(JSON.stringify(testParameters.bytecode));
    const gasUsed = 10;
    const taskId1 = utils.remove0x(api.w3().utils.randomHex(32));

    const deployFailurePromise = api.deploySecretContractFailure(taskId1, codeHash, gasUsed, signature, { from: workerAddress });
    ethTestUtils.advanceXConfirmations(api.w3())
    const events = await deployFailurePromise;

    assert.strictEqual(events.ReceiptFailed.signature, signature);
    assert.strictEqual(events.ReceiptFailed.taskId, taskId1);

    const countSCsAfter = await api.countSecretContracts();
    assert.strictEqual(countSCsAfter, 0);
  })

  it('worker deploy secret contract failure event', async function () {
    return new Promise(async resolve => {
      const registerPromise = api.register(workerEnclaveSigningAddress, workerReport, signature, { from: workerAddress });
      ethTestUtils.advanceXConfirmations(api.w3())
      await registerPromise;

      const depositPromise = api.deposit(workerAddress, 1000, { from: workerAddress });
      ethTestUtils.advanceXConfirmations(api.w3())
      await depositPromise;

      const loginPromise = api.login({ from: workerAddress });
      ethTestUtils.advanceXConfirmations(api.w3())
      await loginPromise;

      const countSCsBefore = await api.countSecretContracts();
      assert.strictEqual(countSCsBefore, 0);

      const codeHash = api.w3().utils.sha3(JSON.stringify(testParameters.bytecode));
      const gasUsed = 10;
      const taskId1 = utils.remove0x(api.w3().utils.randomHex(32));

      eventSubscribe(api, constants.RAW_ETHEREUM_EVENTS.ReceiptFailed, {}, getEventRecievedFunc(constants.RAW_ETHEREUM_EVENTS.ReceiptFailed,
        async event => {
          assert.strictEqual(event.signature, signature);
          assert.strictEqual(event.taskId, taskId1);

          const countSCsAfter = await api.countSecretContracts();
          assert.strictEqual(countSCsAfter, 0);
          resolve();
        })
      );

      api.deploySecretContractFailure(taskId1, codeHash, gasUsed, signature, { from: workerAddress });
      ethTestUtils.advanceXConfirmations(api.w3())
    })
  })

  it('worker logout', async function () {
    const registerPromise = api.register(workerEnclaveSigningAddress, workerReport, signature, { from: workerAddress });
    ethTestUtils.advanceXConfirmations(api.w3())
    await registerPromise;

    const depositPromise = api.deposit(workerAddress, 1000, { from: workerAddress });
    ethTestUtils.advanceXConfirmations(api.w3())
    await depositPromise;

    const loginPromise = api.login({ from: workerAddress });
    ethTestUtils.advanceXConfirmations(api.w3())
    await loginPromise;

    const loggedInWorker = await api.getWorker(workerAddress)
    assert.strictEqual(loggedInWorker.status, constants.ETHEREUM_WORKER_STATUS.LOGGEDIN)

    const logoutPromise = api.logout({ from: workerAddress });
    ethTestUtils.advanceXConfirmations(api.w3())
    await logoutPromise;

    const loggedOutWorker = await api.getWorker(workerAddress)
    assert.strictEqual(loggedOutWorker.status, constants.ETHEREUM_WORKER_STATUS.LOGGEDOUT)
  })

  it('worker logout event', async function () {
    return new Promise(async resolve => {
      const registerPromise = api.register(workerEnclaveSigningAddress, workerReport, signature, { from: workerAddress });
      ethTestUtils.advanceXConfirmations(api.w3())
      await registerPromise;

      const depositePromise = api.deposit(workerAddress, 1000, { from: workerAddress });
      ethTestUtils.advanceXConfirmations(api.w3())
      await depositePromise;

      const loginPromise = api.login({ from: workerAddress });
      ethTestUtils.advanceXConfirmations(api.w3())
      await loginPromise;

      eventSubscribe(api, constants.RAW_ETHEREUM_EVENTS.LoggedOut, {}, getEventRecievedFunc(constants.RAW_ETHEREUM_EVENTS.LoggedOut,
        async (result) => {
          assert.strictEqual(result.workerAddress, workerAddress);
          const worker = await api.getWorker(workerAddress)
          assert.strictEqual(worker.status, constants.ETHEREUM_WORKER_STATUS.LOGGEDOUT)
          resolve();
        })
      );

      api.logout({ from: workerAddress });
      ethTestUtils.advanceXConfirmations(api.w3())
    })
  })

  it('worker withdraw', async function () {
    const registerPromise = api.register(workerEnclaveSigningAddress, workerReport, signature, { from: workerAddress });
    ethTestUtils.advanceXConfirmations(api.w3())
    await registerPromise;

    const depositValue = 1000;
    const withdrawValue = 10;

    const depositPromise = api.deposit(workerAddress, depositValue, { from: workerAddress });
    ethTestUtils.advanceXConfirmations(api.w3())
    await depositPromise;

    const workerBefore = await api.getWorker(workerAddress)
    assert.strictEqual(workerBefore.balance, depositValue)

    // We have to login/logout because of a weird behavior in Enigma.sol:
    // https://github.com/enigmampc/enigma-contract/blob/08346f20aad4ff7377a7ff1f737e9a3ab76d0c04/contracts/Enigma.sol#L87-L96
    // TODO remove the login/logout sequence when the behavior is fixed in Enigma.sol
    const loginPromise = api.login({ from: workerAddress });
    ethTestUtils.advanceXConfirmations(api.w3())
    await loginPromise;

    const logoutPromise = api.logout({ from: workerAddress });
    ethTestUtils.advanceXConfirmations(api.w3())
    await logoutPromise;

    const withdrawPromise = api.withdraw(withdrawValue, { from: workerAddress });
    ethTestUtils.advanceXConfirmations(api.w3())
    await withdrawPromise;

    const workerAfter = await api.getWorker(workerAddress)
    assert.strictEqual(workerAfter.balance, depositValue - withdrawValue)
  })

  it('worker withdraw event', async function () {
    return new Promise(async resolve => {
      const registerPromise = api.register(workerEnclaveSigningAddress, workerReport, signature, { from: workerAddress });
      ethTestUtils.advanceXConfirmations(api.w3())
      await registerPromise;

      const depositValue = 1000;
      const withdrawValue = 10;

      const depositPromise = api.deposit(workerAddress, depositValue, { from: workerAddress });
      ethTestUtils.advanceXConfirmations(api.w3())
      await depositPromise;

      const workerBefore = await api.getWorker(workerAddress)
      assert.strictEqual(workerBefore.balance, depositValue)

      // We have to login/logout because of a weird behavior in Enigma.sol:
      // https://github.com/enigmampc/enigma-contract/blob/08346f20aad4ff7377a7ff1f737e9a3ab76d0c04/contracts/Enigma.sol#L87-L96
      // TODO remove the login/logout sequence when the behavior is fixed in Enigma.sol
      const loginPromise = api.login({ from: workerAddress });
      ethTestUtils.advanceXConfirmations(api.w3())
      await loginPromise;

      const logoutPromise = api.logout({ from: workerAddress });
      ethTestUtils.advanceXConfirmations(api.w3())
      await logoutPromise;

      eventSubscribe(api, constants.RAW_ETHEREUM_EVENTS.WithdrawSuccessful, {}, getEventRecievedFunc(constants.RAW_ETHEREUM_EVENTS.WithdrawSuccessful,
        async result => {
          const workerAfter = await api.getWorker(workerAddress)
          assert.strictEqual(workerAfter.balance, depositValue - withdrawValue)
          resolve();
        })
      );

      api.withdraw(withdrawValue, { from: workerAddress });
      ethTestUtils.advanceXConfirmations(api.w3())
    });
  });

  it('worker create task', async function () {
    const registerPromise = api.register(workerEnclaveSigningAddress, workerReport, signature, { from: workerAddress });
    ethTestUtils.advanceXConfirmations(api.w3())
    await registerPromise;

    const depositPromise = api.deposit(workerAddress, 1000, { from: workerAddress });
    ethTestUtils.advanceXConfirmations(api.w3())
    await depositPromise;

    const loginPromise = api.login({ from: workerAddress });
    ethTestUtils.advanceXConfirmations(api.w3())
    await loginPromise;

    const countSCsBefore = await api.countSecretContracts();
    assert.strictEqual(countSCsBefore, 0);

    const secretContractAddress = utils.remove0x(api.w3().utils.randomHex(32));
    const codeHash = api.w3().utils.sha3(JSON.stringify(testParameters.bytecode));
    const initStateDeltaHash = api.w3().utils.randomHex(32);
    const zeroAddress = '0x0000000000000000000000000000000000000000';
    const gasUsed = 10;

    const deployPromise = api.deploySecretContract(secretContractAddress, codeHash, codeHash, initStateDeltaHash, "0x00", zeroAddress, gasUsed, workerEnclaveSigningAddress, { from: workerAddress });
    ethTestUtils.advanceXConfirmations(api.w3())
    await deployPromise;

    const inputsHash = api.w3().utils.randomHex(32);
    const gasLimit = 7;
    const gasPrice = 10;
    const firstBlockNumber = 17;
    const nonce = 0;


    const mock_taskId = "0xf29647ec8920b552fa96de8cc3129b5ba70471b190c8ec5a4793467f12ad84e9";
    // (This is hard coded into TaskImpl.sol - https://github.com/enigmampc/enigma-p2p/blob/2f9085286e849e94d13da06f34884eeec7d7d4b0/test/ethereum/scripts/contracts/impl/TaskImpl.sol#L63)

    const deployTaskPromise = api.createDeploymentTaskRecord(inputsHash, gasLimit, gasPrice, firstBlockNumber, nonce);
    ethTestUtils.advanceXConfirmations(api.w3())
    await deployTaskPromise;

    const taskParams = await api.getTaskParams(mock_taskId);
    assert.strictEqual(taskParams.inputsHash, inputsHash);
    assert.strictEqual(taskParams.gasLimit, gasLimit);
    assert.strictEqual(taskParams.gasPrice, gasPrice);
    assert.strictEqual(taskParams.senderAddress, workerAccount.address);
    assert.strictEqual(taskParams.outputHash, constants.ETHEREUM_EMPTY_HASH);
    assert.strictEqual(taskParams.status, constants.ETHEREUM_TASK_STATUS.RECORD_CREATED);
  });

  it('worker create task event', async function () {
    return new Promise(async resolve => {
      const registerPromise = api.register(workerEnclaveSigningAddress, workerReport, signature, { from: workerAddress });
      ethTestUtils.advanceXConfirmations(api.w3())
      await registerPromise;

      const depositPromise = api.deposit(workerAddress, 1000, { from: workerAddress });
      ethTestUtils.advanceXConfirmations(api.w3())
      await depositPromise;

      const loginPromise = api.login({ from: workerAddress });
      ethTestUtils.advanceXConfirmations(api.w3())
      await loginPromise;

      const countSCsBefore = await api.countSecretContracts();
      assert.strictEqual(countSCsBefore, 0);

      const secretContractAddress = utils.remove0x(api.w3().utils.randomHex(32));
      const codeHash = api.w3().utils.sha3(JSON.stringify(testParameters.bytecode));
      const initStateDeltaHash = api.w3().utils.randomHex(32);
      const zeroAddress = '0x0000000000000000000000000000000000000000';
      const gasUsed = 10;

      const deployPromise = api.deploySecretContract(secretContractAddress, codeHash, codeHash, initStateDeltaHash, "0x00", zeroAddress, gasUsed, workerEnclaveSigningAddress, { from: workerAddress });
      ethTestUtils.advanceXConfirmations(api.w3())
      await deployPromise;

      const inputsHash = api.w3().utils.randomHex(32);
      const gasLimit = 7;
      const gasPrice = 10;
      const firstBlockNumber = 17;
      const nonce = 0;

      const mock_taskId = "0xf29647ec8920b552fa96de8cc3129b5ba70471b190c8ec5a4793467f12ad84e9";
      // (This is hard coded into TaskImpl.sol - https://github.com/enigmampc/enigma-p2p/blob/2f9085286e849e94d13da06f34884eeec7d7d4b0/test/ethereum/scripts/contracts/impl/TaskImpl.sol#L63)

      eventSubscribe(api, constants.RAW_ETHEREUM_EVENTS.TaskRecordCreated, {}, getEventRecievedFunc(constants.RAW_ETHEREUM_EVENTS.TaskRecordCreated,
        result => {
          assert.strictEqual(result.taskId, mock_taskId);
          assert.strictEqual(result.gasLimit, gasLimit);
          assert.strictEqual(result.gasPrice, gasPrice);
          assert.strictEqual(result.senderAddress, workerAccount.address);
          assert.strictEqual(result.inputsHash, inputsHash);
          resolve();
        }));

      const deployTaskPromise = api.createDeploymentTaskRecord(inputsHash, gasLimit, gasPrice, firstBlockNumber, nonce);
      ethTestUtils.advanceXConfirmations(api.w3())
      await deployTaskPromise;
    });
  });
});



  // it('Register, login, deploy secret contract, create tasks and commit receipts/failure using the BUILDER ', async function () {
  //   const tree = TEST_TREE.ethereum;
  //   if (!tree['all'] || !tree['#2']) {
  //     this.skip();
  //   }

  //   return new Promise(async function (resolve) {
  //     const { res, workerAccount, builder } = await init();

  //     const config = { enigmaContractAddress: builder.enigmaContractAddress, enigmaContractABI: builder.enigmaContractABI };
  //     const builder2 = new EnigmaContractAPIBuilder();
  //     const res2 = await builder2.setAccountKey(workerAccount.privateKey).useDeployed(config).setEthereumAddress(workerAccount.address).build();

  //     const api = res2.api;
  //     const web3 = api.w3();

  //     const accounts = await web3.eth.getAccounts();

  //     const workerEnclaveSigningAddress = accounts[3];
  //     const workerReport = testParameters.report;
  //     const secretContractAddress = utils.remove0x(web3.utils.randomHex(32));
  //     const codeHash = web3.utils.sha3(JSON.stringify(testParameters.bytecode));
  //     const signature = web3.utils.randomHex(32);
  //     const initStateDeltaHash = web3.utils.randomHex(32);
  //     const gasUsed = 10;
  //     const depositValue = 1000;
  //     const optionalEthereumData = '0x00';
  //     const optionalEthereumContractAddress = '0x0000000000000000000000000000000000000000';

  //     await api.register(workerEnclaveSigningAddress, workerReport, signature);
  //     await api.selfDeposit(depositValue);
  //     await api.login();

  //     const workerState = await api.getWorker(workerAccount.address);

  //     assert.strictEqual(workerState.report, workerReport);
  //     assert.strictEqual(workerState.status, constants.ETHEREUM_WORKER_STATUS.LOGGEDIN);
  //     assert.strictEqual(workerState.balance, depositValue);
  //     assert.strictEqual(workerState.address, workerEnclaveSigningAddress);

  //     await api.deploySecretContract(secretContractAddress, codeHash, codeHash, initStateDeltaHash, optionalEthereumData,
  //       optionalEthereumContractAddress, gasUsed, workerEnclaveSigningAddress);


  //     const contractParams = await api.getContractParams(secretContractAddress);
  //     assert.strictEqual(contractParams.preCodeHash, codeHash);
  //     assert.strictEqual(contractParams.codeHash, codeHash);
  //     assert.strictEqual(contractParams.deltaHashes.length, 1);
  //     assert.strictEqual(contractParams.deltaHashes[0], initStateDeltaHash);
  //     assert.strictEqual(contractParams.status, 1);

  //     const taskId1 = utils.remove0x(web3.utils.randomHex(32));
  //     const taskId2 = utils.remove0x(web3.utils.randomHex(32));
  //     const taskId3 = utils.remove0x(web3.utils.randomHex(32));
  //     const taskId4 = utils.remove0x(web3.utils.randomHex(32));

  //     const inputsHash = web3.utils.randomHex(32);
  //     const gasLimit = 7;
  //     const gasPrice = 10;
  //     const firstBlockNumber = 17;
  //     const nonce = 0;

  //     const mock_taskId = "0xf29647ec8920b552fa96de8cc3129b5ba70471b190c8ec5a4793467f12ad84e9";

  //     eventSubscribe(api, constants.RAW_ETHEREUM_EVENTS.TaskRecordCreated, {}, getEventRecievedFunc(constants.RAW_ETHEREUM_EVENTS.TaskRecordCreated,
  //       (result) => {
  //         assert.strictEqual(result.taskId, mock_taskId);
  //         assert.strictEqual(result.gasLimit, gasLimit);
  //         assert.strictEqual(result.gasPrice, gasPrice);
  //         assert.strictEqual(result.senderAddress, workerAccount.address);
  //       }));

  //     await api.createDeploymentTaskRecord(inputsHash, gasLimit, gasPrice, firstBlockNumber, nonce);


  //     const taskParams = await api.getTaskParams(mock_taskId);
  //     assert.strictEqual(inputsHash, taskParams.inputsHash);
  //     assert.strictEqual(gasLimit, taskParams.gasLimit);
  //     assert.strictEqual(gasPrice, taskParams.gasPrice);
  //     assert.strictEqual(workerAccount.address, taskParams.senderAddress);
  //     assert.strictEqual(constants.ETHEREUM_EMPTY_HASH, taskParams.outputHash);
  //     assert.strictEqual(1, taskParams.status);

  //     const stateDeltaHash1 = web3.utils.randomHex(32);
  //     const stateDeltaHash2 = web3.utils.randomHex(32);
  //     const stateDeltaHash3 = web3.utils.randomHex(32);
  //     const outputHash1 = web3.utils.randomHex(32);
  //     const outputHash2 = web3.utils.randomHex(32);
  //     const outputHash3 = web3.utils.randomHex(32);

  //     let count = 0;
  //     eventSubscribe(api, constants.RAW_ETHEREUM_EVENTS.ReceiptVerified, {}, getEventRecievedFunc(constants.RAW_ETHEREUM_EVENTS.ReceiptVerified,
  //       (result) => {
  //         switch (count) {
  //           case 0:
  //             assert.strictEqual(result.taskId, taskId1);
  //             assert.strictEqual(result.stateDeltaHash, stateDeltaHash1);
  //             assert.strictEqual(result.outputHash, outputHash1);
  //             break;
  //           case 1:
  //             assert.strictEqual(result.taskId, taskId2);
  //             assert.strictEqual(result.stateDeltaHash, stateDeltaHash2);
  //             assert.strictEqual(result.outputHash, outputHash2);
  //             break;
  //           case 2:
  //             assert.strictEqual(result.taskId, taskId3);
  //             assert.strictEqual(result.stateDeltaHash, stateDeltaHash3);
  //             assert.strictEqual(result.outputHash, outputHash3);
  //             break;
  //         }
  //         count += 1;
  //       }));


  //     eventSubscribe(api, constants.RAW_ETHEREUM_EVENTS.ReceiptFailed, {}, getEventRecievedFunc(constants.RAW_ETHEREUM_EVENTS.ReceiptFailed,
  //       (result) => {
  //         assert.strictEqual(result.taskId, taskId4);
  //         assert.strictEqual(result.signature, signature);
  //       }));

  //     // Login the worker before committing receipts
  //     await api.commitReceipt(secretContractAddress, taskId1, stateDeltaHash1, outputHash1,
  //       optionalEthereumData, optionalEthereumContractAddress, gasUsed, signature);

  //     await api.commitReceipt(secretContractAddress, taskId2, stateDeltaHash2, outputHash2,
  //       optionalEthereumData, optionalEthereumContractAddress, gasUsed, signature);

  //     await api.commitReceipt(secretContractAddress, taskId3, stateDeltaHash3, outputHash3,
  //       optionalEthereumData, optionalEthereumContractAddress, gasUsed, signature);

  //     await api.commitTaskFailure(secretContractAddress, taskId4, outputHash1, gasUsed, signature);

  //     api.unsubscribeAll();
  //     await api.logout();
  //     await res2.environment.destroy();
  //     await res.environment.destroy();

  //     resolve();
  //   });
  // });

  // it('State sync: empty local tips, partial local tips, partial local tips 2, full local tips', async function () {
  //   const tree = TEST_TREE.ethereum;
  //   if (!tree['all'] || !tree['#3']) {
  //     this.skip();
  //   }

  //   return new Promise(async function (resolve) {
  //     const { res, workerAccount } = await init();

  //     const api = res.api;
  //     const web3 = api.w3();

  //     const accounts = await web3.eth.getAccounts();
  //     const workerEnclaveSigningAddress = accounts[3];
  //     const workerAddress = workerAccount.address;
  //     const workerReport = testParameters.report;// "0x123456";
  //     const secretContractAddress1 = utils.remove0x(web3.utils.randomHex(32)); // accounts[5];
  //     const secretContractAddress2 = utils.remove0x(web3.utils.randomHex(32)); // accounts[4];
  //     const codeHash = web3.utils.sha3(JSON.stringify(testParameters.bytecode));
  //     const codeHash2 = web3.utils.sha3(web3.utils.randomHex(32));
  //     const signature = api.w3().utils.randomHex(32);
  //     const initStateDeltaHash = api.w3().utils.randomHex(32);
  //     const gasUsed = 10;
  //     const depositValue = 1000;
  //     const optionalEthereumData = '0x00';
  //     const optionalEthereumContractAddress = '0x0000000000000000000000000000000000000000';

  //     await api.register(workerEnclaveSigningAddress, workerReport, signature, { from: workerAddress });
  //     await api.deposit(workerAddress, depositValue, { from: workerAddress });
  //     await api.login({ from: workerAddress });

  //     await api.deploySecretContract(secretContractAddress1, codeHash, codeHash, initStateDeltaHash, optionalEthereumData,
  //       optionalEthereumContractAddress, gasUsed, workerEnclaveSigningAddress, { from: workerAddress });
  //     await api.deploySecretContract(secretContractAddress2, codeHash2, codeHash2, initStateDeltaHash, optionalEthereumData,
  //       optionalEthereumContractAddress, gasUsed, workerEnclaveSigningAddress, { from: workerAddress });

  //     const taskId1 = utils.remove0x(web3.utils.randomHex(32));
  //     const taskId2 = utils.remove0x(web3.utils.randomHex(32));
  //     const taskId3 = utils.remove0x(web3.utils.randomHex(32));
  //     const taskId4 = utils.remove0x(web3.utils.randomHex(32));


  //     const stateDeltaHash1 = web3.utils.randomHex(32);
  //     const stateDeltaHash2 = web3.utils.randomHex(32);
  //     const stateDeltaHash3 = web3.utils.randomHex(32);
  //     const stateDeltaHash4 = web3.utils.randomHex(32);
  //     const outputHash1 = web3.utils.randomHex(32);
  //     const outputHash2 = web3.utils.randomHex(32);
  //     const outputHash3 = web3.utils.randomHex(32);
  //     const outputHash4 = web3.utils.randomHex(32);

  //     await api.commitReceipt(secretContractAddress1, taskId1, stateDeltaHash1, outputHash1, optionalEthereumData, optionalEthereumContractAddress,
  //       gasUsed, signature, { from: workerAddress });

  //     await api.commitReceipt(secretContractAddress1, taskId2, stateDeltaHash2, outputHash2, optionalEthereumData, optionalEthereumContractAddress, gasUsed,
  //       signature, { from: workerAddress });

  //     await api.commitReceipt(secretContractAddress1, taskId3, stateDeltaHash3, outputHash3, optionalEthereumData, optionalEthereumContractAddress, gasUsed,
  //       signature, { from: workerAddress });

  //     await api.commitReceipt(secretContractAddress2, taskId4, stateDeltaHash4, outputHash4, optionalEthereumData, optionalEthereumContractAddress, gasUsed,
  //       signature, { from: workerAddress });

  //     StateSync.getRemoteMissingStates(api, [], (err, results) => {
  //       // DONE results == [{address, deltas : [deltaHash, index]}]
  //       assert.strictEqual(results.length, 2);

  //       assert.strictEqual(results[0].address, secretContractAddress1);
  //       assert.strictEqual(results[0].deltas[0].index, 0);
  //       assert.strictEqual(results[0].deltas[0].deltaHash, initStateDeltaHash);
  //       assert.strictEqual(results[0].deltas[1].index, 1);
  //       assert.strictEqual(results[0].deltas[1].deltaHash, stateDeltaHash1);
  //       assert.strictEqual(results[0].deltas[2].index, 2);
  //       assert.strictEqual(results[0].deltas[2].deltaHash, stateDeltaHash2);
  //       assert.strictEqual(results[0].deltas[3].index, 3);
  //       assert.strictEqual(results[0].deltas[3].deltaHash, stateDeltaHash3);
  //       assert.strictEqual(results[0].deltas.length, 4);
  //       assert.strictEqual(results[0].bytecodeHash, codeHash, 'the bytecode is not equal to the codeHash');

  //       assert.strictEqual(results[1].address, secretContractAddress2);
  //       assert.strictEqual(results[1].deltas[0].index, 0);
  //       assert.strictEqual(results[1].deltas[0].deltaHash, initStateDeltaHash);
  //       assert.strictEqual(results[1].deltas[1].index, 1);
  //       assert.strictEqual(results[1].deltas[1].deltaHash, stateDeltaHash4);
  //       assert.strictEqual(results[1].deltas.length, 2);
  //       assert.strictEqual(results[1].bytecodeHash, codeHash2);

  //       StateSync.getRemoteMissingStates(api, [{ address: secretContractAddress1, key: 0 }], (err, results) => {
  //         // DONE results == [{address, deltas : [deltaHash, index]}]
  //         assert.strictEqual(results.length, 2);

  //         assert.strictEqual(results[0].address, secretContractAddress1);
  //         assert.strictEqual(results[0].deltas[0].index, 1);
  //         assert.strictEqual(results[0].deltas[0].deltaHash, stateDeltaHash1);
  //         assert.strictEqual(results[0].deltas[1].index, 2);
  //         assert.strictEqual(results[0].deltas[1].deltaHash, stateDeltaHash2);
  //         assert.strictEqual(results[0].deltas[2].index, 3);
  //         assert.strictEqual(results[0].deltas[2].deltaHash, stateDeltaHash3);
  //         assert.strictEqual(results[0].deltas.length, 3);
  //         assert.strictEqual('bytecodeHash' in results[0], false);

  //         assert.strictEqual(results[1].address, secretContractAddress2);
  //         assert.strictEqual(results[1].deltas[0].index, 0);
  //         assert.strictEqual(results[1].deltas[0].deltaHash, initStateDeltaHash);
  //         assert.strictEqual(results[1].deltas[1].index, 1);
  //         assert.strictEqual(results[1].deltas[1].deltaHash, stateDeltaHash4);
  //         assert.strictEqual(results[1].deltas.length, 2);
  //         assert.strictEqual(results[1].bytecodeHash, codeHash2);

  //         StateSync.getRemoteMissingStates(api, [{ address: secretContractAddress1, key: 1 }, { address: secretContractAddress2, key: 1 }], (err, results) => {
  //           // DONE results == [{address, deltas : [deltaHash, index]}]
  //           assert.strictEqual(results.length, 1);

  //           assert.strictEqual(results[0].address, secretContractAddress1);
  //           assert.strictEqual(results[0].deltas[0].index, 2);
  //           assert.strictEqual(results[0].deltas[0].deltaHash, stateDeltaHash2);
  //           assert.strictEqual(results[0].deltas[1].index, 3);
  //           assert.strictEqual(results[0].deltas[1].deltaHash, stateDeltaHash3);
  //           assert.strictEqual(results[0].deltas.length, 2);
  //           assert.strictEqual('bytecodeHash' in results[0], false);

  //           StateSync.getRemoteMissingStates(api, [{ address: secretContractAddress1, key: 3 }, { address: secretContractAddress2, key: 1 }],
  //             async (err, results) => {
  //               // DONE results == [{address, deltas : [deltaHash, index]}]
  //               assert.strictEqual(results.length, 0);

  //               api.unsubscribeAll();
  //               await res.environment.destroy();
  //               resolve();
  //             });
  //         });
  //       });
  //     });
  //   });
  // });

  // it('State sync - failure', async function() {
  //   const tree = TEST_TREE.ethereum;
  //   if (!tree['all'] || !tree['#4']) {
  //     this.skip();
  //   }
  //
  //   return new Promise(async function(resolve) {
  //     const builder = new EnigmaContractAPIBuilder();
  //     let res = await builder.createNetwork().deploy().build();
  //     const api = res.api;
  //     await res.environment.destroy();
  //
  //     StateSync.getRemoteMissingStates(api, [], (err, results)=>{
  //       assert.notStrictEqual(err, null);
  //       resolve();
  //     });
  //   });
  // });

  // it('Test Ethereum services ', async function () {
  //   const tree = TEST_TREE.ethereum;
  //   if (!tree['all'] || !tree['#5']) {
  //     this.skip();
  //   }

  //   return new Promise(async function (resolve) {
  //     const { res, workerAccount, builder } = await init();
  //     const api = res.api;
  //     const web3 = api.w3();

  //     const services = new EthereumServices(api);
  //     const accounts = await web3.eth.getAccounts();
  //     const workerEnclaveSigningAddress = accounts[3];
  //     const workerAddress = workerAccount.address;
  //     const workerReport = testParameters.report;// "0x123456";
  //     const secretContractAddress = utils.remove0x(web3.utils.randomHex(32)); // accounts[5];
  //     const codeHash = web3.utils.sha3(JSON.stringify(testParameters.bytecode));
  //     const signature = web3.utils.randomHex(32);
  //     const initStateDeltaHash = web3.utils.randomHex(32);
  //     const gasUsed = 10;
  //     const outputHash1 = web3.utils.randomHex(32);
  //     const outputHash2 = web3.utils.randomHex(32);
  //     const outputHash3 = web3.utils.randomHex(32);
  //     const depositValue = 1000;
  //     const optionalEthereumData = '0x00';
  //     const optionalEthereumContractAddress = '0x0000000000000000000000000000000000000000';

  //     await api.register(workerEnclaveSigningAddress, workerReport, signature, { from: workerAddress });
  //     await api.deposit(workerAddress, depositValue, { from: workerAddress });
  //     await api.login({ from: workerAddress });

  //     await api.deploySecretContract(secretContractAddress, codeHash, codeHash, initStateDeltaHash, optionalEthereumData,
  //       optionalEthereumContractAddress, gasUsed, workerEnclaveSigningAddress, { from: workerAddress });

  //     const taskId1 = utils.remove0x(web3.utils.randomHex(32));
  //     const taskId2 = utils.remove0x(web3.utils.randomHex(32));
  //     const taskId3 = utils.remove0x(web3.utils.randomHex(32));

  //     services.initServices(['TaskCreation', 'TaskSuccessSubmission']);

  //     const stateDeltaHash1 = web3.utils.randomHex(32);
  //     const stateDeltaHash2 = web3.utils.randomHex(32);
  //     const stateDeltaHash3 = web3.utils.randomHex(32);

  //     let recieptIndex = 0;

  //     services.on('TaskSuccessSubmission', (err, result) => {
  //       if (recieptIndex === 0) {
  //         assert.strictEqual(result.taskId, taskId1);
  //         assert.strictEqual(result.stateDeltaHash, stateDeltaHash1);
  //         assert.strictEqual(result.outputHash, outputHash1);
  //       }
  //       else if (recieptIndex === 1) {
  //         assert.strictEqual(result.taskId, taskId2);
  //         assert.strictEqual(result.stateDeltaHash, stateDeltaHash2);
  //         assert.strictEqual(result.outputHash, outputHash2);
  //       }
  //       else if (recieptIndex === 2) {
  //         assert.strictEqual(result.taskId, taskId3);
  //         assert.strictEqual(result.stateDeltaHash, stateDeltaHash3);
  //         assert.strictEqual(result.outputHash, outputHash3);
  //       }
  //       recieptIndex += 1;
  //     });

  //     await api.commitReceipt(secretContractAddress, taskId1, stateDeltaHash1, outputHash1, optionalEthereumData,
  //       optionalEthereumContractAddress, gasUsed, signature, { from: workerAddress });

  //     await api.commitReceipt(secretContractAddress, taskId2, stateDeltaHash2, outputHash2, optionalEthereumData,
  //       optionalEthereumContractAddress, gasUsed, signature, { from: workerAddress });

  //     await api.commitReceipt(secretContractAddress, taskId3, stateDeltaHash3, outputHash3, optionalEthereumData,
  //       optionalEthereumContractAddress, gasUsed, signature, { from: workerAddress });

  //     api.unsubscribeAll();

  //     await res.environment.destroy();

  //     resolve();
  //   });
  // });
// });
