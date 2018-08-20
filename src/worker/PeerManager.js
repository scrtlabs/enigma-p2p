/** This module is responsible for Managing Peers nodes.*/
const EventEmitter = require('events').EventEmitter
const waterfall = require('async/waterfall');
const parallel = require('async/parallel');
const PeerId = require('peer-id');
const PeerInfo = require('peer-info');
const pull = require('pull-stream');
const series = require('async/series');
const PeerBundle = require('./libp2p-bundle');
const Pushable = require('pull-pushable');

class BootstrapManager extends EventEmitter{

    constructor(){
        super();
    }
    /**
     * Get all peers peer list
     * */

}
