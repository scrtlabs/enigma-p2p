FROM node:10
MAINTAINER Isan-Rivkin
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm -g config set user root
RUN npm install -g truffle@5.0.2
RUN npm install 
COPY . .
EXPOSE 8080
RUN apt-get update