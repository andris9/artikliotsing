# Artikliotsing

## Eeldused

See juhis töötab Ubuntu põhistes masinates. Sobivad nii VirtualBox serverid kohalikus masinas, kui ka Amazon EC2, Rackspace vmt. virtuaalserverid. Eelnevalt midagi muud installida ei ole vaja. Parem olekski kasutada täiesti tühja Ubuntu 12.04+ serverit, kuna siis on konfliktide oht väiksem.

Rakendus on arendatud ja testiud Ubuntu 13.04 versiooniga.

Juhul, kui kasutad VirtualBox põhist virtuaalmasinat, siis tuleks seadistada võrk vastavalt [sellele juhendile](http://christophermaier.name/blog/2010/09/01/host-only-networking-with-virtualbox). Muidu ei saa oma masinast brauseriga virtuaalmasinale ligi. Vaikimisi kasutavad VirtualBox serverid NAT põhist ühendust internetti pääsemiseks, aga sellele lisaks on vajada veel teine `host-only` ühendus, mis võimaldab IP alusel masinale ligi pääseda.

## Install

Rakendus tuleks installida root õigustes. Juhul kui ei soovi rakendust juurkasutaja õigusest jooksutada tuleks peale installi veidi konfiguratsiooni muuta, kuid installimise hetkel on lihtsam nii.

Esiteks tuleks siis käivitada root õigused ja minna kataloogi, kuhu peaks rakenduse installima

```bash
sudo su
cd /opt
```

Järgmiseks tuleks järgmiste käskudega alla laadida artikliotsingu source ja selle installiskript käivitada.

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

Kui rakendus ei tööta, siis kontrolli logifaile, mille täpsed asukohad väljastatakse ekraanile installiskripti lõpus.
