const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {validator}=require('./access.cjs');
function createServer({authenticate,dataDir}){
 return http.createServer(async(req,res)=>{
  const send=(status,body,type='text/plain')=>{res.writeHead(status,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'"});res.end(body);};
  try{await authenticate(req.headers['cf-access-jwt-assertion']);}catch{return send(403,'Accesso riservato ai colleghi autorizzati. Apri il link dell’istituto e accedi con la tua email.');}
  if(req.method!=='GET')return send(405,'Operazione non consentita.');
  let pathname;try{pathname=new URL(req.url,'http://janus.local').pathname;}catch{return send(400,'Indirizzo non valido');}
  if(pathname==='/')return send(200,'<!doctype html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Calendari Janus</title><style>body{font:20px system-ui;background:#f7f5ee;max-width:720px;margin:70px auto;padding:24px}a{display:block;background:white;padding:24px;border-radius:16px;margin:16px 0;color:#174bdc}</style><h1>Calendari Istituto Janus</h1><p>Consultazione riservata ai colleghi</p><a href="/mattina">Calendario mattina</a><a href="/sera">Calendario sera</a><a href="/docenti">Calendario docenti</a><a href="/cdn-cgi/access/logout">Esci</a></html>','text/html');
  const name=pathname.match(/^\/(mattina|sera|docenti)$/)?.[1];
  if(name)return send(200,fs.readFileSync(path.join(__dirname,'pagine',name+'.html'),'utf8'),'text/html');
  const data=pathname.match(/^\/dati\/(mattina|sera|docenti)\.json$/)?.[1];
  if(data){try{
   // Lo stato indica l'ultima revisione salvata; mai ripiegare su dati pubblici o vecchi.
   const state=JSON.parse(fs.readFileSync(path.join(dataDir,'stato.json'),'utf8'));
   if(!Number.isSafeInteger(state.revision)||state.revision<0)throw Error('Revisione');
   const content=fs.readFileSync(path.join(dataDir,'esportazioni',String(state.revision),data+'.json'),'utf8');JSON.parse(content);
   return send(200,content,'application/json');
  }catch{return send(503,'Dati in aggiornamento o non disponibili. Riprova tra poco.');}}
  return send(404,'Pagina non trovata.');
 });
}
if(require.main===module){
 const authenticate=validator({issuer:process.env.JANUS_ACCESS_ISSUER,audience:process.env.JANUS_ACCESS_AUD,emails:(process.env.JANUS_ALLOWED_EMAILS||'').split(',')});
 const server=createServer({authenticate,dataDir:process.env.JANUS_DATA_DIR||path.join(__dirname,'../archivio')});
 server.listen(Number(process.env.JANUS_PRIVATE_PORT||8780),'127.0.0.1',()=>console.log('Calendari riservati: server locale pronto per Cloudflare Tunnel.'));
}
module.exports={createServer};
