# ib-api-service

[![Test and Publish](https://github.com/waytrade/ib-api-service/actions/workflows/publish.yml/badge.svg)](https://github.com/waytrade/ib-api-service/actions/workflows/publish.yml)

## Preparation

$ yarn global add @openapitools/openapi-generator-cli

## Build and run

$ yarn install
$ yarn build
$ yarn start

## Prepare for release (lint, test and validate OpenAPI)

$ yarn release

## Usage

### node package

$ yarn add @waytrade/ib-api-service

### docker-compose.yml:

```
ib-api-service:
  image: docker.pkg.github.com/waytrade/ib-api-service/ib-api-service:latest
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
