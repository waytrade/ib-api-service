#
# Stage 1: Build App and install Gateway+IbcAlpha
#

FROM waytrade/microservice-core:latest as build
RUN apt-get install --no-install-recommends --yes unzip

# Build App
WORKDIR /usr/src/app
COPY ./package*.json ./
COPY ./yarn.lock ./
RUN yarn install
COPY . .
RUN yarn build

# Install IB Gateway
RUN curl -sSL https://download2.interactivebrokers.com/installers/tws/latest-standalone/tws-latest-standalone-linux-x64.sh --output tws-latest-standalone-linux-x64.sh
RUN chmod a+x tws-latest-standalone-linux-x64.sh
RUN ./tws-latest-standalone-linux-x64.sh -q -dir /opt/Jts/981

# Install IbcAlpha
WORKDIR /opt/ibc
RUN curl -sSL https://github.com/IbcAlpha/IBC/releases/download/3.8.5/IBCLinux-3.8.5.zip --output IBCLinux-3.8.5.zip
RUN unzip ./IBCLinux-3.8.5.zip -d .
COPY ./docker/config/ibc/* .

#
# Stage 2: Build Image
#

FROM node:14
RUN apt-get update
RUN apt-get install --no-install-recommends --yes \
  xvfb \
  libxslt-dev \
  libxrender1 \
  libxtst6 \
  libxi6 \
  libgtk2.0-bin

WORKDIR /usr/src/app

# Copy files
COPY ./package*.json ./
COPY ./config ./config
COPY --from=build /usr/src/app/dist/ ./dist
COPY --from=build /usr/src/app/node_modules/ ./node_modules
COPY --from=build /opt/Jts/981/ /opt/Jts/981
COPY --from=build /opt/i4j_jres/ /opt/i4j_jres
COPY --from=build /opt/ibc/ /opt/ibc
COPY ./docker/config/ibc/ /opt/ibc
RUN chmod -R u+x /opt/ibc/*.sh && chmod -R u+x /opt/ibc/scripts/*.sh

# Copy run script
WORKDIR /root
ADD ./docker/run.sh ./run.sh
RUN chmod a+x ./run.sh

# IbcAlpha env vars
ENV TWS_MAJOR_VRSN 981
ENV TWS_PATH /opt/Jts
ENV IBC_PATH /opt/ibc
ENV IBC_INI /opt/ibc/config.ini
ENV TWOFA_TIMEOUT_ACTION exit

# Run Xvfb and IB Gateway
ENV DISPLAY :1
ENV NODE_ENV production
CMD ["/root/run.sh"]

EXPOSE 3000
