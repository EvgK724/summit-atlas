/* Pure scheduling functions. Browser persistence and presentation live in app.js. */
const Learning = (() => {
  'use strict';
  const DAY = 86400000, STEPS = [1,3,7,14,30];
  const TOPICS = {name:'Название', height:'Высота', geo:'География'};
  const cards = MOUNTAINS.flatMap(m => Object.keys(TOPICS).map(topic=>({id:`${m.id}:${topic}`,peakId:m.id,topic})));
  const validIds = new Set(cards.map(c=>c.id));
  function clean(raw) {
    if (!raw || raw.version !== 1 || !raw.cards || typeof raw.cards !== 'object') return {};
    const result = {};
    for (const [id,e] of Object.entries(raw.cards)) {
      if (!validIds.has(id) || !e || !Number.isInteger(e.step) || e.step < 0 || e.step > 5 || !Number.isFinite(e.due) || e.due < 0 || !Number.isInteger(e.seen) || e.seen < 1) continue;
      result[id] = {step:e.step,due:e.due,seen:e.seen};
    }
    return result;
  }
  function interval(entry,grade) {
    if (grade === 'again') return {step:0,delay:600000};
    if (!['good','easy'].includes(grade)) throw new Error('Unknown review grade');
    const step = Math.min(5,(entry?.step || 0)+(grade === 'easy' ? 2 : 1));
    return {step,delay:STEPS[step-1]*DAY};
  }
  function grade(entry,value,now=Date.now()) {
    const next = interval(entry,value);
    return {step:next.step,due:now+next.delay,seen:(entry?.seen || 0)+1};
  }
  function select(topic='all',peak='all') {
    return cards.filter(c => (topic === 'all' || c.topic === topic) && (peak === 'all' || c.peakId === peak || PEAK_BY_ID[c.peakId].group === peak));
  }
  function due(selection,progress,now=Date.now()) {
    return selection.filter(c=>!progress[c.id] || progress[c.id].due <= now);
  }
  function content(card) {
    const m = PEAK_BY_ID[card.peakId];
    if (card.topic === 'name') return {question:'Какая это вершина?',hint:m.clue,answer:m.name,detail:`${formatHeight(m.height)} м · № ${m.rank} по высоте · ${m.range}.`};
    if (card.topic === 'height') return {question:`Какова высота вершины ${m.name}?`,hint:'Вспомните число. На первом круге можно округлить до сотен метров.',answer:`${formatHeight(m.height)} м`,detail:`${m.name} · № ${m.rank} по высоте. ${m.heightNote}`};
    return {question:`Где находится ${m.name}?`,hint:'Вспомните горную систему — Гималаи или Каракорум — и расположение вершины.',answer:m.range,detail:`${m.region}. ${m.location}`};
  }
  return Object.freeze({cards,TOPICS,clean,interval,grade,select,due,content});
})();
