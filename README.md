# Artikliotsing

## Eeldused

See juhis töötab Ubuntu põhistes masinates. Sobivad nii VirtualBox serverid kohalikus masinas, kui ka Amazon EC2, Rackspace vmt. virtuaalserverid. Eelnevalt midagi muud installida ei ole vaja. Parem olekski kasutada täiesti tühja Ubuntu 12.04+ serverit, kuna siis on konfliktide oht väiksem.

Rakendus on arendatud ja testitud Ubuntu 14.04 LTS Server versiooniga.

## Install

Rakendus töötab Ubuntu serveris. Selle jaoks käivita installer

    curl "https://raw.githubusercontent.com/andris9/artikliotsing/master/install.sh" | sudo bash

Installiskript küsib kahte väärtust - [diffbot.com](http://diffbot.com) tokenit ning porti, millel veebiserverit jooksutada. Kui samas masinas on apache vmt. siis tõenäoliselt porti 80 kasutada ei saa ja tuleb valida midagi muud. Sellisel juhul tuleks tulemüürist jälgida, et see port oleks ka avatud.

Seda kas valitud port on juba hõivatud saab kontrollida järgmise käsuga (asenda 80 endale sobiva pordiga):

```bash
netstat -ln | grep ':80 ' | grep 'LISTEN'
```

Juhul kui vastus on tühi, on port vaba.

Kui vigu ei esinenud (install lõppeb teatega "Installeerimine õnnestus"), ongi rakendus installitud ning võib avada aadressi http://masinanimi:port

## Litsents

**MIT**
