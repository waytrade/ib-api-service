# Interactive Brokers REST/Websock Server (ib-api-service)

![GitHub package.json version](https://img.shields.io/github/package-json/v/waytrade/ib-api-service)
[![Test and Publish](https://github.com/waytrade/ib-api-service/actions/workflows/publish.yml/badge.svg)](https://github.com/waytrade/ib-api-service/actions/workflows/publish.yml)
[![Language grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/waytrade/ib-api-service.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/waytrade/ib-api-service/context:javascript)

This App implements a REST API (with OpenAPI spec and SwaggerUI) + a Websocket Server on top of https://github.com/stoqey/ib and brings a docker image, to run the App and the IB Gateway all in one container.

---

We use this app as part of our microservice ecosystem and it is OSS so you don't need to write it again. No questions will be answered, no support will be given, no feature-request will be accepted. Use it - or fork it and roll your own :)

---

## How run the standalone docker container

Create an .env file on root folder with:

- TWS_USERID (your TWS user id)
- TWS_PASSWORD (your TWS password)
- TRADING_MODE ('paper' or 'live')

Run:

    $ docker-compose up --build

Open http://localhost:3000 to browse the SwaggerUI learn about the API.

## How to use it on your docker-compose.yml:

```
ib-api-service:
  image: ghcr.io/waytrade/ib-api-service/production:latest
  restart: always
  environment:
    SERVER_PORT: 3000
    IB_GATEWAY_PORT: 4002
    IB_GATEWAY_HOST: ib-gateway
  ports:
    - 3000:3000
```

See [ib-gateway-docker](https://github.com/waytrade/ib-gateway-docker) for
an Interactive Brokers Gateway on docker.

---

## How to build a client

### Get openapi.json from server

Run the standalone docker and download http://localhost:3000/openapi.json

or

Install the '@waytrade/ib-api-service' package:

    $ yarn add @waytrade/ib-api-service

_Note that all @waytrade packages are hosted on **github not on npmjs**._
You will need a .npmrc file on your root folder, containing the following lines at least:

```
@waytrade:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=<your_github_auth_token>
```

### Generate the client code

Generate the client code bindings for your favorite language from the openapi.json, like:

    $ openapi-generator-cli generate -i ./node_modules/@waytrade/ib-api-service/openapi.json -g typescript-axios -o ./src/apis/ib-api-service

---

## How to develop

### Preparation

    $ yarn global add @openapitools/openapi-generator-cli

### Build and debug

    $ yarn install
    $ code .

Press Shit+Ctrl+B to start compilation in watch mode.\
Press F5 to start the App on debugger.

### Prepare for push

After the work is finished and you want push: lint, test and validate OpenAPI:

    $ yarn release

only push changes if all tests pass with 0 warning and errors.
