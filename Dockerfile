#
# Docker image for production
#

#
# Stage 1: build and 3rd party app installation
#
# This is a dedicated stage so that build deps and 3rdParty installation
# archives don't end up on production image and consume unnecessary space.
#

FROM node:14 as setup

WORKDIR /root/app

COPY . .

# Build App
RUN yarn install
RUN yarn build
RUN rm -f -r ./node_modules
RUN yarn install --production

# Install IB Gateway
RUN curl -sSL https://download2.interactivebrokers.com/installers/ibgateway/latest-standalone/ibgateway-latest-standalone-linux-x64.sh --output ibgateway-latest-standalone-linux-x64.sh
RUN chmod a+x ibgateway-latest-standalone-linux-x64.sh
RUN ./ibgateway-latest-standalone-linux-x64.sh -q -dir /root/Jts/ibgateway/latest
COPY ./docker/config/ibgateway/jts.ini /root/Jts/jts.ini

# Install IBC
RUN curl -sSL https://github.com/IbcAlpha/IBC/releases/download/3.8.5/IBCLinux-3.8.7.zip --output IBCLinux-3.8.7.zip
RUN mkdir /root/ibc && unzip ./IBCLinux-3.8.7.zip -d /root/ibc
RUN chmod -R u+x /root/ibc/*.sh && chmod -R u+x /root/ibc/scripts/*.sh
COPY ./docker/config/ibc/config.ini /root/ibc/config.ini


#
# Stage 2: compile production image
#

FROM node:14

WORKDIR /root

RUN apt-get update
RUN apt-get install --no-install-recommends --yes \
  xvfb \
  libxslt-dev \
  libxrender1 \
  libxtst6 \
  libxi6 \
  libgtk2.0-bin

# Copy IBC files
COPY --from=setup /root/ibc/ ./ibc

# Copy IB Gateway files
COPY --from=setup /root/Jts/ ./Jts
COPY --from=setup /opt/i4j_jres/ /opt/i4j_jres

# Copy App files
COPY --from=setup /root/app/package*.json ./
COPY --from=setup /root/app/config ./config
COPY --from=setup /root/app/dist/ ./dist
COPY --from=setup /root/app/node_modules/ ./node_modules

# Copy run script
COPY ./docker/run.sh /root/run.sh
RUN chmod a+x /root/run.sh

# IBC env vars
ENV TWS_MAJOR_VRSN latest
ENV TWS_PATH /root/Jts
ENV IBC_PATH /root/ibc
ENV IBC_INI /root/ibc/config.ini
ENV TWOFA_TIMEOUT_ACTION exit

# X11 env vars
ENV DISPLAY :1

# Start run script
ENV NODE_ENV production
CMD ["/root/run.sh"]
