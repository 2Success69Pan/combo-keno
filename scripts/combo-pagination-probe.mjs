const base='https://www.stoloto.ru/p/api/mobile/api/v35/service/draws/archive';
const cases=[{name:'baseline',args:{}},{name:'page2',args:{page:'2'}},{name:'offset50',args:{offset:'50'}},{name:'start50',args:{start:'50'}},{name:'page3',args:{page:'3'}},{name:'count20page2',args:{count:'20',page:'2'}}];
const headers={'Accept':'application/json, text/plain, */*','Device-Type':'MOBILE','Gosloto-Partner':'bXMjXFRXZ3coWXh6R3s1NTdUX3dnWlBMLUxmdg','Referer':'https://www.stoloto.ru/keno2/archive/','User-Agent':'Mozilla/5.0 (compatible; COMBOArchiveVerifier/1.0)'};
const day='2026-10-20';
async function probe(test){
 const u=new URL(base);for(const [k,v] of Object.entries({game:'keno2',count:'200',date_from:day,date_to:day,...test.args}))u.searchParams.set(k,v);
 const ctrl=new AbortController();const tm=setTimeout(()=>ctrl.abort(),13000);
 try{const r=await fetch(u,{headers,signal:ctrl.signal});if(!r.ok)throw Error(`HTTP ${r.status}`);const d=await r.json();const rows=d.draws||[];const ids=rows.map(x=>Number(x.number??x.draw??x.id));console.log(JSON.stringify({variant:test.name,status:r.status,keys:Object.keys(d).filter(x=>x!=='draws'),count:rows.length,idsFirst:ids.slice(0,3),idsLast:ids.slice(-3),other:{total:d.total,count:d.count,hasMore:d.hasMore,page:d.page,totalCount:d.totalCount}}));}
 catch(e){console.log(JSON.stringify({variant:test.name,error:String(e.message)}));}finally{clearTimeout(tm)}
}
for(const test of cases)await probe(test);