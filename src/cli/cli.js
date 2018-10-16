const path = require('path')
const NodeController = require('../worker/controller/NodeController');



var readline = require('readline');
var program = require('commander');


const B1Path = path.join(__dirname, "../../test/testUtils/id-l");
const B1Port = "10300";
const B2Path = path.join(__dirname, "../../test/testUtils/id-d");
const B2Port = "10301";
const B1Addr = '/ip4/0.0.0.0/tcp/10300/ipfs/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm';
const B2Addr = '/ip4/0.0.0.0/tcp/10301/ipfs/Qma3GsJmB47xYuyahPZPSadh1avvxfyYQwk8R3UnFrQ6aP';

let configObject = {
    'bootstrapNodes' : null,
    'port' : null,
    'nickname' : null,
    'idPath' : null,
};

let changedKeys = [];

let node;
let openner = "  ______       _                         _____ ___  _____  \n" +
" |  ____|     (_)                       |  __ \\__ \\|  __ \\ \n" +
" | |__   _ __  _  __ _ _ __ ___   __ _  | |__) | ) | |__) |\n" +
" |  __| | '_ \\| |/ _` | '_ ` _ \\ / _` | |  ___/ / /|  ___/ \n" +
" | |____| | | | | (_| | | | | | | (_| | | |    / /_| |     \n" +
" |______|_| |_|_|\\__, |_| |_| |_|\\__,_| |_|   |____|_|     \n" +
"                  __/ |                                    \n" +
"                 |___/                                     ";
console.log(openner);
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
        .option('-b, --bnodes <items>', 'Bootstrap nodes', list)
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
        console.log(">------------------------<");
    },
    'getOutConnections' : ()=>{
        let cons = node.getAllOutboundHandshakes();
        console.log("---> outbound connections <---");
        cons.forEach(con=>{
            console.log(con.id.toB58String());
        });
        console.log(">------------------------<");
    },
    'getInConnections' : ()=>{
        let cons = node.getAllInboundHandshakes();
        console.log("---> inbound connections <---");
        cons.forEach(con=>{
            console.log(con.id.toB58String());
        });
        console.log(">------------------------<");
    },
    'peerBank' : () =>{
        let peers = node.getAllPeerBank();
        console.log("peer bank: ");
        for(let k in peers){
            console.log(k);
        }
        console.log(">------------------------<");
    },
    'discover' : () =>{
        node.tryConsistentDiscovery();
    },
    'inCount' : () =>{
        let cons = node.getAllInboundHandshakes();
        console.log("---> inbound connections <---");
        console.log(cons.length);
        console.log(">------------------------<");
    },
    'outCount' : () =>{
        let cons = node.getAllOutboundHandshakes();
        console.log("---> outbound connections <---");
        console.log(cons.length);
        console.log(">------------------------<");
    },
    'broadcast' : (args) =>{
        let msg = args[1];
        node.broadcast(msg);
    },
    'provide' : (args) =>{
        node.provideContent();
    },
    'simpleCon' : (args)=>{
        let id = args[1];
        node.isSimpleConnected(id);
    },
    'help' : (args)=>{
        console.log("---> Commands List <---");
        console.log("$addPeer <address> : connect to a new peer manualy."); 
        console.log("$getAddr : get the multiaddress of the node. "); 
        console.log("$getOutConnections : get id list of the outbound connections "); 
        console.log("$getInConnections : get list of the inbound connections "); 
        console.log("$peerBank : get list of the potential (not connected) seeds"); 
        console.log("$discover : perform persistent discovery to reach optimal DHT"); 
        console.log("$inCount : number of inbound connections");
        console.log("$outCount : number of outbound connections"); 
        console.log("$broadcast <message> : broadcast a message to the whole network"); 
        console.log("$provide : announce the network the content the node provides"); 
        console.log("$simpleCon : number of total simple connections"); 
        console.log("$help : help"); 
        console.log(">------------------------<");
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
    console.log("--------------------------------------");
    node = NodeController.initDefaultTemplate(config);

    await node.engNode().syncRun();

    console.log("node has started");
}


initInitialConfig();
initializeNode();
initReadLine();