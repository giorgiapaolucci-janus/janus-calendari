const crypto=require('node:crypto');
const FILES=['mattina.json','sera.json','docenti.json'];
function canonical(value){
 if(Array.isArray(value))return value.map(canonical);
 if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).filter(k=>k!=='aggiornato').sort().map(k=>[k,canonical(value[k])]));
 return value;
}
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
async function verify(files,{fetcher=fetch,base='https://giorgiapaolucci-janus.github.io/janus-calendari/'}={}){
 const results=await Promise.all(FILES.map(async name=>{
  try{
   const response=await fetcher(base+name+'?janus_verify='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(10000),redirect:'error'});
   if(!response.ok)return {file:name,ok:false};
   const expected=JSON.parse(files[name]),actual=await response.json();
   return {file:name,ok:hash(expected)===hash(actual)};
  }catch{return {file:name,ok:false};}
 }));
 return {ok:results.every(r=>r.ok),files:results};
}
module.exports={verify,hash};
