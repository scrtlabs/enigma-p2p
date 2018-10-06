const waterfall = require('async/waterfall');
const parallel = require('async/parallel');
const PeerId = require('peer-id');
const PeerInfo = require('peer-info');
const pull = require('pull-stream');
const series = require('async/series');
const NodeBundle = require('../../src/worker/libp2p-bundle');
const EngNode = require('../../src/worker/EnigmaNode');
const nodeUtils = require('../../src/common/utils');
const Pushable = require('pull-pushable')
const consts = require('../../src/common/constants');
const PROTOCOLS = consts.PROTOCOLS;
const ProtocolHandler = require('../../src/worker/handlers/ProtcolHandler');
const Controller = require('../../src/worker/controller/NodeController');