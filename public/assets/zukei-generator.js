// =====================================================
// うちトレ 図形ジェネレーター v3（完全新規）
// =====================================================

const FILL   = '#dbeafe';
const STROKE = '#1e40af';

function rand(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

// ────────────────────────────────────────────────────
// SVGユーティリティ
// ────────────────────────────────────────────────────
function mksvg(w, h, inner) {
  return `<svg width="${w}" height="${h}" viewBox="-10 -10 ${w+20} ${h+20}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}

// 寸法ラベル付き補助線
function dimLabel(x1, y1, x2, y2, label) {
  const mx = (x1+x2)/2, my = (y1+y2)/2;
  const dx = -(y2-y1), dy = x2-x1;
  const len = Math.sqrt(dx*dx+dy*dy) || 1;
  const ox = dx/len*14, oy = dy/len*14;
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3,2"/>
<text x="${mx+ox}" y="${my+oy}" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#1e40af" font-weight="700">${label}</text>`;
}

// 垂線＋高さラベル
function hLabel(x, y1, y2, label, side=1) {
  const tx = x + side*16;
  return `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="#64748b" stroke-width="1" stroke-dasharray="3,2"/>
<line x1="${x-4}" y1="${y1}" x2="${x+4}" y2="${y1}" stroke="#64748b" stroke-width="1.5"/>
<line x1="${x-4}" y1="${y2}" x2="${x+4}" y2="${y2}" stroke="#64748b" stroke-width="1.5"/>
<text x="${tx}" y="${(y1+y2)/2}" dominant-baseline="central" text-anchor="${side>0?'start':'end'}" font-size="12" fill="#1e40af" font-weight="700">${label}</text>`;
}

// ────────────────────────────────────────────────────
// 図形SVG生成
// ────────────────────────────────────────────────────

// 長方形（縦横比を反映）
function drawRect(wcm, hcm) {
  const MAX=110, x=16, y=14;
  const ratio = wcm / hcm;
  let W, H;
  if (ratio >= 1) { W = MAX; H = Math.max(Math.round(MAX / ratio), 35); }
  else            { H = MAX; W = Math.max(Math.round(MAX * ratio), 35); }
  const svgW = W + 55, svgH = H + 48;
  return mksvg(svgW, svgH,
    `<rect x="${x}" y="${y}" width="${W}" height="${H}" fill="${FILL}" stroke="${STROKE}" stroke-width="2.5"/>` +
    dimLabel(x, y+H+13, x+W, y+H+13, wcm+'cm') +
    hLabel(x+W+13, y, y+H, hcm+'cm')
  );
}

// 正方形
function drawSquare(scm) {
  return drawRect(scm, scm);
}

// 三角形（4バリエーション）
function drawTriangle(basecm, hcm, variant) {
  const BW=115, H=85, bx=22, by=115;
  let pts, apexX;
  if      (variant===0) { apexX=bx;        } // 直角（左）
  else if (variant===1) { apexX=bx+BW/2;   } // 二等辺
  else if (variant===2) { apexX=bx-20;     } // 鈍角
  else                  { apexX=bx+BW*0.7; } // 鋭角右寄り
  const apexY = by - H;
  pts = `${bx},${by} ${bx+BW},${by} ${apexX},${apexY}`;
  // 底辺への垂足
  const footX = Math.max(bx-25, Math.min(bx+BW, apexX));
  const side = apexX > bx+BW/2 ? -1 : 1;
  return mksvg(185, 148,
    `<polygon points="${pts}" fill="${FILL}" stroke="${STROKE}" stroke-width="2.5"/>` +
    dimLabel(bx, by+13, bx+BW, by+13, basecm+'cm') +
    `<line x1="${footX}" y1="${by}" x2="${apexX}" y2="${apexY}" stroke="#64748b" stroke-width="1" stroke-dasharray="3,2"/>` +
    `<line x1="${footX-4}" y1="${by}" x2="${footX+4}" y2="${by}" stroke="#64748b" stroke-width="1.5"/>` +
    `<line x1="${footX-4}" y1="${apexY}" x2="${footX+4}" y2="${apexY}" stroke="#64748b" stroke-width="1.5"/>` +
    `<text x="${apexX+side*16}" y="${(by+apexY)/2}" dominant-baseline="central" text-anchor="${side>0?'start':'end'}" font-size="12" fill="#1e40af" font-weight="700">${hcm}cm</text>`
  );
}

// 平行四辺形
function drawParallel(basecm, hcm) {
  const sh=26, bx=16, by=14, W=112, H=82;
  return mksvg(178, 134,
    `<polygon points="${bx+sh},${by} ${bx+sh+W},${by} ${bx+W},${by+H} ${bx},${by+H}" fill="${FILL}" stroke="${STROKE}" stroke-width="2.5"/>` +
    dimLabel(bx, by+H+13, bx+W, by+H+13, basecm+'cm') +
    hLabel(bx+W+14, by, by+H, hcm+'cm')
  );
}

// ひし形
function drawRhombus(d1cm, d2cm) {
  const cx=82, cy=62, rx=56, ry=42;
  return mksvg(175, 132,
    `<polygon points="${cx},${cy-ry} ${cx+rx},${cy} ${cx},${cy+ry} ${cx-rx},${cy}" fill="${FILL}" stroke="${STROKE}" stroke-width="2.5"/>` +
    `<line x1="${cx-rx}" y1="${cy}" x2="${cx+rx}" y2="${cy}" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3,2"/>` +
    `<line x1="${cx}" y1="${cy-ry}" x2="${cx}" y2="${cy+ry}" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3,2"/>` +
    `<text x="${cx}" y="${cy+ry+14}" text-anchor="middle" font-size="12" fill="#1e40af" font-weight="700">${d1cm}cm</text>` +
    `<text x="${cx+rx+13}" y="${cy}" dominant-baseline="central" font-size="12" fill="#1e40af" font-weight="700">${d2cm}cm</text>`
  );
}

// 台形（上底・下底・高さ）
function drawTrapezoid(topcm, botcm, hcm) {
  const bx=14, by=14, H=82, botW=118;
  const topW = botW * (topcm/botcm);
  const off  = (botW-topW)/2;
  return mksvg(182, 136,
    `<polygon points="${bx+off},${by} ${bx+off+topW},${by} ${bx+botW},${by+H} ${bx},${by+H}" fill="${FILL}" stroke="${STROKE}" stroke-width="2.5"/>` +
    dimLabel(bx, by+H+13, bx+botW, by+H+13, botcm+'cm') +
    dimLabel(bx+off, by-13, bx+off+topW, by-13, topcm+'cm') +
    hLabel(bx+botW+15, by, by+H, hcm+'cm')
  );
}

// 円
function drawCircle(rcm) {
  const cx=85, cy=68, R=56;
  return mksvg(175, 148,
    `<circle cx="${cx}" cy="${cy}" r="${R}" fill="${FILL}" stroke="${STROKE}" stroke-width="2.5"/>` +
    `<line x1="${cx}" y1="${cy}" x2="${cx+R}" y2="${cy}" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4,2"/>` +
    `<text x="${cx+R/2}" y="${cy-9}" text-anchor="middle" font-size="12" fill="#1e40af" font-weight="700">${rcm}cm</text>` +
    `<text x="${cx}" y="${cy+R+14}" text-anchor="middle" font-size="11" fill="#64748b">（半径）</text>`
  );
}

// おうぎ形（割り切れる角度のみ）
function drawSector(rcm, angle) {
  const cx=88, cy=90, R=68;
  const rad = angle * Math.PI / 180;
  const x2  = cx + R*Math.cos(rad);
  const y2  = cy - R*Math.sin(rad);  // SVGはy軸反転なし → +sin で下
  // 上方向（-π/2）から時計回りに描く
  const startRad = -Math.PI/2;
  const endRad   = startRad + angle*Math.PI/180;
  const ex = cx + R*Math.cos(endRad);
  const ey = cy + R*Math.sin(endRad);
  const sx = cx + R*Math.cos(startRad);
  const sy = cy + R*Math.sin(startRad);
  const lg = angle > 180 ? 1 : 0;
  const midRad = startRad + angle*Math.PI/180/2;
  const tx = cx + R*0.45*Math.cos(midRad);
  const ty = cy + R*0.45*Math.sin(midRad);
  return mksvg(188, 168,
    `<path d="M${cx},${cy} L${sx},${sy} A${R},${R} 0 ${lg} 1 ${ex},${ey} Z" fill="${FILL}" stroke="${STROKE}" stroke-width="2.5"/>` +
    `<text x="${(cx+sx)/2+8}" y="${(cy+sy)/2}" text-anchor="start" dominant-baseline="central" font-size="12" fill="#1e40af" font-weight="700">${rcm}cm</text>` +
    `<text x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="central" font-size="13" fill="#1e40af" font-weight="900">${angle}°</text>`
  );
}

// 直方体
function drawCuboid(wcm, dcm, hcm) {
  const x=22, y=22, W=92, D=30, H=80;
  return mksvg(178, 162,
    `<polygon points="${x},${y+D} ${x+W},${y+D} ${x+W},${y+D+H} ${x},${y+D+H}" fill="${FILL}" stroke="${STROKE}" stroke-width="2"/>` +
    `<polygon points="${x},${y+D} ${x+D},${y} ${x+W+D},${y} ${x+W},${y+D}" fill="#eff6ff" stroke="${STROKE}" stroke-width="2"/>` +
    `<polygon points="${x+W},${y+D} ${x+W+D},${y} ${x+W+D},${y+H} ${x+W},${y+D+H}" fill="#dbeafe" stroke="${STROKE}" stroke-width="2"/>` +
    dimLabel(x, y+D+H+14, x+W, y+D+H+14, wcm+'cm') +
    `<text x="${x+W+D+11}" y="${y+H/2+D/2}" dominant-baseline="central" font-size="12" fill="#1e40af" font-weight="700">${dcm}cm</text>` +
    `<text x="${x-12}" y="${y+D+H/2}" text-anchor="middle" dominant-baseline="central" font-size="12" fill="#1e40af" font-weight="700">${hcm}cm</text>`
  );
}

// 円柱
function drawCylinder(rcm, hcm) {
  const cx=86, y=18, rx=56, ry=14, H=95;
  return mksvg(178, 160,
    `<rect x="${cx-rx}" y="${y+ry}" width="${rx*2}" height="${H}" fill="${FILL}" stroke="${STROKE}" stroke-width="2"/>` +
    `<ellipse cx="${cx}" cy="${y+ry+H}" rx="${rx}" ry="${ry}" fill="${FILL}" stroke="${STROKE}" stroke-width="2"/>` +
    `<ellipse cx="${cx}" cy="${y+ry}" rx="${rx}" ry="${ry}" fill="#eff6ff" stroke="${STROKE}" stroke-width="2"/>` +
    `<line x1="${cx}" y1="${y+ry}" x2="${cx+rx}" y2="${y+ry}" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4,2"/>` +
    `<text x="${cx+rx/2}" y="${y+ry-10}" text-anchor="middle" font-size="12" fill="#1e40af" font-weight="700">${rcm}cm</text>` +
    hLabel(cx+rx+14, y+ry, y+ry+H, hcm+'cm')
  );
}

// ────────────────────────────────────────────────────
// 問題生成
// ────────────────────────────────────────────────────
function makeProb(pageType) {
  const pools = {
    menseki:        ['rect','square','triangle','triangle','parallel','rhombus','trapezoid'],
    enshuu_menseki: ['circle','circle','sector','sector'],
    taieki:         ['cuboid'],
    entai:          ['cylinder'],
  };
  const pool = pools[pageType] || pools.menseki;
  const type = pool[rand(0, pool.length-1)];
  const a = rand(3,13), b = rand(3,13);

  if (type==='rect') {
    return { svg:drawRect(a,b), q:'長方形の面積を求めなさい。', formula:'たて × よこ', ans:a*b+'cm²' };
  }
  if (type==='square') {
    return { svg:drawSquare(a), q:'正方形の面積を求めなさい。', formula:'一辺 × 一辺', ans:a*a+'cm²' };
  }
  if (type==='triangle') {
    const v=rand(0,3);
    return { svg:drawTriangle(a,b,v), q:'三角形の面積を求めなさい。', formula:'底辺 × 高さ ÷ 2', ans:(a*b/2)+'cm²' };
  }
  if (type==='parallel') {
    return { svg:drawParallel(a,b), q:'平行四辺形の面積を求めなさい。', formula:'底辺 × 高さ', ans:a*b+'cm²' };
  }
  if (type==='rhombus') {
    return { svg:drawRhombus(a,b), q:'ひし形の面積を求めなさい。', formula:'対角線 × 対角線 ÷ 2', ans:(a*b/2)+'cm²' };
  }
  if (type==='trapezoid') {
    const top=rand(3,9), bot=rand(top+2,13), h=rand(3,9);
    return { svg:drawTrapezoid(top,bot,h), q:'台形の面積を求めなさい。', formula:'（上底 + 下底）× 高さ ÷ 2', ans:((top+bot)*h/2)+'cm²' };
  }
  if (type==='circle') {
    const r=rand(2,9);
    return { svg:drawCircle(r), q:'円の面積（π≒3.14）を求めなさい。', formula:'半径 × 半径 × 3.14', ans:(r*r*3.14)+'cm²' };
  }
  if (type==='sector') {
    const r=rand(3,9);
    // angle÷360 が割り切れる角度のみ（循環小数を防ぐ）
    const angles=[36,45,72,90,108,144,180,216,252,288,324];
    const angle=angles[rand(0,angles.length-1)];
    return { svg:drawSector(r,angle), q:'おうぎ形の面積（π≒3.14）を求めなさい。', formula:'半径 × 半径 × 3.14 × 中心角 ÷ 360', ans:(r*r*3.14*(angle/360))+'cm²' };
  }
  if (type==='cuboid') {
    const w=rand(2,11), d=rand(2,9), h=rand(2,11);
    return { svg:drawCuboid(w,d,h), q:'直方体の体積を求めなさい。', formula:'たて × よこ × 高さ', ans:(w*d*h)+'cm³' };
  }
  if (type==='cylinder') {
    const r=rand(2,8), h=rand(3,12);
    return { svg:drawCylinder(r,h), q:'円柱の体積（π≒3.14）を求めなさい。', formula:'半径 × 半径 × 3.14 × 高さ', ans:(r*r*3.14*h)+'cm³' };
  }
  return makeProb('menseki');
}

// ────────────────────────────────────────────────────
// HTML生成・表示
// ────────────────────────────────────────────────────
function probHTML(num, prob) {
  return `<div class="zukei-item">
  <div class="zukei-header"><span class="zukei-num">（${num}）</span><span class="zukei-q">${prob.q}</span></div>
  <div class="zukei-formula-hint">公式：${prob.formula}</div>
  <div class="zukei-shape">${prob.svg}</div>
  <div class="zukei-ans-row"><span class="zukei-ans-label">答え</span><span class="zukei-blank-long"></span></div>
</div>`;
}

function wrapPage(page) {
  const w = document.createElement('div'); w.className = 'page-preview-wrap';
  const b = document.createElement('div'); b.className = 'page-scale-box';
  b.appendChild(page); w.appendChild(b); return w;
}

function buildAnswerPage(answers, count, title) {
  const w = document.createElement('div'); w.className = 'page-preview-wrap';
  const b = document.createElement('div'); b.className = 'page-scale-box';
  const p = document.createElement('div'); p.className = 'zukei-page answer-page';
  const t = document.createElement('div'); t.className = 'zukei-page-title';
  t.textContent = title + '\u3000答え'; p.appendChild(t);
  for (let pg=1; pg<=count; pg++) {
    const items = answers.filter(a => a.pageNo===pg);
    if (!items.length) continue;
    const sec  = document.createElement('div'); sec.className  = 'answer-section';
    if (count>1) {
      const lbl = document.createElement('div'); lbl.className = 'answer-page-label';
      lbl.textContent = pg+'枚目'; sec.appendChild(lbl);
    }
    const grid = document.createElement('div'); grid.className = 'answer-grid';
    items.forEach(({num,label}) => {
      const i = document.createElement('div'); i.className = 'answer-item';
      i.innerHTML = `<span class="answer-num">（${num}）</span><span class="answer-val">${label}</span>`;
      grid.appendChild(i);
    });
    sec.appendChild(grid); p.appendChild(sec);
  }
  b.appendChild(p); w.appendChild(b); return w;
}

function applyMobilePageScaling() {
  document.querySelectorAll('.page-preview-wrap').forEach(wrap => {
    const box  = wrap.querySelector('.page-scale-box');
    const page = wrap.querySelector('.zukei-page');
    if (!box||!page) return;
    const W=page.scrollWidth, H=page.scrollHeight;
    if (!W||!H) return;
    if (window.innerWidth>640 || window.matchMedia('print').matches) {
      box.style.width=W+'px'; box.style.height=H+'px'; return;
    }
    const avail = Math.max(wrap.clientWidth-8, 0);
    if (!avail) return;
    const sc = Math.min(1, avail/W);
    wrap.classList.add('scaled');
    box.style.width=W*sc+'px'; box.style.height=H*sc+'px';
    page.style.transform='scale('+sc+')';
  });
}

async function downloadPDF() {
  const pages = document.querySelectorAll('.zukei-page');
  if (!pages.length) { alert('先に生成してください'); return; }
  if (!window.html2canvas||!window.jspdf) { alert('ライブラリ読み込み失敗。'); return; }
  const {jsPDF} = window.jspdf;
  const pdf = new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  for (let i=0; i<pages.length; i++) {
    const c = await html2canvas(pages[i],{scale:2,useCORS:true});
    if (i>0) pdf.addPage();
    pdf.addImage(c.toDataURL('image/png'),'PNG',0,0,210,297);
  }
  pdf.save('zukei.pdf');
}

function generate() {
  const pageType  = document.getElementById('mode')?.value || 'menseki';
  const count     = parseInt(document.getElementById('count').value);
  const container = document.getElementById('pages');
  container.innerHTML = '';
  const titles = {
    menseki:'図形の面積', enshuu_menseki:'円の面積',
    taieki:'体積（直方体・立方体）', entai:'円柱の体積'
  };
  const title   = titles[pageType] || '図形';
  const answers = [];
  for (let p=0; p<count; p++) {
    const page = document.createElement('div'); page.className='zukei-page';
    const t    = document.createElement('div'); t.className='zukei-page-title'; t.textContent=title; page.appendChild(t);
    const grid = document.createElement('div'); grid.className='zukei-grid';
    for (let n=1; n<=4; n++) {
      const prob = makeProb(pageType);
      grid.innerHTML += probHTML(n, prob);
      answers.push({pageNo:p+1, num:n, label:prob.ans});
    }
    page.appendChild(grid);
    container.appendChild(wrapPage(page));
  }
  container.appendChild(buildAnswerPage(answers, count, title));
  applyMobilePageScaling();
}

window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const mode   = params.get('mode');
  if (mode) { const el=document.getElementById('mode'); if(el) el.value=mode; }
  document.getElementById('mode')?.addEventListener('change', generate);
  document.getElementById('count')?.addEventListener('change', generate);
  generate();
  let t;
  window.addEventListener('resize', ()=>{ clearTimeout(t); t=setTimeout(applyMobilePageScaling,80); });
  window.addEventListener('beforeprint', applyMobilePageScaling);
  window.addEventListener('afterprint',  applyMobilePageScaling);
});
