// Unica fonte: accessi-zoom.json. Il passcode e' sempre testo.
const fs=require('node:fs'),path=require('node:path');
const config=JSON.parse(fs.readFileSync(path.join(__dirname,'accessi-zoom.json'),'utf8'));
const vecchieAule={"86952268837":"AULA 1","85618843652":"AULA 2","84208963789":"AULA 3","83343621947":"AULA 4","84144422731":"AULA 5","89274784117":"AULA 6","81644826135":"AULA 7"};
const perIncontro={...vecchieAule};
const tabella={};
for(const a of config.accessi){
 const key=a.aula+'|'+a.ora;
 if(tabella[key]||typeof a.passcode!=='string'||!/^\d+$/.test(a.passcode))throw Error('Accesso Zoom non valido: '+key);
 const url=new URL(a.link);
 if(url.protocol!=='https:'||!/(^|\.)zoom\.us$/.test(url.hostname)||url.pathname!=='/j/'+a.meetingId)throw Error('Link Zoom non valido: '+key);
 tabella[key]={link:a.link,passcode:a.passcode};perIncontro[a.meetingId]=a.aula;
}
function risolvi(l){
 let aula=String(l.room||'').trim().toUpperCase();
 if(aula==='AULA DOCENTI'||l.esercizi){const m=/\/j\/(\d+)/.exec(l.zoomUrl||'');aula=m&&perIncontro[m[1]]||aula;}
 return tabella[aula+'|'+l.start]||null;
}
function applica(dati,turno){
 dati.accessiZoom=Object.fromEntries(Object.entries(tabella).filter(([key])=>(Number(key.split('|')[1].slice(0,2))>=15)===(turno==='sera')));
 for(const l of dati.lezioni){const a=risolvi(l);if(a){l.zoomUrl=a.link;l.zoomPasscode=a.passcode;}}
 return dati;
}
module.exports={config,tabella,risolvi,applica};
