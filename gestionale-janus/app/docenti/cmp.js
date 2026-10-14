const fs=require('fs'),vm=require('vm');
const html=fs.readFileSync(__dirname+'/originale-docenti.html','utf8');
const s=html.match(/<script>([\s\S]*?)<\/script>/)[1];
// estrai DIURNO, SERALE, NOMI, CASA
const pre=s.slice(s.indexOf("var P ="), s.indexOf("var FAM"));
const sb={};vm.createContext(sb);vm.runInContext(pre+';this.R={DIURNO,SERALE,NOMI,CASA,P}',sb);
const R=sb.R;
const src=['data.js','rules.js','engine.js'].map(f=>fs.readFileSync(__dirname+'/../'+f,'utf8')).join('\n');
const c2={console};vm.createContext(c2);vm.runInContext(src+';this.X={lezioni,nomeD,DOCENTI}',c2);
const L=c2.X.lezioni();
const key=(d,g,h,a,m,au)=>[d,g,h,a,String(m).toLowerCase().replace(/[^a-z]/g,''),au||0].join('|');
const pg=new Map();
R.DIURNO.concat(R.SERALE).forEach(r=>pg.set(key(r[0],r[1],r[2],r[3],r[4],r[6]),r));
const sw=new Map();
L.forEach(l=>{ if(!l.doc)return; sw.set(key(l.doc.toUpperCase(),l.g,l.h,l.anno,l.materia,l.aula&&+l.aula),l)});
let a=0,b=0;
for(const [k,r] of pg) if(!sw.has(k)){a++;console.log('SOLO PAGINA',JSON.stringify(r).slice(0,130))}
for(const [k,l] of sw) if(!pg.has(k)){b++;console.log('SOLO SOFTWARE',l.id,l.doc,l.g,l.h,l.anno,l.materia,l.aula,'|',l.ind)}
console.log(pg.size,sw.size,a,b);
