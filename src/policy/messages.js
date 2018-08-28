const Policy = require('./policy');
class Msg {

    constructor(msg){
        this.rawMsg = msg;
        this.policy = new Policy();
        this.valid = this.validateMessage();
    }
    validateMessage(){
        return this.policy.validJsonRpc(this.rawMsg);
    }
    jsonrpc(){
        return this.rawMsg['jsonrpc'];
    }
    method(){
        return this.rawMsg['method'];
    }
    id(){
        return this.rawMsg['id'];
    }
}
class PingMsg extends Msg{

    constructor(msg){
        super(msg);
    }
    params(){
        return this.rawMsg['params'];
    }
    sender(){
        return this.params()[0];
    }
    
}

class PongMsg extends Msg{
    constructor(msg){
        super(msg);
    }
    result(){
        return this.rawMsg['result'];
    }
    response(){
        return this.result()['response'];
    }
}