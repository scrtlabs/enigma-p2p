const assert = require('assert');
const path = require('path');
const waterfall = require('async/waterfall');
const TEST_TREE = require('./test_tree').TEST_TREE;
const CoreServer = require('../src/core/core_server_mock/core_server');
const EnvironmentBuilder = require('../src/main_controller/EnvironmentBuilder');
const testUtils = require('./testUtils/utils');
const ethTestUtils = require('./ethereum/utils');
const crypto = require('../src/common/cryptography');

const B2Path = path.join(__dirname, './testUtils/id-l');
const B2Port = '10301';

const constants = require('../src/common/constants');
const MsgTypes = constants.P2P_MESSAGES;
const DbUtils = require('../src/common/DbUtils');

const SYNC_SCENARIOS = { EMPTY_DB: 1, PARTIAL_DB_WITH_SOME_ADDRESSES: 2, PARTIAL_DB_WITH_ALL_ADDRESSES: 3 };

const EnigmaContractAPIBuilder = require(path.join(__dirname, '../src/ethereum/EnigmaContractAPIBuilder'));
const Verifier = require('../src/worker/state_sync/receiver/StateSyncReqVerifier');
const Web3 = require('web3');

const SyncMsgBuilder = require('../src/policy/p2p_messages/sync_messages').SyncMsgBuilder;

const parallel = require('async/parallel');

async function initEthereumStuff() {
  const workerAccount = new Web3().eth.accounts.create();

  const builder = new EnigmaContractAPIBuilder();
  const res = await builder.setAccountKey(workerAccount.privateKey).createNetwork().deploy().build();
  const enigmaContractApi = res.api;
  const web3 = enigmaContractApi.w3();

  const accounts = await web3.eth.getAccounts();
  const WORKER_WEI_VALUE = 100000000000000000;
  await web3.eth.sendTransaction({ from: accounts[4], to: workerAccount.address, value: WORKER_WEI_VALUE });

  const workerEnclaveSigningAddress = accounts[0];
  const workerAddress = workerAccount.address;
  const workerReport = '0x123456';
  const signature = web3.utils.randomHex(32);
  const depositValue = 1000;

  const registerPromise = enigmaContractApi.register(workerEnclaveSigningAddress, workerReport, signature, { from: workerAddress });
  ethTestUtils.advanceXConfirmations(enigmaContractApi.w3())
  await registerPromise;

  const depositPromise = enigmaContractApi.deposit(workerAddress, depositValue, { from: workerAddress });
  ethTestUtils.advanceXConfirmations(enigmaContractApi.w3())
  await depositPromise;

  const loginPromise = enigmaContractApi.login({ from: workerAddress });
  ethTestUtils.advanceXConfirmations(enigmaContractApi.w3())
  await loginPromise;

  return {
    enigmaContractAddress: res.enigmaContractAddress, enigmaContractApi: enigmaContractApi, web3: web3,
    workerEnclaveSigningAddress: workerEnclaveSigningAddress,
    workerAddress: workerAddress,
    environment: res.environment
  };
}

async function stopEthereumStuff(environment) {
  await environment.destroy();
}

function syncResultMsgToStatesMap(resultMsgs) {
  const statesMap = {};

  for (let i = 0; i < resultMsgs.length; ++i) {
    for (let j = 0; j < resultMsgs[i].resultList.length; ++j) {
      const msg = resultMsgs[i].resultList[j].payload;
      if (msg.type() == MsgTypes.SYNC_STATE_RES) {
        const deltas = msg.deltas();
        for (let k = 0; k < deltas.length; ++k) {
          const address = DbUtils.hexToBytes((deltas[k].address));
          if (!(address in statesMap)) {
            statesMap[address] = {};
          }
          const key = deltas[k].key;
          const delta = deltas[k].data;
          statesMap[address][key] = delta;
        }
      } else { // (msg.type() == MsgTypes.SYNC_BCODE_RES)
        const address = DbUtils.hexToBytes(msg.address());
        if (!(address in statesMap)) {
          statesMap[address] = {};
        }
        statesMap[address][-1] = msg.bytecode();
      }
    }
  }
  return statesMap;
}

