# enigma-p2p
| Branch | Build | Code Coverage | 
|--------|-------|---------------|
| Master |[![Build Status](https://travis-ci.com/enigmampc/enigma-p2p.svg?token=cNBBjbVVEGszuAJUokFT&branch=master)](https://travis-ci.com/enigmampc/enigma-p2p) | [![codecov](https://codecov.io/gh/enigmampc/enigma-p2p/branch/master/graph/badge.svg?token=SSyRKy7Ckg)](https://codecov.io/gh/enigmampc/enigma-p2p) |
| Develop |[![Build Status](https://travis-ci.com/enigmampc/enigma-p2p.svg?token=cNBBjbVVEGszuAJUokFT&branch=develop)](https://travis-ci.com/enigmampc/enigma-p2p) | [![codecov](https://codecov.io/gh/enigmampc/enigma-p2p/branch/develop/graph/badge.svg?token=SSyRKy7Ckg)](https://codecov.io/gh/enigmampc/enigma-p2p) |

[WIP] The Enigma Worker P2P package written in Node.js based on libp2p-js [WIP]

The P2P implementation of the Enigma Worker. This implementation is part of the Node stack running as a process on the OS communicating both with `Core` and the outside world.

# Getting Started

## Quick CLI


First:

`cd ./src/cli`

For help and list of flags:

`$node cli_app.js -h`

For interactive-options help type `$help` while running. 

For quick launching with default the CLI with 1 bootstrap node type:

`node cli_app.js -n dns -i B1 -b B1 -p B1 --core <ip>:<port> --proxy <port>`

For the run-time commands the node can do:

**While already running type**  `help`

for quick launch with default worker(s) in a different terminal type:

`node cli_app.js -b B1 --core <ip>:<port> --proxy <port>`

`--core <ip>:<port>` flag will start a mock server on the given port and connect to it. 

`--proxy <port>` will start up the JSONrpc server as well.
 

## Prerequisites
* TBD
## Installing
* TBD
# Running the Node
* TBD
# Running the tests
* TBD


## JSON RPC API

<img src="docs/jsonrpc.png"
     alt="streams flow " />

## Built With

* [NodeJS](https://nodejs.org/en/)
* [Libp2p](https://libp2p.io/) - Networking library

## Authors

* TBD

## License

The Enigma Worker P2P is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details.

You should have received a [copy](LICENSE) of the GNU Affero General Public License along with this program.  If not, see <https://www.gnu.org/licenses/>.
