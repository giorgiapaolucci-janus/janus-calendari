const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),test=require('node:test'),assert=require('node:assert/strict');
const {config,risolvi,applica}=require('./accessi-zoom.cjs');
test('56 abbinamenti univoci e passcode esatti, anche a cinque cifre',()=>{
 assert.equal(config.accessi.length,56);assert.equal(new Set(config.accessi.map(a=>a.aula+'|'+a.ora)).size,56);
 for(const a of config.accessi){const l={room:a.aula,start:a.ora};assert.deepEqual(risolvi(l),{link:a.link,passcode:a.passcode});}
 assert.equal(risolvi({room:'AULA 1',start:'10:00'}).passcode,'86719');
});
test('cambi di aula e ora, esercizi e campi didattici preservati',()=>{
 const l={id:'prova',room:'AULA 2',start:'17:00',subject:'Italiano',teacher:'Docente',zoomUrl:'vecchio'};
 const dati={lezioni:[l],modifiche:[{lessonId:'prova',teacher:'Supplente'}]};applica(dati,'sera');
 assert.equal(l.zoomUrl,risolvi(l).link);assert.equal(l.subject,'Italiano');assert.equal(dati.modifiche[0].teacher,'Supplente');
 l.room='AULA 5';l.start='18:00';applica(dati,'sera');assert.equal(l.zoomUrl,risolvi(l).link);
 assert.equal(risolvi({room:'AULA DOCENTI',esercizi:true,start:'11:00',zoomUrl:'https://us06web.zoom.us/j/89274784117'}).link,risolvi({room:'AULA 6',start:'11:00'}).link);
 assert.equal(Object.keys(dati.accessiZoom).length,28);
});
test('template: configurazione remota prevale sulla copia incorporata',()=>{
 for(const turno of ['mattina','sera']){
  const html=fs.readFileSync(path.join(__dirname,'delera/calendario-'+turno+'.html'),'utf8');
  for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){if(/application\/json/.test(m[1]))JSON.parse(m[2]);else new vm.Script(m[2]);}
  const v=turno==='mattina'?'ACCESSI_MATTINA':'ACCESSI_SERA',fn=turno==='mattina'?'accessoMattina':'accessoSera';
  const a=html.indexOf('  var '+v),b=html.indexOf('  function etichettaAccessibile',a);assert.ok(a>0&&b>a);
  const entry=config.accessi.find(x=>turno==='mattina'?x.ora==='09:00':x.ora==='17:00');
  const data={};data[entry.aula+'|'+entry.ora]={link:'https://us06web.zoom.us/j/12345678901',passcode:'12345'};
  const ctx={window:{JANUS_ACCESSI_ZOOM:data},safeUrl:x=>x,el:(tag,cls,text)=>({tag,cls,text,children:[],appendChild(x){this.children.push(x)},setAttribute(){},addEventListener(){}})};vm.createContext(ctx);vm.runInContext(html.slice(a,b),ctx);
  assert.equal(ctx[fn]({room:entry.aula,start:entry.ora}).passcode,'12345');
  const r=ctx.pulsanteZoom({room:entry.aula,start:entry.ora},{});assert.equal(r.children[0].href,data[entry.aula+'|'+entry.ora].link);assert.equal(r.children[1].text,'passcode: 12345');
  assert.equal(ctx.pulsanteZoom({room:entry.aula,start:entry.ora,status:'cancelled'},{}),null);
  assert.ok(html.includes('id="jc-refresh"'));assert.ok(html.includes('window.JANUS_ACCESSI_ZOOM = d.accessiZoom'));
 }
});
