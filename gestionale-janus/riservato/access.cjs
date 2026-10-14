const crypto=require('node:crypto');
function validator({issuer,audience,emails,loadKeys}){
 const allowed=new Set(emails.map(x=>x.trim().toLowerCase()).filter(Boolean));
 if(!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer)||!audience||!allowed.size)throw Error('Configurare dominio Access, audience ed email autorizzate.');
 let cache=null,until=0;
 const getKeys=loadKeys||async function(){if(cache&&Date.now()<until)return cache;const r=await fetch(issuer+'/cdn-cgi/access/certs',{signal:AbortSignal.timeout(10000),redirect:'error'});if(!r.ok)throw Error('Chiavi indisponibili');cache=(await r.json()).keys;until=Date.now()+300000;return cache;};
 return async function(token){
  if(typeof token!=='string'||token.length>16000)throw Error('Accesso richiesto');
  const parts=token.split('.');if(parts.length!==3)throw Error('Accesso non valido');
  const h=JSON.parse(Buffer.from(parts[0],'base64url')),p=JSON.parse(Buffer.from(parts[1],'base64url'));
  if(h.alg!=='RS256'||typeof h.kid!=='string')throw Error('Firma non valida');
  const key=(await getKeys()).find(k=>k.kid===h.kid&&k.kty==='RSA'&&(!k.use||k.use==='sig'));
  if(!key||!crypto.verify('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),crypto.createPublicKey({key,format:'jwk'}),Buffer.from(parts[2],'base64url')))throw Error('Firma non valida');
  const now=Date.now()/1000,aud=Array.isArray(p.aud)?p.aud:[p.aud];
  if(p.iss!==issuer||!aud.includes(audience)||!Number.isFinite(p.exp)||p.exp<=now||(p.nbf!==undefined&&(!Number.isFinite(p.nbf)||p.nbf>now))||typeof p.sub!=='string'||!p.sub||typeof p.email!=='string'||!allowed.has(p.email.toLowerCase()))throw Error('Accesso non autorizzato');
  return p.email;
 };
}
module.exports={validator};
