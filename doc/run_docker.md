# How to run the prebuilt docker image

## Prepare the system

- Install [Docker](https://docs.docker.com/get-docker/)

## Run container

1.  Create a new folder

        mkdir ib-api-service
        cd ib-api-service

2.  Create a .env file, containing:

        TWS_USERID=<yourTwsUser>
        TWS_PASSWORD=<yourTwsPass>
        TRADING_MODE=<paper or live>
        VNC_SERVER_PASSWORD=<yourVncPassword>
        REST_API_USERNAME=<restApiUsername>
        REST_API_PASSWORD=<restApiPassword>

    VNC_SERVER_PASSWORD is optional (if not specified, no VNC server for access to IBGateway UI will be started).

3.  Create a docker-compose.yml, containing:

        version: "3.4"
        services:
          ib-api-service:
            image: ghcr.io/waytrade/ib-api-service/production:latest
            environment:
              SERVER_PORT: 3000
              REST_API_USERNAME: ${REST_API_USERNAME}
              REST_API_PASSWORD: ${REST_API_PASSWORD}
              TWS_USERID: ${TWS_USERID}
              TWS_PASSWORD: ${TWS_PASSWORD}
              TRADING_MODE: ${TRADING_MODE:-live}
              VNC_SERVER_PASSWORD: ${VNC_SERVER_PASSWORD:-}
            ports:
              - "3000:3000"
              - "5900:5900"

4.  Run the docker container:

        docker-compose up

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
