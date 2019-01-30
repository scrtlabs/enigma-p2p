const EventEmitter = require('events');
const Web3 = require('web3');

const constants = require('../common/constants');
const EVENTS = constants.ETHEREUM_EVENTS;

class EthereumAPI extends EventEmitter {
  /**
   * {EnigmaContractReaderAPI} enigmaContractAPI
   * {EthereumServices} ethereumServices
   * */
  constructor(contractAPI, ethereumServices) {
    super();
    this._contractApi = contractAPI;
    this._ethereumServices = ethereumServices;
    this._workerParam = null;
  }

  /**
   * Init the API
   */
  async init() {
    // this._ethereumServices = new EthereumServicesAPI(this._contractApi);
    // this._ethereumServices.initServices(['NewEpoch']);

    await this._updateWorkerParam();
    this._ethereumServices.on(EVENTS.NewEpoch, this._newEpochUpdate);
  }

  /**
   * Verify that the worker address is in the selected workers group for the given secret contract address
   * @param {string} secretContractAddress - Secret contract address
   * @param {string} workerAddress - Worker address
   * @return {Boolean} true if the worker is in the selected group
   */
  verifySelectedWorker(secretContractAddress, workerAddress) {
    // In order to not be bound to Ethereum, we create a new web3 instance here and not use the
    // EnigmaContractApi instance
    const web3 = new Web3();
    const selectedWorker = EthereumAPI.selectWorkerGroup(secretContractAddress, this._workerParam, web3, 1)[0];
    return (selectedWorker.signer === workerAddress);
  }

  /**
   * Select the workers weighted-randomly based on the staked token amount that will run the computation task
   *
   * @param {string} scAddr - Secret contract address
   * @param {Object} params - Worker params
   * @param {Object} web3
   * @param {number} workerGroupSize - Number of workers to be selected for task
   * @return {Array} An array of selected workers where each selected worker is chosen with probability equal to
   * number of staked tokens
   */
  static selectWorkerGroup(secretContractAddress, params, web3, workerGroupSize) {
    // Find total number of staked tokens for workers
    const tokenCpt = params.balances.reduce((a, b) => a + b, 0);
    let nonce = 0;
    const selectedWorkers = [];
    do {
      // Unique hash for epoch, secret contract address, and nonce
      const hash = web3.utils.soliditySha3(
          {t: 'uint256', v: params.seed},
          {t: 'bytes32', v: secretContractAddress},
          {t: 'uint256', v: nonce},
      );
      // Find random number between [0, tokenCpt)
      let randVal = (web3.utils.toBN(hash).mod(web3.utils.toBN(tokenCpt))).toNumber();
      let selectedWorker = params.workers[params.workers.length - 1];
      // Loop through each worker, subtracting worker's balance from the random number computed above. Once the
      // decrementing randVal becomes negative, add the worker whose balance caused this to the list of selected
      // workers. If worker has already been selected, increase nonce by one, resulting in a new hash computed above.
      for (let i = 0; i < params.workers.length; i++) {
        randVal -= params.balances[i];
        if (randVal <= 0) {
          selectedWorker = params.workers[i];
          break;
        }
      }
      if (!selectedWorkers.includes(selectedWorker)) {
        selectedWorkers.push(selectedWorker);
      }
      nonce++;
    }
    while (selectedWorkers.length < workerGroupSize);
    return selectedWorkers;
  }

  _newEpochUpdate() {
    this._updateWorkerParam();
  }

  async _updateWorkerParam() {
    const blockNumber = await this._contractApi.getBlockNumber();
    const getWorkerParamsResult = await this.getWorkerParams(blockNumber);
    this._workerParam = {
      firstBlockNumber: parseInt(getWorkerParamsResult[0]),
      seed: parseInt(getWorkerParamsResult[1]),
      workers: getWorkerParamsResult[2],
      balances: getWorkerParamsResult[3].map((x) => parseInt(x)),
    };
  }
}


module.exports = EthereumAPI;
