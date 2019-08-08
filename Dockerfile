FROM node:dubnium

LABEL maintainer="Isan-Rivkin"

WORKDIR /usr/src/app

RUN apt-get update
RUN npm -g config set user root
RUN npm install -g truffle@5.0.2

COPY package*.json ./
RUN npm install 

COPY . .

EXPOSE 8080
