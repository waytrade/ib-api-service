#!/bin/sh

rm -f /tmp/.X1-lock
Xvfb :1 -ac -screen 0 1024x768x16 &

/opt/ibc/scripts/ibcstart.sh "${TWS_MAJOR_VRSN}" -g \
     "--tws-path=${TWS_PATH}" \
     "--ibc-path=${IBC_PATH}" "--ibc-ini=${IBC_INI}" \
     "--user=${TWSUSERID}" "--pw=${TWSPASSWORD}" "--mode=${TRADING_MODE}" \
     "--on2fatimeout=${TWOFA_TIMEOUT_ACTION}" &

sleep 30

cd /usr/src/app
yarn start
