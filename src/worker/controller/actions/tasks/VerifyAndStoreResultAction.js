/**
 * this action handles everything that is published to task results topic
 * i.e whenever some other worker publishes a result of computation or deployment
 * this action:
 * - verify correctness of task
 * - update local storage
 * */
const constants = require('../../../../common/constants');
class PublishTaskResultAction{
  constructor(controller) {
    this._controller = controller;
  }
  /**
   * params {
   * notification,
   * params : Buffer -> {the actuall object from publish that contains from,data,,...}
   * }
   * */
  async execute(params){
    let message = params.params;
    let from = message.from; // b58 id
    // { taskId: '66666666666666666',
    //     status: '2',
    //     preCodeHash: 'hash-of-the-precode-bytecode',
    //     output: 'the-deployed-bytecode',
    //     delta: { key: 0, delta: [ 11, 2, 3, 5, 41, 44 ] },
    //   usedGas: 'amount-of-gas-used',
    //       ethereumPayload: 'hex of payload',
    //     ethereumAddress: 'address of the payload',
    //     signature: 'enclave-signature' }
    let data = message.data;
    let resultObj = JSON.parse(JSON.parse(data.toString()).result);
  }
}
module.exports = PublishTaskResultAction;
