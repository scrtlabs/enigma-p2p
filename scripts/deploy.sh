#!/bin/bash
git clone https://github.com/enigmampc/discovery-docker-network.git
cd discovery-docker-network/enigma-p2p
docker build --build-arg GIT_BRANCH_CONTRACT=$TRAVIS_BRANCH -t enigmampc/enigma_p2p:latest --no-cache .
echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin
docker push enigmampc/enigma_p2p:latest
