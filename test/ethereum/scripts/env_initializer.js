const { exec, spawn } = require('child_process');
const Web3 = require('web3');

const testUtils = require('../../testUtils/utils');


let subprocess; // Global `trufffle develop` "child process" object 


function buildEnv(truffleDirectory) {
    return new Promise((resolve, reject) => {
        const command = 'cd ' + truffleDirectory + ' && truffle compile && cd ' + process.cwd();
        exec(command, (err, stdout, stderr) => {
            if (err) {
                reject();
            }
            //console.log(stdout);
            resolve(stderr, stdout);
        })
    })
}

function resetEnv(truffleDirectory) {
    return new Promise((resolve, reject) => {
        const command = 'cd ' + truffleDirectory + ' && truffle migrate --reset && cd ' + process.cwd();
        exec(command, (err, stdout, stderr) => {
            if (err) {
                reject();
            }
            //console.log(stdout);
            resolve(stderr, stdout);
        })
    })
}


async function init(truffleDirectory) {
    await buildEnv(truffleDirectory);
    await resetEnv(truffleDirectory);

    const EnigmaContractJson = require("./build/contracts/EnigmaMock.json");
    const EnigmaTokenContractJson = require("./build/contracts/EnigmaToken.json");

    const websocketProvider = "ws://127.0.0.1:9545"
    const provider = new Web3.providers.WebsocketProvider(websocketProvider);
    
    // from https://github.com/ethereum/web3.js/issues/1354
    provider.on('error', e => console.error('WS Error: ', e)); // provider.on('error', e => console.error('WS Error', e));
    provider.on('end', e => console.log('WS End')); // provider.on('end', e => console.error('WS End', e));
    
    let web3 = new Web3(provider);

    const accounts = await web3.eth.getAccounts();

    const sender1 = accounts[0];
    const sender2 = accounts[1];
    const principal = accounts[2];//'0x627306090abab3a6e1400e9345bc60c78a8bef57';

    let enigmaTokenContract = new web3.eth.Contract(EnigmaTokenContractJson.abi);
  
    let enigmaTokenContractInstance = await enigmaTokenContract.deploy({data: EnigmaTokenContractJson.bytecode, arguments: []})
        .send({
            from: sender1,
            gas: 1500000,
            //gasPrice: '100000000000'
        });

    //console.log('using account', principal, 'as principal signer');
    
    let enigmaContract = new web3.eth.Contract(EnigmaContractJson.abi);
    enigmaContractInstance = await enigmaContract.deploy({
        data: EnigmaContractJson.bytecode, 
        arguments: [enigmaTokenContractInstance.options.address, principal]
        }).send({
                from: sender2,
                gas: 6500000//4500000,
                //gasPrice: '100000000000'
            });
    
    return {contractAddress : enigmaContractInstance.options.address, contractABI: EnigmaContractJson.abi, web3 : web3};
}


async function startNetwork(truffleDirectory) {
    const command = 'cd ' + truffleDirectory + ' && truffle develop';
    subprocess = spawn(command, {
        shell: true,
        detached: true,
    });
        
    subprocess.unref();

    await testUtils.sleep(3000);
}


async function start(truffleDirectory) {
    await startNetwork(truffleDirectory);
}


function stop(web3) {
    subprocess.kill();
}


function disconnect(web3) {
    web3.currentProvider.disconnect();
}


module.exports = {start : start, stop: stop, init: init, disconnect: disconnect}
