const tree = require('./test_tree').TEST_TREE.healthcheck;
const assert = require('assert');
const testBuilder = require('./testUtils/quickBuilderUtil');
const constants = require('../src/common/constants');
const testUtils = require('./testUtils/utils');
const DB_PROVIDER = require('../src/core/core_server_mock/data/provider_db');
const envInitializer = require('./ethereum/scripts/env_initializer');
const path = require('path');
const EnigmaContractWriterAPI = require(path.join(__dirname, '../src/ethereum/EnigmaContractWriterAPI'));
const CoreServer = require('../src/core/core_server_mock/core_server');
const DbUtils = require('../src/common/DbUtils');
const EnvironmentBuilder = require('../src/main_controller/EnvironmentBuilder');

const truffleDir = path.join(__dirname, './ethereum/scripts');
const B2Path = path.join(__dirname, './testUtils/id-l');
const B2Port = '10301';
const noLoggerOpts = {
  bOpts : {
    withLogger : true,
  },
  pOpts : {
    withLogger : true,
  },
};

async function initEthereumStuff() {
  await envInitializer.start(truffleDir);
  const result = await envInitializer.init(truffleDir);
  const enigmaContractAddress = result.contractAddress;
  const enigmaContractABI = result.contractABI;
  const web3 = result.web3;
  const enigmaContractApi = await new EnigmaContractWriterAPI(enigmaContractAddress, enigmaContractABI, web3);

  const accounts = await web3.eth.getAccounts();
  const workerEnclaveSigningAddress = accounts[0];
  const workerAddress = accounts[1];
  const workerReport = '0x123456';
  const signature = web3.utils.randomHex(32);

  await enigmaContractApi.register(workerEnclaveSigningAddress, workerReport, signature, {from: workerAddress});

  await enigmaContractApi.login({from: workerAddress});

  return {enigmaContractAddress: enigmaContractAddress, enigmaContractApi: enigmaContractApi, web3: web3,
    workerEnclaveSigningAddress: workerEnclaveSigningAddress,
    workerAddress: workerAddress};
}

async function stopEthereumStuff(web3) {
  await envInitializer.disconnect(web3);
  await envInitializer.stop();
}

function transformStatesListToMap(statesList) {
  const statesMap = {};
  for (let i = 0; i < statesList.length; ++i) {
    const address = statesList[i].address;
    if (!(address in statesMap)) {
      statesMap[address] = {};
    }
    const key = statesList[i].key;
    statesMap[address][key] = statesList[i].data;
  }
  return statesMap;
}

function prepareSyncTestData() {
  const res = {};
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

  res.expected = transformStatesListToMap([{
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
  return res;
}

const PROVIDERS_DB_MAP = transformStatesListToMap(DB_PROVIDER);

async function setEthereumState(api, web3, workerAddress, workerEnclaveSigningAddress) {
  for (const address in PROVIDERS_DB_MAP) {
    const secretContractData = PROVIDERS_DB_MAP[address];
    const addressInByteArray = address.split(',').map(function(item) {
      return parseInt(item, 10);
    });

    const hexString = '0x' + DbUtils.toHexString(addressInByteArray);
    const codeHash = web3.utils.keccak256(secretContractData[-1]);
    const firstDeltaHash = web3.utils.keccak256(secretContractData[0]);
    const outputHash = web3.utils.randomHex(32);
    const gasUsed = 5;
    await api.deploySecretContract(hexString, codeHash, codeHash, firstDeltaHash, gasUsed, workerEnclaveSigningAddress, {from: workerAddress});

    let i = 1;

    while (i in secretContractData) {
      const taskId = web3.utils.randomHex(32);
      const ethCall = web3.utils.randomHex(32);
      const delta = secretContractData[i];
      const stateDeltaHash = web3.utils.keccak256(delta);
      await api.commitReceipt(hexString, taskId, stateDeltaHash, outputHash, gasUsed, ethCall,
        workerEnclaveSigningAddress, {from: workerAddress});
      i++;
    }
  }
}

function prepareContractAndStates() {
  return new Promise(async (resolve)=>{
    const res = prepareSyncTestData();
    const tips = res.tips;
    const expectedMap= res.expected;

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
    const dnsMockUri = 'tcp://127.0.0.1:4444';
    const peerMockUri = 'tcp://127.0.0.1:5555';

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
      .setIpcConfig({uri: dnsMockUri})
      .build();

    // start the dns
    const peerBuilder = new EnvironmentBuilder();
    const peerController = await peerBuilder
      .setNodeConfig(peerConfig)
      .setIpcConfig({uri: peerMockUri})
      .setEthereumConfig({enigmaContractAddress: enigmaContractAddress})
      .build();

    // write all states to ethereum
    await setEthereumState(api, web3, workerAddress, workerEnclaveSigningAddress);
    await testUtils.sleep(2000);

    let hc = await peerController.healthCheck();
    await dnsController.getNode().stop();
    dnsController.getIpcClient().disconnect();

    await peerController.getNode().stop();
    peerController.getIpcClient().disconnect();

    dnsMockCore.disconnect();
    peerMockCore.disconnect();
    await stopEthereumStuff(ethereumInfo.web3);
    await testUtils.sleep(2000);
    resolve();
  });
}

//TODO:: sync_network_test.js to learn about createN usage

it('#1 perform healthcheck', async function() {
  if (!tree['all'] || !tree['#1']) {
    this.skip();
  }
  return prepareContractAndStates()
  // return new Promise(async  (resolve) =>{
  //   // create env 9 nodes
  //   // discover
  //   // assert connections report
  //   let peersNum = 8;
  //   let {peers,bNode} = await testBuilder.createN(peersNum,noLoggerOpts);
  //   await testUtils.sleep(4*1000);
  //   let bNodeController = bNode.mainController;
  //   let bNodeCoreServer = bNode.coreServer;
  //   let pPaths = peers.map(p=>{
  //     return p.tasksDbPath;
  //   });
  //   let bPath = bNode.tasksDbPath;
  //   const stopTest = async ()=>{
  //     for(let i = 0; i < pPaths.length; ++i){
  //       await peers[i].mainController.shutdownSystem();
  //       peers[i].coreServer.disconnect();
  //       await testUtils.rm_Minus_Rf(pPaths[i]);
  //     }
  //     await bNodeController.shutdownSystem();
  //     bNodeCoreServer.disconnect();
  //     await testUtils.rm_Minus_Rf(bPath);
  //     resolve();
  //   };
  //
  //
  //   let testedNode = peers[0];
  //   // discover
  //   await testedNode.mainController.getNode().asyncTryConsistentDiscovery();
  //   // perform the health check
  //   let hc = await testedNode.mainController.healthCheck();
  //   assert.strictEqual(hc.status, true);
  //   // an address is 20 bytes + '0x' in hex: is 42
  //   assert.strictEqual(hc.core.registrationParams.signKey.length, 42);
  //   // close all peers and resolve test
  //   await stopTest();
  //   await stopEthereumStuff(ethereumInfo.web3);
  //   resolve();
  // })
});