function prepareSyncTestData(scenario) {
  const res = {};

  if (scenario === SYNC_SCENARIOS.EMPTY_DB) {
    res.tips = [];
    res.expected = ethTestUtils.PROVIDERS_DB_MAP;
  } else if (scenario === SYNC_SCENARIOS.PARTIAL_DB_WITH_SOME_ADDRESSES) {
    res.tips = [{
      address: [13, 214, 171, 4, 67, 23, 118, 195, 84, 56, 103, 199, 97, 21, 226, 55, 220, 54, 212, 246, 174, 203, 51, 171, 28, 30, 63, 158, 131, 64, 181, 42],
      key: 0,
      data: [
        88, 135, 204, 213, 199, 50, 191, 7, 61, 104, 87, 210, 127, 76, 163, 11, 175, 114, 207, 167, 26, 249, 222, 222, 73, 175, 207, 222, 86, 42, 236, 92, 194, 214,
        28, 195, 236, 122, 122, 12, 134, 55, 41, 209, 106, 172, 10, 130, 139, 149, 39, 196, 181, 187, 55, 166, 237, 215, 135, 98, 90, 12, 6, 72, 240, 138, 112, 99, 76, 55, 22,
        207, 92, 200, 194, 48, 70, 123, 210, 240, 15, 213, 37, 16, 235, 133, 77, 158, 220, 171, 33, 256, 22, 229, 31,
        82, 253, 160, 2, 1, 133, 12, 135, 94, 144, 211, 23, 61, 150, 36, 31, 55, 178, 42, 128, 60, 194, 192, 182, 190, 227, 136, 133, 252, 128, 213,
        88, 135, 204, 213, 199, 50, 191, 7, 61, 104, 87, 210, 127, 76, 163, 11, 175, 114, 207, 167, 26, 249, 222, 222, 73, 175, 207, 222, 86, 42, 236, 92, 194, 214,
        28, 195, 236, 122, 122, 12, 134, 55, 41, 209, 106, 172, 10, 130, 139, 149, 39, 196, 181, 187, 55, 166, 237, 215, 135, 98, 90, 12, 6, 72, 240, 138, 112, 99, 76, 55, 22,
        231, 223, 153, 119, 15, 98, 26, 77, 139, 89, 64, 24, 108, 137, 118, 38, 142, 19, 131, 220, 252, 248, 212, 120],
    },
    {
      address: [76, 214, 171, 4, 67, 23, 118, 195, 84, 56, 103, 199, 97, 21, 226, 55, 220, 54, 212, 246, 174, 203, 51, 171, 28, 30, 63, 158, 131, 64, 181, 33],
      key: 1,
      data: [135, 94, 144, 211, 23, 61, 150, 36, 31, 55, 178, 42, 128, 60, 194, 192, 182, 190, 227, 136, 133, 252, 128, 213,
        150, 13, 149, 77, 159, 158, 13, 213, 171, 154, 224, 241,
        207, 92, 200, 194, 48, 70, 123, 210, 240, 15, 213, 37, 16, 235, 133, 77, 158, 220, 171, 33, 256, 22, 229, 31,
        82, 253, 160, 2, 1, 133, 12, 135, 94, 144, 211, 23, 61, 150, 36, 31, 55, 178, 42, 128, 60, 194, 192, 182, 190, 227, 136, 133, 252, 128, 213,
        88, 135, 204, 213, 199, 50, 191, 7, 61, 104, 87, 210, 127, 76, 163, 11, 175, 114, 207, 167, 26, 249, 222, 222, 73, 175, 207, 222, 86, 42, 236, 92, 194, 214,
        28, 195, 207, 222, 86, 42, 236, 92, 194, 214],
    }];

    res.expected = ethTestUtils.transformStatesListToMap([{
      address: [76, 214, 171, 4, 67, 23, 118, 195, 84, 56, 103, 199, 97, 21, 226, 55, 220, 54, 212, 246, 174, 203, 51, 171, 28, 30, 63, 158, 131, 64, 181, 33],
      key: 2,
      data: [135, 94, 144, 211, 23, 61, 150, 36, 31, 55, 178, 42, 128, 60, 194, 192, 182, 190, 227, 136, 133, 252, 128, 213,
        150, 13, 149, 77, 159, 158, 13, 213, 171, 154, 224, 241,
        207, 92, 200, 194, 48, 70, 123, 210, 240, 15, 213, 37, 16, 235, 133, 77, 158, 220, 171, 33, 256, 22, 229, 31,
        82, 253, 160, 2, 1, 133, 12, 135, 94, 144, 211, 23, 61, 150, 36, 31, 55, 178, 42, 128, 60, 194, 192, 182, 190, 227, 136, 133, 252, 128, 213,
        88, 135, 204, 213, 199, 50, 191, 7, 61, 104, 213, 37, 16, 235, 133, 77, 158, 220, 171, 33, 256, 22, 229, 31,
        82, 253, 160, 2, 1, 133, 12, 135, 94, 144, 211],
    },
    {
      address: [11, 214, 171, 4, 67, 23, 118, 195, 84, 34, 103, 199, 97, 21, 226, 55, 220, 143, 212, 246, 174, 203, 51, 171, 28, 30, 63, 158, 131, 64, 181, 200],
      key: -1,
      data: [11, 255, 84, 134, 4, 62, 190, 60, 15, 43, 249, 32, 21, 188, 170, 27, 22, 23, 8, 248, 158, 176, 219, 85, 175, 190, 54, 199, 198, 228, 198, 87, 124, 33, 158, 115, 60, 173, 162, 16,
        150, 13, 149, 77, 159, 158, 13, 213, 171, 154, 224, 241, 4, 42, 38, 120, 66, 253, 127, 201, 113, 252, 246, 177, 218, 155, 249, 166, 68, 65, 231, 208, 210, 116, 89, 100,
        207, 92, 200, 194, 48, 70, 123, 210, 240, 15, 213, 37, 16, 235, 133, 77, 158, 220, 171, 33, 256, 22, 229, 31,
        56, 90, 104, 16, 241, 108, 14, 126, 116, 91, 106, 10, 141, 122, 78, 214, 148, 194, 14, 31, 96, 142, 178, 96, 150, 52, 142, 138, 37, 209, 110,
        82, 253, 160, 2, 1, 133, 12, 135, 94, 144, 211, 23, 61, 150, 36, 31, 55, 178, 42, 128, 60, 194, 192, 182, 190, 227, 136, 133, 252, 128, 213,
        88, 135, 204, 213, 199, 50, 191, 7, 61, 104, 87, 210, 127, 76, 163, 11, 175, 114, 207, 167, 26, 249, 222, 222, 73, 175, 207, 222, 86, 42, 236, 92, 194, 214,
        28, 195, 236, 122, 122, 12, 134, 55, 41, 209, 106, 172, 10, 130, 139, 149, 39, 196, 181, 187, 55, 166, 237, 215, 135, 98, 90, 12, 6, 72, 240, 138, 112, 99, 76, 55, 22,
        231, 223, 153, 119, 15, 98, 26, 77, 139, 89, 64, 24, 108, 137, 118, 38, 142, 19, 131, 220, 252, 248, 212, 120, 231, 26, 21, 228, 246, 179, 104, 207, 76, 218, 88, 150, 13, 149, 77, 159, 158, 13, 213, 171, 154, 224, 241, 4, 42, 38, 120, 66, 253, 127, 201, 113, 252, 246, 177, 218, 155, 249, 166, 68, 65, 231, 208, 210, 116, 89, 100,
        207, 92, 200, 194, 48, 70, 123, 210, 240, 15, 213, 37, 16, 235, 133, 77, 158, 220, 171, 33, 256, 22, 229, 31,
        82, 253, 160, 2, 1, 133, 12, 135, 94, 144, 211, 23, 61, 150, 36, 31, 55, 178, 42, 128, 60, 194, 192, 182, 190, 227, 136, 133, 252, 128, 213,
        88, 135, 204, 213, 199, 50, 191, 7, 61, 104, 87, 210, 127, 76, 163, 11, 175, 114, 207, 167, 26, 249, 222, 222, 73, 175, 207, 222, 86, 42, 236, 92, 194, 214,
        28, 195, 236, 122, 122, 12, 134, 55, 41, 209, 106, 172, 10, 130, 139, 149, 39, 196, 181, 187, 55, 166, 237, 215, 135, 98, 90, 12, 6, 72, 240, 138, 112, 99, 76, 55, 22,
        231, 223, 153, 119, 15, 98, 26, 77, 139, 89, 64, 24, 108, 137, 118, 38, 142, 19, 131, 220, 252, 248, 212, 120, 231, 26, 21, 228, 246, 179, 104, 207, 76, 218, 88, 150, 13, 149, 77, 159, 158, 13, 213, 171, 154, 224, 241, 4, 42, 38, 120, 66, 253, 127, 201, 113, 252, 246, 177, 218, 155, 249, 166, 68, 65, 231, 208, 210, 116, 89, 100,
        207, 92, 200, 194, 48, 70, 123, 210, 240, 15, 213, 37, 16, 235, 133, 77, 158, 220, 171, 33, 256, 22, 229, 31,
        82, 253, 160, 2, 1, 133, 12, 135, 94, 144, 211, 23, 61, 150, 36, 31, 55, 178, 42, 128, 60, 194, 192, 182, 190, 227, 136, 133, 252, 128, 213,
        88, 135, 204, 213, 199, 50, 191, 7, 61, 104, 87, 210, 127, 76, 163, 11, 175, 114, 207, 167, 26, 249, 222, 222, 73, 175, 207, 222, 86, 42, 236, 92, 194, 214,
        28, 195, 236, 122, 122, 12, 134, 55, 41, 209, 106, 172, 10, 130, 139, 149, 39, 196, 181, 187, 55, 166, 237, 215, 135, 98, 90, 12, 6, 72, 240, 138, 112, 99, 76, 55, 22,
        231, 223, 153, 119, 15, 98, 26, 77, 139, 89, 64, 24, 108, 137, 118, 38, 142, 19, 131, 220, 252, 248, 212, 120, 231, 26, 21, 228, 246, 179, 104, 207, 76, 218, 88, 150, 13, 149, 77, 159, 158, 13, 213, 171, 154, 224, 241, 4, 42, 38, 120, 66, 253, 127, 201, 113, 252, 246, 177, 218, 155, 249, 166, 68, 65, 231, 208, 210, 116, 89, 100,
        207, 92, 200, 194, 48, 70, 123, 210, 240, 15, 213, 37, 16, 235, 133, 77, 158, 220, 171, 33, 256, 22, 229, 31,
        82, 253, 160, 2, 1, 133, 12, 135, 94, 144, 211, 23, 61, 150, 36, 31, 55, 178, 42, 128, 60, 194, 192, 182, 190, 227, 136, 133, 252, 128, 213,
        88, 135, 204, 213, 199, 50, 191, 7, 61, 104, 87, 210, 127, 76, 163, 11, 175, 114, 207, 167, 26, 249, 222, 222, 73, 175, 207, 222, 86, 42, 236, 92, 194, 214,
        28, 195, 236, 122, 122, 12, 134, 55, 41, 209, 106, 172, 10, 130, 139, 149, 39, 196, 181, 187, 55, 166, 237, 215, 135, 98, 90, 12, 6, 72, 240, 138, 112, 99, 76, 55, 22,
        231, 223, 153, 119, 15, 98, 26, 77, 139, 89, 64, 194, 214,
        28, 195, 236, 122, 122, 12, 134, 55, 41, 209, 106, 172, 10, 130, 139, 149, 39, 196, 181, 187, 55, 166, 237, 215, 135, 98, 90, 12, 6, 72, 240, 138, 112, 99, 76, 55, 22,
        231, 223, 153, 119, 15, 98, 26, 77, 139, 89, 64, 24, 108, 137, 118, 38, 142, 19, 131, 220, 252, 248, 212, 120, 231, 26, 21, 228, 246, 179, 104, 207, 76, 218, 88, 24, 108, 137, 118, 38, 142, 19, 131, 220, 252, 248, 212, 120, 231, 26, 21, 228, 246, 179, 104, 207, 76, 218, 88, 150, 13, 149, 77, 159, 158, 13, 213, 171, 154, 224, 241, 4, 42, 38, 120, 66, 253, 127, 201, 113, 252, 246, 177, 218, 155, 249, 166, 68, 65, 231, 208, 210, 116, 89, 100,
        207, 92, 200, 194, 48, 70, 123, 210, 240, 15, 213, 37, 16, 235, 133, 77, 158, 220, 171, 33, 256, 22, 229, 31,
        82, 253, 160, 2, 1, 133, 12, 135, 94, 144, 211, 23, 61, 150, 36, 31, 55, 178, 42, 128, 60, 194, 192, 182, 190, 227, 136, 133, 252, 128, 213,
        88, 135, 204, 213, 199, 50, 191, 7, 61, 104, 87, 210, 127, 76, 163, 11, 175, 114, 207, 167, 26, 249, 222, 222, 73, 175, 207, 222, 86, 42, 236, 92, 194, 214,
        28, 195, 236, 122, 122, 12, 134, 55, 41, 209, 106, 172, 10, 130, 139, 149, 39, 196, 181, 187, 55, 166, 237, 215, 135, 98, 90, 12, 6, 72, 240, 138, 112, 99, 76, 55, 22,
        231, 223, 153, 119, 15, 98, 26, 77, 139, 89, 64, 24, 108, 137, 118, 38, 142, 19, 131, 220, 252, 248, 212, 120, 231, 26, 21, 228, 246, 179, 104, 207, 76, 218, 88, 150, 13, 149, 77, 159, 158, 13, 213, 171, 154, 224, 241, 4, 42, 38, 120, 66, 253, 127, 201, 113, 252, 246, 177, 218, 155, 249, 166, 68, 65, 231, 208, 210, 116, 89, 100,
        207, 92, 200, 194, 48, 70, 123, 210, 240, 15, 213, 37, 16, 235, 133, 77, 158, 220, 171, 33, 256, 22, 229, 31,
        82, 253, 160, 2, 1, 133, 12, 135, 94, 144, 211, 23, 61, 150, 36, 31, 55, 178, 42, 128, 60, 194, 192, 182, 190, 227, 136, 133, 252, 128, 213,
        88, 135, 204, 213, 199, 50, 191, 7, 61, 104, 87, 210, 127, 76, 163, 11, 175, 114, 207, 167, 26, 249, 222, 222, 73, 175, 207, 222, 86, 42, 236, 92, 194, 214,
        28, 195, 236, 122, 122, 12, 134, 55, 41, 209, 106, 172, 10, 130, 139, 149, 39, 196, 181, 187, 55, 166, 237, 215, 135, 98, 90, 12, 6, 72, 240, 138, 112, 99, 76, 55, 22,
        231, 223, 153, 119, 15, 98, 26, 77, 139, 89, 64, 24, 108, 137, 118, 38, 142, 19, 131, 220, 252, 248, 212, 120, 231, 26, 21, 228, 246, 179, 104, 207, 76, 218, 88, 150, 13, 149, 77, 159, 158, 13, 213, 171, 154, 224, 241, 4, 42, 38, 120, 66, 253, 127, 201, 113, 252, 246, 177, 218, 155, 249, 166, 68, 65, 231, 208, 210, 116, 89, 100,
        207, 92, 200, 194, 48, 70, 123, 210, 240, 15, 213, 37, 16, 235, 133, 77, 158, 220, 171, 33, 256, 22, 229, 31,
        82, 253, 160, 2, 1, 133, 12, 135, 94, 144, 211, 23, 61, 150, 36, 31, 55, 178, 42, 128, 60, 194, 192, 182, 190, 227, 136, 133, 252, 128, 213,
        88, 135, 204, 213, 199, 50, 191, 7, 61, 104, 87, 210, 127, 76, 163, 11, 175, 114, 207, 167, 26, 249, 222, 222, 73, 175, 207, 222, 86, 42, 236, 92],
    },
    {
      // 0bd6ab04431776c3542267c76115e237dc8fd4f6aecb33ab1c1e3f9e8340b5c8
      address: [11, 214, 171, 4, 67, 23, 118, 195, 84, 34, 103, 199, 97, 21, 226, 55, 220, 143, 212, 246, 174, 203, 51, 171, 28, 30, 63, 158, 131, 64, 181, 200],
      key: 0,
      data: [92, 200, 194, 48, 70, 123, 210, 240, 15, 213, 37, 16, 235, 133, 77, 158, 220, 171, 33, 256, 22, 229, 31,
        82, 253, 160, 2, 1, 133, 12, 135, 94, 144, 211, 23, 61, 150, 36, 31, 55, 178, 42, 128, 60, 194, 192, 182, 190, 227, 136, 133, 252, 128, 213,
        88, 135, 204, 213, 199, 50, 191, 7, 61, 104, 87, 210, 127, 76, 163, 11, 175, 114, 207, 167, 26, 249, 222, 222, 73, 175, 207, 222, 86, 42, 236, 92, 194, 214,
        28, 195, 236, 122, 122, 12, 134, 55, 41, 209, 106, 172, 10, 130, 139, 149, 39, 196, 181, 187, 55, 166, 237, 215, 135, 98, 90, 12, 6, 72, 240, 138, 112, 99, 76, 55, 22,
        231, 223, 153, 119, 15, 98, 26, 77, 139, 89, 64, 24, 108, 137, 118, 38, 142, 19, 131, 220, 252, 248, 212, 120, 231, 26, 21, 228, 246, 179, 104, 207, 76, 218, 88, 150, 13, 149, 77, 159, 158, 13, 213, 171, 154, 224, 241, 4, 42, 38, 120, 66, 253, 127, 201, 113, 252, 246, 177, 218, 155, 249, 166, 68, 65, 231, 208, 210, 116, 89, 100,
        207, 92, 200, 194, 48, 70, 123, 210, 240, 15, 213, 37, 16, 235, 133, 77, 158, 220, 171, 33, 256, 22, 229, 31,
        82, 253, 160, 2, 1, 133, 12, 135, 94, 144, 211, 23, 61, 150, 36, 31, 55, 178, 42, 128, 60, 194, 192, 182, 190, 227, 136, 133, 252, 128, 213,
        88, 135, 204],
    },
    {
      address: [13, 214, 171, 4, 67, 23, 118, 195, 84, 56, 103, 199, 97, 21, 226, 55, 220, 54, 212, 246, 174, 203, 51, 171, 28, 30, 63, 158, 131, 64, 181, 42],
      key: 1,
      data: [236, 122, 122, 12, 134, 55, 41, 209, 106, 172, 10, 130, 139, 149, 39, 196, 181, 187, 55, 166, 237, 215, 135, 98, 90, 12, 6, 72, 240, 138, 112, 99, 76, 55, 22,
        88, 135, 204, 213, 199, 50, 191, 7, 61, 104, 87, 210, 127, 76, 163, 11, 175, 114, 207, 167, 26, 249, 222, 222, 73, 175, 207, 222, 86, 42, 236, 92, 194, 214,
        28, 195, 236, 122, 122, 12, 134, 55, 41, 209, 106, 172, 10, 130, 139, 149, 39, 196, 181, 187, 55, 166, 237, 215, 135, 98, 90, 12, 6, 72, 240, 138, 112, 99, 76, 55, 22,
        207, 92, 200, 194, 48, 70, 123, 210, 240, 15, 213, 37, 16, 235, 133, 77, 158, 220, 171, 33, 256, 22, 229, 31,
        82, 253, 160, 2, 1, 133, 12, 135, 94, 144, 211, 23, 61, 150, 36, 31, 55, 178, 42, 128, 60, 194, 192, 182, 190, 227, 136, 133, 252, 128, 213,
        88, 135, 204, 213, 199, 50, 191, 7, 61, 104, 87, 210, 127, 76, 163, 11, 175, 114, 207, 167, 26, 249, 222, 222, 73, 175, 207, 222, 86, 42, 236, 92, 194, 214,
        28, 195, 236, 122, 122, 12, 134, 55, 41, 209, 106, 172, 10, 130, 139, 149, 39, 196, 181, 187, 55, 166, 237, 215, 135, 98, 90, 12, 6, 72, 240, 138, 112, 99, 76, 55, 22,
        231, 223, 153, 119, 15, 98, 26, 77, 139, 89, 64, 24, 108, 137, 118, 38, 142, 19, 131, 220, 252, 248, 212, 120,
        88, 135, 204, 213, 199, 50, 191, 7, 61, 104, 87, 210, 127, 76, 163, 11, 175, 114, 207, 167, 26, 249, 222, 222, 73, 175, 207, 222, 86, 42],
    }]);
  } else if (scenario === SYNC_SCENARIOS.PARTIAL_DB_WITH_ALL_ADDRESSES) {
    res.tips = [{
      address: [76, 214, 171, 4, 67, 23, 118, 195, 84, 56, 103, 199, 97, 21, 226, 55, 220, 54, 212, 246, 174, 203, 51, 171, 28, 30, 63, 158, 131, 64, 181, 33],
      key: 0,
      data: [135, 94, 144, 211, 23, 61, 150, 36, 31, 55, 178, 42, 128, 60, 194, 192, 182, 190, 227, 136, 133, 252, 128, 213,
        150, 13, 149, 77, 159, 158, 13, 213, 171, 154, 224, 241,
        207, 92, 200, 194, 48, 70, 123, 210, 240, 15, 213, 37, 16, 235, 133, 77, 158, 220, 171, 33, 256, 22, 229, 31,
        82, 253, 160, 2, 1, 133, 12, 135, 94, 144, 211, 23, 61, 150, 36, 31, 55, 178, 42, 128, 60, 194, 192, 182, 190, 227, 136, 133, 252, 128, 213,
        88, 135, 204, 213, 199, 50, 191, 7, 61, 104, 87, 210, 127, 76, 163, 11, 175, 114, 207, 167, 26, 249, 222, 222, 73, 175, 207, 222, 86, 42, 236, 92, 194, 214,
        28, 195, 207, 222, 86, 42, 236, 92, 194, 214]
    },
    {
      address: [13, 214, 171, 4, 67, 23, 118, 195, 84, 56, 103, 199, 97, 21, 226, 55, 220, 54, 212, 246, 174, 203, 51, 171, 28, 30, 63, 158, 131, 64, 181, 42],
      key: 0,
      data: [
        88, 135, 204, 213, 199, 50, 191, 7, 61, 104, 87, 210, 127, 76, 163, 11, 175, 114, 207, 167, 26, 249, 222, 222, 73, 175, 207, 222, 86, 42, 236, 92, 194, 214,
        28, 195, 236, 122, 122, 12, 134, 55, 41, 209, 106, 172, 10, 130, 139, 149, 39, 196, 181, 187, 55, 166, 237, 215, 135, 98, 90, 12, 6, 72, 240, 138, 112, 99, 76, 55, 22,
        207, 92, 200, 194, 48, 70, 123, 210, 240, 15, 213, 37, 16, 235, 133, 77, 158, 220, 171, 33, 256, 22, 229, 31,
        82, 253, 160, 2, 1, 133, 12, 135, 94, 144, 211, 23, 61, 150, 36, 31, 55, 178, 42, 128, 60, 194, 192, 182, 190, 227, 136, 133, 252, 128, 213,
        88, 135, 204, 213, 199, 50, 191, 7, 61, 104, 87, 210, 127, 76, 163, 11, 175, 114, 207, 167, 26, 249, 222, 222, 73, 175, 207, 222, 86, 42, 236, 92, 194, 214,
        28, 195, 236, 122, 122, 12, 134, 55, 41, 209, 106, 172, 10, 130, 139, 149, 39, 196, 181, 187, 55, 166, 237, 215, 135, 98, 90, 12, 6, 72, 240, 138, 112, 99, 76, 55, 22,
        231, 223, 153, 119, 15, 98, 26, 77, 139, 89, 64, 24, 108, 137, 118, 38, 142, 19, 131, 220, 252, 248, 212, 120],
    },
    {
      address: [11, 214, 171, 4, 67, 23, 118, 195, 84, 34, 103, 199, 97, 21, 226, 55, 220, 143, 212, 246, 174, 203, 51, 171, 28, 30, 63, 158, 131, 64, 181, 200],
      key: 0,
      data: [92, 200, 194, 48, 70, 123, 210, 240, 15, 213, 37, 16, 235, 133, 77, 158, 220, 171, 33, 256, 22, 229, 31,
        82, 253, 160, 2, 1, 133, 12, 135, 94, 144, 211, 23, 61, 150, 36, 31, 55, 178, 42, 128, 60, 194, 192, 182, 190, 227, 136, 133, 252, 128, 213,
        88, 135, 204, 213, 199, 50, 191, 7, 61, 104, 87, 210, 127, 76, 163, 11, 175, 114, 207, 167, 26, 249, 222, 222, 73, 175, 207, 222, 86, 42, 236, 92, 194, 214,
        28, 195, 236, 122, 122, 12, 134, 55, 41, 209, 106, 172, 10, 130, 139, 149, 39, 196, 181, 187, 55, 166, 237, 215, 135, 98, 90, 12, 6, 72, 240, 138, 112, 99, 76, 55, 22,
        231, 223, 153, 119, 15, 98, 26, 77, 139, 89, 64, 24, 108, 137, 118, 38, 142, 19, 131, 220, 252, 248, 212, 120, 231, 26, 21, 228, 246, 179, 104, 207, 76, 218, 88, 150, 13, 149, 77, 159, 158, 13, 213, 171, 154, 224, 241, 4, 42, 38, 120, 66, 253, 127, 201, 113, 252, 246, 177, 218, 155, 249, 166, 68, 65, 231, 208, 210, 116, 89, 100,
        207, 92, 200, 194, 48, 70, 123, 210, 240, 15, 213, 37, 16, 235, 133, 77, 158, 220, 171, 33, 256, 22, 229, 31,
        82, 253, 160, 2, 1, 133, 12, 135, 94, 144, 211, 23, 61, 150, 36, 31, 55, 178, 42, 128, 60, 194, 192, 182, 190, 227, 136, 133, 252, 128, 213,
        88, 135, 204],
    }];

    res.expected = ethTestUtils.transformStatesListToMap([{
      address: [76, 214, 171, 4, 67, 23, 118, 195, 84, 56, 103, 199, 97, 21, 226, 55, 220, 54, 212, 246, 174, 203, 51, 171, 28, 30, 63, 158, 131, 64, 181, 33],
      key: 1,
      data: [135, 94, 144, 211, 23, 61, 150, 36, 31, 55, 178, 42, 128, 60, 194, 192, 182, 190, 227, 136, 133, 252, 128, 213,
        150, 13, 149, 77, 159, 158, 13, 213, 171, 154, 224, 241,
        207, 92, 200, 194, 48, 70, 123, 210, 240, 15, 213, 37, 16, 235, 133, 77, 158, 220, 171, 33, 256, 22, 229, 31,
        82, 253, 160, 2, 1, 133, 12, 135, 94, 144, 211, 23, 61, 150, 36, 31, 55, 178, 42, 128, 60, 194, 192, 182, 190, 227, 136, 133, 252, 128, 213,
        88, 135, 204, 213, 199, 50, 191, 7, 61, 104, 87, 210, 127, 76, 163, 11, 175, 114, 207, 167, 26, 249, 222, 222, 73, 175, 207, 222, 86, 42, 236, 92, 194, 214,
        28, 195, 207, 222, 86, 42, 236, 92, 194, 214],
    },
    {
      address: [76, 214, 171, 4, 67, 23, 118, 195, 84, 56, 103, 199, 97, 21, 226, 55, 220, 54, 212, 246, 174, 203, 51, 171, 28, 30, 63, 158, 131, 64, 181, 33],
      key: 2,
      data: [135, 94, 144, 211, 23, 61, 150, 36, 31, 55, 178, 42, 128, 60, 194, 192, 182, 190, 227, 136, 133, 252, 128, 213,
        150, 13, 149, 77, 159, 158, 13, 213, 171, 154, 224, 241,
        207, 92, 200, 194, 48, 70, 123, 210, 240, 15, 213, 37, 16, 235, 133, 77, 158, 220, 171, 33, 256, 22, 229, 31,
        82, 253, 160, 2, 1, 133, 12, 135, 94, 144, 211, 23, 61, 150, 36, 31, 55, 178, 42, 128, 60, 194, 192, 182, 190, 227, 136, 133, 252, 128, 213,
        88, 135, 204, 213, 199, 50, 191, 7, 61, 104, 213, 37, 16, 235, 133, 77, 158, 220, 171, 33, 256, 22, 229, 31,
        82, 253, 160, 2, 1, 133, 12, 135, 94, 144, 211],
    },
    {
      address: [13, 214, 171, 4, 67, 23, 118, 195, 84, 56, 103, 199, 97, 21, 226, 55, 220, 54, 212, 246, 174, 203, 51, 171, 28, 30, 63, 158, 131, 64, 181, 42],
      key: 1,
      data: [236, 122, 122, 12, 134, 55, 41, 209, 106, 172, 10, 130, 139, 149, 39, 196, 181, 187, 55, 166, 237, 215, 135, 98, 90, 12, 6, 72, 240, 138, 112, 99, 76, 55, 22,
        88, 135, 204, 213, 199, 50, 191, 7, 61, 104, 87, 210, 127, 76, 163, 11, 175, 114, 207, 167, 26, 249, 222, 222, 73, 175, 207, 222, 86, 42, 236, 92, 194, 214,
        28, 195, 236, 122, 122, 12, 134, 55, 41, 209, 106, 172, 10, 130, 139, 149, 39, 196, 181, 187, 55, 166, 237, 215, 135, 98, 90, 12, 6, 72, 240, 138, 112, 99, 76, 55, 22,
        207, 92, 200, 194, 48, 70, 123, 210, 240, 15, 213, 37, 16, 235, 133, 77, 158, 220, 171, 33, 256, 22, 229, 31,
        82, 253, 160, 2, 1, 133, 12, 135, 94, 144, 211, 23, 61, 150, 36, 31, 55, 178, 42, 128, 60, 194, 192, 182, 190, 227, 136, 133, 252, 128, 213,
        88, 135, 204, 213, 199, 50, 191, 7, 61, 104, 87, 210, 127, 76, 163, 11, 175, 114, 207, 167, 26, 249, 222, 222, 73, 175, 207, 222, 86, 42, 236, 92, 194, 214,
        28, 195, 236, 122, 122, 12, 134, 55, 41, 209, 106, 172, 10, 130, 139, 149, 39, 196, 181, 187, 55, 166, 237, 215, 135, 98, 90, 12, 6, 72, 240, 138, 112, 99, 76, 55, 22,
        231, 223, 153, 119, 15, 98, 26, 77, 139, 89, 64, 24, 108, 137, 118, 38, 142, 19, 131, 220, 252, 248, 212, 120,
        88, 135, 204, 213, 199, 50, 191, 7, 61, 104, 87, 210, 127, 76, 163, 11, 175, 114, 207, 167, 26, 249, 222, 222, 73, 175, 207, 222, 86, 42],
    }]);
  }

  return res;
}


