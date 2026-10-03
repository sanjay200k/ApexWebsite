/* Supabase module: optional REST sync with local-only credentials, refresh, and safe error states. */
import { SUPABASE_CONFIG_KEY, sanitizeState, getSupabaseConfig, setSupabaseConfig } from './state.js';
const clean = url => String(url || '').replace(/\/$/, '');
const decode = token => { try { return JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))); } catch { return {}; } };
export const Supabase = {
  session: null,
  cfg(){ return getSupabaseConfig(); },
  saveConfig(config){ setSupabaseConfig(config); },
  headers(cfg, extra={}){ return {'apikey':cfg.key,'Content-Type':'application/json',...(this.session?.access_token?{Authorization:`Bearer ${this.session.access_token}`}:{ }),...extra}; },
  async ensureSession(){
    if (!this.session?.access_token) return false;
    const exp = Number(decode(this.session.access_token).exp || 0);
    if (exp && Date.now() < exp * 1000 - 30000) return true;
    if (!this.session.refresh_token) return false;
    const cfg=this.cfg();
    const response=await fetch(`${clean(cfg.url)}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:cfg.key,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:this.session.refresh_token})});
    if (!response.ok) { this.session=null; localStorage.removeItem('pp_supabase_session'); return false; }
    const next=await response.json(); this.saveSession({...this.session,...next,refresh_token:next.refresh_token||this.session.refresh_token}); return true;
  },
  async sendMagicLink(){ const cfg=this.cfg(); if(!cfg.url||!cfg.key||!cfg.email) throw new Error('Enter the Supabase URL, anon key, and email first.'); const response=await fetch(`${clean(cfg.url)}/auth/v1/otp`,{method:'POST',headers:{apikey:cfg.key,'Content-Type':'application/json'},body:JSON.stringify({email:cfg.email,create_user:true})}); if(!response.ok) throw new Error('Supabase could not send the login link.'); return true; },
  async pull(){ const cfg=this.cfg(); if(!await this.ensureSession()) throw Object.assign(new Error('Sign in again'),{auth:true}); const response=await fetch(`${clean(cfg.url)}/rest/v1/progression_state?user_id=eq.${encodeURIComponent(this.session.user.id)}&select=state,updated_at`,{headers:this.headers(cfg)}); if(response.status===401||response.status===403) throw Object.assign(new Error('Sign in again'),{auth:true}); if(!response.ok) throw new Error('Supabase sync read failed.'); const rows=await response.json(); return rows[0] || null; },
  async push(state){ const cfg=this.cfg(); if(!await this.ensureSession()) throw Object.assign(new Error('Sign in again'),{auth:true}); const now=state.lastModified||new Date().toISOString(); const row={user_id:this.session.user.id,state:sanitizeState(state),updated_at:now}; const response=await fetch(`${clean(cfg.url)}/rest/v1/progression_state`,{method:'POST',headers:this.headers(cfg,{'Prefer':'resolution=merge-duplicates,return=minimal'}),body:JSON.stringify(row)}); if(response.status===401||response.status===403) throw Object.assign(new Error('Sign in again'),{auth:true}); if(!response.ok) throw new Error('Supabase sync write failed.'); return true; },
  loadSession(){ try { this.session=JSON.parse(localStorage.getItem('pp_supabase_session')||'null'); } catch { this.session=null; } const params=new URLSearchParams(location.hash.replace(/^#/,'')); const token=params.get('access_token'); if(token){ try { const payload=decode(token); this.saveSession({access_token:token,refresh_token:params.get('refresh_token')||'',user:{id:payload.sub,email:payload.email}}); history.replaceState(null,'',location.pathname+location.search); } catch {} } return this.session; },
  saveSession(session){ this.session=session; try { localStorage.setItem('pp_supabase_session',JSON.stringify(session)); } catch {} }
};
