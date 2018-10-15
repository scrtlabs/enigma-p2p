

class AfterOptimalDHTAction{

    constructor(controller){
        this._controller = controller;
    }

    execute(params){

        let success = params.status;
        let bootTime = params.bootTime;


        // TODO:: Initialize the process of understand what is missing


        console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^");
        console.log("AfterOptimalDHTAction");
        console.log("status: " + success + " bootTime: " + bootTime);
        console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^");

    }
}

module.exports = AfterOptimalDHTAction;