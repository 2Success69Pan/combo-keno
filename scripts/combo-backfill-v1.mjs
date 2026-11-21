import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const BASE='combo-history-v1.json';
const TAIL='combo-history-tail-restored-v1.json';
const STATUS='combo-status-v1.json';
const ENDPOINTS=[
 'https://www.stoloto.ru/p/api/mobile/api/v35/service/draws/archive',
 'https://www.stoloto.ru/p/api/mobile/api/v34/service/draws/archive'
];
const HEADERS={
 Accept:'application/json, text/plain, */*',
 'Device-Type':'MOBILE',
 'Gosloto-Partner':'bXMjXFRXZ3coWXh6R3s1NTdUX3dnWlBMLUxmdg',
 Referer:'https://www.stoloto.ru/keno2/archive/',
 'User-Agent':'Mozilla/5.0 (compatible; COMBOArchiveVerifier/1.0)'
};
const CHECK_ONLY=process.argv.includes('--check-only');
function isoDate(value){
 const s=String(value||'');
 let m=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
 if(m)return `${m[1]}-${m[2]}-${m[3]}`;
 m=s.match(/^(\d{2})\.(\d{2})\.(\d{2,4})$/);
 if(m)return `${m[3].length===2?'20'+m[3]:m[3]}-${m[2]}-${m[1]}`;
 throw Error('Bad date '+s);
}
function formatDate(iso){const [y,m,d]=iso.split('-');return `${d}.${m}.${y.slice(-2)}`}
function localToday(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function daysBetween(start,end){const out=[];let t=Date.parse(start+'T00:00:00Z'),limit=Date.parse(end+'T00:00:00Z');while(t<=limit){out.push(new Date(t).toISOString().slice(0,10));t+=86400000;if(out.length>550)throw Error('Too many days: '+out.length)}return out}
function validRecord(x){const n=Number(x.draw);if(!Number.isSafeInteger(n)||n<=0||!/^\d{2}\.\d{2}\.\d{2}$/.test(String(x.date))||!/^\d{2}:\d{2}$/.test(String(x.time))||!Array.isArray(x.balls)||x.balls.length!==20||new Set(x.balls).size!==20||x.balls.some(v=>!Number.isInteger(v)||v<1||v>80))throw Error('Invalid draw record '+n);return x}
function same(a,b){return a.draw===b.draw&&a.date===b.date&&a.time===b.time&&JSON.stringify(a.balls)===JSON.stringify(b.balls)}
function mergeVerified(base,extra){const m=new Map();for(const r of [...base,...extra]){validRecord(r);const previous=m.get(r.draw);if(previous&&!same(previous,r))throw Error('CONFLICT on draw '+r.draw);if(!previous)m.set(r.draw,r)}const out=[...m.values()].sort((a,b)=>a.draw-b.draw);for(let i=1;i<out.length;i++)if(out[i].draw!==out[i-1].draw+1)throw Error('MISSING draw '+(out[i-1].draw+1));return out}
function parseOfficial(item){
 const draw=Number(item.number??item.draw??item.id);
 const iso=isoDate(item.date??item.drawDate);
 const match=String(item.date??item.drawDate).match(/T(\d{2}):(\d{2})/);
 if(!match)throw Error(`Official date lacks time for ${draw}`);
 const nums=item.winningCombination??item.numbers??item.balls;
 if(!Array.isArray(nums)||nums.length<20)throw Error('Winning combination lacks 20 balls: '+draw);
 // Official payload may prefix 9 column/bonus digits; only the final 20 are KENO balls.
 const balls=nums.slice(-20).map(Number);
 const record={draw,date:formatDate(iso),time:`${match[1]}:${match[2]}`,balls,source:'Столото · официальный API'};
 const col=Number(item.column??item.columnNumber);
 if(Number.isInteger(col)&&col>=1&&col<=10)record.column=col;
 return validRecord(record);
}
async function fetchArchivePage(day,page){
 const failures=[];
 for(const endpoint of ENDPOINTS){
  for(let attempt=1;attempt<=2;attempt++){
   const u=new URL(endpoint);
   for(const [key,value] of Object.entries({game:'keno2',count:'50',date_from:day,date_to:day,page:String(page)}))u.searchParams.set(key,value);
   try{
    const control=new AbortController();const timeout=setTimeout(()=>control.abort(),25000);
    let response;try{response=await fetch(u,{headers:HEADERS,signal:control.signal})}finally{clearTimeout(timeout)}
    if(!response.ok)throw Error('HTTP '+response.status);
    const json=await response.json();
    if(!Array.isArray(json.draws)||typeof json.hasMore!=='boolean')throw Error('Unexpected official pagination schema');
    return json;
   }catch(error){failures.push(`${endpoint} page=${page} try=${attempt}: ${error.message}`);
    if(attempt<2)await new Promise(resolve=>setTimeout(resolve,750*attempt));
   }
  }
 }
 throw Error(`${day} page ${page}: ${failures.join(' | ')}`);
}
async function fetchDay(day){
 const results=new Map();let hasMore=true;
 for(let page=1;hasMore;page++){
  if(page>12)throw Error(`PAGE OVERFLOW ${day}: official archive exceeded 12 pages`);
  const json=await fetchArchivePage(day,page);
  if(json.hasMore&&json.draws.length===0)throw Error(`EMPTY PAGE with hasMore=true: ${day} page=${page}`);
  for(const item of json.draws){
   const record=parseOfficial(item);
   if(isoDate(record.date)!==day)throw Error(`OFF-DATE draw ${record.draw}: expected ${day} got ${record.date}`);
   const existing=results.get(record.draw);
   if(existing&&!same(existing,record))throw Error(`Page-overlap conflict on ${record.draw}`);
   results.set(record.draw,record);
  }
  hasMore=json.hasMore;
  if(page>1&&json.draws.length===50&&page===12)throw Error('Pagination appears endless');
 }
 return [...results.values()].sort((a,b)=>a.draw-b.draw);
}
async function main(){
 const base=JSON.parse(await fs.readFile(BASE,'utf8'));
 const tail=JSON.parse(await fs.readFile(TAIL,'utf8'));
 if(!Array.isArray(base)||!Array.isArray(tail))throw Error('Base or tail not an array');
 const initial=mergeVerified(base,tail);
 const last=initial.at(-1),today=localToday(),before=isoDate(last.date);
 if(before>today)throw Error('Last archive record is in future');
 const prev=new Date(Date.parse(before+'T00:00:00Z')-86400000).toISOString().slice(0,10);
 const dates=daysBetween(prev,today);
 console.log(`COMBO: ${initial.length} draws, last #${last.draw} ${last.date} ${last.time}; verify ${dates.length} dates through ${today}`);
 let official=[];
 for(const day of dates){const rows=await fetchDay(day);if(day!==today&&rows.length===0)throw Error('Official archive empty on '+day);official.push(...rows);console.log(`DATE ${day}: ${rows.length}`)}
 const merged=mergeVerified(initial,official);
 // Require a matching overlap and never silently trust a disjoint API history.
 const oldById=new Map(initial.map(x=>[x.draw,x]));
 const anchor=official.filter(x=>oldById.has(x.draw));
 if(!anchor.length)throw Error('NO ANCHOR: official API has no overlapping draw; do not write');
 for(const r of anchor)if(!same(r,oldById.get(r.draw)))throw Error('ANCHOR conflict '+r.draw);
 const fresh=merged.length-initial.length;
 if(fresh===0)console.log('No new official draws.');
 if(CHECK_ONLY){console.log('CHECK ONLY validated '+merged.length);return}
 if(fresh===0)return;
 const lastNew=merged.at(-1);
 const status={version:'restored-live-v1',source:ENDPOINTS[0],updatedAt:new Date().toISOString(),drawsStored:merged.length,latestDraw:lastNew.draw,latestDate:lastNew.date,latestTime:lastNew.time,verification:'official-api-contiguous',checkedFrom:prev,checkedThrough:today,added:fresh,mode:dates.length>2?'backfill':'recent-days'};
 await fs.writeFile(BASE+'.tmp',JSON.stringify(merged)+'\n');
 await fs.writeFile(STATUS+'.tmp',JSON.stringify(status,null,2)+'\n');
 // Crash-safe rename after all checks; snapshot remains reconstructable from git history.
 await fs.rename(BASE+'.tmp',BASE);
 await fs.rename(STATUS+'.tmp',STATUS);
 await fs.writeFile(TAIL,'[]\n');
 console.log(`PASS: ${initial.length} + ${fresh} = ${merged.length}; latest ${lastNew.draw}. Switching to recent-day mode next run.`);
}
if(import.meta.url===pathToFileURL(process.argv[1]||'').href){main().catch(e=>{console.error('SAFE STOP:',e.message);process.exitCode=1})}
export {isoDate,formatDate,daysBetween,validRecord,same,mergeVerified,parseOfficial,fetchDay};