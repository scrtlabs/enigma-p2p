const Policy = require('./policy');
const utils = require('../common/utils');

class Msg {
    constructor(msg){
        this.rawMsg = msg;
        this.policy = new Policy();
        this.validJsonRpc = this.validateMessage();
        // make immutable
        if(new.target === Msg){
            Object.freeze(this);
        }
    }
    validateMessage(){return this.policy.validJsonRpc(this.rawMsg);}
    jsonrpc(){return this.rawMsg['jsonrpc'];}
    method(){return this.rawMsg['method'];}
    id(){return this.rawMsg['id'];}
    isValidJsonRpc(){ return this.validJsonRpc;}
    toJSON(){return this.rawMsg;}
}

class PingMsg extends Msg{
    constructor(msgParams){
        let finalMsg;
        if("jsonrpc" in msgParams){
            finalMsg = msgParams;
        }else{
            if("findpeers" in msgParams && "from" in msgParams){
                finalMsg = {
                    "jsonrpc" : "2.0",
                    "method" : "ping",
                    "params" : [{'from': msgParams.from,'findpeers' : msgParams.findpeers}],
                    "id" : utils.randId()
                };
            }else{
                throw new Error("[-] error construction ping msg ");
            }
        }

        super(finalMsg);
        if(new.target === PingMsg){
            Object.freeze(this);
        }
    }
    params(){
        return this.rawMsg['params'];
    }
    from(){
        return this.params()[0]['from'];
    }
    findPeers(){
        return this.params()[0]['findpeers'];
    }
    isValidMsg(){
        // TODO:: add extra checks.
        return this.isValidJsonRpc();
    }
}

class PongMsg extends Msg{

    constructor(msgParams){
        let finalMsg;

        if("jsonrpc" in msgParams){
            finalMsg = msgParams;
        }else if("id" in msgParams &&
            "from" in msgParams &&
            "to" in msgParams &&
            "status" in msgParams &&
            "seeds" in msgParams){

            finalMsg = {
                "jsonrpc" : "2.0",
                "method" : "pong",
                "id" :msgParams.id,
                "result" : {
                    "response" : {
                        "from" : msgParams.from,
                        "to" : msgParams.to,
                        "status" : msgParams.status,
                        "seeds" : msgParams.seeds
                    }
                }
            };

        }else{
            throw new Error('[-] Error creating a pong message');
        }

        super(finalMsg);
        if(new.target === PongMsg){
            Object.freeze(this);
        }
    }

    result(){
        return this.rawMsg['result'];
    }
    response(){
        return this.result()['response'];
    }
    from(){
        return this.response()['from'];
    }
    to(){
        return this.response()['to'];
    }
    status(){
        return this.response()['status'];
    }
    seeds(){
        return this.response()['seeds'];
    }
    isValidMsg(){
        // TODO:: add extra checks.
        return this.isValidJsonRpc();
    }
}

module.exports.PingMsg = PingMsg;
module.exports.PongMsg = PongMsg;

