const API='/api';
async function api(path,opts={}){const r=await fetch(API+path,{credentials:'same-origin',...opts,headers:{...(opts.body instanceof FormData?{}:{'Content-Type':'application/json'}),...(opts.headers||{})}});if(r.status===204)return null;const body=await r.json().catch(()=>({}));if(!r.ok)throw new Error(body.error?.message||'Request failed');return body}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
