#!/bin/bash

ES_VERSION=0.20.5
REDIS_VERSION=2.8.19

set -e

if [ `whoami` != "root" ] ; then
    echo -en '\E[47;31m'"\033[1mYou must run this script as root. Sorry!\033[0m"
    tput sgr0
    echo ""
    exit 1
fi

read -e -p "Enter diffbot token: " DIFFBOT_TOKEN
read -e -p "Enter web server port (typically 80): " HTTP_PORT

DIR=`pwd`

# ensure needed packages
apt-get update -y
apt-get install -y build-essential libssl-dev git-core python curl sudo openjdk-7-jre-headless software-properties-common python-software-properties
apt-get -fy install

# Install Node.js
if [ `which node` ] ; then
    echo -en "\033[1mNode.js already installed, skipping\033[0m"
    echo ""
    tput sgr0
else
    echo -en "\033[1mInstalling Node.js\033[0m"
    echo ""
    tput sgr0

    curl -sL https://deb.nodesource.com/setup | bash -
    apt-get install -y nodejs
fi

# Install Redis
if [ `which redis-server` ] ; then
    echo -en "\033[1mRedis already installed, skipping\033[0m"
    echo ""
    tput sgr0
else
    echo -en "\033[1mInstalling Redis\033[0m"
    echo ""
    tput sgr0
    wget http://download.redis.io/releases/redis-${REDIS_VERSION}.tar.gz
    tar -xzvf redis-${REDIS_VERSION}.tar.gz
    cd redis-${REDIS_VERSION}
    make
    make install

    mkdir /var/lib/redis || echo "Redis data directory already exists"
    curl http://tahvel.info/redis.conf -o /etc/redis.conf

    curl http://tahvel.info/redis -o /etc/init.d/redis
    chmod +x /etc/init.d/redis

    if [ `which chkconfig` ] ; then
        # we're chkconfig, so lets add to chkconfig and put in runlevel 345
        chkconfig --add redis && echo "Successfully added to chkconfig!"
        chkconfig --level 345 redis on && echo "Successfully added to runlevels 345!"
    else
        update-rc.d redis defaults && echo "Success!"
    fi

    /etc/init.d/redis start
    cd ~
    rm -rf redis-${REDIS_VERSION}*
fi

# Install Elasticsearch
if [ `which /etc/init.d/elasticsearch` ] ; then
    echo -en "\033[1mElasticSearch already installed, skipping\033[0m"
    echo ""
    tput sgr0
else
    echo -en "\033[1mInstalling ElasticSearch\033[0m"
    echo ""
    tput sgr0

    # install elasticsearch
    wget "http://download.elasticsearch.org/elasticsearch/elasticsearch/elasticsearch-${ES_VERSION}.deb"
    dpkg -i "elasticsearch-${ES_VERSION}.deb"
    rm -rf "elasticsearch-${ES_VERSION}.deb"

    sleep 5

    # install plugins
    /usr/share/elasticsearch/bin/plugin -install elasticsearch/elasticsearch-mapper-attachments/1.4.0
    /usr/share/elasticsearch/bin/plugin -install mobz/elasticsearch-head

    /etc/init.d/elasticsearch restart
fi

cd $DIR

# artiklite otsimine

echo ""
echo -en "\033[1mInstalling RSS fetcher\033[0m"
echo ""
tput sgr0

cd findarticle

cp config.json.sample config.json

npm install

ln -s "$DIR/findarticle/setup/findarticle" "/etc/init.d/findarticle"
update-rc.d findarticle defaults

cd "$DIR"

# artikli töötlemine

echo ""
echo -en "\033[1mInstalling Article parser\033[0m"
echo ""
tput sgr0

cd getarticle
sed "s/DIFFBOT_TOKEN/${DIFFBOT_TOKEN}/g" config.json.sample > config.json

npm install

ln -s "$DIR/getarticle/setup/getarticle" "/etc/init.d/getarticle"
update-rc.d getarticle defaults

cd "$DIR"

# veebiliides

echo ""
echo -en "\033[1mInstalling Web service\033[0m"
echo ""
tput sgr0

cd artikliotsing
sed "s/HTTP_PORT/${HTTP_PORT}/g" config.json.sample > config.json

npm install

ln -s "$DIR/artikliotsing/setup/artikliotsing" "/etc/init.d/artikliotsing"
update-rc.d artikliotsing defaults

cd "$DIR"

echo ""
echo -en "\033[1mAll services installed. Starting services ...\033[0m"
echo ""
tput sgr0

/etc/init.d/findarticle start
/etc/init.d/getarticle start
/etc/init.d/artikliotsing start

echo ""
echo "Log files for the services:"
echo "    /var/log/findarticle.log"
echo "    /var/log/getarticle.log"
echo "    /var/log/artikliotsing.log"
echo ""
echo ""
echo -en "\033[1mINSTALL COMPLETED\033[0m"
echo ""
tput sgr0
