# Artikliotsing

## Eeldused

See juhis töötab Ubuntu põhistes masinates. Sobivad nii VirtualBox serverid kohalikus masinas, kui ka Amazon EC2, Rackspace vmt. virtuaalserverid. Eelnevalt midagi muud installida ei ole vaja. Parem olekski kasutada täiesti tühja Ubuntu 14.04+ serverit, kuna siis on konfliktide oht väiksem.

Rakendus on arendatud ja testitud Ubuntu 14.04 LTS Server versiooniga.

## Install

Rakendus töötab Ubuntu serveris ja selle saab installida *apg-get* pakihalduriga. Artikliotsing eeldab mõningaid täiendavaid rakendusi, mida standard repositooriumitest ei saa, nimelt *elasticsearch*, *redis-server* ja *nodejs*. Selleks, et kõik vajalikud eeldused koos Artikliotsingu rakendusega serverisse installida võid kasutada installerit.

    wget "https://raw.githubusercontent.com/andris9/artikliotsing/master/install.sh"
    chmod +x install.sh
    sudo ./install.sh

Installiskript küsib kahte väärtust - [diffbot.com](http://diffbot.com) tokenit ning porti, millel veebiserverit jooksutada. Kui samas masinas on apache vmt. siis tõenäoliselt porti 80 kasutada ei saa ja tuleb valida midagi muud. Sellisel juhul tuleks tulemüürist jälgida, et see port oleks ka avatud.

Kui tahad aga ise oma pakke hallata või kui sul on vajalikud rakendused juba olemas, võid kasutada otse artikliotsingu repositiooriumit:

    apt-key adv --keyserver keyserver.ubuntu.com --recv-keys FCB2C812
    add-apt-repository "deb http://public.kreata.ee/ trusty main"

ja seejärel

    apt-get update
    apt-get install artikliotsing
    service artikliotsing start

Sellisel juhul muuda konfiguratsioonifaili /etc/artikliotsing.d/default.json ja lisa sinna diffbot token ja http pordi väärtus käsitsi.

### Uuendamine

Edaspidi pole koodi uuendamiseks vaja teha muud kui:

    sudo apt-get update
    sudo apt-get install --only-upgrade artikliotsing
    service artikliotsing start

## Litsents

**MIT**
