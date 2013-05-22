#!/bin/bash

wget https://github.com/andris9/artikliotsing/archive/master.tar.gz
tar -xzwf artikliotsing-master.tar.gz
mv artikliotsing-master artikliotsing
rm -rf artikliotsing-master.tar.gz
cd artikliotsing
./install.sh
