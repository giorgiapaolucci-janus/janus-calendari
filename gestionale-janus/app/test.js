ST.assenze.push(...ASSENZE_SEED);
const c = controlli();
const cnt = {}; c.forEach(i=>{cnt[i.sev+':'+i.code]=(cnt[i.sev+':'+i.code]||0)+1});
console.log('lezioni', lezioni().length, JSON.stringify(cnt));
c.filter(i=>i.sev!=='info').slice(0,60).forEach(i=>console.log(i.sev,i.code,i.msg));
// Test: Giulia Dipalo malattia 12-16 ottobre
const p = creaPropostaAssenza({docenteId:'gd',dal:'2026-10-12',al:'2026-10-16',tipo:'malattia'});
console.log(p.titolo, '|', p.riepilogo, p.errori);
p.dettagli.slice(0,14).forEach(d=>console.log(d.data,d.h,d.cal,d.aula,d.materia,'->',d.a&&nomeD(d.a),d.livNome,(d.avvisi||[]).join(';'),d.motivo||''));
p.scoperte.forEach(d=>console.log('SCOPERTA',d.data,d.h,d.materia,d.motivo));
