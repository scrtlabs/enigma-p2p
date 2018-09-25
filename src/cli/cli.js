const NodeController = require('../worker/controller/NodeController');



var readline = require('readline');
var program = require('commander');


const B1Path = "/home/wildermind/WebstormProjects/enigma-p2p/test/testUtils/id-l";
const B1Port = "10300";
const B2Path = "/home/wildermind/WebstormProjects/enigma-p2p/test/testUtils/id-d";
const B2Port = "103001";
const B1Addr = '/ip4/0.0.0.0/tcp/10300/ipfs/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm';
const B2Addr = '/ip4/0.0.0.0/tcp/103001/ipfs/Qma3GsJmB47xYuyahPZPSadh1avvxfyYQwk8R3UnFrQ6aP';

let configObject = {
    'bootstrapNodes' : null,
    'port' : null,
    'nickname' : null,
    'idPath' : null,
};

let changedKeys = [];

let node;

function list(val) {
    let parseVal =val.split(',');
    parseVal.forEach(ma=>{
        let toReplace = '';
        let val = '';
        if(ma === "B1"){
            val = "B1";
            toReplace = B1Addr;
        }
        if(ma === "B2"){
            val = "B2";
            toReplace = B2Addr;
        }

        let idx = parseVal.indexOf(val);
        parseVal[idx] = toReplace;
    });
    configObject.bootstrapNodes = parseVal;
    changedKeys.push("bootstrapNodes");
    return parseVal;
}

function nickname(val){
    let parsedVal =val.toString();
    configObject.nickname = parsedVal;
    changedKeys.push("nickname");
    return parsedVal;
}
function port(val){
    let parseVal =val.toString();
    if(parseVal === 'B1')
        parseVal = B1Port;
    if(parseVal === 'B2')
        parseVal = B2Port;
    configObject.port = parseVal;
    changedKeys.push("port");
    return parseVal;
}

function idPath(val){
    let parsedVal = val.toString();
    if(parsedVal === 'B1')
        parsedVal = B1Path;
    if(parsedVal === 'B2')
        parsedVal = B2Path;
    configObject.idPath = parsedVal;
    changedKeys.push("idPath");
    return parsedVal;
}


function initInitialConfig(){
    program
        .version('0.1.0')
        .usage('[options] <file ...>')
        .option('-s, --bnodes <items>', 'Bootstrap nodes', list)
        .option('-n, --nickname [value]', 'nickname',nickname)
        .option('-p, --port [value]', 'listening port', port)
        .option('-i, --path [value]', 'id path', idPath)
        .parse(process.argv);

}

function getFinalConfig(){
    let finalConfig = {};
    changedKeys.forEach(key=>{
        finalConfig[key] = configObject[key];
    });
    return finalConfig;
}

let commands = {
    'addPeer' : (args)=>{
        let ma = args[1];
        node.addPeer(ma);
    },
    'getAddr' : ()=>{
        let addrs = node.getSelfAddrs();
        console.log("---> self addrs : <---- ")
        console.log(addrs);
    },
    'getOutConnections' : ()=>{
        let cons = node.getAllOutboundHandshakes();
        console.log("---> outbound connections <---");
        cons.forEach(con=>{
            console.log(con.id.toB58String());
        });
    },
    'getInConnections' : ()=>{
        let cons = node.getAllInboundHandshakes();
        console.log("---> inbound connections <---");
        cons.forEach(con=>{
            console.log(con.id.toB58String());
        });
    },
    'peerBank' : () =>{
        let peers = node.getAllPeerBank();
        console.log("peer bank: ");
        for(let k in peers){
            console.log(k);
        }
    }
};

function execCmd(cmd){
    let args = cmd.split(" ");
    if(commands[args[0]]){
        commands[args[0]](args);
    }else{
        console.log("XXX no such command XXX ");
    }
};
function initReadLine(){

    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
    });

    rl.on('line', function(line){
        execCmd(line);
    });
}

async function initializeNode(){
    console.log("----- starting node with config ----- ");
    let config = getFinalConfig();
    console.log(JSON.stringify(config, null,2));

    node = NodeController.initDefaultTemplate(config);

    await node.engNode().syncRun();

    console.log("node has started");
}


initInitialConfig();
initializeNode();
initReadLine();