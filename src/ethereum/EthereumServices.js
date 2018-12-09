const EventEmitter = require('events');

const servicesMap = {
    NewEpoch: ["WorkersParameterized"],
    TaskCreation: ["TaskRecordCreated", "TaskRecordsCreated"],
    TaskSubmission: ["ReceiptVerified", "ReceiptsVerified"],
    SecretContractDeployment: ["SecretContractDeployed"]
}


class EthereumServices extends EventEmitter {
    /**
     * {EnigmaContractReaderAPI} enigmaContractAPI
     * 
     * */
    constructor (enigmaContractAPI) {
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
                
            })
        }
        else {
            Object.keys(this._servicesMap).forEach((service)=> {
                this._initService(service);    
            })
        }
    }

    _initService(serviceName) {
        this._servicesMap[serviceName].forEach((eventName)=> {
            this._api.subscribe(eventName, {}, (err, event)=>{
                if (err) {
                    this.emit(serviceName, err);
                }
                else {
                    this.emit(serviceName, null, event);
                }
            })    
        });
    }
}
    

module.exports = EthereumServices;
