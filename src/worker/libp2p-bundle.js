const libp2p = require('libp2p');
const TCP = require('libp2p-tcp');
const Mplex = require('libp2p-mplex');
// const SECIO = require('libp2p-secio');
const KadDHT = require('libp2p-kad-dht');
const defaultsDeep = require('@nodeutils/defaults-deep');
const Bootstrap = require('libp2p-bootstrap');
const SPDY = require('libp2p-spdy');
const WS = require('libp2p-websockets');
// const MulticastDNS = require('libp2p-mdns');

class PeerBundle extends libp2p {
  constructor(_options) {
    const defaults = {
      modules: {
        transport: [TCP, WS],
        streamMuxer: [Mplex, SPDY],
        // connEncryption: [ SECIO ],
        peerDiscovery: [Bootstrap],
        dht: KadDHT,
      },
      config: {
        dht: {
          kBucketSize: 20,
        },
        EXPERIMENTAL: {
          dht: true,
          pubsub: true,
        },
        peerDiscovery: {
          bootstrap: {
            interval: 2000,
            enabled: false,
            list: [],
          },
        },
      },
    };
    const finalConfigurations = defaultsDeep(_options, defaults);
    super(finalConfigurations);
  }
}

module.exports = PeerBundle;
