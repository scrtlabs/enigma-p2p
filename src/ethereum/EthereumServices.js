const EventEmitter = require("events");

const constants = require("../common/constants");

let servicesMap = {};

servicesMap[constants.ETHEREUM_EVENTS.NewEpoch] = [
  constants.RAW_ETHEREUM_EVENTS.WorkersParameterized
];
servicesMap[constants.ETHEREUM_EVENTS.TaskCreation] = [
  constants.RAW_ETHEREUM_EVENTS.TaskRecordCreated
];
servicesMap[constants.ETHEREUM_EVENTS.TaskSuccessSubmission] = [
  constants.RAW_ETHEREUM_EVENTS.ReceiptVerified
];
servicesMap[constants.ETHEREUM_EVENTS.TaskFailureSubmission] = [
  constants.RAW_ETHEREUM_EVENTS.ReceiptFailed
];
servicesMap[constants.ETHEREUM_EVENTS.TaskFailureDueToEthereumCB] = [
  constants.RAW_ETHEREUM_EVENTS.ReceiptFailedETH
];
servicesMap[constants.ETHEREUM_EVENTS.TaskCancelled] = [
  constants.RAW_ETHEREUM_EVENTS.TaskFeeReturned
];
servicesMap[constants.ETHEREUM_EVENTS.SecretContractDeployment] = [
  constants.RAW_ETHEREUM_EVENTS.SecretContractDeployed
];

class EthereumServices extends EventEmitter {
  /**
   * {EnigmaContractReaderAPI} enigmaContractAPI
   *
   * */
  constructor(enigmaContractAPI) {
    super();
    this._api = enigmaContractAPI;
    this._servicesMap = servicesMap;
  }

  /**
   * init services
   * @param {Array<string>} desiredServices
   * */
  initServices(desiredServices) {
    if (desiredServices !== undefined && desiredServices !== null) {
      desiredServices.forEach(service => {
        this._initService(service);
      });
    } else {
      Object.keys(this._servicesMap).forEach(service => {
        this._initService(service);
      });
    }
  }

  _initService(serviceName) {
    this._servicesMap[serviceName].forEach(eventName => {
      this._api.subscribe(eventName, {}, (err, event) => {
        if (err) {
          this.emit(serviceName, err);
        } else {
          event.type = serviceName;
          this.emit(serviceName, null, event);
        }
      });
    });
  }
}

module.exports = EthereumServices;
