const opener = require('./opener');
const path = require('path')
const NodeController = require('../worker/controller/NodeController');
const nodeUtils = require('../../src/common/utils');
var readline = require('readline');
var program = require('commander');


const B1Path = path.join(__dirname, "../../test/testUtils/id-l");
const B1Port = "10300";
const B2Path = path.join(__dirname, "../../test/testUtils/id-d");
const B2Port = "10301";
const B1Addr = '/ip4/0.0.0.0/tcp/10300/ipfs/QmcrQZ6RJdpYuGvZqD5QEHAv6qX4BrQLJLQPQUrTrzdcgm';
const B2Addr = '/ip4/0.0.0.0/tcp/10301/ipfs/Qma3GsJmB47xYuyahPZPSadh1avvxfyYQwk8R3UnFrQ6aP';
changedKeys = [];
configObject = {
  'bootstrapNodes' : null,
  'port' : null,
  'nickname' : null,
  'idPath' : null,
};

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

class CLI{
  constructor(){
    this._node = null;
  }
  async start(){
    this._initInitialConfig();
    await this._initializeNode();
  }

  _initInitialConfig(){
    program
    .version('0.1.0')
    .usage('[options] <file ...>')
    .option('-b, --bnodes <items>', 'Bootstrap nodes', list)
    .option('-n, --nickname [value]', 'nickname', nickname)
    .option('-p, --port [value]', 'listening port', port)
    .option('-i, --path [value]', 'id path', idPath)
    .parse(process.argv);
  }
  async _initializeNode(){
    console.log("----- starting node with config ----- ");
    let config = this._getFinalConfig();
    console.log(JSON.stringify(config, null,2));
    console.log("--------------------------------------");
    this._node = NodeController.initDefaultTemplate(config);

    await this._node.engNode().syncRun();

    console.log("node has started");
  }
  _getFinalConfig(){
    let finalConfig = {};
    changedKeys.forEach(key=>{
      finalConfig[key] = configObject[key];
    });
    return finalConfig;
  }

  _list(val) {
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
}




