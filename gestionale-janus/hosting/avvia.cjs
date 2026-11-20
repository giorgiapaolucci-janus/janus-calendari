const fs=require('node:fs'),path=require('node:path');
// Nessun ripristino automatico sopra un archivio già esistente.
const dir=process.env.JANUS_DATA_DIR;
if(!dir)throw Error('Disco persistente non configurato.');
// Controllare accessi e configurazione prima di inizializzare il disco.
require('../condivisione.cjs').runtime();
const target=path.join(dir,'stato.json');
if(!fs.existsSync(target)){
 const seed=JSON.parse(fs.readFileSync(path.join(__dirname,'../dati/calendario-gestionale-completo.json'),'utf8'));
 require('../store.cjs').validate(seed.collections);
 fs.mkdirSync(dir,{recursive:true,mode:0o700});
 fs.writeFileSync(target,JSON.stringify(seed),{flag:'wx',mode:0o600});
}
require('../server.cjs');
