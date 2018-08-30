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
        if(typeof msgParams == 'string'){
            msgParams = JSON.parse(msgParams);
        }
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
    toNetworkStream(){
        return JSON.stringify(this);
    }
}

class PongMsg extends Msg{

    constructor(msgParams){
        let finalMsg;
        if(typeof msgParams == 'string'){
            msgParams = JSON.parse(msgParams);
        }
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
    toNetworkStream(){
        return JSON.stringify(this);
    }
}

class HeartBeatReqMsg extends Msg {
    constructor(msgParams) {
        let finalMsg;

        if (typeof msgParams == 'string') {
            msgParams = JSON.parse(msgParams);
        }

        if ("jsonrpc" in msgParams) {

            finalMsg = msgParams;

        } else if ("from" in msgParams && "to" in msgParams) {

            finamMsg = {
                "jsonrpc": "2.0",
                "method": "heartbeat",
                "params": [{
                    "from": msgParams.from,
                    "to": msgParams.to,
                }],
                "id": utils.randId()
            };
        }

        super(finalMsg);
        if(new.target === HeartBeatReqMsg){
            Object.freeze(this);
        }
    }
    from(){
        return this.rawMsg["params"][0]["from"];
    }
    to(){
        return this.rawMsg["params"][0]["to"];
    }
    toNetworkStream(){
        return JSON.stringify(this);
    }
    isValidMsg(){
        // TODO:: add extra checks.
        return this.isValidJsonRpc();
    }
}

class HeartBeatReqMsg extends Msg {
    constructor(msgParams){

    }
}
//TODO:: Create a message structure for peer response to /getpeerbook
//TODO:: /getpeerbook request is not needed since there's no content there.
class GetPeerBookResonseMsg extends Msg {
    constructor(msgParams){
        let finalMsg;
        super(finalMsg);
        if(new.target === GetPeerBookResonseMsg){
            Object.freeze(this);
        }
    }
}

module.exports.PingMsg = PingMsg;
module.exports.PongMsg = PongMsg;

