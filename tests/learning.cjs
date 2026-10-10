const vm=require('vm'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const data=fs.readFileSync(path.join(root,'src/data.js'),'utf8').replace('/*__RESEARCH__*/',fs.readFileSync(path.join(root,'sources.json'),'utf8'));
const context=vm.createContext({Intl,Date,Set,Object,Number,Error});
vm.runInContext(data+'\n'+fs.readFileSync(path.join(root,'src/learning.js'),'utf8')+'\nglobalThis.api=Learning;',context);
const L=context.api,now=1800000000000,day=86400000;
assert.equal(L.cards.length,42);assert.equal(new Set(L.cards.map(c=>c.id)).size,42);
assert.equal(L.select('all','himalaya').length,30);assert.equal(L.select('height','karakoram').length,4);assert.equal(L.select('all','everest').length,3);
let entry;
for(const days of [1,3,7,14,30,30]){entry=L.grade(entry,'good',now);assert.equal(entry.due,now+days*day);}
entry=L.grade(entry,'again',now);assert.equal(entry.due,now+600000);assert.equal(entry.step,0);
assert.equal(L.grade(entry,'good',now).due,now+day);
assert.equal(L.grade(undefined,'easy',now).due,now+3*day);
assert.throws(()=>L.grade(undefined,'invalid',now));
const p={'everest:name':L.grade(undefined,'good',now)};
assert.equal(L.due(L.cards,p,now).length,41);assert.equal(L.due(L.cards,p,now+day).length,42);
assert.equal(Object.keys(L.clean({version:1,cards:{...p,'bogus:name':p['everest:name'],'k2:geo':{step:99,due:now,seen:1},'k2:name':{step:0,due:-1,seen:1}}})).length,1);
assert.equal(Object.keys(L.clean(null)).length,0);assert.equal(Object.keys(L.clean({version:2,cards:p})).length,0);
for(const card of L.cards){const c=L.content(card);for(const key of ['question','hint','answer','detail'])assert.ok(c[key]&&c[key].length>0);}
console.log('PASS: 42 unique cards; range/topic filters; interval ladder; reset; easy; 30-day cap; due boundary; malformed-storage handling; all card content.');
