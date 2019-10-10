const EventEmitter = require('events');

const constants = require('../common/constants');
const EVENTS = constants.ETHEREUM_EVENTS;

let servicesMap = {};

servicesMap[EVENTS.NewEpoch] = ['WorkersParameterized'];
servicesMap[EVENTS.TaskCreation] = ['TaskRecordCreated'];
servicesMap[EVENTS.TaskSuccessSubmission] = ['ReceiptVerified'];
servicesMap[EVENTS.TaskFailureSubmission] = ['ReceiptFailed'];
servicesMap[EVENTS.TaskFailureDueToEthereumCB] = ['ReceiptFailedETH'];
servicesMap[EVENTS.TaskCancelled] = ['TaskFeeReturned'];
servicesMap[EVENTS.SecretContractDeployment] = ['SecretContractDeployed'];


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
      desiredServices.forEach((service)=> {
        this._initService(service);
      });
    } else {
      Object.keys(this._servicesMap).forEach((service)=> {
        this._initService(service);
      });
    }
  }

  _initService(serviceName) {
    this._servicesMap[serviceName].forEach((eventName)=> {
      this._api.subscribe(eventName, {}, (err, event)=>{
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
