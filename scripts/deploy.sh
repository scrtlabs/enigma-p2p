#!/bin/bash
git clone https://github.com/enigmampc/discovery-docker-network.git
cd discovery-docker-network/enigma-p2p

if [[ ${TRAVIS_BRANCH} == "master" ]]; then
	TAG=latest
else
	# ${TRAVIS_BRANCH} == "develop"
	TAG=develop
fi

docker build --build-arg GIT_BRANCH_P2P=$TRAVIS_BRANCH -t enigmampc/enigma_p2p:${TAG} --no-cache .
echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin
docker push enigmampc/enigma_p2p:${TAG}
