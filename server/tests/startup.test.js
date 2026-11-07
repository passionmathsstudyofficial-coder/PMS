import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createReadinessServer} from '../src/services/httpStartup.js';

async function start(options){const gate=createReadinessServer(options);gate.server.listen(0,'127.0.0.1');await once(gate.server,'listening');return {...gate,url:`http://127.0.0.1:${gate.server.address().port}`}}
async function close(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
test('listener accepts connections during initialization and waits for a ready application',async()=>{
 const g=await start();let completed=false;
 try{const pending=fetch(g.url+'/api/health').then(r=>{completed=true;return r});await new Promise(r=>setTimeout(r,40));assert.equal(completed,false,'must not claim health before initialization');g.markReady((req,res)=>{res.writeHead(200,{'Content-Type':'application/json'});res.end('{"ok":true}')});assert.deepEqual(await (await pending).json(),{ok:true});assert.equal((await fetch(g.url)).status,200)}finally{await close(g.server)}
});
test('initialization failure returns retryable non-cacheable 503 instead of a healthy response',async()=>{
 const g=await start();try{g.markFailed(new Error('Database unavailable'));const r=await fetch(g.url);assert.equal(r.status,503);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(r.headers.get('retry-after'),'1')}finally{await close(g.server)}
});
test('startup requests have a deadline and later requests recover when initialization completes',async()=>{
 const g=await start({timeoutMs:30});try{assert.equal((await fetch(g.url)).status,503);g.markReady((req,res)=>res.end('Ready'));assert.equal(await (await fetch(g.url)).text(),'Ready')}finally{await close(g.server)}
});
