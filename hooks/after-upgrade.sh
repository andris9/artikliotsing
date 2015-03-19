#!/bin/bash

NAME="artikliotsing"

initctl stop ${NAME} || true
initctl start ${NAME} || true
