
// ===== 共通ユーティリティ（generator.jsと同等） =====
function wrapPageForPreview(page){
  const wrapper = document.createElement('div');
  wrapper.className = 'page-preview';
  const scaleBox = document.createElement('div');
  scaleBox.className = 'page-scale-box';
  scaleBox.appendChild(page);
  wrapper.appendChild(scaleBox);
  return wrapper;
}

function applyMobilePageScaling(){
  const wrappers = document.querySelectorAll('.page-preview');
  wrappers.forEach((wrapper) => {
    const scaleBox = wrapper.querySelector('.page-scale-box');
    const page     = wrapper.querySelector('.page');
    if(!scaleBox || !page) return;
    wrapper.classList.remove('is-scaled');
    scaleBox.style.width = '';
    scaleBox.style.height = '';
    page.style.transform = '';
    const pageWidth  = page.offsetWidth;
    const pageHeight = page.offsetHeight;
    if(!pageWidth || !pageHeight) return;
    if(window.innerWidth > 640 || window.matchMedia('print').matches){
      scaleBox.style.width  = pageWidth  + 'px';
      scaleBox.style.height = pageHeight + 'px';
      return;
    }
    const availableWidth = Math.max(wrapper.clientWidth - 8, 0);
    if(!availableWidth) return;
    const scale = Math.min(1, availableWidth / pageWidth);
    wrapper.classList.add('is-scaled');
    scaleBox.style.width  = (pageWidth  * scale) + 'px';
    scaleBox.style.height = (pageHeight * scale) + 'px';
    page.style.transform  = `scale(${scale})`;
  });
}

async function downloadPDF(){
  const pageNodes = document.querySelectorAll('.page');
  if(!pageNodes.length){
    alert('先に「生成」を押して問題を作成してください。');
    return;
  }
  if(!window.html2canvas || !window.jspdf){
    alert('PDF保存ライブラリの読み込みに失敗しました。');
    return;
  }
  const { jsPDF } = window.jspdf;
  const pageType  = document.body.dataset.pageType || 'fraction';
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  for(let i = 0; i < pageNodes.length; i++){
    const canvas = await html2canvas(pageNodes[i], { scale: 2, useCORS: true });
    const img    = canvas.toDataURL('image/png');
    if(i > 0) pdf.addPage();
    pdf.addImage(img, 'PNG', 0, 0, 210, 297);
  }
  const filename = pageType === 'fraction' ? 'bunsu.pdf' : 'shosuu.pdf';
  pdf.save(filename);
}

