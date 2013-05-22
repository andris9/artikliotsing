# Artikliotsing

## Install

Rakendus tuleks installida root õigustes. Juhul kui ei soovi rakendust juurkasutaja õigusest jooksutada tuleks peale installi veidi konfiguratsiooni muuta, kuid installimise hetkel on lihtsam nii.

Esiteks tuleks siis käivitada root õigused ja minna kataloogi, kuhu peaks rakenduse installima

```bash
sudo su
cd /opt
```

Järgmiseks tuleks alla laadida artikliotsingu source ja selle installiskript käivitada.

```bash
wget https://github.com/andris9/artikliotsing/archive/master.tar.gz
tar -xzvf master.tar.gz
rm -rf master.tar.gz
mv artikliotsing-master artikliotsing
cd artikliotsing
./install.sh
```

Järgmisena küsib installiskript kahte väärtust - [diffbot.com](http://diffbot.com) tokenit ning porti, millel veebiserverit jooksutada. Kui samas masinas on apache vmt. siis tõenäoliselt porti 80 kasutada ei saa ja tuleb valida midagi muud. Sellisel juhul tuleks tulemüürist jälgida, et see port oleks ka avatud.

Seda kas valitud port on juba hõivatud saab kontrollida järgmise käsuga (asenda 80 endale sobiva pordiga):

```bash
netstat -ln | grep ':80 ' | grep 'LISTEN'
```

Juhul kui vastus on tühi, on port vaba.

Kui vigu ei esinenud (install lõppeb teatega INSTALL COMPLETED), ongi rakendus installitud ning võib avada aadressi http://masinanimi:port
