// esporta DOCENTI e TURNI dal software in JSON (per il file Excel)
const fs=require('fs'),vm=require('vm');
const src=fs.readFileSync('../data.js','utf8')+'\n;this.__o={DOCENTI,TURNI};';
const ctx={};vm.createContext(ctx);vm.runInContext(src,ctx);
fs.writeFileSync('software.json',JSON.stringify(ctx.__o));
