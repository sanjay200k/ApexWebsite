/* Charts module: deterministic averages plus accessible, responsive SVG trend charts. */
export function rollingAverage(rows, read, windowSize = 7) { return rows.map((_, index) => { const slice = rows.slice(Math.max(0, index-windowSize+1), index+1).filter(row => Number(read(row)) > 0); return slice.length ? slice.reduce((sum, row) => sum + read(row), 0) / slice.length : null; }); }
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pathFor = (points, X, Y) => { let d=''; let previous=-2; points.forEach((point,index)=>{const x=X(index),y=Y(point.value);if(point.value<=0){previous=-2;return}d+=(index===0||index!==previous+1?'M':'L')+x.toFixed(1)+' '+y.toFixed(1);previous=index;}); return d; };
const areaFor = (points, X, Y) => { let d='', run=[]; const flush=()=>{ if(run.length){ d+='M'+X(run[0].index).toFixed(1)+' '+Y(run[0].value).toFixed(1)+run.slice(1).map(p=>' L'+X(p.index).toFixed(1)+' '+Y(p.value).toFixed(1)).join('')+' L'+X(run[run.length-1].index).toFixed(1)+' '+Y(0).toFixed(1)+' L'+X(run[0].index).toFixed(1)+' '+Y(0).toFixed(1)+' Z '; } run=[]; }; for(const p of points){ if(p.value>0 && (!run.length || p.index===run[run.length-1].index+1)) run.push(p); else { flush(); if(p.value>0) run.push(p); } } flush(); return d.trim(); };
export function renderTrendChart({id='tracker',series=[],goal=0,unit='',width=720,height=270,rolling=false,summary=''}) {
  const pad={l:48,r:18,t:24,b:40}, plotW=width-pad.l-pad.r, plotH=height-pad.t-pad.b;
  const all=series.flatMap(s=>s.points).map(p=>Number(p.value)).filter(v=>v>0), max=Math.max(1,goal||0,...all)*1.12;
  const count=Math.max(1,...series.map(s=>s.points.length));
  const X=i=>pad.l+(count>1?i/(count-1):.5)*plotW, Y=v=>pad.t+plotH-(Math.max(0,v)/max)*plotH;
  const defs=`<defs>${series.map((s,i)=>`<linearGradient id="${id}_area_${i}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${s.color}" stop-opacity=".30"/><stop offset="1" stop-color="${s.color}" stop-opacity=".02"/></linearGradient><radialGradient id="${id}_dot_${i}" cx="35%" cy="28%"><stop offset="0" stop-color="#fff" stop-opacity=".92"/><stop offset=".22" stop-color="${s.color}"/><stop offset="1" stop-color="${s.color}" stop-opacity=".72"/></radialGradient>`).join('')}</defs>`;
  const grid=[0,.5,1].map(q=>`<line class="tracker-grid" x1="${pad.l}" x2="${width-pad.r}" y1="${Y(max*q)}" y2="${Y(max*q)}"/><text class="tracker-axis" x="${pad.l-8}" y="${Y(max*q)+4}" text-anchor="end">${Math.round(max*q)}${esc(unit)}</text>`).join('');
  const xDates=[...new Set(series.flatMap(s=>s.points.map(p=>p.date)))].sort(); const step=Math.max(1,Math.ceil(xDates.length/6));
  const labels=xDates.map((date,i)=>i%step===0||i===xDates.length-1?`<text class="tracker-axis" x="${X(i)}" y="${height-12}" text-anchor="middle">${esc(date.slice(5))}</text>`:'').join('');
  const goalLine=goal>0?`<line class="tracker-goal" x1="${pad.l}" x2="${width-pad.r}" y1="${Y(goal)}" y2="${Y(goal)}"/><text class="tracker-goal-label" x="${width-pad.r}" y="${Y(goal)-6}" text-anchor="end">goal ${goal}${esc(unit)}</text>`:'';
  const bodies=series.map((s,i)=>{const points=s.points.map((p,index)=>({...p,index}));const path=pathFor(points,X,Y);const area=areaFor(points,X,Y);const avg=rolling?rollingAverage(s.points,p=>p.value,7).map((value,index)=>value?{value,index}:null).filter(Boolean):[];return `<g class="tracker-series" style="--tracker-color:${s.color}"><path class="tracker-area" d="${area}" fill="url(#${id}_area_${i})"/><path class="tracker-line" d="${path}" stroke="${s.color}" pathLength="1"/><path class="tracker-average" d="${pathFor(avg,X,Y)}"/><g class="tracker-points">${points.filter(p=>p.value>0).map(p=>`<circle cx="${X(p.index)}" cy="${Y(p.value)}" r="5.5" fill="url(#${id}_dot_${i})" stroke="${s.color}" data-tracker-point tabindex="0" role="img" aria-label="${esc(p.date)}: ${esc(p.display??p.value)}${esc(unit)}"><title>${esc(p.date)} · ${esc(p.display??p.value)}${esc(unit)}</title></circle>`).join('')}</g></g>`;}).join('');
  const legend=series.map(s=>`<span class="tracker-key"><i style="--tracker-color:${s.color}"></i>${esc(s.name)}</span>`).join('');
  return `<div class="tracker-chart" data-trend-chart="${esc(id)}"><svg class="tracker-svg" viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-label="${esc(summary||'Tracker trend chart')}">${defs}${grid}${goalLine}${bodies}${labels}</svg><div class="tracker-chart-legend">${legend}${rolling?'<span class="tracker-key"><i class="tracker-average-key"></i>7-day average</span>':''}</div><p class="tracker-sr">${esc(summary||'Trend chart with dates on the horizontal axis and values on the vertical axis. Tap a point for its date and value.')}</p></div>`;
}

/* Touch + keyboard tooltips: SVG <title> does not show on touch, so show a tip on tap/focus. */
if (typeof document !== 'undefined' && !globalThis.__trackerTip) {
  globalThis.__trackerTip = true;
  const st = document.createElement('style');
  st.textContent = '.tracker-chart{position:relative}.tracker-tip{position:absolute;pointer-events:none;background:#0a1022;color:#fff;border:1px solid #7ea6ff;border-radius:8px;padding:4px 8px;font:12px/1.3 system-ui,sans-serif;white-space:nowrap;transform:translate(-50%,-130%);z-index:5}';
  document.head.appendChild(st);
  const hide = () => document.querySelectorAll('.tracker-tip').forEach(t => t.remove());
  const show = pt => { hide(); const chart = pt.closest('.tracker-chart'); if (!chart) return; const c = chart.getBoundingClientRect(), p = pt.getBoundingClientRect(); const tip = document.createElement('div'); tip.className = 'tracker-tip'; tip.textContent = pt.getAttribute('aria-label') || ''; tip.style.left = (p.left + p.width/2 - c.left) + 'px'; tip.style.top = (p.top - c.top) + 'px'; chart.appendChild(tip); };
  document.addEventListener('click', e => { const pt = e.target.closest?.('[data-tracker-point]'); pt ? show(pt) : hide(); });
  document.addEventListener('focusin', e => { const pt = e.target.closest?.('[data-tracker-point]'); if (pt) show(pt); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hide(); });
}