function syncTest(scenario) {
  return new Promise(async (resolve) => {
    const res = prepareSyncTestData(scenario);
    const tips = res.tips;
    const expectedMap = res.expected;

    const bootstrapNodes = ['/ip4/0.0.0.0/tcp/' + B2Port + '/ipfs/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm'];

    const dnsConfig = {
      'bootstrapNodes': bootstrapNodes,
      'port': B2Port,
      'nickname': 'dns',
      'idPath': B2Path,
    };
    const peerConfig = {
      'bootstrapNodes': bootstrapNodes,
      'nickname': 'peer',
    };
    const dnsMockUri = 'tcp://127.0.0.1:44444';
    const peerMockUri = 'tcp://127.0.0.1:55555';

    const dnsMockCore = new CoreServer('dns');
    const peerMockCore = new CoreServer('peer');

    // define as provider to start with provider_db
    dnsMockCore.setProvider(true);
    // start the dns mock server (core)
    dnsMockCore.runServer(dnsMockUri);

    // start the peer mock server (core)
    peerMockCore.runServer(peerMockUri);
    // set empty tips array
    peerMockCore.setReceiverTips(tips);
    await testUtils.sleep(1500);
    const ethereumInfo = await initEthereumStuff();
    const api = ethereumInfo.enigmaContractApi;
    const web3 = ethereumInfo.web3;
    const workerEnclaveSigningAddress = ethereumInfo.workerEnclaveSigningAddress;
    const workerAddress = ethereumInfo.workerAddress;
    const enigmaContractAddress = ethereumInfo.enigmaContractAddress;

    // start the dns
    const dnsBuilder = new EnvironmentBuilder();
    const dnsController = await dnsBuilder
      .setNodeConfig(dnsConfig)
      .setIpcConfig({ uri: dnsMockUri })
      .build();

    // start the dns
    const peerBuilder = new EnvironmentBuilder();
    const peerController = await peerBuilder
      .setNodeConfig(peerConfig)
      .setIpcConfig({ uri: peerMockUri })
      .setEthereumConfig({ enigmaContractAddress: enigmaContractAddress })
      .build();

    // write all states to ethereum
    await ethTestUtils.setEthereumState(api, web3, workerAddress, workerEnclaveSigningAddress);
    await testUtils.sleep(8000);
    waterfall([
      (cb) => {
        // announce
        dnsController.getNode().tryAnnounce((err, ecids) => {
          assert.strictEqual(null, err, 'error announcing' + err);
          cb(null);
        });
      },
      (cb) => {
        // sync
        peerController.getNode().syncReceiverPipeline(async (err, statusResult) => {
          assert.strictEqual(null, err, 'error syncing' + err);
          statusResult.forEach((result) => {
            assert.strictEqual(true, result.success);
          });
          cb(null, statusResult);
        });
      },
    ], async (err, statusResult) => {
      assert.strictEqual(null, err, 'error in waterfall ' + err);

      // validate the results
      const missingstatesMap = syncResultMsgToStatesMap(statusResult);
      assert.strictEqual(Object.entries(missingstatesMap).length, Object.entries(expectedMap).length);
      for (const [address, data] of Object.entries(missingstatesMap)) {
        assert.strictEqual(Object.entries(missingstatesMap[address]).length, Object.entries(expectedMap[address]).length);
        for (const [key, delta] of Object.entries(missingstatesMap[address])) {
          for (let i = 0; i < missingstatesMap[address][key].length; ++i) {
            assert.strictEqual(missingstatesMap[address][key][i], expectedMap[address][key][i]);
          }
        }
      }
      await dnsController.getNode().stop();
      dnsController.getIpcClient().disconnect();

      await peerController.getNode().stop();
      peerController.getIpcClient().disconnect();

      dnsMockCore.disconnect();
      peerMockCore.disconnect();

      await stopEthereumStuff(ethereumInfo.environment);

      await testUtils.sleep(2000);
      resolve();
    });
  });
}


