const path = require('path');
const assert = require('assert');
const EnigmaContractAPIBuilder = require(path.join(__dirname, '../../src/ethereum/EnigmaContractAPIBuilder'));
const testParameters = require('./test_parameters.json');
const constants = require('../../src/common/constants');
const utils = require('../../src/common/utils');
const Web3 = require('web3');
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
    const res = await builder.setAccountKey(workerAccount.privateKey).setMinimunConfirmations(constants.MINIMUM_CONFIRMATIONS).createNetwork().deploy().build();
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
    const result = await deployPromise;

    assert.strictEqual(result.SecretContractDeployed.codeHash, codeHash);
    assert.strictEqual(result.SecretContractDeployed.secretContractAddress, secretContractAddress);
    assert.strictEqual(result.SecretContractDeployed.stateDeltaHash, initStateDeltaHash);

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
        async result => {
          assert.strictEqual(result.codeHash, codeHash);
          assert.strictEqual(result.secretContractAddress, secretContractAddress);
          assert.strictEqual(result.stateDeltaHash, initStateDeltaHash);

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

  it('worker commit receipt', async function () {
    const registerPromise = api.register(workerEnclaveSigningAddress, workerReport, signature, { from: workerAddress });
    ethTestUtils.advanceXConfirmations(api.w3());
    await registerPromise;

    const depositPromise = api.deposit(workerAddress, 1000, { from: workerAddress });
    ethTestUtils.advanceXConfirmations(api.w3());
    await depositPromise;

    const loginPromise = api.login({ from: workerAddress });
    ethTestUtils.advanceXConfirmations(api.w3());
    await loginPromise;

    const secretContractAddress = utils.remove0x(api.w3().utils.randomHex(32));
    const codeHash = api.w3().utils.sha3(JSON.stringify(testParameters.bytecode));
    const initStateDeltaHash = api.w3().utils.randomHex(32);
    const zeroAddress = '0x0000000000000000000000000000000000000000';
    const gasUsed = 10;

    const deployPromise = api.deploySecretContract(secretContractAddress, codeHash, codeHash, initStateDeltaHash, "0x00", zeroAddress, gasUsed, workerEnclaveSigningAddress, { from: workerAddress });
    ethTestUtils.advanceXConfirmations(api.w3())
    await deployPromise;

    const optionalEthereumData = '0x00';
    const optionalEthereumContractAddress = '0x0000000000000000000000000000000000000000';
    const outputHash = api.w3().utils.randomHex(32);
    const stateDeltaHash = api.w3().utils.randomHex(32);
    const taskId = utils.remove0x(api.w3().utils.randomHex(32));

    const receiptPromise = api.commitReceipt(secretContractAddress, taskId, stateDeltaHash, outputHash, optionalEthereumData, optionalEthereumContractAddress, gasUsed, signature);
    ethTestUtils.advanceXConfirmations(api.w3())
    const receipt = await receiptPromise;

    assert.strictEqual(receipt.ReceiptVerified.outputHash, outputHash);
    assert.strictEqual(receipt.ReceiptVerified.stateDeltaHash, stateDeltaHash);
    assert.strictEqual(receipt.ReceiptVerified.stateDeltaHashIndex, 1);
    assert.strictEqual(receipt.ReceiptVerified.taskId, taskId);
  });

  it('worker commit receipt event', async function () {
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

      const secretContractAddress = utils.remove0x(api.w3().utils.randomHex(32));
      const codeHash = api.w3().utils.sha3(JSON.stringify(testParameters.bytecode));
      const initStateDeltaHash = api.w3().utils.randomHex(32);
      const zeroAddress = '0x0000000000000000000000000000000000000000';
      const gasUsed = 10;

      const deployPromise = api.deploySecretContract(secretContractAddress, codeHash, codeHash, initStateDeltaHash, "0x00", zeroAddress, gasUsed, workerEnclaveSigningAddress, { from: workerAddress });
      ethTestUtils.advanceXConfirmations(api.w3())
      await deployPromise;

      const optionalEthereumData = '0x00';
      const optionalEthereumContractAddress = '0x0000000000000000000000000000000000000000';
      const outputHash = api.w3().utils.randomHex(32);
      const stateDeltaHash = api.w3().utils.randomHex(32);
      const taskId = utils.remove0x(api.w3().utils.randomHex(32));

      eventSubscribe(api, constants.RAW_ETHEREUM_EVENTS.ReceiptVerified, {}, getEventRecievedFunc(constants.RAW_ETHEREUM_EVENTS.ReceiptVerified,
        async receipt => {
          assert.strictEqual(receipt.outputHash, outputHash);
          assert.strictEqual(receipt.stateDeltaHash, stateDeltaHash);
          assert.strictEqual(receipt.stateDeltaHashIndex, 1);
          assert.strictEqual(receipt.taskId, taskId);
          resolve();
        })
      );

      api.commitReceipt(secretContractAddress, taskId, stateDeltaHash, outputHash, optionalEthereumData, optionalEthereumContractAddress, gasUsed, signature);
      ethTestUtils.advanceXConfirmations(api.w3())
    });
  });

  it('worker commit task failure', async function () {
    const registerPromise = api.register(workerEnclaveSigningAddress, workerReport, signature, { from: workerAddress });
    ethTestUtils.advanceXConfirmations(api.w3());
    await registerPromise;

    const depositPromise = api.deposit(workerAddress, 1000, { from: workerAddress });
    ethTestUtils.advanceXConfirmations(api.w3());
    await depositPromise;

    const loginPromise = api.login({ from: workerAddress });
    ethTestUtils.advanceXConfirmations(api.w3());
    await loginPromise;

    const secretContractAddress = utils.remove0x(api.w3().utils.randomHex(32));
    const codeHash = api.w3().utils.sha3(JSON.stringify(testParameters.bytecode));
    const initStateDeltaHash = api.w3().utils.randomHex(32);
    const zeroAddress = '0x0000000000000000000000000000000000000000';
    const gasUsed = 10;

    const deployPromise = api.deploySecretContract(secretContractAddress, codeHash, codeHash, initStateDeltaHash, "0x00", zeroAddress, gasUsed, workerEnclaveSigningAddress, { from: workerAddress });
    ethTestUtils.advanceXConfirmations(api.w3())
    await deployPromise;

    const outputHash = api.w3().utils.randomHex(32);
    const taskId = utils.remove0x(api.w3().utils.randomHex(32));

    const taskFailurePromise = api.commitTaskFailure(secretContractAddress, taskId, outputHash, gasUsed, signature);
    ethTestUtils.advanceXConfirmations(api.w3())
    const receipt = await taskFailurePromise;

    assert.strictEqual(receipt.ReceiptFailed.signature, signature);
    assert.strictEqual(receipt.ReceiptFailed.taskId, taskId);
  });

  it('worker commit task failure event', async function () {
    return new Promise(async resolve => {
      const registerPromise = api.register(workerEnclaveSigningAddress, workerReport, signature, { from: workerAddress });
      ethTestUtils.advanceXConfirmations(api.w3());
      await registerPromise;

      const depositPromise = api.deposit(workerAddress, 1000, { from: workerAddress });
      ethTestUtils.advanceXConfirmations(api.w3());
      await depositPromise;

      const loginPromise = api.login({ from: workerAddress });
      ethTestUtils.advanceXConfirmations(api.w3());
      await loginPromise;

      const secretContractAddress = utils.remove0x(api.w3().utils.randomHex(32));
      const codeHash = api.w3().utils.sha3(JSON.stringify(testParameters.bytecode));
      const initStateDeltaHash = api.w3().utils.randomHex(32);
      const zeroAddress = '0x0000000000000000000000000000000000000000';
      const gasUsed = 10;

      const deployPromise = api.deploySecretContract(secretContractAddress, codeHash, codeHash, initStateDeltaHash, "0x00", zeroAddress, gasUsed, workerEnclaveSigningAddress, { from: workerAddress });
      ethTestUtils.advanceXConfirmations(api.w3())
      await deployPromise;

      const outputHash = api.w3().utils.randomHex(32);
      const taskId = utils.remove0x(api.w3().utils.randomHex(32));

      eventSubscribe(api, constants.RAW_ETHEREUM_EVENTS.ReceiptFailed, {}, getEventRecievedFunc(constants.RAW_ETHEREUM_EVENTS.ReceiptFailed,
        async receipt => {
          assert.strictEqual(receipt.signature, signature);
          assert.strictEqual(receipt.taskId, taskId);
          resolve();
        })
      );

      api.commitTaskFailure(secretContractAddress, taskId, outputHash, gasUsed, signature);
      ethTestUtils.advanceXConfirmations(api.w3())
    });
  });
});
