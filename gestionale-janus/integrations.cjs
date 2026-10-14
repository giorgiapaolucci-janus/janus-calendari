const crypto=require('node:crypto');
const {SHEET_ID}=require('./sheets.cjs');
const REPO='giorgiapaolucci-janus/janus-calendari';
async function json(url, options={}) {
  const r=await fetch(url,{...options,signal:AbortSignal.timeout(30000)});
  const data=await r.json();
  if(!r.ok) throw Error(`Servizio remoto: HTTP ${r.status}. Controlla accesso, autorizzazioni e connessione.`);
  return data;
}
async function github(token, files) {
  const call=(p,method='GET',body)=>json(`https://api.github.com/repos/${REPO}/${p}`,{method,headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','Content-Type':'application/json','User-Agent':'Calendari-Janus'},...(body?{body:JSON.stringify(body)}:{})});
  const head=await call('git/ref/heads/main'), parent=head.object.sha;
  const commit=await call('git/commits/'+parent);
  const tree=await call('git/trees','POST',{base_tree:commit.tree.sha,tree:Object.entries(files).map(([path,content])=>({path,mode:'100644',type:'blob',content}))});
  if(tree.sha===commit.tree.sha) return parent;
  const next=await call('git/commits','POST',{message:'Aggiorna calendari Janus',tree:tree.sha,parents:[parent]});
  await call('git/refs/heads/main','PATCH',{sha:next.sha,force:false});
  return next.sha;
}
async function googleToken(account) {
  const now=Math.floor(Date.now()/1000), enc=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned=enc({alg:'RS256',typ:'JWT'})+'.'+enc({iss:account.client_email,scope:'https://www.googleapis.com/auth/spreadsheets',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
  const assertion=unsigned+'.'+crypto.sign('RSA-SHA256',Buffer.from(unsigned),account.private_key).toString('base64url');
  const result=await json('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion})});
  if(!result.access_token) throw Error('Google non ha restituito un accesso valido.');
  return result.access_token;
}
function cell(v) { return v==null||v===''?{}:{userEnteredValue:typeof v==='number'?{numberValue:v}:{stringValue:String(v)}}; }
function requestsFor(payload, live) {
  const requests=[];
  for(const [name, rows] of Object.entries(payload.sheets)) {
    const sh=live.sheets.find(s=>s.properties.title===name);
    if(!sh) throw Error('Scheda mancante: '+name);
    const grid=sh.data?.[0], current=grid?.rowData||[], width=rows[0].length, height=Math.max(rows.length,current.length);
    if(height>sh.properties.gridProperties.rowCount) throw Error('Aggiungere righe nel foglio '+name+' prima di aggiornare.');
    for(let r=0;r<height;r++) {
      const old=current[r]?.values||[], next=rows[r]||[];
      for(let c=0;c<width;c++) {
        const before=old[c]||{}, after=cell(next[c]);
        if(before.userEnteredValue?.formulaValue || before.dataValidation || before.chipRuns?.length) throw Error('Formula, chip o convalida in '+name+': aggiornamento sospeso per preservarla.');
        if(JSON.stringify(before.userEnteredValue||{})!==JSON.stringify(after.userEnteredValue||{})) requests.push({updateCells:{start:{sheetId:sh.properties.sheetId,rowIndex:r,columnIndex:c},rows:[{values:[after]}],fields:'userEnteredValue'}});
      }
    }
  }
  return requests;
}
async function google(account,payload) {
  const token=await googleToken(account), base=`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}`;
  const headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
  const params=new URLSearchParams({includeGridData:'true',fields:'sheets(properties,data(rowData(values(userEnteredValue,dataValidation,chipRuns))))'});
  for(const [name,rows] of Object.entries(payload.sheets)) params.append('ranges',`'${name}'!A1:${String.fromCharCode(64+rows[0].length)}1000`);
  const live=await json(base+'?'+params,{headers}), requests=requestsFor(payload,live);
  if(requests.length) {
    const meta=await json(base+'?fields=sheets.properties',{headers});
    const info=meta.sheets.find(s=>s.properties.title==='Info');
    if(info) requests.push({updateCells:{start:{sheetId:info.properties.sheetId,rowIndex:1,columnIndex:0},rows:[{values:[cell('Aggiornato il '+new Date().toLocaleString('it-IT',{timeZone:'Europe/Rome'}))]}],fields:'userEnteredValue'}});
    await json(base+':batchUpdate',{method:'POST',headers,body:JSON.stringify({requests})});
    const verified=await json(base+'?'+params,{headers});
    if(requestsFor(payload,verified).length) throw Error('Google: verifica successiva al salvataggio non riuscita.');
  }
  return requests.length;
}
module.exports={github,google,requestsFor,REPO};
