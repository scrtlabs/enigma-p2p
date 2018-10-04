const constants = require('../../../common/constants');
const STAT_TYPES = constants.STAT_TYPES;
const STATUS = constants.MSG_STATUS;
const TOPICS = constants.PUBSUB_TOPICS;


class PubsubPublishAction{


    constructor(controller){
        this._controller = controller;
    }

    execute(params){

        let topic = params.topic;
        let msgBuffer = Buffer.from(params.message);

        if (!this._controller.policy().isValidTopic(topic)){
            console.log("[-] Err invalid topic name " + topic);
            return;
        }

        this._controller.engNode().broadcast(
            topic,
            msgBuffer,
            ()=>{
                console.log("published [" + TOPICS.BROADCAST+"]")
            }
        )
    }
}
module.exports = PubsubPublishAction;