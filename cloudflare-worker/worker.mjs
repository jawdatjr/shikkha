/**
 * Ashik Shikkha shared GitHub backup gateway.
 * Requires PRIVATE GitHub data repo & Cloudflare Worker secrets. No GitHub token in the PWA.
 * Small-team solution, not a high-volume accounting database.
 */
const MAX_BODY = 800_000;
const MAX_EVENTS_PER_REQUEST = 80;
const MAX_EVENTS_STORED = 15000;
const DATA_FILE = 'data/ledger.json';
const HEADERS = {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'};

function response(body, status=200, origin='') {
  const h = { ...HEADERS, 'Vary':'Origin', 'Access-Control-Allow-Methods':'POST, OPTIONS', 'Access-Control-Allow-Headers':'Authorization, Content-Type' };
  if (origin) h['Access-Control-Allow-Origin'] = origin;
  return new Response(JSON.stringify(body), { status, headers: h });
}
function toBase64(utf8) {
  const a = new TextEncoder().encode(utf8);
  let s = '';
  for(let i=0;i<a.length;i+=8192) s+=String.fromCharCode(...a.subarray(i,i+8192));
  return btoa(s);
}
function fromBase64(base64) {
  const s=atob(base64.replace(/\s/g,''));
  return new TextDecoder().decode(Uint8Array.from(s,c=>c.charCodeAt(0)));
}
function validEvent(e) {
  if(!e || typeof e !== 'object' || Array.isArray(e)) return false;
  if(typeof e.id !== 'string' || !/^[a-f\d-]{30,40}$/i.test(e.id)) return false;
  if(!['receipt','expense'].includes(e.entity)) return false;
  if(!['upsert','delete'].includes(e.action)) return false;
  if(typeof e.entityId !== 'string' || e.entityId.length < 5 || e.entityId.length > 100) return false;
  if(e.base !== null && typeof e.base !== 'string') return false;
  if(!e.payload || typeof e.payload !== 'object' || Array.isArray(e.payload)) return false;
  if(JSON.stringify(e).length > 28000) return false;
  return true;
}
function gitHeaders(env) {
  return { 'Authorization': `Bearer ${env.GH_TOKEN}`, 'Accept':'application/vnd.github+json', 'X-GitHub-Api-Version':'2022-11-28', 'User-Agent':'ashik-shikkha-backup', 'Content-Type':'application/json' };
}
async function readRepo(env) {
  const url = `https://api.github.com/repos/${encodeURIComponent(env.GH_OWNER)}/${encodeURIComponent(env.GH_REPO)}/contents/${DATA_FILE}?ref=${encodeURIComponent(env.GH_BRANCH||'main')}`;
  const r = await fetch(url, { headers:gitHeaders(env), cache:'no-store' });
  if(r.status === 404) return {sha:null,events:[]};
  if(!r.ok) throw new Error(`GitHub read failed (${r.status})`);
  const item=await r.json();
  if(item.encoding!=='base64') throw new Error('Unexpected GitHub content encoding');
  const data=JSON.parse(fromBase64(item.content));
  if(!data || !Array.isArray(data.events)) throw new Error('Invalid repository ledger schema');
  return {sha:item.sha,events:data.events};
}
async function putRepo(env, sha, events) {
  const url=`https://api.github.com/repos/${encodeURIComponent(env.GH_OWNER)}/${encodeURIComponent(env.GH_REPO)}/contents/${DATA_FILE}`;
  const payload={message:`Automatic POS ledger backup: ${new Date().toISOString()}`,branch:env.GH_BRANCH||'main',content:toBase64(JSON.stringify({schema:2,updatedAt:new Date().toISOString(),events}))};
  if(sha) payload.sha=sha;
  const r=await fetch(url,{method:'PUT',headers:gitHeaders(env),body:JSON.stringify(payload)});
  return {ok:r.ok,status:r.status};
}
function resolveActor(req, env) {
  const auth=req.headers.get('Authorization')||'';
  if(!auth.startsWith('Bearer ')) return null;
  const token=auth.slice(7);
  if(!token || token.length < 24 || token.length > 200) return null;
  let mapping;
  try { mapping=JSON.parse(env.SALESMAN_KEYS||'{}'); } catch { return null; }
  for(const [name,secret] of Object.entries(mapping)) if(typeof secret==='string' && secret===token) return name.slice(0,80);
  return null;
}
export default {
  async fetch(request, env) {
    const origin=request.headers.get('Origin')||'';
    const permitted=env.ALLOWED_ORIGIN || '';
    if(origin && (!permitted || origin!==permitted)) return response({error:'Origin not allowed'},403);
    if(request.method==='OPTIONS') return response({},200,origin);
    if(request.method!=='POST' || new URL(request.url).pathname!=='/sync') return response({error:'Use POST /sync'},404,origin);
    const actor=resolveActor(request,env);
    if(!actor) return response({error:'Invalid salesman credentials'},401,origin);
    if(!env.GH_TOKEN||!env.GH_OWNER||!env.GH_REPO) return response({error:'Gateway not configured'},503,origin);
    const raw=await request.text();
    if(raw.length>MAX_BODY) return response({error:'Request too large'},413,origin);
    let req;
    try { req=JSON.parse(raw); } catch {return response({error:'Invalid JSON'},400,origin);}
    if(!req || !Array.isArray(req.events)||req.events.length>MAX_EVENTS_PER_REQUEST||req.events.some(e=>!validEvent(e))) return response({error:'Invalid events batch'},400,origin);
    try {
      for(let attempt=0;attempt<6;attempt++) {
        const {sha,events}=await readRepo(env);
        const seen=new Set(events.map(e=>e.id));
        const heads=new Map();
        for(const e of events) heads.set(`${e.entity}:${e.entityId}`,e.id);
        const merged=events.slice(),applied=[],conflicts=[];
        for(const e of req.events){
          if(seen.has(e.id)){ applied.push(e.id); continue; }
          const key=`${e.entity}:${e.entityId}`,latest=heads.get(key)||null;
          if((e.base||null)!==latest){ conflicts.push({id:e.id,entity:e.entity,entityId:e.entityId,expected:latest});continue; }
          const accepted={id:e.id,entity:e.entity,entityId:e.entityId,action:e.action,payload:e.payload,base:e.base||null,clientAt:String(e.clientAt||''),serverAt:new Date().toISOString(),actor};
          merged.push(accepted);seen.add(e.id);heads.set(key,e.id);applied.push(e.id);
        }
        if(merged.length>MAX_EVENTS_STORED) return response({error:'Ledger capacity reached. Migrate to database before further writes.'},507,origin);
        if(merged.length===events.length) return response({events,applied,conflicts,cloudCount:events.length},200,origin);
        const saved=await putRepo(env,sha,merged);
        if(saved.ok) return response({events:merged,applied,conflicts,cloudCount:merged.length},200,origin);
        if(saved.status!==409 && saved.status!==422) throw new Error(`GitHub write failed (${saved.status})`);
      }
      return response({error:'Concurrent sync busy, retry shortly'},503,origin);
    } catch(e){ return response({error:String(e.message||e)},502,origin); }
  }
};