const fs = require('node:fs');
const path = require('node:path');
const COLS = ['assenze', 'sost', 'mods', 'proposte', 'regole', 'docenti'];
function atomic(file, value) {
  fs.mkdirSync(path.dirname(file), {recursive:true, mode:0o700});
  const tmp = file + '.tmp';
  const fd = fs.openSync(tmp, 'w', 0o600);
  try { fs.writeFileSync(fd, JSON.stringify(value, null, 2)); fs.fsyncSync(fd); }
  finally { fs.closeSync(fd); }
  fs.renameSync(tmp, file);
}
function validate(c) {
  if (!c || typeof c !== 'object' || COLS.some(k => !Array.isArray(c[k]))) throw Error('Archivio incompleto.');
  for (const k of COLS) {
    const ids = new Set();
    for (const row of c[k]) {
      if (!row || typeof row !== 'object' || typeof row.id !== 'string' || !/^[\w-]+$/.test(row.id) || ids.has(row.id)) throw Error('Documento non valido: ' + k);
      ids.add(row.id);
    }
  }
}
class Store {
  constructor(dir, seed) {
    this.dir = dir; this.file = path.join(dir, 'stato.json');
    if (!fs.existsSync(this.file)) {
      const collections = Object.fromEntries(COLS.map(k => [k, []]));
      for (const k of COLS) {
        const folder = path.join(seed, k);
        if (fs.existsSync(folder)) for (const f of fs.readdirSync(folder).filter(f=>f.endsWith('.json')).sort()) {
          const raw = JSON.parse(fs.readFileSync(path.join(folder, f), 'utf8'));
          collections[k].push({...raw.data || raw, id:path.basename(f, '.json')});
        }
      }
      validate(collections);
      atomic(this.file, {version:1, revision:0, updatedAt:new Date().toISOString(), collections});
    }
    const previous=this.read();
    if(fs.existsSync(path.join(__dirname,'allineamento.json'))){
      const result=require('./allineamento.cjs').reconcile(previous);
      if(result.changed||JSON.stringify(result.report)!==JSON.stringify(previous.allineamento)){
        atomic(path.join(this.dir,'backup',`stato-${previous.revision}.json`),previous);
        atomic(this.file,{...previous,revision:previous.revision+1,updatedAt:new Date().toISOString(),collections:result.collections,allineamento:result.report});
      }
    }
  }
  read() { const s = JSON.parse(fs.readFileSync(this.file, 'utf8')); validate(s.collections); return s; }
  save(revision, collections) {
    validate(collections);
    const old = this.read();
    if (old.revision !== revision) { const e = Error('I dati sono cambiati in un’altra finestra. Ricarica la pagina e ripeti la modifica.'); e.status = 409; throw e; }
    atomic(path.join(this.dir, 'backup', `stato-${old.revision}.json`), old);
    const next = {...old, version:1, revision:old.revision+1, updatedAt:new Date().toISOString(), collections};
    atomic(this.file, next); return next;
  }
}
module.exports = {Store, COLS, atomic, validate};
