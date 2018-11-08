

class AfterOptimalDHTAction {
  constructor(controller) {
    this._controller = controller;
  }

  execute(params) {
    const success = params.status;
    const bootTime = params.bootTime;


    // TODO:: Initialize the process of understand what is missing


    console.log('^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^');
    console.log('AfterOptimalDHTAction');
    console.log('status: ' + success + ' bootTime: ' + bootTime);
    console.log('^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^');
  }
}

module.exports = AfterOptimalDHTAction;
