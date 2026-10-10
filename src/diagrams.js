/* SUMMIT — original illustrative mountain geometry.
 * Deliberately schematic: no DEM, scale, climbing routes, or route grades.
 * Both public functions return self-contained SVG strings.
 */
(function () {
  'use strict';

  const shapes = {
    everest: {
      crest: [[0,563],[85,522],[164,444],[245,469],[328,382],[424,286],[511,114],[574,181],[626,215],[696,339],[764,302],[847,407],[921,493],[1000,567]],
      snow: 358, seed: 2,
    },
    k2: {
      crest: [[0,566],[101,521],[175,479],[234,423],[295,412],[382,300],[461,185],[512,89],[557,151],[617,288],[665,351],[734,429],[811,451],[889,520],[1000,568]],
      snow: 342, seed: 5,
    },
    kangchenjunga: {
      crest: [[0,568],[69,529],[129,457],[217,249],[266,315],[341,176],[396,227],[487,103],[550,202],[614,147],[676,253],[737,206],[814,364],[867,428],[926,501],[1000,569]],
      snow: 360, seed: 9,
    },
    lhotse: {
      crest: [[0,567],[91,513],[185,456],[282,420],[355,278],[429,166],[466,211],[522,97],[575,163],[622,144],[669,302],[708,356],[785,421],[884,497],[1000,568]],
      snow: 333, seed: 13,
    },
    makalu: {
      crest: [[0,568],[95,526],[184,457],[241,413],[316,350],[379,277],[456,161],[506,91],[557,161],[622,238],[685,349],[764,397],[832,474],[922,520],[1000,568]],
      snow: 360, seed: 17,
    },
    'cho-oyu': {
      crest: [[0,569],[84,524],[168,449],[249,381],[304,259],[372,205],[416,153],[482,158],[535,135],[589,155],[638,225],[711,306],[786,412],[863,474],[937,526],[1000,568]],
      snow: 386, seed: 19,
    },
    dhaulagiri: {
      crest: [[0,568],[96,531],[176,461],[256,402],[316,341],[363,221],[397,105],[464,145],[526,169],[588,248],[659,294],[727,402],[803,455],[899,519],[1000,568]],
      snow: 362, seed: 23,
    },
    manaslu: {
      crest: [[0,568],[91,527],[164,471],[249,409],[339,326],[416,191],[465,136],[510,243],[562,99],[608,194],[663,297],[719,334],[792,430],[885,504],[1000,568]],
      snow: 355, seed: 29,
    },
    'nanga-parbat': {
      crest: [[0,568],[79,527],[141,485],[214,416],[290,304],[358,269],[425,207],[490,101],[550,156],[592,192],[651,327],[719,372],[790,461],[876,512],[1000,568]],
      snow: 346, seed: 31,
    },
    'annapurna-i': {
      crest: [[0,568],[73,522],[144,414],[202,335],[262,211],[306,268],[367,167],[415,207],[474,132],[522,114],[577,163],[632,226],[681,206],[743,319],[808,399],[896,504],[1000,568]],
      snow: 355, seed: 37,
    },
    'gasherbrum-i': {
      crest: [[0,568],[92,524],[182,452],[251,390],[323,251],[375,308],[447,225],[520,105],[561,172],[619,272],[686,343],[747,381],[818,457],[905,520],[1000,568]],
      snow: 347, seed: 41,
    },
    'broad-peak': {
      crest: [[0,568],[88,521],[166,438],[240,361],[307,223],[358,156],[415,201],[470,142],[523,153],[568,122],[619,188],[674,298],[747,359],[825,452],[911,519],[1000,568]],
      snow: 367, seed: 43,
    },
    'gasherbrum-ii': {
      crest: [[0,568],[94,525],[187,451],[275,424],[347,342],[419,232],[483,136],[526,94],[566,184],[625,279],[696,370],[766,401],[833,471],[920,527],[1000,568]],
      snow: 348, seed: 47,
    },
    shishapangma: {
      crest: [[0,568],[83,525],[172,465],[247,411],[309,308],[366,248],[423,157],[487,207],[547,125],[602,167],[658,244],[706,268],[766,362],[840,461],[918,518],[1000,568]],
      snow: 376, seed: 53,
    },
  };

  let serial = 0;
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const round = n => Math.round(n * 10) / 10;
  const pts = list => list.map(p => p.map(round).join(',')).join(' ');
  const path = list => 'M ' + list.map(p => p.map(round).join(' ')).join(' L ');

  function geometry(id) {
    const cfg = shapes[id] || shapes.everest;
    const peak = cfg.crest.reduce((p, q) => q[1] < p[1] ? q : p);
    const rows = [cfg.crest];
    for (let band = 1; band <= 3; band += 1) {
      const depth = [0, .38, .72, 1][band];
      rows.push(cfg.crest.map(([x, y], i) => {
        const edge = i === 0 || i === cfg.crest.length - 1;
        const spread = (x - peak[0]) * band * .092;
        const wobble = edge ? 0 : Math.sin(i * 1.81 + cfg.seed) * (band === 1 ? 20 : 13);
        return [x + spread + wobble, y + (593 - y) * depth + (band === 3 ? 0 : Math.cos(i * 2.3 + cfg.seed) * 9)];
      }));
    }
    const facets = [];
    for (let band = 0; band < 3; band += 1) {
      for (let i = 0; i < cfg.crest.length - 1; i += 1) {
        const a = rows[band][i], b = rows[band][i + 1], c = rows[band + 1][i], d = rows[band + 1][i + 1];
        if ((i + cfg.seed) % 2) {
          facets.push({points:[a,b,c], band, index:i*2}, {points:[b,d,c], band, index:i*2+1});
        } else {
          facets.push({points:[a,b,d], band, index:i*2}, {points:[a,d,c], band, index:i*2+1});
        }
      }
    }
    return {cfg, peak, rows, facets};
  }

  function facetMarkup(geo, icy, miniature) {
    const palettes = icy ? [
      ['#b9eef0','#8edbdf','#69bdcd','#d1f5ed','#4e9eb7','#97d8e0'],
      ['#3585a5','#256582','#397c9c','#194361','#236785','#4a91ac'],
    ] : [
      ['#20455e','#274c64','#315e73','#1d3b57','#2b5369','#254458'],
      ['#172c47','#1a334e','#102239','#20405a','#152f49','#1c3a50'],
    ];
    return geo.facets.filter(f => !miniature || f.band < 2).map(f => {
      const cx = f.points.reduce((sum, p) => sum + p[0], 0) / 3;
      const left = cx < geo.peak[0] + (f.band * 30);
      const swatch = (f.index * 3 + f.band * 2 + geo.cfg.seed) % 6;
      const fill = palettes[left ? 0 : 1][swatch];
      const opacity = icy ? 1 : [1,.85,.66][f.band];
      return `<polygon points="${pts(f.points)}" fill="${fill}" opacity="${opacity}"${miniature ? '' : ' stroke="#7dc9d8" stroke-opacity=".09" stroke-width=".85" stroke-linejoin="round"'}/>`;
    }).join('');
  }

  function mountainDrawing(m) {
    m = m || {};
    const id = Object.prototype.hasOwnProperty.call(shapes, m.id) ? m.id : 'everest';
    const ns = 'summit-' + id + '-' + (++serial);
    const geo = geometry(id);
    const {cfg, peak, rows} = geo;
    const outline = cfg.crest.concat([[1025,607],[-25,607]]);
    const snow = [[-50,0],[1050,0],[1050,cfg.snow]].concat(Array.from({length:15}, (_, i) => {
      const x = 1020 - i * 77;
      const y = cfg.snow + Math.sin(i * 1.73 + cfg.seed) * 28 + (i % 3 === 0 ? 26 : -9);
      return [x,y];
    })).concat([[-50,cfg.snow]]);
    const peaks = cfg.crest.map((p, i) => ({p,i})).filter(({p,i}) => i > 0 && i < cfg.crest.length-1 && p[1] < cfg.crest[i-1][1] && p[1] < cfg.crest[i+1][1]);
    const ridges = peaks.map(({p,i}) => {
      const primary = p === peak;
      const ridge = [p,rows[1][i],rows[2][i],rows[3][i]];
      return `<path d="${path(ridge)}" fill="none" stroke="${primary ? '#acf6f4' : '#73d5e2'}" stroke-width="${primary ? 1.9 : 1.3}" opacity="${primary ? .9 : .55}" stroke-linejoin="round"/>`;
    }).join('');
    const height = Number(m.height);
    const heightText = Number.isFinite(height) && height > 0 ? height.toLocaleString('ru-RU', {maximumFractionDigits:2}) + ' м' : '';
    const labelX = Math.min(peak[0] + 30, 818);
    const labelY = Math.max(43, peak[1] - 29);
    const title = (m.name || 'Горная вершина') + ' — учебный силуэт';
    const contours = [335,382,429,473,516,553].map((y, i) => `<path d="M -20 ${y+22} C 115 ${y-38} 207 ${y+32} 302 ${y-7} S 444 ${y-29} 514 ${y+5} S 656 ${y+27} 750 ${y-8} S 894 ${y-14} 1025 ${y+17}" fill="none" stroke="#7fdaea" stroke-width="${i%2 ? .8 : 1.1}" opacity="${i<3 ? .18 : .13}"/>`).join('');

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 630" role="img" aria-labelledby="${ns}-title ${ns}-desc" class="mountain-drawing" preserveAspectRatio="xMidYMid meet">
      <title id="${ns}-title">${esc(title)}</title>
      <desc id="${ns}-desc">Условная художественная форма горного массива со светлыми снежными гранями и бирюзовыми рёбрами. ${heightText ? 'Высота вершины над уровнем моря: ' + esc(heightText) + '. ' : ''}Это учебная иллюстрация, не топографическая модель и не схема маршрутов.</desc>
      <defs>
        <radialGradient id="${ns}-aura"><stop stop-color="#207287" stop-opacity=".3"/><stop offset=".55" stop-color="#17415c" stop-opacity=".12"/><stop offset="1" stop-color="#10243b" stop-opacity="0"/></radialGradient>
        <linearGradient id="${ns}-body" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#5187a0"/><stop offset=".6" stop-color="#233f5b"/><stop offset="1" stop-color="#102239"/></linearGradient>
        <linearGradient id="${ns}-mist" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#7edfeb" stop-opacity="0"/><stop offset=".6" stop-color="#63c9df" stop-opacity=".045"/><stop offset="1" stop-color="#101c2e" stop-opacity="0"/></linearGradient>
        <linearGradient id="${ns}-edge" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#50c3df" stop-opacity=".13"/><stop offset=".46" stop-color="#c6fff5" stop-opacity=".95"/><stop offset="1" stop-color="#43a9d2" stop-opacity=".25"/></linearGradient>
        <filter id="${ns}-glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3"/></filter>
        <clipPath id="${ns}-mass"><polygon points="${pts(outline)}"/></clipPath>
        <clipPath id="${ns}-snow"><polygon points="${pts(snow)}"/></clipPath>
      </defs>
      <ellipse cx="${peak[0]}" cy="275" rx="470" ry="305" fill="url(#${ns}-aura)"/>
      <g fill="none" stroke="#64bfd7" stroke-width="1" opacity=".075">
        <path d="M 76 68 V 580 M 244 48 V 600 M 412 48 V 610 M 580 48 V 610 M 748 48 V 600 M 916 68 V 580"/>
        <path d="M 44 158 H 954 M 28 275 H 972 M 18 392 H 982 M 16 509 H 984"/>
        <ellipse cx="500" cy="575" rx="446" ry="46"/><ellipse cx="500" cy="575" rx="327" ry="30"/>
      </g>
      <g fill="#5db9d0" opacity=".19">
        <path d="M 73 158 h 6 m -3 -3 v 6 M 913 275 h 6 m -3 -3 v 6 M 745 158 h 6 m -3 -3 v 6" fill="none" stroke="#68cddd" stroke-width="1.4"/>
        <circle cx="244" cy="275" r="2"/><circle cx="916" cy="392" r="2"/>
      </g>
      <path d="M 0 525 L 55 476 L 92 491 L 168 387 L 221 455 L 288 373 L 341 443 L 424 400 L 487 486 L 581 376 L 657 439 L 724 366 L 778 420 L 838 354 L 912 470 L 958 460 L 1000 533 V 593 H 0 Z" fill="#18344c" opacity=".48"/>
      <path d="M 0 557 L 83 498 L 164 526 L 222 462 L 299 504 L 376 442 L 459 528 L 571 467 L 673 520 L 774 431 L 862 507 L 920 481 L 1000 560 V 597 H 0 Z" fill="#1d4155" opacity=".42"/>
      <ellipse cx="500" cy="587" rx="425" ry="21" fill="#030911" opacity=".55"/>
      <g clip-path="url(#${ns}-mass)">
        <polygon points="${pts(outline)}" fill="url(#${ns}-body)"/>
        ${facetMarkup(geo,false,false)}
        <g clip-path="url(#${ns}-snow)">${facetMarkup(geo,true,false)}</g>
        ${contours}
        ${ridges}
        <path d="M 90 581 Q 280 542 411 568 T 789 565 T 1030 566" fill="none" stroke="#5fbed2" stroke-width="1" opacity=".15"/>
        <rect x="0" y="440" width="1000" height="150" fill="url(#${ns}-mist)"/>
      </g>
      <path d="${path(cfg.crest)}" fill="none" stroke="#6ce8ed" stroke-width="4.5" opacity=".17" filter="url(#${ns}-glow)" stroke-linejoin="round"/>
      <path d="${path(cfg.crest)}" fill="none" stroke="url(#${ns}-edge)" stroke-width="1.75" stroke-linejoin="round"/>
      <path d="M 0 585 L 73 561 L 148 567 L 232 544 L 331 575 L 425 567 L 524 588 L 636 563 L 717 577 L 801 550 L 883 570 L 952 564 L 1000 586 V 630 H 0 Z" fill="#0b1727" opacity=".88"/>
      <path d="M 33 590 Q 180 572 306 589 T 562 591 T 820 588 T 963 593" fill="none" stroke="#416880" stroke-width=".9" opacity=".28"/>
      ${heightText ? `<g fill="none" stroke="#bcfff4"><path d="M ${peak[0]} ${peak[1]-9} V ${labelY+3} H ${labelX-12}" stroke-width="1" opacity=".5"/><circle cx="${peak[0]}" cy="${peak[1]}" r="10" stroke-width="1" opacity=".3"/><circle cx="${peak[0]}" cy="${peak[1]}" r="4" fill="#d5fff5" stroke="none"/></g><text x="${labelX}" y="${labelY+10}" fill="#c7f8ef" font-family="ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" font-size="32" font-weight="650" letter-spacing=".5">${esc(heightText)}</text>` : ''}
    </svg>`;
  }

  function mountainMini(id) {
    id = Object.prototype.hasOwnProperty.call(shapes,id) ? id : 'everest';
    const ns = 'summit-mini-' + id + '-' + (++serial);
    const geo = geometry(id);
    const outline = geo.cfg.crest.concat([[1020,594],[-20,594]]);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" aria-hidden="true" focusable="false" class="mountain-mini" preserveAspectRatio="xMidYMid meet">
      <defs><clipPath id="${ns}-clip"><polygon points="${pts(outline)}"/></clipPath><linearGradient id="${ns}-fade" x1="0" y1="0" x2="0" y2="1"><stop offset=".5" stop-color="#10243b" stop-opacity="0"/><stop offset="1" stop-color="#10243b" stop-opacity=".93"/></linearGradient></defs>
      <g transform="translate(0,-1) scale(.2,.167)">
        <g clip-path="url(#${ns}-clip)"><polygon points="${pts(outline)}" fill="#18394f"/>${facetMarkup(geo,true,true)}<rect x="0" y="0" width="1000" height="610" fill="url(#${ns}-fade)"/></g>
        <path d="${path(geo.cfg.crest)}" fill="none" stroke="#92eceb" stroke-opacity=".8" stroke-width="4" stroke-linejoin="round"/>
      </g>
    </svg>`;
  }

  // Plain script globals, without requiring an import or a build system.
  globalThis.mountainDrawing = mountainDrawing;
  globalThis.mountainMini = mountainMini;
})();
