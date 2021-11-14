# Interactive Brokers REST/Websock Server (ib-api-service)

![GitHub package.json version](https://img.shields.io/github/package-json/v/waytrade/ib-api-service)
[![Language grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/waytrade/ib-api-service.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/waytrade/ib-api-service/context:javascript)
[![Test and Publish](https://github.com/waytrade/ib-api-service/actions/workflows/publish.yml/badge.svg)](https://github.com/waytrade/ib-api-service/actions/workflows/publish.yml)
[![Test Report](https://raw.githubusercontent.com/waytrade/microservice-core/master/assets/test-results.svg)](https://waytrade.github.io/ib-api-service/jest/)
[![Core Coverage](https://raw.githubusercontent.com/waytrade/ib-api-service/gh-pages/coverage/coverage.svg)](https://waytrade.github.io/ib-api-service/coverage/lcov-report)

A REST/Websocket API Server (with OpenAPI & SwaggerUI) on top of [@stoqey/ib](https://github.com/stoqey/ib) IBApiNext.

---

We use this app as part of our microservice ecosystem and it is OSS so you don't need to write it again. No questions will be answered, no support will be given, no feature-request will be accepted. Use it - or fork it and roll your own :)

---

## How to use

Running the server:

- [by using the prebuilt docker image](doc/run_docker.md) (for quick-start)
- [by building the docker image](doc/build_docker.md) (if you want to build/host your own image)
- [by building App and running it on debugger](doc/debug_app.md) (if you want develop on the App)

Building a client:

The ib-api-service interface is completely described via [OpenAPI](https://swagger.io/specification/). It provides a SwaggerUI at '/' and a openapi.json on `/openapi.json` or from [Packages](https://github.com/waytrade/ib-api-service/packages/770607):

    yarn add @waytrade/ib-api-service

After getting the openapi.json, use your favorite openapi-generator to generate code binding for your client application.\
Example: to create bindings for Typescript language, using [axios](https://github.com/axios/axios) framework, run:

    openapi-generator-cli generate -i ./node_modules/@waytrade/ib-api-service/openapi.json -g typescript-axios -o ./src/apis/ib-api-service