function createSyncMsgForVerifierTest(type, data) {
  const rawMsg = {};
  rawMsg.msgType = type;
  rawMsg.id = 'e3yB8OEMGSiA';

  if (type === MsgTypes.SYNC_STATE_RES) {
    rawMsg.type = 'GetDeltas';
    rawMsg.result = { deltas: data };
  } else if (type === MsgTypes.SYNC_BCODE_RES) {
    rawMsg.type = 'GetContract';
    rawMsg.result = {
      address: data.address,
      bytecode: data.bytecode,
    };
  } else {
    return SyncMsgBuilder.msgReqFromObjNoValidation(rawMsg);
  }
  return SyncMsgBuilder.msgResFromObjNoValidation(rawMsg);
}

function prepareDataForVerifierTest() {
  const web3 = new Web3();

  let address0 = web3.utils.randomHex(32);
  address0 = address0.slice(2, address0.length);

  let address1 = web3.utils.randomHex(32);
  address1 = address1.slice(2, address1.length);

  const bytecode = Buffer.from([11, 255, 84, 134, 4, 62, 190, 60, 15, 43, 249, 32, 21, 188, 170, 27, 22, 23, 8, 248, 158, 176, 219, 85, 175, 190, 54, 199, 198, 228, 198, 87, 124, 33, 158, 115, 60, 173, 162, 16,
    150, 13, 149, 77, 159, 158, 13, 213, 171, 154, 224, 241, 4, 42, 38, 120, 66, 253, 127, 201, 113, 252, 246, 177, 218, 155, 249, 166, 68, 65, 231, 208, 210, 116, 89, 100,
    207, 92, 200, 194, 48, 70, 123, 210, 240, 15, 213, 37, 16, 235, 133, 77, 158, 220, 171, 33, 256, 22, 229, 31,
    56, 90, 104, 16, 241, 108, 14, 126, 116, 91, 106, 10, 141, 122, 78, 214, 148, 194, 14, 31, 96, 142, 178, 96, 150, 52, 142, 138, 37, 209, 110,
    82, 253, 160, 2, 1, 133, 12, 135, 94, 144, 211, 23, 61, 150, 36, 31, 55, 178, 42, 128, 60, 194, 192, 182, 190, 227, 136, 133, 252, 128, 213,
    88, 135, 204, 213, 199, 50, 191, 7, 61, 104, 87, 210, 127, 76, 163, 11, 175, 114, 207, 167, 26, 249, 222, 222, 73, 175, 207, 222, 86, 42, 236, 92, 194, 214,
    28, 195, 236, 122, 122, 12, 134, 55, 41, 209, 106, 172, 10, 130, 139, 149, 39, 196, 181, 187, 55, 166, 237, 215, 135, 98, 90, 12, 6, 72, 240, 138, 112, 99, 76, 55, 22,
    231, 223, 153, 119, 15, 98, 26, 77, 139, 89, 64, 24, 108, 137, 118, 38, 142, 19, 131, 220, 252, 248, 212, 120, 231, 26, 21, 228, 246, 179, 104, 207, 76, 218, 88, 150, 13, 149, 77, 159, 158, 13, 213, 171, 154, 224, 241, 4, 42, 38, 120, 66, 253, 127, 201, 113, 252, 246, 177, 218, 155, 249, 166, 68, 65, 231, 208, 210, 116, 89, 100,
    207, 92, 200, 194, 48, 70, 123, 210, 240, 15, 213, 37, 16, 235, 133, 77, 158, 220, 171, 33, 256, 22, 229, 31,
    82, 253, 160, 2, 1, 133, 12, 135, 94, 144, 211, 23, 61, 150, 36, 31, 55, 178, 42, 128, 60, 194, 192, 182, 190,
    227, 136, 133, 252, 128, 213]).toString('hex');

  const delta0_0 = Buffer.from([135, 94, 144, 211, 23, 61, 150, 36, 31, 55, 178, 42, 128, 60, 194, 192, 182, 190, 227, 136, 133, 252, 128, 213,
    150, 13, 149, 77, 159, 158, 13, 213, 171, 154, 224, 241,
    207, 92, 200, 194, 48, 70, 123, 210, 240, 15, 213, 37, 16, 235, 133, 77, 158, 220, 171, 33, 256, 22, 229, 31,
    82, 253, 160, 2, 1, 133, 12, 135, 94, 144, 211, 23, 61, 150, 36, 31, 55, 178, 42, 128, 60, 194, 192, 182, 190, 227, 136, 133, 252, 128, 213,
    88, 135, 204, 213, 199, 50, 191, 7, 61, 104, 213, 37, 16, 235, 133, 77, 158, 220, 171, 33, 256, 22, 229, 31,
    82, 253, 160, 2, 1, 133, 12, 135, 94, 144, 211]).toString('hex');;

  const delta0_1 = Buffer.from([236, 122, 122, 12, 134, 55, 41, 209, 106, 172, 10, 130, 139, 149, 39, 196, 181, 187, 55, 166, 237, 215, 135, 98, 90, 12, 6, 72, 240, 138, 112, 99, 76, 55, 22,
    88, 135, 204, 213, 199, 50, 191, 7, 61, 104, 87, 210, 127, 76, 163, 11, 175, 114, 207, 167, 26, 249, 222, 222, 73, 175, 207, 222, 86, 42, 236, 92, 194, 214,
    28, 195, 236, 122, 122, 12, 134, 55, 41, 209, 106, 172, 10, 130, 139, 149, 39, 196, 181, 187, 55, 166, 237, 215, 135, 98, 90, 12, 6, 72, 240, 138, 112, 99, 76, 55, 22,
    207, 92, 200, 194, 48, 70, 123, 210, 240, 15, 213, 37, 16, 235, 133, 77, 158, 220, 171, 33, 256, 22, 229, 31,
    82, 253, 160, 2, 1, 133, 12, 135, 94, 144, 211, 23, 61, 150, 36, 31, 55, 178, 42, 128, 60, 194, 192, 182, 190, 227, 136, 133, 252, 128, 213,
    88, 135, 204, 213, 199, 50, 191, 7, 61, 104, 87, 210, 127, 76, 163, 11, 175, 114, 207, 167, 26, 249, 222, 222, 73, 175, 207, 222, 86, 42, 236, 92, 194, 214,
    28, 195, 236, 122, 122, 12, 134, 55, 41, 209, 106, 172, 10, 130, 139, 149, 39, 196, 181, 187, 55, 166, 237, 215, 135, 98, 90, 12, 6, 72, 240, 138, 112, 99, 76, 55, 22,
    231, 223, 153, 119, 15, 98, 26, 77, 139, 89, 64, 24, 108, 137, 118, 38, 142, 19, 131, 220, 252, 248, 212, 120,
    88, 135, 204, 213, 199, 50, 191, 7, 61, 104, 87, 210, 127, 76, 163, 11, 175, 114, 207, 167, 26, 249, 222, 222,
    73, 175, 207, 222, 86, 42]).toString('hex');

  const delta1_0 = Buffer.from([92, 200, 194, 48, 70, 123, 210, 240, 15, 213, 37, 16, 235, 133, 77, 158, 220, 171, 33, 256, 22, 229, 31,
    82, 253, 160, 2, 1, 133, 12, 135, 94, 144, 211, 23, 61, 150, 36, 31, 55, 178, 42, 128, 60, 194, 192, 182, 190, 227, 136, 133, 252, 128, 213,
    88, 135, 204, 213, 199, 50, 191, 7, 61, 104, 87, 210, 127, 76, 163, 11, 175, 114, 207, 167, 26, 249, 222, 222, 73, 175, 207, 222, 86, 42, 236, 92, 194, 214,
    28, 195, 236, 122, 122, 12, 134, 55, 41, 209, 106, 172, 10, 130, 139, 149, 39, 196, 181, 187, 55, 166, 237, 215, 135, 98, 90, 12, 6, 72, 240, 138, 112, 99, 76, 55, 22,
    231, 223, 153, 119, 15, 98, 26, 77, 139, 89, 64, 24, 108, 137, 118, 38, 142, 19, 131, 220, 252, 248, 212, 120, 231, 26, 21, 228, 246, 179, 104, 207, 76, 218, 88, 150, 13, 149, 77, 159, 158, 13, 213, 171, 154, 224, 241, 4, 42, 38, 120, 66, 253, 127, 201, 113, 252, 246, 177, 218, 155, 249, 166, 68, 65, 231, 208, 210, 116, 89, 100,
    207, 92, 200, 194, 48, 70, 123, 210, 240, 15, 213, 37, 16, 235, 133, 77, 158, 220, 171, 33, 256, 22, 229, 31,
    82, 253, 160, 2, 1, 133, 12, 135, 94, 144, 211, 23, 61, 150, 36, 31, 55, 178, 42, 128, 60, 194, 192, 182, 190, 227, 136, 133, 252, 128, 213,
    88, 135, 204]).toString('hex');

  const missing = {};
  missing[address0] = { deltas: { 0: crypto.hash(delta0_0), 1: crypto.hash(delta0_1) }, bytecodeHash: crypto.hash(bytecode) };
  missing[address1] = { deltas: { 0: crypto.hash(delta1_0) } };

  const wrongMsg1 = createSyncMsgForVerifierTest(MsgTypes.SYNC_STATE_RES, [{ address: address1, key: '1', data: delta1_0 }]);
  const expectedErr1 = 'received an unknown index ' + '1' + ' for address ' + address1;

  let wrongAddress = web3.utils.randomHex(32);
  wrongAddress = address1.slice(2, address1.length);

  const wrongMsg2 = createSyncMsgForVerifierTest(MsgTypes.SYNC_STATE_RES, [{ address: wrongAddress, key: '0', data: delta1_0 }]);
  const expectedErr2 = 'received an unknown address ' + wrongAddress + ' in SyncStateRes';

  const correctSyncStateMsg = createSyncMsgForVerifierTest(MsgTypes.SYNC_STATE_RES, [{ address: address1, key: '0', data: delta1_0 }]);

  const wrongData1 = Array.from(delta1_0);
  wrongData1.push(130);

  const wrongMsg3 = createSyncMsgForVerifierTest(MsgTypes.SYNC_STATE_RES, [{ address: address1, key: '0', data: wrongData1 }]);
  const expectedErr3 = 'delta received for address ' + address1 + ' in index ' + '0' + ' does not match remote hash';

  const wrongMsg4 = createSyncMsgForVerifierTest(MsgTypes.SYNC_BCODE_RES, { address: address1, bytecode: bytecode });
  const expectedErr4 = 'received a bytecodeHash for unknown address ' + address1;

  const wrongMsg5 = createSyncMsgForVerifierTest(MsgTypes.SYNC_BCODE_RES, { address: wrongAddress, bytecode: bytecode });
  const expectedErr5 = 'received an unknown address ' + wrongAddress + ' in SyncBcodeRes';

  const correctSyncBytecodeMsg = createSyncMsgForVerifierTest(MsgTypes.SYNC_BCODE_RES, { address: address0, bytecode: bytecode });

  const wrongData2 = Array.from(bytecode);
  wrongData2.push(130);

  const wrongMsg6 = createSyncMsgForVerifierTest(MsgTypes.SYNC_BCODE_RES, { address: address0, bytecode: wrongData2 });
  const expectedErr6 = 'bytecodeHash received for address ' + address0 + ' does not match remote hash';

  const wrongMsg7 = createSyncMsgForVerifierTest(MsgTypes.SYNC_BCODE_REQ, { address: address0, bytecode: wrongData2 });
  const expectedErr7 = 'received an unknown msgType ' + MsgTypes.SYNC_BCODE_REQ;

  const expected = [{ msg: wrongMsg1, err: expectedErr1, res: false }, { msg: wrongMsg2, err: expectedErr2, res: false },
  { msg: wrongMsg3, err: expectedErr3, res: false }, { msg: correctSyncStateMsg, err: null, res: true },
  { msg: wrongMsg4, err: expectedErr4, res: false }, { msg: wrongMsg5, err: expectedErr5, res: false },
  { msg: wrongMsg6, err: expectedErr6, res: false }, { msg: wrongMsg7, err: expectedErr7, res: false },
  { msg: correctSyncBytecodeMsg, err: null, res: true }];

  return { expected: expected, missing: missing };
}

