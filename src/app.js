(() => {
  'use strict';
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const set = (id,v) => {$(id).textContent=v;};
  const URL_APP = 'https://evgk724.github.io/summit-atlas/';
  const STORE = 'summit-learning-v1';
  let progress = {}, storageWarning=false, toastTimer, review=null, expanded=null;
  let peakId='everest',view='relief',mode='atlas',range='all';
  const readURL = () => {
    const p = new URLSearchParams(location.search);
    peakId = PEAK_BY_ID[p.get('peak')] ? p.get('peak') : 'everest';
    view = ['relief','heights','map'].includes(p.get('view')) ? p.get('view') : 'relief';
    mode = p.get('mode') === 'learn' ? 'learn' : 'atlas';
  };
  readURL();
  try {progress=Learning.clean(JSON.parse(localStorage.getItem(STORE)));} catch { /* A new or unavailable store starts without invented history. */ }
  function toast(message) {set('#toast',message);$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),4500);}
  function saveProgress() {
    try {localStorage.setItem(STORE,JSON.stringify({version:1,cards:progress}));window.atlasHasUnsavedProgress=false;}
    catch {window.atlasHasUnsavedProgress=true;if(!storageWarning){toast('Браузер не разрешил сохранение. Прогресс доступен до закрытия страницы.');storageWarning=true;}}
  }
  function writeURL() {
    const p=new URLSearchParams({peak:peakId,view});if(mode==='learn')p.set('mode','learn');
    try {history.replaceState(null,'',`${location.pathname}?${p}`);} catch { /* Local HTML may disallow history writes. */ }
  }
  const goTop = () => $('.utility-bar').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  function showMode(next,scroll=true) {
    if(expanded)toggleExpand();mode=next;
    $('#atlas-view').hidden=mode!=='atlas';$('#learn-view').hidden=mode!=='learn';
    $$('.main-nav button').forEach(b=>{b.classList.toggle('active',b.dataset.mode===mode);if(b.dataset.mode===mode)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
    if(mode==='learn')updateReviewOverview();
    document.title = mode==='learn' ? 'Запоминание — SUMMIT' : `${PEAK_BY_ID[peakId].name} — SUMMIT`;
    writeURL();if(scroll)goTop();
  }
  function renderGrid() {
    const query=$('#peak-search').value.trim().toLocaleLowerCase('ru').replace(/\s/g,'');
    const list=MOUNTAINS.filter(m=>(range==='all'||m.group===range)&&[m.name,m.nameEn,...m.aliases,String(m.height),formatHeight(m.height)].some(t=>t.toLocaleLowerCase('ru').replace(/\s/g,'').includes(query)));
    $('#peak-grid').innerHTML=list.map(m=>`<button type="button" class="peak-card${m.id===peakId?' selected':''}" data-peak="${m.id}" aria-pressed="${m.id===peakId}" aria-label="${esc(m.name)}, ${formatHeight(m.height)} метров, ${m.range}"><span class="peak-card-number">${String(m.rank).padStart(2,'0')} / 14</span><div class="peak-card-visual" aria-hidden="true">${mountainMini(m.id)}</div><strong class="peak-card-name">${esc(m.name)}</strong><span class="peak-card-alt">${formatHeight(m.height)} м</span><span class="peak-card-range">${m.range}</span></button>`).join('');
    $('#empty-search').hidden=list.length>0;
  }
  function renderPeak() {
    const m=PEAK_BY_ID[peakId];
    set('#peak-rank',`№ ${String(m.rank).padStart(2,'0')} ИЗ 14`);set('#peak-range',m.range.toLocaleUpperCase('ru'));
    set('#peak-name',m.name);$('#peak-name').classList.toggle('long-title',m.name.length>10);
    set('#peak-english',[m.nameEn,...m.aliases].join(' · '));set('#peak-summary',m.facts[0]);
    set('#peak-height',formatHeight(m.height));set('#peak-year',m.firstAscent.year);set('#peak-location',`${m.region}. ${m.location}`);
    set('#detail-heading',`${m.name} в деталях`);set('#anchor-title',m.anchor);set('#anchor-text',memoryText(m));
    set('#ascent-date',new Date(m.firstAscent.date+'T12:00:00Z').toLocaleDateString('ru-RU',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}));
    set('#ascent-team',m.firstAscent.people.join(', '));
    const note=m.id==='dhaulagiri'?'Международная экспедиция.':m.firstAscent.note||'';
    set('#ascent-note',note);$('#ascent-note').hidden=!note;
    $('#facts-grid').innerHTML=m.facts.map((f,i)=>`<article class="fact-item"><span>${String(i+1).padStart(2,'0')}</span><h3>${esc(m.titles[i])}</h3><p>${esc(f)}</p></article>`).join('');
    set('#pair-title',m.name);set('#pair-text',m.distinction);set('#pair-button',`${PEAK_BY_ID[m.pair].name} →`);
    renderViewer();renderGrid();if(mode==='atlas')document.title=`${m.name} — SUMMIT`;
  }
  function choosePeak(id,scroll=false) {if(!PEAK_BY_ID[id])return;peakId=id;renderPeak();writeURL();if(scroll&&!expanded)goTop();}
  const mapPositions={everest:[785,440],k2:[245,94],kangchenjunga:[930,560],lhotse:[765,565],makalu:[932,447],'cho-oyu':[691,376],dhaulagiri:[575,436],manaslu:[566,560],'nanga-parbat':[88,210],'annapurna-i':[451,443],'gasherbrum-i':[352,285],'broad-peak':[349,187],'gasherbrum-ii':[224,294],shishapangma:[586,330]};
  function mapDrawing() {
    const project=m=>[80+(m.lon-74)*60,80+(37-m.lat)*49];
    const lines=[76,80,84,88].map(l=>{const x=80+(l-74)*60;return `<path d="M${x} 55V590"/><text x="${x+7}" y="610" class="map-degree">${l}°E</text>`;}).join('')+[28,32,36].map(l=>{const y=80+(37-l)*49;return `<path d="M55 ${y}H970"/><text x="8" y="${y+5}" class="map-degree">${l}°N</text>`;}).join('');
    const dots=MOUNTAINS.map(m=>{const [x,y]=project(m),[lx,ly]=mapPositions[m.id],active=m.id===peakId;return `<g class="map-dot${active?' active':''}" data-map-peak="${m.id}" role="button" tabindex="0" aria-label="${m.rank}. ${esc(m.name)}, ${m.range}" aria-pressed="${active}"><path d="M${x} ${y}L${lx} ${ly}" stroke="${active?'#e9bd86':'#456c86'}" stroke-width="${active?2.5:1.2}"/><circle cx="${x}" cy="${y}" r="${active?8:4.5}" fill="${active?'#e9bd86':'#b6d9ec'}"/><circle class="map-hit" cx="${lx}" cy="${ly}" r="37"/><circle class="map-badge" cx="${lx}" cy="${ly}" r="26"/><text x="${lx}" y="${ly+1}">${m.rank}</text></g>`;}).join('');
    return `<svg viewBox="0 0 1000 650" role="group" aria-label="Обзорная карта 14 вершин. Кружки с номерами связаны линиями с географическими точками."><defs><radialGradient id="map-glow"><stop stop-color="#244a614f"/><stop offset="1" stop-color="#10203200"/></radialGradient></defs><ellipse cx="530" cy="320" rx="510" ry="350" fill="url(#map-glow)"/><g stroke="#2b465866" stroke-dasharray="3 7">${lines}</g><text x="385" y="108" class="map-caption">КАРАКОРУМ</text><text x="688" y="273" class="map-caption">ГИМАЛАИ</text><text x="90" y="43" class="map-caption">СЕВЕР ↑</text>${dots}</svg>`;
  }
  function renderViewer() {
    const m=PEAK_BY_ID[peakId], content=$('#viewer-content'),top=content.querySelector('.height-chart')?.scrollTop||0;
    $$('.view-tabs button').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);b.setAttribute('aria-pressed',String(b.dataset.view===view));});
    set('#viewer-code',`${m.lat.toFixed(2)}°N / ${m.lon.toFixed(2)}°E`);
    if(view==='relief'){
      set('#viewer-title','ПОРТРЕТ ВЕРШИНЫ');content.innerHTML=mountainDrawing(m);
      set('#viewer-note','Учебный силуэт · не топографическая модель. Высота указана над уровнем моря, масштаб рельефа условный.');
    } else if(view==='heights'){
      set('#viewer-title','ЧЕТЫРНАДЦАТЬ ВЫСОТ');
      content.innerHTML=`<div class="height-chart" tabindex="0" aria-label="Сравнение 14 высот. Список можно прокручивать."><p class="chart-intro">Длина полосы — превышение над 8000 м.<br>Одинаковая шкала: от 0 до 1000 м.</p>${MOUNTAINS.map(p=>`<button type="button" class="height-row${p.id===peakId?' active':''}" data-height-peak="${p.id}" aria-pressed="${p.id===peakId}"><span class="chart-name">${p.rank}. ${esc(p.name)}</span><span class="bar-track" aria-hidden="true"><i style="width:${(p.height-8000)/10}%"></i></span><span class="chart-value">${formatHeight(p.height)} м</span></button>`).join('')}</div>`;
      content.querySelector('.height-chart').scrollTop=top;
      set('#viewer-note','Прокрутите список, чтобы увидеть все вершины. Числа — полная высота над уровнем моря; справочные значения могут различаться.');
    } else {
      set('#viewer-title','ГЕОГРАФИЯ ВЕРШИН');content.innerHTML=mapDrawing();
      set('#viewer-note',`${m.rank}. ${m.name} · ${m.range}. Номер — место по высоте; линия ведёт к точке на карте. Для удобства разверните карту. Координаты приблизительные.`);
    }
  }
  function toggleExpand() {
    const viewer=$('#viewer'),button=$('#expand-viewer');
    if(!expanded){
      const placeholder=document.createComment('viewer');viewer.before(placeholder);document.body.append(viewer);
      const siblings=[...document.body.children].filter(e=>e!==viewer&&!['SCRIPT','STYLE'].includes(e.tagName));
      expanded={placeholder,siblings:siblings.map(e=>[e,e.inert]),overflow:document.body.style.overflow};
      siblings.forEach(e=>e.inert=true);document.body.style.overflow='hidden';viewer.classList.add('expanded');viewer.setAttribute('role','dialog');viewer.setAttribute('aria-modal','true');viewer.setAttribute('aria-label','Развёрнутая иллюстрация');
      button.setAttribute('aria-expanded','true');button.setAttribute('aria-label','Свернуть иллюстрацию');button.focus();
    }else{
      expanded.placeholder.replaceWith(viewer);expanded.siblings.forEach(([e,value])=>e.inert=value);document.body.style.overflow=expanded.overflow;expanded=null;
      viewer.classList.remove('expanded');['role','aria-modal','aria-label'].forEach(a=>viewer.removeAttribute(a));button.setAttribute('aria-expanded','false');button.setAttribute('aria-label','Развернуть иллюстрацию');button.focus();
    }
  }
  function showSources(id=peakId) {
    const m=PEAK_BY_ID[id];
    const group=(title,sources)=>`<section class="source-group"><h3>${esc(title)}</h3>${sources.map(s=>`<a class="source-link" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer"><strong>${esc(s.title)} ↗</strong><span>${esc(s.supports)}</span></a>`).join('')}</section>`;
    $('#sources-list').innerHTML=`<p class="height-note">${esc(m.name)}: ${esc(m.heightNote)}</p>${group(m.name,m.sources)}${group('Общая карта и список вершин',RESEARCH.meta.generalSources)}`;
    set('#source-policy',`Источники сверены 10 октября 2026. ${RESEARCH.meta.heightPolicy} Силуэты и ассоциации созданы для обучения. Координаты приблизительные. Приложение не показывает политические границы.`);
    openDialog($('#sources-dialog'));
  }
  function openDialog(dialog) {dialog.showModal();dialog.scrollTop=0;}
  const selectedCards=()=>Learning.select($('#study-topic').value,$('#study-peak').value);
  const plural=(n,one,few,many)=>n%100>=11&&n%100<=14?many:n%10===1?one:n%10>=2&&n%10<=4?few:many;
  const relativeTime = date => {
    const minutes=Math.ceil((date-Date.now())/60000);
    if(minutes<=0)return 'сейчас';
    if(minutes<60)return `через ${minutes} ${plural(minutes,'минуту','минуты','минут')}`;
    return new Date(date).toLocaleString('ru-RU',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'});
  };
  function updateReviewOverview() {
    const allDue=Learning.due(Learning.cards,progress).length;
    set('#nav-due',allDue);set('#due-count',allDue);set('#seen-count',Object.keys(progress).length);
    const selected=selectedCards(),due=Learning.due(selected,progress);
    set('#review-ready-title',due.length?`${due.length} ${plural(due.length,'карточка готова','карточки готовы','карточек готовы')} к повторению`:'Подборка повторена');
    const next=Math.min(...selected.map(c=>progress[c.id]?.due??Date.now()));
    set('#review-ready-note',due.length?'Отвечайте в своём темпе. Можно остановиться после любой карточки.':`Следующее повторение — ${relativeTime(next)}. При желании можно повторить всю подборку сейчас.`);
    $('#start-review').disabled=!due.length;
  }
  function intervalLabel(card,value) {
    const days=Learning.interval(progress[card.id],value).delay/86400000;
    return `через ${days} ${plural(days,'день','дня','дней')}`;
  }
  function renderCard() {
    const card=review.queue[review.index],text=Learning.content(card),m=PEAK_BY_ID[card.peakId];
    review.revealed=false;
    set('#session-position',`${review.index+1} / ${review.queue.length}`);$('#session-progress-bar').style.width=`${review.index/review.queue.length*100}%`;
    set('#card-topic',`${Learning.TOPICS[card.topic].toLocaleUpperCase('ru')} / ВСПОМНИТЬ САМОСТОЯТЕЛЬНО`);
    set('#card-question',text.question);set('#card-hint',text.hint);set('#card-answer',text.answer);set('#card-answer-detail',text.detail);set('#card-anchor',memoryText(m));
    $('#card-back').hidden=true;$('#card-front').hidden=false;$('#rating-buttons').hidden=true;$('#reveal-answer').setAttribute('aria-expanded','false');
    set('#good-interval',intervalLabel(card,'good'));set('#easy-interval',intervalLabel(card,'easy'));
  }
  function startReview(all=false) {
    const selected=selectedCards();
    // Interleave peaks within each topic so adjacent answers do not supply the next clue.
    const order=c=>Object.keys(Learning.TOPICS).indexOf(c.topic)*100+PEAK_BY_ID[c.peakId].rank;
    const queue=(all?selected:Learning.due(selected,progress)).sort((a,b)=>order(a)-order(b));
    if(!queue.length){updateReviewOverview();return;}
    review={queue,index:0,revealed:false};$('#learn-overview').hidden=true;$('#review-complete').hidden=true;$('#review-session').hidden=false;renderCard();
    $('#review-session').scrollIntoView({block:'start',behavior:'smooth'});$('#reveal-answer').focus({preventScroll:true});
  }
  function overview(scroll=true) {
    review=null;$('#learn-overview').hidden=false;$('#review-session').hidden=true;$('#review-complete').hidden=true;updateReviewOverview();if(scroll)goTop();
  }
  function reveal() {
    if(!review)return;review.revealed=true;$('#card-back').hidden=false;$('#card-front').hidden=true;$('#rating-buttons').hidden=false;$('#reveal-answer').setAttribute('aria-expanded','true');
    $('[data-grade="again"]').focus({preventScroll:true});
  }
  function rate(value) {
    if(!review||!review.revealed)return;
    const card=review.queue[review.index];progress[card.id]=Learning.grade(progress[card.id],value);saveProgress();review.index++;updateReviewOverview();
    if(review.index>=review.queue.length){
      $('#review-session').hidden=true;$('#review-complete').hidden=false;
      const next=Math.min(...review.queue.map(c=>progress[c.id].due));
      set('#review-summary',`Вы повторили ${review.queue.length} ${plural(review.queue.length,'карточку','карточки','карточек')}. Ближайший возврат к ним — ${relativeTime(next)}. Можно закончить на сегодня или выбрать другую тему.`);
      $('#return-overview').focus({preventScroll:true});$('#review-complete').scrollIntoView({block:'start',behavior:'smooth'});review=null;
    }else{renderCard();$('#reveal-answer').focus({preventScroll:true});$('#review-session').scrollIntoView({block:'start',behavior:'smooth'});}
  }
  $$('#study-peak').forEach(select=>MOUNTAINS.forEach(m=>select.add(new Option(m.name,m.id))));
  $('#text-size').value=document.documentElement.dataset.textSize;
  $('#text-size').addEventListener('change',e=>{document.documentElement.dataset.textSize=e.target.value;try{localStorage.setItem('summit-text-size',e.target.value);}catch{toast('Размер изменён. Браузер не разрешил сохранить настройку.');}});
  $$('[data-mode]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();showMode(b.dataset.mode);}));
  $$('.view-tabs button').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.view;renderViewer();writeURL();}));
  $('#expand-viewer').addEventListener('click',toggleExpand);
  $('#peak-grid').addEventListener('click',e=>{const b=e.target.closest('[data-peak]');if(b)choosePeak(b.dataset.peak,true);});
  $('#viewer-content').addEventListener('click',e=>{const b=e.target.closest('[data-map-peak],[data-height-peak]');if(b){const id=b.dataset.mapPeak||b.dataset.heightPeak;choosePeak(id);const target=$(`[data-map-peak="${id}"],[data-height-peak="${id}"]`);target?.focus({preventScroll:true});}});
  $('#viewer-content').addEventListener('keydown',e=>{const b=e.target.closest('[data-map-peak]');if(b&&['Enter',' '].includes(e.key)){e.preventDefault();b.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
  $$('.range-filters button').forEach(b=>b.addEventListener('click',()=>{range=b.dataset.range;$$('.range-filters button').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b));});renderGrid();}));
  $('#peak-search').addEventListener('input',renderGrid);
  $('#reset-search').addEventListener('click',()=>{$('#peak-search').value='';$('[data-range="all"]').click();$('#peak-search').focus();});
  $('#pair-button').addEventListener('click',()=>choosePeak(PEAK_BY_ID[peakId].pair,true));
  $('#remember-peak').addEventListener('click',()=>{overview(false);$('#study-peak').value=peakId;$('#study-topic').value='all';showMode('learn');});
  $$('.sources-trigger').forEach(b=>b.addEventListener('click',()=>showSources(review?.queue[review.index]?.peakId||peakId)));
  $('#answer-source').addEventListener('click',()=>showSources(review.queue[review.index].peakId));
  $$('.qr-trigger').forEach(b=>b.addEventListener('click',()=>openDialog($('#qr-dialog'))));
  $('#about-button').addEventListener('click',()=>openDialog($('#about-dialog')));
  $$('.close-dialog').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
  $$('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
  $('#copy-link').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(URL_APP);set('#copy-link','Ссылка скопирована ✓');setTimeout(()=>set('#copy-link','Скопировать ссылку ↗'),3000);}catch{const node=$('.qr-url'),selection=getSelection(),r=document.createRange();r.selectNodeContents(node);selection.removeAllRanges();selection.addRange(r);toast('Ссылка выделена — скопируйте её обычным способом.');}});
  ['#study-topic','#study-peak'].forEach(id=>$(id).addEventListener('change',updateReviewOverview));
  $('#start-review').addEventListener('click',()=>startReview());$('#practice-all').addEventListener('click',()=>startReview(true));
  $('#reveal-answer').addEventListener('click',reveal);$$('[data-grade]').forEach(b=>b.addEventListener('click',()=>rate(b.dataset.grade)));
  $('#end-review').addEventListener('click',()=>overview());$('#return-overview').addEventListener('click',()=>overview());
  document.addEventListener('keydown',e=>{
    if(!expanded)return;
    if(e.key==='Escape'){e.preventDefault();toggleExpand();return;}
    if(e.key==='Tab'){
      const focusable=[...$('#viewer').querySelectorAll('button,[tabindex="0"]')].filter(e=>e.getClientRects().length);
      const first=focusable[0],last=focusable.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
  });
  addEventListener('popstate',()=>{readURL();renderPeak();showMode(mode,false);});
  addEventListener('storage',e=>{if(e.key===STORE){try{progress=Learning.clean(JSON.parse(e.newValue));updateReviewOverview();}catch{}}});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateReviewOverview();});
  setInterval(()=>{if(!document.hidden)updateReviewOverview();},60000);
  renderPeak();showMode(mode,false);updateReviewOverview();
})();
