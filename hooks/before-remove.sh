#!/bin/bash

NAME="artikliotsing"

initctl stop ${NAME} || true

rm -rf /var/run/${NAME}.pid
rm -rf /var/log/${NAME}.log