const {validator}=require('./riservato/access.cjs');
const fs=require('node:fs');
function runtime(env=process.env,makeValidator=validator){
 const shared=env.JANUS_MODE==='condiviso';
 if(env.JANUS_MODE&&!['locale','condiviso'].includes(env.JANUS_MODE))throw Error('JANUS_MODE non valido.');
 const port=Number(env.JANUS_PORT||8765);
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('Porta non valida.');
 if(!shared)return {shared:false,port,host:'127.0.0.1',origin:`http://127.0.0.1:${port}`,authenticate:async()=>null};
 let url;try{url=new URL(env.JANUS_PUBLIC_ORIGIN);}catch{throw Error('Configurare JANUS_PUBLIC_ORIGIN con il dominio HTTPS del gestionale.');}
 if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('JANUS_PUBLIC_ORIGIN deve essere una origine HTTPS.');
 if(!env.JANUS_DATA_DIR)throw Error('Configurare JANUS_DATA_DIR su un disco persistente.');
 const githubToken=env.JANUS_GITHUB_TOKEN_FILE?fs.readFileSync(env.JANUS_GITHUB_TOKEN_FILE,'utf8').trim():env.JANUS_GITHUB_TOKEN;
 if(!githubToken)throw Error('Configurare JANUS_GITHUB_TOKEN o JANUS_GITHUB_TOKEN_FILE nei segreti del server.');
 const verify=makeValidator({issuer:env.JANUS_ACCESS_ISSUER,audience:env.JANUS_ACCESS_AUD,emails:(env.JANUS_ALLOWED_EMAILS||'').split(',')});
 return {shared:true,port,host:'127.0.0.1',origin:url.origin,githubToken,authenticate:req=>verify(req.headers['cf-access-jwt-assertion'])};
}
module.exports={runtime};
