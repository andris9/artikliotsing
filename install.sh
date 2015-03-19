#!/bin/bash

set -e

if [ `whoami` != "root" ] ; then
    echo -en '\E[47;31m'"\033[1mYou must run this script as root. Sorry!\033[0m"
    tput sgr0
    echo ""
    exit 1
fi

read -e -p "Enter diffbot token: " DIFFBOT_TOKEN
read -e -p "Enter web server port (typically 80): " HTTP_PORT

REPOS=""
USE_ES=""

# Lisa Redis repo

if [ `which redis-server` ] ; then
    echo -en "\033[1mReids on juba installitud, jätan vahele\033[0m"
    echo ""
    tput sgr0
else
    echo -en "\033[1mInstallin Redis serveri\033[0m"
    echo ""
    tput sgr0
    apt-add-repository ppa:chris-lea/redis-server -y
    REPOS="$REPOS redis-server"
fi

# Lisa ElasticSearch repo
if [ `which elasticsearch` ] ; then
    echo -en "\033[1mElasticSearch on juba installitud, jätan vahele\033[0m"
    echo ""
    tput sgr0
else
    echo -en "\033[1mInstallin ElasticSearch serveri\033[0m"
    echo ""
    tput sgr0

    if [ `which java` ] ; then
        echo "Java on juba installitud, jätan vahele"
    else
        echo "Installin Java"
        REPOS="$REPOS openjdk-7-jre-headless"
    fi

    wget -qO - https://packages.elasticsearch.org/GPG-KEY-elasticsearch | apt-key add -
    add-apt-repository "deb http://packages.elasticsearch.org/elasticsearch/1.4/debian stable main"
    REPOS="$REPOS elasticsearch"
    USE_ES="true"

fi

# Lisa Node.js repo
if [ `which elasticsearch` ] ; then
    echo -en "\033[1mNode.js on juba installitud, jätan vahele\033[0m"
    echo ""
    tput sgr0
else
    echo -en "\033[1mInstallin Node.js platvormi\033[0m"
    echo ""
    tput sgr0
    curl -sL https://deb.nodesource.com/setup | bash
    REPOS="$REPOS nodejs"
fi

# Lisa Artikliotsingu repo
if [ -d "/etc/artikliotsing.d" ]; then
    echo ""
    tput sgr0
else
    echo -en "\033[1mLisan artikliotsingu repo\033[0m"
    echo ""
    tput sgr0
    apt-key adv --keyserver keyserver.ubuntu.com --recv-keys FCB2C812
    add-apt-repository "deb http://public.kreata.ee/ trusty main"
fi

apt-get update

if [ -n "$REPOS" ]; then
    apt-get install -y $REPOS

    if [ -n "$USE_ES" ]; then
        sudo update-rc.d elasticsearch defaults 95 10
        /etc/init.d/elasticsearch start
    fi
fi

apt-get install -y artikliotsing

initctl stop artikliotsing || true

echo "{\"diffbotToken\": \"${DIFFBOT_TOKEN}\", \"port\": ${HTTP_PORT}}" > /etc/artikliotsing.d/production.json

initctl start artikliotsing || true

echo -en "\033[1mInstalleerimine õnnestus!\033[0m"
echo ""
tput sgr0