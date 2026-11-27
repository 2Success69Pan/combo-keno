(function(){
'use strict';
const ID='m2RowsPanel',KEY='combo-m2-rows-v1';
const q=id=>document.getElementById(id);
const settings=(()=>{try{return JSON.parse(sessionStorage.getItem(KEY)||'{}')||{}}catch{return {}}})();
const st=Object.assign({count:50,reverse:true,numbers:true,sum:false,fort:false,even:'all',empty:0,reduce:0,temp:false,filter:'all',marks:[],view:'rows',selected:0,perDraw:[],order:[],trg:false,mirror:false},settings);
const marks=new Set(Array.isArray(st.marks)?st.marks:[]);
const visibleRows=new Set(Array.isArray(st.perDraw)?st.perDraw.map(Number):[]);
const orderedRows=new Set(Array.isArray(st.order)?st.order.map(Number):[]);
const save=()=>{try{sessionStorage.setItem(KEY,JSON.stringify({...st,marks:[...marks],perDraw:[...visibleRows],order:[...orderedRows]}))}catch(e){}};
const esc=t=>String(t??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const valid=d=>d&&Number.isSafeInteger(Number(d.draw))&&Array.isArray(d.balls)&&d.balls.length===20&&d.balls.every(n=>Number.isInteger(Number(n))&&Number(n)>=1&&Number(n)<=80)&&new Set(d.balls.map(Number)).size===20;
const rowOf=n=>Math.floor((Number(n)-1)/10)+1;
const colOf=n=>((Number(n)-1)%10)+1;
const data=()=>typeof DRAWS==='undefined'?[]:DRAWS.filter(valid).slice(-st.count).sort((a,b)=>st.reverse?b.draw-a.draw:a.draw-b.draw);
const groups=d=>{const a=Array.from({length:9},()=>[]);for(const raw of d.balls)a[rowOf(raw)].push(Number(raw));return a};
const counts=d=>groups(d).map(x=>x.length);
const winner=d=>typeof drawColumn==='function'?drawColumn(d):null;
const rowWinner=d=>{const c=counts(d),mx=Math.max(...c.slice(1)),last=Array(9).fill(-1);d.balls.forEach((n,i)=>last[rowOf(n)]=i);return Array.from({length:8},(_,i)=>i+1).filter(n=>c[n]===mx).sort((a,b)=>last[a]-last[b])[0]};
const selectedOccupancy=count=>Number(st.filter)===4?count>=4:count===Number(st.filter);
const show=n=>st.even==='all'||(n%2===0)===(st.even==='even');
function mirrorSet(d){
 if(!st.mirror)return new Set();
 if(typeof getTableMirrorPairNumbers==='function')return getTableMirrorPairNumbers(d);
 const set=new Set(d.balls.map(Number)),out=new Set();
 for(const n of set){const rev=Number(String(n).padStart(2,'0').split('').reverse().join(''));if(rev!==n&&set.has(rev))out.add(n)}
 return out;
}
function fortSet(d){
 if(!st.fort)return new Set();
 if(typeof cmFortPairNumbers==='function')return cmFortPairNumbers(d);
 const set=new Set(d.balls.map(Number));return new Set([...set].filter(n=>set.has(81-n)));
}
const label=(n,kind)=>'<span class="m2-num '+kind+'">'+String(n).padStart(2,'0')+'</span>';
function markup(){
 const root=q(ID);if(!root)return;
 const active=typeof matrixSlotMode!=='undefined'&&matrixSlotMode===2;
 root.hidden=!active;if(!active)return;
 const draws=data(),winIndex=Array(9).fill(-1),freq=Array(9).fill(0);
 draws.forEach((d,i)=>{const w=rowWinner(d);freq[w]++;if(winIndex[w]<0||!st.reverse)winIndex[w]=i});
 const btn=(action,name,active=false,attr='')=>'<button type="button" data-m2="'+action+'" class="'+(active?'active':'')+'" aria-pressed="'+!!active+'" '+attr+'>'+name+'</button>';
 const toolbar='<div class="m2-toolbar"><strong>М2 · Матрица строк 01–80</strong>'+btn('close','✕')+btn('numbers','А',st.numbers)+
 '<select id="m2Depth" aria-label="Глубина">'+[20,50,100,200,500].map(n=>'<option value="'+n+'"'+(st.count===n?' selected':'')+'>'+n+'</option>').join('')+'</select>'+
 btn('sum','СУМ',st.sum)+btn('mirror','🪞 Зеркало',st.mirror)+btn('fort','ФОРТ',st.fort)+
 btn('refresh','⟳ Обновить')+btn('reverse','↑↓ Перевернуть')+btn('temp','🌡 Температура',st.temp)+btn('trg','🔺 TRG',st.trg)+
 btn('even','ЧЁТ',st.even==='even')+btn('odd','НЕЧЁТ',st.even==='odd')+'</div>';
 const filter='<div class="m2-toolbar m2-filters"><span class="m2-caption">Чисел в строке</span>'+[0,1,2,3,4,'all'].map(n=>btn('filter',n==='all'?'ВСЕ':n===4?'4+':n,st.filter===n,'data-value="'+n+'"')).join('')+'</div>';
 const sliders='<div class="m2-sliders"><label>Пустые строки <input id="m2Empty" type="range" min="0" max="10" value="'+st.empty+'"><output>'+st.empty+'</output></label><label>Сократить частоту <input id="m2Reduce" type="range" min="0" max="20" value="'+st.reduce+'"><output>'+st.reduce+'</output></label></div>';
 const fmax=Math.max(1,...freq.slice(1));
 const th='<thead><tr><th>Тираж</th>'+Array.from({length:8},(_,i)=>'<th>стр'+(i+1)+'<small>'+String(i*10+1).padStart(2,'0')+'–'+(i+1)*10+'</small></th>').join('')+'<th>ст</th><th>Дата/время</th></tr></thead>';
 const body=draws.map((d,i)=>{
  const buckets=groups(d),win=winner(d),rw=rowWinner(d),mirrors=mirrorSet(d),fort=fortSet(d);
  const countCheck=buckets.slice(1).reduce((x,y)=>x+y.length,0);
  if(countCheck!==20)throw Error('M2 draw numbers distribution invalid '+d.draw);
  const cells=Array.from({length:8},(_,idx)=>{
   const k=idx+1,arr=buckets[k],numbers=orderedRows.has(Number(d.draw))?arr:arr.slice().sort((a,b)=>a-b);
   const occupied=arr.length,winRow=k===rw,isLast=winRow&&winIndex[k]===i;
   const trail=!winRow&&winIndex[k]>=0&&(st.reverse?i<winIndex[k]:i>winIndex[k]);
   const color=marks.has(d.draw+':'+k)?' marked':isLast?' latest':winRow?' past':trail?' trail':'';
   const filtered=st.filter!=='all'&&selectedOccupancy(occupied)?' occupancy':'';
   const list=numbers.filter(show);
   const cellsText=(st.sum?'<span class="m2-sum">'+list.reduce((a,b)=>a+b,0)+'</span>':(st.numbers||visibleRows.has(Number(d.draw))||orderedRows.has(Number(d.draw))?list.map(n=>{
    let classes=[];
    if(colOf(n)===win)classes.push('winner-number');
    if(mirrors.has(n))classes.push('mirror-number');
    if(fort.has(n))classes.push('fort-number');
    return '<span class="m2-number '+classes.join(' ')+'" title="'+(orderedRows.has(Number(d.draw))?'Выпал №'+(d.balls.indexOf(n)+1)+': ':'')+n+'">'+(orderedRows.has(Number(d.draw))?'<sup>'+(d.balls.indexOf(n)+1)+'</sup>':'')+String(n).padStart(2,'0')+'</span>';
   }).join(' '):''));
   return '<td data-m2-cell="'+d.draw+':'+k+'" data-m2-row="'+k+'" class="'+color+filtered+'">'+cellsText+'</td>';
  }).join('');
  const parity=d.balls.filter(x=>x%2===0).length;
  const countLine=parity===10?'=':parity>10?'II':'I';
  return '<tr><th class="m2-draw"><span>'+d.draw+'</span><button data-m2="order" data-draw="'+d.draw+'" class="'+(orderedRows.has(Number(d.draw))?'active':'')+'" title="В: порядок выпадения в своей строке">В</button><button data-m2="showrow" data-draw="'+d.draw+'" class="'+(visibleRows.has(Number(d.draw))?'active':'')+'" title="А: числа этого тиража">А</button></th>'+cells+'<td class="m2-winning" title="Фактический выпавший столб '+win+'"><span>'+win+'</span><small>'+countLine+'</small></td><td class="m2-date">'+esc(String(d.date||'').slice(0,5))+' '+esc(String(d.time||'').slice(0,5))+'</td></tr>';
 }).join('');
 const lastDraw=draws.length?Math.max(...draws.map(d=>Number(d.draw))):0;
 const empty=Array.from({length:st.empty},(_,i)=>'<tr><th>'+(lastDraw+i+1)+'</th>'+Array.from({length:8},(_,k)=>'<td class="m2-empty" data-m2-cell="'+(lastDraw+i+1)+':'+(k+1)+'"></td>').join('')+'<td>—</td><td>—</td></tr>').join('');
 const footer='<tfoot><tr><th>Частота</th>'+Array.from({length:8},(_,i)=>'<td>'+Math.max(0,freq[i+1]-st.reduce)+'</td>').join('')+'<td>ст</td><td>'+draws.length+' тир.</td></tr></tfoot>';
 root.innerHTML=toolbar+filter+sliders+'<div class="m2-info">Каждый тираж: 20 чисел. стр1: 01–10 · стр2: 11–20 · … · стр8: 71–80. Зелёный — числа фактически выпавшего столба; красный — зеркало; голубой — ФОРТ.</div><div class="m2-scroll"><table class="m2-table">'+th+'<tbody>'+(st.reverse?empty+body:body+empty)+'</tbody>'+footer+'</table></div>';
 if(st.temp){
  root.querySelectorAll('.m2-table tfoot td').forEach((cell,i)=>{
   if(i<8){const f=Math.max(0,freq[i+1]-st.reduce),red=Math.round(255*f/fmax);cell.style.color='rgb('+red+',0,'+(255-red)+')'}
  });
 }
}
function persistRender(preserve=true){
 const root=q(ID),scroll=root?.querySelector('.m2-scroll'),left=scroll?.scrollLeft||0,top=window.scrollY;
 save();markup();
 if(preserve){const next=root?.querySelector('.m2-scroll');if(next)next.scrollLeft=left;/* never scroll page to top */}
}
document.addEventListener('click',e=>{
 const root=q(ID);if(!root||root.hidden||!root.contains(e.target))return;
 const b=e.target.closest('[data-m2]'),cell=e.target.closest('[data-m2-cell]');
 if(cell&&!b){const key=cell.dataset.m2Cell;marks.has(key)?marks.delete(key):marks.add(key);persistRender();return}
 if(!b)return;
 const act=b.dataset.m2,val=b.dataset.value,id=Number(b.dataset.draw);
 if(act==='close'){if(typeof setMatrixSlotMode==='function')setMatrixSlotMode(2);return}
 if(act==='refresh'){markup();return}
 if(act==='numbers')st.numbers=!st.numbers;
 if(act==='sum')st.sum=!st.sum;
 if(act==='mirror')st.mirror=!st.mirror;
 if(act==='fort')st.fort=!st.fort;
 if(act==='reverse')st.reverse=!st.reverse;
 if(act==='temp')st.temp=!st.temp;
 if(act==='trg')st.trg=!st.trg;
 if(act==='even')st.even=st.even==='even'?'all':'even';
 if(act==='odd')st.even=st.even==='odd'?'all':'odd';
 if(act==='filter'){const selected=val==='all'?'all':Number(val);st.filter=st.filter===selected&&selected!=='all'?'all':selected;}
 if(act==='showrow'){visibleRows.has(id)?visibleRows.delete(id):visibleRows.add(id)}
 if(act==='order'){orderedRows.has(id)?orderedRows.delete(id):orderedRows.add(id)}
 persistRender();
});
document.addEventListener('change',e=>{
 const root=q(ID);if(!root||!root.contains(e.target))return;
 if(e.target.id==='m2Depth')st.count=Number(e.target.value);
 if(e.target.id==='m2Empty')st.empty=Number(e.target.value);
 if(e.target.id==='m2Reduce')st.reduce=Number(e.target.value);
 persistRender();
});
document.addEventListener('input',e=>{
 if(!['m2Empty','m2Reduce'].includes(e.target.id))return;
 const root=q(ID);if(!root||root.hidden)return;
 e.target.nextElementSibling.textContent=e.target.value;
});
const style=document.createElement('style');style.id='m2RowsStyle';style.textContent=[
 '#m2RowsPanel{border:1px solid #3c637d;border-radius:12px;padding:6px;background:#071e32;color:#eef7ff;margin:8px 0}',
 '#m2RowsPanel[hidden]{display:none!important}',
 '#m2RowsPanel .m2-toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:5px;margin:5px 0 9px}',
 '#m2RowsPanel .m2-toolbar button,#m2RowsPanel .m2-toolbar select{min-height:38px;padding:7px;border:1px solid #416480;border-radius:8px;background:#173851;color:#eef7ff;font-weight:800;font-size:12px}',
 '#m2RowsPanel button.active{background:#207048!important;border-color:#74e5a3!important;color:white!important}',
 '#m2RowsPanel .m2-caption{font-size:11px;color:#c4d8e8}',
 '#m2RowsPanel .m2-sliders{display:flex;flex-wrap:wrap;gap:8px;margin:5px 0}',
 '#m2RowsPanel .m2-sliders label{display:flex;align-items:center;gap:5px;font-size:11px}',
 '#m2RowsPanel input[type=range]{width:92px;accent-color:#b66af4}',
 '#m2RowsPanel .m2-info{font-size:10px;color:#b4cddd;margin:6px 0}',
 '#m2RowsPanel .m2-scroll{max-width:100%;overflow-x:auto;overscroll-behavior-x:contain}',
 '#m2RowsPanel .m2-table{border-collapse:collapse;width:100%;min-width:0;table-layout:fixed;font-size:clamp(8px,2.2vw,11px)}',
 '#m2RowsPanel .m2-table td,#m2RowsPanel .m2-table th{border:1px solid #345672;padding:2px 1px;vertical-align:middle;text-align:center}',
 '#m2RowsPanel .m2-table thead th{background:#17405b;color:white;line-height:1.15}',
 '#m2RowsPanel .m2-table thead th small{display:block;font-size:8px;font-weight:500}',
 '#m2RowsPanel .m2-table th:first-child{width:14%}',
 '#m2RowsPanel .m2-table thead th:nth-last-child(2){width:6%}',
 '#m2RowsPanel .m2-table th:last-child{width:14%}',
 '#m2RowsPanel .m2-table td{background:#071e32;height:46px}',
 '#m2RowsPanel .m2-table td.trail{background:#71551e}',
 '#m2RowsPanel .m2-table td.past{background:#41586e}',
 '#m2RowsPanel .m2-table td.latest{background:#ffd03e;color:#13253a}',
 '#m2RowsPanel .m2-table td.marked{background:#27754c!important}',
 '#m2RowsPanel .m2-table td.occupancy{outline:2px solid #4bbff5;outline-offset:-2px}',
 '#m2RowsPanel .m2-draw{position:relative;background:#092237;padding:15px 2px 2px!important;font-size:10px}',
 '#m2RowsPanel .m2-draw button{position:absolute;top:1px;padding:0 3px;border:1px solid #648198;background:#1a3851;color:#e9f4fc;border-radius:3px;font-size:10px}',
 '#m2RowsPanel .m2-draw button[data-m2=order]{left:1px}',
 '#m2RowsPanel .m2-draw button[data-m2=showrow]{right:1px}',
 '#m2RowsPanel .m2-number{display:inline-block;margin:1px;padding:1px;border-radius:4px;font-weight:750;white-space:nowrap}',
 '#m2RowsPanel .m2-number sup{font-size:7px;vertical-align:super;color:inherit}',
 '#m2RowsPanel .m2-number.winner-number{background:#12844f;color:white;border:1px solid #60f5a3}',
 '#m2RowsPanel .m2-number.mirror-number{box-shadow:inset 0 0 0 2px #ff5a61}',
 '#m2RowsPanel .m2-number.fort-number{outline:1px solid #55c0ff;outline-offset:-1px}',
 '#m2RowsPanel .m2-winning{background:#072238!important}',
 '#m2RowsPanel .m2-winning>span{display:inline-flex;background:#21ca72;color:#062b1b;border-radius:50%;min-width:24px;min-height:24px;align-items:center;justify-content:center;font-weight:900;font-size:14px}',
 '#m2RowsPanel .m2-winning small{display:block;font-size:8px}',
 '#m2RowsPanel .m2-date{background:#102b42!important;font-size:clamp(7px,1.8vw,10px);overflow-wrap:anywhere}',
 '#m2RowsPanel .m2-table tfoot td{height:25px;background:#102b42;font-weight:800}'
].join('\n');document.head.appendChild(style);
window.comboM2Render=markup;
window.comboM2Refresh=()=>{const root=q(ID);if(root&&!root.hidden)persistRender()};
})();
