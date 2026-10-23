const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const app=path.join(__dirname,'../app'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'janus-private-')),out=path.join(__dirname,'pagine');
try{fs.mkdirSync(out,{recursive:true});for(const f of ['prepara.js','originale-mattina.html','originale-sera.html'])fs.copyFileSync(path.join(app,'studenti',f),path.join(temp,f));
cp.execFileSync(process.execPath,[path.join(temp,'prepara.js')],{env:{...process.env,URL_BASE:'/dati'},stdio:'pipe'});
for(const name of ['mattina','sera','docenti']){
 let html=fs.readFileSync(name==='docenti'?path.join(app,'docenti/calendario-docenti.html'):path.join(temp,'calendario-'+name+'.html'),'utf8');
 html=html.replace(/<script type="application\/json" id="janus-dati">[\s\S]*?<\/script>/,'');
 const start=html.lastIndexOf('<script>'),end=html.indexOf('</script>',start);
 if(start<0||end<0)throw Error('Template non riconosciuto');
 const assignment=name==='docenti'?'window.JANUS_DOCENTI=d;':'window.JANUS_ACCESSI_ZOOM=d.accessiZoom;window.JANUS_LEZIONI=d.lezioni;window.JANUS_MODIFICHE=d.modifiche||[];';
 html=html.slice(0,start)+`<script>fetch('/dati/${name}.json',{cache:'no-store',credentials:'same-origin'}).then(function(r){if(!r.ok)throw Error('Accesso o dati non disponibili');return r.json();}).then(function(d){${assignment}var s=document.createElement('script');s.text=document.getElementById('janus-app').textContent;document.body.appendChild(s);}).catch(function(){document.body.textContent='Calendario non disponibile. Ricarica la pagina e verifica il tuo accesso.';});</script>`+html.slice(end+9);
 html='<nav style="padding:16px;font:16px system-ui"><a href="/">Tutti i calendari</a> · <a href="/cdn-cgi/access/logout">Esci</a></nav>'+html;
 fs.writeFileSync(path.join(out,name+'.html'),html);
}
console.log('Tre pagine riservate generate, senza copie incorporate dei calendari.');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
