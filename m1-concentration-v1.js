(function(){
'use strict';
const KEY='combo-m1-config-v1',ARCH='combo-m1-archive-v1',PENDING='combo-m1-pending-v1';
const el=id=>document.getElementById(id);
const read=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}};
const state=Object.assign({depth:50,reverse:true,filter:'all',focus:0,svMode:'columns',archive:false,fort:true,parity:'all',sum:false,numbers:true,reduce:0,marks:[]},read(KEY,{}));
let records=Array.isArray(read(ARCH,[]))?read(ARCH,[]):[],pending=read(PENDING,null);
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(state))}catch{}};
const saveRecords=()=>{try{localStorage.setItem(ARCH,JSON.stringify(records));localStorage.setItem(PENDING,JSON.stringify(pending))}catch{}};
const c=n=>((Number(n)-1)%9)+1, valid=d=>d&&Number.isSafeInteger(Number(d.draw))&&Array.isArray(d.balls)&&d.balls.length===20&&d.balls.every(n=>Number.isInteger(Number(n))&&n>=1&&n<=80);
const draws=()=>typeof DRAWS==='undefined'?[]:DRAWS.filter(valid).slice().sort((a,b)=>a.draw-b.draw);
const nums=d=>d.balls.map(Number);
const count=d=>{const a=Array(10).fill(0);for(const n of d.balls)a[c(n)]++;return a};
const buckets=d=>{const a=Array.from({length:10},()=>[]);for(const n of d.balls)a[c(n)].push(Number(n));return a};
const fmt=n=>String(n).padStart(2,'0');
const esc=v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const b=n=>Math.min(4,n),lbl=x=>x===4?'4+':String(x);
const visible=n=>state.parity==='all'||(Number(n)%2===0)===(state.parity==='even');
const chosen=d=>{const ct=count(d);return Array.from({length:9},(_,i)=>i+1).filter(k=>(state.filter==='all'||b(ct[k])===Number(state.filter))&&(!state.focus||k===state.focus))};
function arm(d){
 if(!d||state.filter==='all')return null;
 const gr=buckets(d),ks=chosen(d);
 return {source:Number(d.draw),target:Number(d.draw)+1,ks,proposed:[...new Set(ks.flatMap(k=>gr[k]))],referenceCounts:count(d),filter:state.filter,createdAt:new Date().toISOString()};
}
function settle(){
 const all=draws();if(!all.length)return;
 if(pending&&Number.isInteger(Number(pending.target))){
  const d=all.find(x=>Number(x.draw)===Number(pending.target));
  if(d&&!records.some(r=>Number(r.target)===Number(d.draw))){
   records.push({target:Number(d.draw),source:Number(pending.source),ks:pending.ks,proposed:pending.proposed,actual:nums(d),createdAt:pending.createdAt,filter:pending.filter});
   records.sort((a,b)=>a.target-b.target);records=records.slice(-5000);pending=null;saveRecords();
  }else if(!d&&Number(all[all.length-1].draw)>Number(pending.target))return;
 }
 const latest=all[all.length-1];
 if(state.filter!=='all'&&(!pending||Number(pending.source)!==Number(latest.draw))){
  pending=arm(latest);saveRecords();
 }
}
const combination=(n,k)=>{if(k<0||k>n)return 0;k=Math.min(k,n-k);let v=1;for(let i=1;i<=k;i++)v*=((n-k+i)/i);return v};
const hprob=(g,k)=>combination(g,k)*combination(80-g,20-k)/combination(80,20);
const chance=(g,f)=>Number(f)===4?Array.from({length:g-3},(_,i)=>hprob(g,i+4)).reduce((a,b)=>a+b,0):hprob(g,Number(f));
function stats(){
 if(!records.length)return 'Нет сохранённых фактических проверок.';
 return 'Сохранено записей: '+records.length+'. Окна: последние 20 / 50 / 100 — '+[20,50,100].map(n=>Math.min(n,records.length)).join(' / ')+'. Старые результаты Ч/К/КЧ скрыты: их правило не подтверждено.';
}
function svData(d){
 const counts=count(d),highest=Math.max(...counts.slice(1)),last=Array(10).fill(-1);
 d.balls.forEach((v,i)=>{last[c(v)]=i});
 const concentration=typeof cmConcWinner==='function'?cmConcWinner(d):Array.from({length:9},(_,i)=>i+1).filter(k=>counts[k]===highest).sort((a,b)=>last[a]-last[b])[0];
 const columns=[...new Set(buckets(d)[concentration].map(n=>((n-1)%10)+1))].sort((a,b)=>a-b);
 return {concentration,columns};
}
// Ч: current winning column among columns of numbers in previous main concentration.
// К: current winning column equals previous concentration number.
// КЧ: both. ✗: neither.
function svTransition(current,previous){
 if(!previous)return {status:'—',winner:null,previousConc:null,previousColumns:[]};
 const data=svData(previous),previousConc=data.concentration,previousColumns=data.columns;
 const winner=typeof drawColumn==='function'?drawColumn(current):null;
 if(!Number.isInteger(winner)||winner<1||winner>10)return {status:'—',winner,previousConc,previousColumns};
 const ch=previousColumns.includes(winner),k=winner===previousConc;
 return {status:ch?(k?'КЧ':'Ч'):(k?'К':'✗'),winner,previousConc,previousColumns};
}
function row(d,previous,waterfall){
 const cs=count(d),bg=buckets(d),winner=svData(d).concentration,official=typeof drawColumn==='function'?drawColumn(d):0,fort=new Set();
 if(state.fort){const set=new Set(nums(d));for(const n of set)if(set.has(81-n))fort.add(n)}
 const tr='<tr><th>'+d.draw+'</th>';
 const cells=Array.from({length:9},(_,i)=>{
  const k=i+1,ns=bg[k].filter(visible),key=d.draw+':'+k;
  const isWinner=winner===k;
  const isLatest=isWinner&&waterfall.latest[k]===waterfall.rowIndex;
  const isTrail=!isWinner&&waterfall.latest[k]>=0&&(state.reverse?waterfall.rowIndex<waterfall.latest[k]:waterfall.rowIndex>waterfall.latest[k]);
  const cls=(isWinner?(isLatest?' m1-last':' m1-history'):(isTrail?' m1-trail':''))+(state.marks.includes(key)?' m1-mark':'')+(state.filter!=='all'&&b(cs[k])===Number(state.filter)?' m1-active':'');
  const bubble=winner===k?'<span class="m1-bubble" title="Выпавший столб ст'+official+'">'+official+'</span>':'';
  const text=state.sum?'<span>'+ns.reduce((a,n)=>a+n,0)+'</span>':state.numbers?'<span class="m1-nums">'+ns.map(n=>'<span class="'+(fort.has(n)?'m1-fort':'')+'">'+fmt(n)+'</span>').join('')+'</span>':'<span>'+cs[k]+'</span>';
  return '<td data-m1-cell="'+key+'" class="'+cls+'" title="к'+k+': '+cs[k]+' чисел">'+bubble+text+'</td>';
 }).join('');
 const relation=svTransition(d,previous),value=relation.status;
 const hint=relation.previousConc===null?'Нет предыдущего тиража':'Предыдущая основная концентрация к'+relation.previousConc+'; столбцы её чисел: '+relation.previousColumns.map(n=>'ст'+n).join(', ')+'; текущий ст'+relation.winner;
 const cls=value==='КЧ'?'m1-sv-kch':value==='Ч'?'m1-sv-ch':value==='К'?'m1-sv-k':'m1-sv-none';
 return tr+cells+'<td class="m1-check" title="'+hint+'"><span class="m1-sv-badge '+cls+'">'+value+'</span></td><td class="m1-date">'+esc(String(d.date||'').slice(0,5))+' '+esc(String(d.time||'').slice(0,5))+'</td></tr>';
}
function render(){
 const panel=el('m1Panel');if(!panel)return;
 panel.hidden=typeof matrixSlotMode==='undefined'||matrixSlotMode!==1;if(panel.hidden)return;
 settle();
 const all=draws(),latest=all[all.length-1];
 let selected=state.reverse?all.slice().reverse():all.slice();
 selected=selected.slice(0,Math.min(selected.length,Math.max(1,Number(state.depth)||50)));
 if(state.focus&&state.filter!=='all')selected=selected.filter(d=>b(count(d)[state.focus])===Number(state.filter));
 const button=(action,label,on=false,extra='')=>'<button type="button" data-m1="'+action+'" class="'+(on?'on':'')+'" '+extra+'>'+label+'</button>';
 const toolbar='<div class="m1-toolbar"><strong>М1 · Концентрации 1–9</strong>'+button('close','✕')+button('numbers','А',state.numbers)+button('sum','СУМ',state.sum)+button('fort','ФОРТ',state.fort)+button('reverse','↑↓')+button('refresh','⟳')+
 '<select id="m1Depth">'+[20,50,100,500,999999].map(n=>'<option value="'+n+'"'+(Number(state.depth)===n?' selected':'')+'>'+(n===999999?'Все':n+' тир')+'</option>').join('')+'</select>'+
 button('parity','ЧЁТ',state.parity==='even','data-value="even"')+button('parity','НЕЧЁТ',state.parity==='odd','data-value="odd"')+'</div>';
 const filter='<div class="m1-filter">'+[0,1,2,3,4,'all'].map(x=>button('filter',x==='all'?'ВСЕ':lbl(x),String(state.filter)===String(x),'data-value="'+x+'"')).join('')+'</div>';
 const frequency='<div class="m1-toolbar"><label>Сократить частоту <input id="m1Reduce" type="range" min="0" max="20" value="'+(Number(state.reduce)||0)+'"><output>'+(Number(state.reduce)||0)+'</output></label><span class="m1-info">Строк: '+selected.length+'</span></div>';
 const reference='<p class="m1-info">Св: текущий выпавший столб относительно предыдущей основной концентрации. Ч — по столбцам её чисел; К — по номеру концентрации; КЧ — оба; ✗ — ни одно.</p>';
 const header='<thead><tr><th>Тираж</th>'+Array.from({length:9},(_,i)=>'<th data-m1-head="'+(i+1)+'">к'+(i+1)+(state.focus===i+1?' •':'')+'</th>').join('')+'<th>Св</th><th>Дата/время</th></tr></thead>';
 const previousByDraw=new Map(all.map((d,i)=>[Number(d.draw),i>0?all[i-1]:null]));
 // Main matrix's chronological waterfall: latest win yellow, older win gray,
 // uninterrupted trail from most recent win toward newer draws amber.
 const latestWinByConc=Array(10).fill(-1);
 selected.forEach((draw,i)=>{
  const k=svData(draw).concentration;
  if(state.reverse){if(latestWinByConc[k]<0)latestWinByConc[k]=i}
  else latestWinByConc[k]=i;
 });
 const rows=selected.map((draw,i)=>row(draw,previousByDraw.get(Number(draw.draw)),{latest:latestWinByConc,rowIndex:i})).join('');
 const freq=Array.from({length:9},(_,i)=>Math.max(0,selected.filter(d=>count(d)[i+1]>0).length-(Number(state.reduce)||0)));
 const footer='<tfoot><tr><th>Частота</th>'+freq.map(n=>'<td>'+n+'</td>').join('')+'<td>—</td><td>'+selected.length+' строк</td></tr></tfoot>';
 const baseline=state.filter==='all'?'Выбери группу 0/1/2/3/4+ для сравнения со случайной базой.':'Случайная база: концентрации к1–к8 (9 чисел): '+(chance(9,state.filter)*100).toFixed(2)+'%; к9 (8 чисел): '+(chance(8,state.filter)*100).toFixed(2)+'% (гипергеометрическая модель 20 из 80).';
 const entries=records.slice().sort((x,y)=>y.target-x.target).slice(0,250).map(r=>'<tr><td>'+Number(r.target)+'</td><td>№'+Number(r.source)+' · '+esc((r.ks||[]).map(n=>'к'+n).join(' '))+' · '+esc((r.proposed||[]).map(fmt).join(' '))+'</td><td>'+esc((r.actual||[]).map(fmt).join(' '))+'</td><td>Факт</td></tr>').join('');
 const pendingText=pending?'Следующий замороженный: №'+pending.target+' из №'+pending.source+' · '+pending.ks.map(n=>'к'+n).join(' '):'Нет замороженного прогноза. Выбери группу 0/1/2/3/4+.';
 const arch='<div class="m1-archive">'+button('archive','Архив анализа '+(state.archive?'▴':'▾')+' ('+records.length+')')+(state.archive?'<p class="m1-info">'+esc(pendingText)+'</p><pre>'+esc(stats())+'</pre><div class="m1-toolbar">'+button('json','Экспорт JSON')+button('csv','Экспорт CSV')+'<label>Импорт JSON / CSV<input type="file" id="m1Import" accept=".json,.csv"></label></div><div class="m1-archive-scroll"><table><thead><tr><th>Тираж</th><th>Предлагал</th><th>Вышло</th><th>Итог</th></tr></thead><tbody>'+entries+'</tbody></table></div><p class="m1-info">Исторические тиражи не записываются как прогнозы. Сохраняется только заранее замороженный выбор, локально в браузере. Старые оценки Ч/К/КЧ не подтверждены и не используются. Факты сохранены.</p>':'')+'</div>';
 panel.innerHTML=toolbar+filter+frequency+'<div class="m1-scroll"><table>'+header+'<tbody>'+rows+'</tbody>'+footer+'</table></div>';
}
function download(name,mime,value){const url=URL.createObjectURL(new Blob([value],{type:mime})),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
const csvQuote=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
function exportData(type){
 if(type==='json'){download('combo-m1-archive.json','application/json',JSON.stringify({version:1,records},null,2));return}
 const cols=['target','source','ks','proposed','actual','result','createdAt'];
 const lines=[cols.map(csvQuote).join(',')].concat(records.map(x=>cols.map(k=>csvQuote(Array.isArray(x[k])?x[k].join('|'):x[k])).join(',')));
 download('combo-m1-archive.csv','text/csv;charset=utf-8','\uFEFF'+lines.join('\r\n'));
}
function csvLine(line){const out=[];let val='',q=false;for(let i=0;i<line.length;i++){const x=line[i];if(x==='"'){if(q&&line[i+1]==='"'){val+='"';i++}else q=!q}else if(x===','&&!q){out.push(val);val=''}else val+=x}out.push(val);return out}
function validateRecord(x){
 if(!x||!Number.isSafeInteger(Number(x.target))||!Number.isSafeInteger(Number(x.source))||Number(x.source)>=Number(x.target)||!['Ч','К','КЧ','✗'].includes(x.result))return null;
 const values=(key,max)=>{const arr=Array.isArray(x[key])?x[key]:String(x[key]||'').split('|');return [...new Set(arr.map(Number).filter(n=>Number.isInteger(n)&&n>=1&&n<=max))]};
 return {target:Number(x.target),source:Number(x.source),ks:values('ks',9),proposed:values('proposed',80),actual:values('actual',80),result:x.result,createdAt:String(x.createdAt||'').slice(0,40)};
}
async function importData(file){
 if(!file)return;
 try{
  const txt=await file.text();let input;
  if(file.name.toLowerCase().endsWith('.csv')){
   const lines=txt.replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean),head=csvLine(lines.shift());
   input=lines.map(line=>{const r={},v=csvLine(line);head.forEach((k,i)=>r[k]=v[i]);return r});
  }else{const obj=JSON.parse(txt);input=Array.isArray(obj)?obj:obj.records}
  if(!Array.isArray(input))throw Error('Нет записей');
  const map=new Map(records.map(x=>[x.target,x]));let count=0;
  for(const raw of input){const obj=validateRecord(raw);if(obj&&!map.has(obj.target)){map.set(obj.target,obj);count++}}
  records=[...map.values()].sort((a,b)=>a.target-b.target).slice(-5000);saveRecords();render();alert('Импортировано: '+count);
 }catch(e){alert('Ошибка импорта: '+e.message)}
}
document.addEventListener('click',e=>{
 const root=el('m1Panel');if(!root||root.hidden||!root.contains(e.target))return;
 const head=e.target.closest('[data-m1-head]'),cell=e.target.closest('[data-m1-cell]'),btn=e.target.closest('[data-m1]');
 if(head){const n=Number(head.dataset.m1Head);state.focus=state.focus===n?0:n;save();render();return}
 if(cell){const key=cell.dataset.m1Cell;state.marks=state.marks.includes(key)?state.marks.filter(x=>x!==key):[...state.marks,key];save();render();return}
 if(!btn)return;
 const action=btn.dataset.m1,value=btn.dataset.value;
 if(action==='close'){setMatrixSlotMode(1);return}
 if(action==='filter'){state.filter=String(state.filter)===String(value)?'all':value;state.focus=0;/* already frozen prediction stays unchanged until verified */}
 if(action==='sum')state.sum=!state.sum;
 if(action==='numbers')state.numbers=!state.numbers;
 if(action==='fort')state.fort=!state.fort;
 if(action==='reverse')state.reverse=!state.reverse;
 if(action==='parity')state.parity=state.parity===value?'all':value;
 if(action==='archive')state.archive=!state.archive;
 if(action==='json'||action==='csv'){exportData(action);return}
 if(action==='refresh'){if(typeof refreshAllFromTable==='function')refreshAllFromTable();return}
 save();render();
});
document.addEventListener('change',e=>{
 const root=el('m1Panel');if(!root||!root.contains(e.target))return;
 if(e.target.id==='m1Depth'){state.depth=Number(e.target.value);save();render()}
 if(e.target.id==='m1Reduce'){state.reduce=Number(e.target.value);save();render()}
 if(e.target.id==='m1Import')importData(e.target.files&&e.target.files[0]);
});
const style=document.createElement('style');style.id='m1-styles';style.textContent=[
'#m1Panel{margin:9px 0;padding:9px;border:1px solid #436782;border-radius:12px;background:#091e30;color:#ecf5ff}',
'#m1Panel[hidden]{display:none!important}',
'#m1Panel .m1-toolbar{display:flex;align-items:center;flex-wrap:wrap;gap:5px;margin:7px 0}',
'#m1Panel button,#m1Panel select,#m1Panel input{background:#173a55;color:white;border:1px solid #4a718f;border-radius:8px;padding:8px;min-height:40px}',
'#m1Panel button.on{background:#23774c;border-color:#64e39b}',
'#m1Panel .m1-filter{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:3px}',
'#m1Panel .m1-filter button{min-width:0;padding:6px 1px}',
'#m1Panel .m1-scroll{overflow-x:auto;max-width:100%;overscroll-behavior-x:contain}',
'#m1Panel .m1-scroll table{border-collapse:collapse;table-layout:fixed;width:100%;min-width:580px;font-size:clamp(7px,1.2vw,10px)}',
'#m1Panel .m1-scroll td,#m1Panel .m1-scroll th{border:1px solid #304d66;text-align:center;padding:1px;overflow-wrap:anywhere}',
'#m1Panel .m1-scroll th:first-child{width:14%;white-space:nowrap;background:#0a2236;color:#eef5ff}#m1Panel .m1-date{width:12%;font-size:9px!important;color:#d7e8f5;background:#102b42!important}#m1Panel .m1-scroll th{background:#15405b;color:#fff}',
'#m1Panel .m1-scroll tbody tr{height:48px}#m1Panel .m1-scroll tbody td{height:48px;max-height:56px;background:#071e32;color:#edf5fa;vertical-align:middle;overflow:hidden}#m1Panel .m1-scroll tbody td.m1-trail{background:#72551c;color:#fff}#m1Panel .m1-scroll tbody td.m1-history{background:#435a70;color:#fff}#m1Panel .m1-scroll tbody td.m1-last{background:#ffcb39;color:#152633}',
'#m1Panel .m1-scroll tbody td.m1-active{box-shadow:inset 0 0 0 2px #4eb4ff}',
'#m1Panel .m1-scroll tbody td.m1-mark{background:#237849!important;color:white}',
'#m1Panel .m1-nums{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 1px;line-height:1.08;font-size:clamp(7px,1.25vw,10px);font-weight:700}#m1Panel .m1-nums>span{display:inline-block;min-width:0;white-space:nowrap}#m1Panel .m1-scroll tbody td .m1-nums span{margin:0}',
'#m1Panel .m1-fort{background:#ba6816;color:white;border-radius:4px;padding:1px 2px}',
'#m1Panel .m1-bubble{display:flex;align-items:center;justify-content:center;width:17px;height:17px;margin:0 auto 1px;border-radius:50%;background:#23cd6a;border:2px solid #008d46;color:#07291a;font-size:11px;font-weight:900}',
'#m1Panel .m1-check{width:7%;background:#0a2236!important}#m1Panel .m1-check-pill{display:inline-flex;align-items:center;justify-content:center;min-width:20px;padding:3px 2px;border-radius:7px;font-size:9px;font-weight:900;color:white}#m1Panel .m1-check-pill.m1-kch{background:#e7c13c;color:#102030}#m1Panel .m1-check-pill.m1-ch{background:#1e9953}#m1Panel .m1-check-pill.m1-k{background:#287bae}#m1Panel .m1-check-pill.m1-x{background:transparent;color:#ff8294}',
'#m1Panel .m1-info{font-size:12px;color:#bdd1df;line-height:1.5}',
'#m1Panel .m1-archive{border-top:1px solid #41617a;margin-top:10px;padding-top:8px}',
'#m1Panel .m1-archive pre{white-space:pre-wrap;font:11px/1.6 monospace}',
'#m1Panel .m1-archive-scroll{max-height:330px;overflow:auto}',
'#m1Panel .m1-archive-scroll table{min-width:600px;table-layout:auto}',
'#m1Panel .m1-archive-scroll td{height:auto;background:transparent}',
'#m1Panel input[type=file]{max-width:190px;font-size:11px}',
'#m1Panel .m1-check{width:12%;background:#092239!important;padding:2px!important}',
'#m1Panel .m1-sv-badge{display:inline-flex;flex-wrap:wrap;justify-content:center;max-width:100%;padding:3px;border-radius:6px;line-height:1.2;font-size:9px;font-weight:900}',
'#m1Panel .m1-sv-ch{background:#19a85f;color:#052918}',
'#m1Panel .m1-sv-k{background:#45c2f0;color:#08273a}',
'#m1Panel .m1-sv-kch{background:#f0c83b;color:#342707}',
'#m1Panel .m1-sv-none{background:transparent;color:#e1848f}'
].join('\n');document.head.appendChild(style);
window.comboM1Render=render;window.comboM1Refresh=settle;
})();
