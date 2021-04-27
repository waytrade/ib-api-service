# ib-api-service

[![Test and Publish](https://github.com/waytrade/ib-api-service/actions/workflows/publish.yml/badge.svg)](https://github.com/waytrade/ib-api-service/actions/workflows/publish.yml)

Implements a REST / Webhook API Server on top of https://github.com/stoqey/ib

We use this app as part of our microservice ecosystem and it is OSS so you don't need to write it again. No questions will be answered, no support will be given, no feature-request will be accepted. Use it - or fork it and roll your own :)

## Preparation

    $ yarn global add @openapitools/openapi-generator-cli

## Build and run

    $ yarn install
    $ yarn build
    $ yarn start

## Prepare for release (lint, test and validate OpenAPI)

    $ yarn release

## Usage

### Run the standalone docker (with IB Gateway, IBC and ib-api-service)

Create an .env file on root folder with:

- TWS_USERID (your TWS user id)
- TWS_PASSWORD (your TWS password)#
- TRADING_MODE ('paper' or 'live')

Run:

    $ docker-compose up --build

### Get openapi.json as a node package

    $ yarn add @waytrade/ib-api-service

and generate your client code, like:

    $ openapi-generator-cli generate -i ./node_modules/@waytrade/ib-api-service/openapi.json -g typescript-axios -o ./src/apis/ib-api-service

### Include on your docker-compose.yml:

```
ib-api-service:
  image: waytrade/ib-api-service
  restart: always
  environment:
    SERVER_PORT: 3002
    TWS_USERID: ${TWS_USERID}
    TWS_PASSWORD: ${TWS_PASSWORD}
    TRADING_MODE: ${TRADING_MODE:-live}
    NODE_ENV: production
  ports:
    - 3002:3002
```
