const TEST_TREE = require('./test_tree').TEST_TREE;
const IpcClient = require('../src/core/ipc');
const assert = require('assert');
const waterfall = require('async/waterfall');
const zmq = require('zeromq');


it('#1 send acks to each other', async function(){
  let tree = TEST_TREE['ipc'];
  if(!tree['all'] || !tree['#1']){
    this.skip();
  }

  return new Promise(async (resolve)=>{
    const uri = 'tcp://127.0.0.1:5555';
    let serverSocket;
    let ipcClient;
    let serverOk = false, clientOk = false;

    waterfall([
      /** run the server - simulate core */
      cb=>{
        serverSocket = zmq.socket('rep');
        serverSocket.bindSync(uri);

        serverSocket.on('message', msg=>{
          serverOk = JSON.parse(msg).clientOk;
          serverSocket.send(JSON.stringify({"serverOk":true}));
        });
        cb(null);
      },
      /** run the client */
      cb=>{
        ipcClient = new IpcClient(uri);
        ipcClient.setResponseHandler((msg)=>{
           clientOk = msg.serverOk;
           cb(null);
        });

        ipcClient.connect();
        ipcClient.sendJson({"clientOk":true});
      }
    ],(err)=>{
      ipcClient.disconnect();
      serverSocket.disconnect(uri);
        if(err){
          assert.strictEqual(true,false,"error in waterfall");
        }else{
          assert.strictEqual(true, serverOk, "serverOk wrong");
          assert.strictEqual(true, clientOk, "clientOk wrong");
          resolve();
        }
    });
  });
});


