# How to build the docker image

## Prepare the system

- Install [Docker](https://docs.docker.com/get-docker/)

## Build

1.  Clone this repo

        git clone https://github.com/waytrade/ib-api-service.git
        cd ib-api-service

2.  Create a `.npmrc` file\
    `@waytrade` packages are not hosted on **npm.js but on github**.\
    Since Github does not allow unauthenticated access, you first need to create personal access on https://github.com/settings/tokens (make sure `read:packages` is checked!) and paste it into a .npmrc file with the following content:

            @waytrade:registry=https://npm.pkg.github.com
            //npm.pkg.github.com/:_authToken=<yourPersonalAcessToken>

    For being able to access those packages you need to configure npm properly. Do this by adding

3.  Create a .env file, containing:

         TWS_USERID=<yourTwsUser>
         TWS_PASSWORD=<yourTwsPass>
         TRADING_MODE=<paper or live>
         VNC_SERVER_PASSWORD=<yourVncPassword>
         REST_API_USERNAME=<restApiUsername>
         REST_API_PASSWORD=<restApiPassword>

    VNC_SERVER_PASSWORD is optional (if not specified, no VNC server for access to IBGateway UI will be started).

4.  Build the docker container:

        docker-compose up --build

5.  Wait (~30s) until you see:

         Starting ib-api-service in 5s...
         Starting ib-api-service...
         INFO: Starting App...
         INFO: Booting ib-api-service at port 3000
         INFO: [IBApiAutoConnection] Connecting to TWS with client id 0
         INFO: IB Gateway host: localhost
         INFO: IB Gateway port: 4000
         INFO: ib-api-service is running at port 3000

on console output, open http://localhost:3000 and continue with [How to authenticate on SwaggerUI](swagger_login.md).