// ===== 数学ユーティリティ =====
function rand(min, max){
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function gcd(a, b){
  a = Math.abs(a); b = Math.abs(b);
  while(b){ const t = b; b = a % b; a = t; }
  return a || 1;
}

function lcm(a, b){ return Math.abs(a / gcd(a, b) * b); }

function simplify(num, den){
  if(num === 0) return [0, 1];
  const g = gcd(Math.abs(num), Math.abs(den));
  return [num / g, den / g];
}

const MAX_ATTEMPTS = 3000;

// ===== 分数問題生成 =====
function randFrac(maxDen){
  const den = rand(2, maxDen);
  const num = rand(1, den - 1);
  return [num, den];
}

function makeFractionProblem(op, maxDen, sameDenom){
  for(let i = 0; i < MAX_ATTEMPTS; i++){
    const [n1, d1] = randFrac(maxDen);
    let n2, d2;

    if(sameDenom && (op === 'add' || op === 'sub')){
      d2 = d1;
      n2 = rand(1, d1 - 1);
    } else {
      [n2, d2] = randFrac(maxDen);
    }

    if(op === 'add'){
      const d = lcm(d1, d2);
      if(d > 60) continue;
      return { n1, d1, n2, d2 };
    }

    if(op === 'sub'){
      // n1/d1 > n2/d2 になることを保証
      if(n1 * d2 <= n2 * d1) continue;
      const d = lcm(d1, d2);
      if(d > 60) continue;
      return { n1, d1, n2, d2 };
    }

    if(op === 'mul'){
      const [rn, rd] = simplify(n1 * n2, d1 * d2);
      if(rd <= maxDen && rn > 0) return { n1, d1, n2, d2 };
    }

    if(op === 'div'){
      if(n1 === 0 || n2 === 0) continue;
      const [rn, rd] = simplify(n1 * d2, d1 * n2);
      if(rd <= maxDen && rn > 0) return { n1, d1, n2, d2 };
    }
  }
  // フォールバック
  return { n1: 1, d1: 2, n2: 1, d2: 3 };
}

// ===== 小数問題生成 =====
function fmtDec(n, places){
  // 浮動小数点の表示誤差を避ける
  const rounded = Math.round(n * Math.pow(10, places)) / Math.pow(10, places);
  return parseFloat(rounded.toFixed(places)).toString();
}

function makeDecimalProblem(op, decPlaces){
  const factor = Math.pow(10, decPlaces);
  const maxA   = 9 * factor;

  for(let i = 0; i < MAX_ATTEMPTS; i++){
    if(op === 'add'){
      const ai = rand(decPlaces === 1 ? 2 : 2, maxA - 1);
      const bi = rand(1, maxA - 1);
      if(ai + bi <= maxA * 1.5) return { a: ai / factor, b: bi / factor };
    }

    if(op === 'sub'){
      const ai = rand(Math.ceil(factor * 1.1), maxA);
      const bi = rand(1, ai - 1);
      if(ai !== bi) return { a: ai / factor, b: bi / factor };
    }

    if(op === 'mul'){
      // 小数 × 整数（小学生向け）
      const ai = rand(2, maxA - 1);
      const b  = rand(2, 9);
      const result = ai * b;
      if(result < 1000 * factor) return { a: ai / factor, b };
    }

    if(op === 'div'){
      // 小数 ÷ 整数 = ぴったり割り切れる
      const quotient = rand(2, maxA - 1);
      const divisor  = rand(2, 9);
      const dividend = quotient * divisor;
      if(dividend / factor < 90) return { a: dividend / factor, b: divisor };
    }
  }
  // フォールバック
  if(op === 'div') return { a: 1.2, b: 4 };
  return { a: 1.2, b: 0.5 };
}

// ===== HTML レンダラー =====
function fracHTML(num, den){
  return `<span class="frac"><span class="frac-num">${num}</span><span class="frac-den">${den}</span></span>`;
}

function opSym(op){
  return { add:'＋', sub:'－', mul:'×', div:'÷' }[op] || op;
}

function fracProblemHTML(i, prob, op){
  return `
    <div class="problem-frac-item">
      <span class="prob-num-label">(${i})</span>
      <span class="prob-frac-expr">
        ${fracHTML(prob.n1, prob.d1)}
        <span class="prob-op">${opSym(op)}</span>
        ${fracHTML(prob.n2, prob.d2)}
        <span class="prob-eq">＝</span>
        <span class="prob-blank-line"></span>
      </span>
    </div>`;
}

function decProblemHTML(i, prob, op){
  const decPlaces = parseInt(document.getElementById('dec-places').value);
  const fa = fmtDec(prob.a, decPlaces);
  const fb = Number.isInteger(prob.b) ? prob.b.toString() : fmtDec(prob.b, decPlaces);
  return `
    <div class="problem-frac-item">
      <span class="prob-num-label">(${i})</span>
      <span class="prob-frac-expr">
        <span class="prob-dec-num">${fa}</span>
        <span class="prob-op">${opSym(op)}</span>
        <span class="prob-dec-num">${fb}</span>
        <span class="prob-eq">＝</span>
        <span class="prob-blank-line"></span>
      </span>
    </div>`;
}

// ===== 重複チェック付き生成 =====
function uniqueProblem(usedKeys, fn, args){
  for(let t = 0; t < 300; t++){
    const r = fn(...args);
    const k = JSON.stringify(r);
    if(!usedKeys.has(k)){ usedKeys.add(k); return r; }
  }
  return fn(...args);
}

// ===== メイン生成関数 =====
function generate(){
  const pageType = document.body.dataset.pageType || 'fraction';
  const op       = document.getElementById('op').value;
  const count    = parseInt(document.getElementById('count').value);
  const container = document.getElementById('pages');
  container.innerHTML = '';

  for(let p = 0; p < count; p++){
    const usedKeys = new Set();
    const page = document.createElement('div');
    page.className = 'page page-horizontal';
    const grid = document.createElement('div');
    grid.className = 'problem-frac-grid';

    for(let i = 1; i <= 20; i++){
      if(pageType === 'fraction'){
        const maxDen    = parseInt(document.getElementById('max-den').value);
        const sameDenom = document.getElementById('same-denom').value === 'same';
        const prob = uniqueProblem(usedKeys, makeFractionProblem, [op, maxDen, sameDenom]);
        grid.innerHTML += fracProblemHTML(i, prob, op);
      } else {
        const decPlaces = parseInt(document.getElementById('dec-places').value);
        const prob = uniqueProblem(usedKeys, makeDecimalProblem, [op, decPlaces]);
        grid.innerHTML += decProblemHTML(i, prob, op);
      }
    }

    page.appendChild(grid);
    container.appendChild(wrapPageForPreview(page));
  }

  // 足し算・引き算のみ同分母オプションを表示
  const sameDomWrap = document.getElementById('same-denom-wrap');
  if(sameDomWrap){
    sameDomWrap.style.display = (op === 'add' || op === 'sub') ? '' : 'none';
  }

  applyMobilePageScaling();
}

// ===== 初期化 =====
window.addEventListener('DOMContentLoaded', () => {
  // 演算切替で同分母オプションの表示を更新
  document.getElementById('op')?.addEventListener('change', () => {
    const op = document.getElementById('op').value;
    const sameDomWrap = document.getElementById('same-denom-wrap');
    if(sameDomWrap){
      sameDomWrap.style.display = (op === 'add' || op === 'sub') ? '' : 'none';
    }
    generate();
  });

  document.getElementById('max-den')?.addEventListener('change', generate);
  document.getElementById('same-denom')?.addEventListener('change', generate);
  document.getElementById('dec-places')?.addEventListener('change', generate);
  document.getElementById('count')?.addEventListener('change', generate);

  // 初期の同分母オプション表示
  const op = document.getElementById('op')?.value || 'add';
  const sameDomWrap = document.getElementById('same-denom-wrap');
  if(sameDomWrap){
    sameDomWrap.style.display = (op === 'add' || op === 'sub') ? '' : 'none';
  }

  generate();

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(applyMobilePageScaling, 80);
  });
  window.addEventListener('beforeprint', applyMobilePageScaling);
  window.addEventListener('afterprint', applyMobilePageScaling);
});
