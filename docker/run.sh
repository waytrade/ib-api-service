#!/bin/sh

rm -f /tmp/.X1-lock
Xvfb :1 -ac -screen 0 1024x768x16 &

export DISPLAY=:1
x11vnc -ncache 10 -ncache_cr -display :1 -forever -shared -logappend /var/log/x11vnc.log -bg -noipv6 &

/root/ibc/scripts/ibcstart.sh "${TWS_MAJOR_VRSN}" -g \
     "--tws-path=${TWS_PATH}" \
     "--ibc-path=${IBC_PATH}" "--ibc-ini=${IBC_INI}" \
     "--user=${TWS_USERID}" "--pw=${TWS_PASSWORD}" "--mode=${TRADING_MODE}" \
     "--on2fatimeout=${TWOFA_TIMEOUT_ACTION}" &

sleep 30

cd /root/app
yarn start
