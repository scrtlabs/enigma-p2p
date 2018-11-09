# Network Monitor

Converts any node in the network into a special node that monitors and displays the structure of the Enigma network.
It runs a webserver ([express.js](https://expressjs.com/)) that any client can connect to, and visualize the current network structure. HTTP server and web 
browser communicate with [socket.io](https://socket.io/), and browser displays the graph using [D3.js](https://d3js.org/).
<p align="center">
<img src="https://s3.amazonaws.com/enigmaco-docs/protocol/enigma-p2p/networkMonitor.png">
</p>

## Sample Network Configurations
<img src="https://s3.amazonaws.com/enigmaco-docs/protocol/enigma-p2p/network1.png"><img src="https://s3.amazonaws.com/enigmaco-docs/protocol/enigma-p2p/network2.png">
<img src="https://s3.amazonaws.com/enigmaco-docs/protocol/enigma-p2p/network3.png"><img src="https://s3.amazonaws.com/enigmaco-docs/protocol/enigma-p2p/network4.png">

## Usage

Launch first a DNS node:

`node cli.js -n dns -i B1 -b B1 -p B1`

Then launch the monitor, and point your browser to: http://localhost:3000

`node monitor.js`

And then spawn any number of nodes on the network (see inline comments for different configurations):

`node network_up.js`
