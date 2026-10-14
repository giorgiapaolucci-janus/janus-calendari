/* Persistenza locale: ogni azione viene salvata come un'unica transazione. */
let localRevision=0, localReady=false, localBusy=false, localDirty=false, syncStatus={};
async function api(route,body) {
  const r=await fetch('/api/'+route,{method:body?'POST':'GET',headers:{'X-Janus-Token':window.JANUS_TOKEN,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  const v=await r.json();if(!r.ok)throw Error(v.error||'Collegamento locale non disponibile.');return v;
}
function adopt(collections) {
  for(const c of COLS){LOCAL[c]=Object.fromEntries(collections[c].map(d=>[d.id,d]));localEmit(c);}
}
function collectionState(){return Object.fromEntries(COLS.map(c=>[c,Object.entries(LOCAL[c]).map(([id,data])=>({...data,id}))]));}
async function initStore() {
  U.canEdit=false;U.canWrite=false;U.uid='giorgia-locale';
  try {const state=await api('state');localRevision=state.revision;syncStatus=state.sync;adopt(state.collections);localReady=true;U.canEdit=true;U.canWrite=true;}
  catch(e){U.msg={k:'err',t:'Dati non caricati: '+e.message};}
  render();
}
async function put(col,id,data) {
  if(!localReady||!localBusy)throw Error('Salvataggio disponibile solo durante un’azione nel programma.');
  LOCAL[col][id]=JSON.parse(JSON.stringify({...data,id}));localDirty=true;localEmit(col);
}
async function del(col,id) {
  if(!localReady||!localBusy)throw Error('Archivio non pronto.');
  delete LOCAL[col][id];localDirty=true;localEmit(col);
}
async function localAction(fn) {
  if(localBusy)return;
  if(!localReady){U.msg={k:'err',t:'Attendi il caricamento dei dati o ricarica la pagina.'};render();return;}
  const snapshot=JSON.parse(JSON.stringify(collectionState()));localBusy=true;localDirty=false;U.msg=null;
  try {
    await fn();
    if(localDirty) {
      if(U.msg?.k==='err')throw Error(U.msg.t);
      const next=await api('state',{revision:localRevision,collections:collectionState()});
      localRevision=next.revision;syncStatus=next.sync;adopt(next.collections);
    }
  } catch(e) {
    adopt(snapshot);
    // Un'interruzione può avvenire dopo il commit: rileggere prima di consentire altre modifiche.
    try {const s=await api('state');localRevision=s.revision;adopt(s.collections);syncStatus=s.sync;}
    catch(_){localReady=false;U.canEdit=false;U.canWrite=false;}
    U.msg={k:'err',t:e.message};
  } finally {localBusy=false;localDirty=false;render();}
}
function pSync() {
  return `<div class="grid2"><section class="card"><h2>Archivio su questo Mac</h2><p>Le modifiche vengono salvate su disco. Ogni salvataggio conserva una copia della versione precedente.</p><p>Revisione ${localRevision}. Le proposte cambiano il calendario solo dopo l’approvazione.</p><button class="b" data-a="backupLocale">Scarica copia dei dati</button></section>
  <section class="card"><h2>Aggiornamenti</h2><p>GitHub / Delera: <strong>${esc(syncStatus.github||'Da collegare')}</strong></p><p>Google Sheets: <strong>${esc(syncStatus.google||'Da collegare')}</strong></p><p>${esc(syncStatus.locale||'Preparazione esportazioni…')}</p><a class="b" href="https://docs.google.com/spreadsheets/d/17BkPIZw_eKagNqW_WEXkWfdA3ABFiWfnJ0NBBvUV4rw/edit" target="_blank" rel="noreferrer">Apri il foglio</a> <button class="b" data-a="syncLocale">Riprova aggiornamento</button><p class="sub" style="margin-top:12px">Gli aggiornamenti automatici funzionano mentre questo programma è in esecuzione. Un errore remoto non cancella le modifiche salvate.</p></section></div>
  <section class="card" style="margin-top:14px"><h2>Collega i servizi</h2><p>Questa configurazione è necessaria una sola volta. Gli accessi di Claude e Codex non vengono trasferiti al programma.</p><div class="col"><label>Token GitHub per janus-calendari (Contents: lettura e scrittura)<br><input id="github-token" type="password" autocomplete="off" placeholder="${syncStatus.githubConfigurato?'Già configurato; lascia vuoto per conservarlo':'Token GitHub'}" style="width:100%"></label><label>File JSON dell’account di servizio Google<br><input id="google-key" type="file" accept=".json"></label><p class="sub">Abilita Google Sheets API nel progetto Google e condividi il foglio come Editor con l’indirizzo dell’account di servizio. ${esc(syncStatus.googleEmail||'')}</p><label><input id="auto-sync" type="checkbox" ${syncStatus.automatico?'checked':''}> Aggiorna GitHub e il foglio dopo ogni modifica effettiva</label><p class="sub">Le credenziali restano nell’archivio locale, escluse dai backup scaricabili e dai file pubblicati.</p><button class="b pri" data-a="configLocale">Salva collegamenti</button></div></section>`;
}
ACT.syncLocale=async()=>{syncStatus=await api('sync',{});U.msg={k:'info',t:'Verifica degli aggiornamenti completata. Consulta gli esiti qui sotto.'};};
ACT.configLocale=async()=>{
  const file=document.getElementById('google-key').files[0];
  const body={github:document.getElementById('github-token').value,automatico:document.getElementById('auto-sync').checked};
  if(file)body.google=JSON.parse(await file.text());
  syncStatus=await api('config',body);U.msg={k:'info',t:'Configurazione salvata. Consulta gli esiti degli aggiornamenti.'};
};
ACT.backupLocale=()=>{const blob=new Blob([JSON.stringify({version:1,revision:localRevision,collections:collectionState()},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='janus-backup-'+oggiIso()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
render();initStore();
