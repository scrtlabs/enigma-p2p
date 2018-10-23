const express = require('express');
const cors = require('cors');

class NetworkMonitor {

  constructor(){
    this._app = express();
    this._app.use(cors());

    this._app.get('/events', (req, res) => {

      // create the response headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });

      let i = 0;
      // connect to the data source
      this.connect(() => {
       setInterval(() => {
         // ping the data source
         this.ping((data) => {
           console.log('Got data:' + data);
           // each response must have a unique id!
           i=i+1;
           res.write('id: '+i+'\n');

           // convert the result to a JSON string and write to the client
           res.write('data: '+JSON.stringify(data)+'\n\n');
         });
       // ping every two seconds
       }, 2000); 
      });
    });

    this._server = this._app.listen(3000, () => {
      let port = this._server.address().port
      console.log('Network Monitor streaming at http://localhost:%s/events', port)
    });

  }
  
  connect(callback) {
    // connect to a data source
    console.log('Connected');
    callback();
  }

  ping(callback) {
    // ping for data from the source
    let m = Math.floor(Math.random() * 10);
    console.log(m);
    callback(m);
  }

}

module.exports = NetworkMonitor;

