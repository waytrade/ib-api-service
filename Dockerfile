FROM waytrade/microservice-core:latest

# Install Linux Tools and Libs

RUN apt-get install --no-install-recommends --yes \
  unzip \
  xvfb \
  libxslt-dev \
  libxrender1 \
  libxtst6 \
  libxi6 \
  libgtk2.0-bin

# Install IB Gateway

WORKDIR /opt/Jts/981
RUN curl -sSL https://download2.interactivebrokers.com/installers/tws/latest-standalone/tws-latest-standalone-linux-x64.sh --output tws-latest-standalone-linux-x64.sh
RUN chmod a+x tws-latest-standalone-linux-x64.sh
RUN ./tws-latest-standalone-linux-x64.sh -q -dir /opt/Jts/981
RUN rm ./tws-latest-standalone-linux-x64.sh

# Install IbcAlpha

WORKDIR /opt/ibc
RUN curl -sSL https://github.com/IbcAlpha/IBC/releases/download/3.8.5/IBCLinux-3.8.5.zip --output IBCLinux-3.8.5.zip
RUN unzip ./IBCLinux-3.8.5.zip -d .
COPY ./docker/config/ibc/* .
RUN chmod -R u+x *.sh && chmod -R u+x scripts/*.sh
RUN rm ./IBCLinux-3.8.5.zip
ENV TWS_MAJOR_VRSN 981
ENV TWS_PATH /opt/Jts
ENV IBC_PATH /opt/ibc
ENV IBC_INI /opt/ibc/config.ini
ENV TWOFA_TIMEOUT_ACTION exit

# Install App

WORKDIR /usr/src/app
COPY ./package*.json ./
COPY ./yarn.lock ./
COPY ./.npmrc ./
RUN yarn install
COPY . .
RUN yarn build

# Install run script

WORKDIR /root
ADD ./docker/run.sh ./run.sh
RUN chmod a+x ./run.sh

# Run Xvfb and IB Gateway

ENV DISPLAY :1
ENV NODE_ENV production
EXPOSE 3002
CMD ["/root/run.sh"]