it('#1 should tryAnnounce action from mock-db no-cache', async function () {
  const tree = TEST_TREE['sync_basic'];
  if (!tree['all'] || !tree['#1']) {
    this.skip();
  }
  return new Promise(async (resolve) => {
    const uri = 'tcp://127.0.0.1:6111';
    const coreServer = new CoreServer();
    const peerConfig = {
      'bootstrapNodes': [],
      'port': '0',
      'nickname': 'peer',
      'idPath': null,
    };
    let mainController;
    waterfall([
      (cb) => {
        // start the mock server first
        coreServer.setProvider(true);
        coreServer.runServer(uri);
        cb(null);
      },
      (cb) => {
        const builder = new EnvironmentBuilder();
        builder
          .setNodeConfig(peerConfig)
          .setIpcConfig({ uri: uri })
          .build().then((instance) => {
            mainController = instance;
            cb(null);
          });
      },
      (cb) => {
        // announce
        mainController.getNode().tryAnnounce((err, ecids) => {
          assert.strictEqual(null, err, 'error announcing' + err);
          cb(null, ecids);
        });
      },
      (ecids, cb) => {
        // verify announcement FindContentProviderAction action
        mainController.getNode().findProviders(ecids, (findProvidersResult) => {
          const keyCounter = findProvidersResult.getKeysList().length;
          assert.strictEqual(ecids.length, keyCounter, 'not enough keys');
          cb(null);
        });
      },
    ], async (err) => {
      assert.strictEqual(null, err, 'error in waterfall ' + err);
      await mainController.getNode().stop();
      mainController.getIpcClient().disconnect();
      coreServer.disconnect();
      resolve();
    });
  });
});

