/**
 * This class is responsible for everything related to consensus
 *
 * - getMissingStates:
 * - - takes local state as input
 * - - fetches all missing states from ethereum
 * - - returns [{address, deltas : [deltaHash, index]}] => what needs to be synched
 *
 * - validateStates:
 * - - receives states
 * - - validate the hashes with Ethereum
 *
 * */

class EthereumConsensus{
  async getMissingStates(){/*...*/}
  async validateStates(){/*...*/}
}
