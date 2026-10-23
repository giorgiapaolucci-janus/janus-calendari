const fs=require('node:fs'),path=require('node:path');
const {applica}=require('./accessi-zoom.cjs');
for(const turno of ['mattina','sera']){
 const file=path.join(__dirname,turno+'.json');const dati=JSON.parse(fs.readFileSync(file,'utf8'));
 applica(dati,turno);dati.aggiornato=new Date().toISOString();fs.writeFileSync(file,JSON.stringify(dati,null,1)+'\n');
 console.log(turno+': accessi aggiornati, '+dati.lezioni.length+' lezioni preservate');
}