it('#2 Perform a full sync scenario - from scratch', async function () {
  const tree = TEST_TREE['sync_basic'];
  if (!tree['all'] || !tree['#2']) {
    this.skip();
  }

  return syncTest(SYNC_SCENARIOS.EMPTY_DB);
});

it('#3 Perform a full sync scenario - from mid-with-some-addresses', async function () {
  const tree = TEST_TREE['sync_basic'];
  if (!tree['all'] || !tree['#3']) {
    this.skip();
  }
  return syncTest(SYNC_SCENARIOS.PARTIAL_DB_WITH_SOME_ADDRESSES);
});

it('#4 Perform a full sync scenario - from mid-with-all-addresses', async function () {
  const tree = TEST_TREE['sync_basic'];
  if (!tree['all'] || !tree['#4']) {
    this.skip();
  }
  return syncTest(SYNC_SCENARIOS.PARTIAL_DB_WITH_ALL_ADDRESSES);
});

it('#5 Test verifier', async function () {
  const tree = TEST_TREE['sync_basic'];
  if (!tree['all'] || !tree['#5']) {
    this.skip();
  }

  return new Promise(async (resolve) => {
    const res = prepareDataForVerifierTest();

    const expected = res.expected;
    const missing = res.missing;

    // verify
    const jobs = [];
    let i = 0;

    expected.forEach((testCaseData) => {
      jobs.push((cb) => {
        Verifier.verify(missing, testCaseData.msg, (err, isOk) => {
          assert.strictEqual(err, testCaseData.err);
          assert.strictEqual(isOk, testCaseData.res);
          i += 1;
          return cb(null);
        });
      });
    });

    parallel(jobs, (err) => {
      resolve();
    });
  });
});
