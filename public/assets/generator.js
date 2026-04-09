
function rand(min, max){
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeNumber(d){
  let min = Math.pow(10, d - 1);
  let max = Math.pow(10, d) - 1;
  if(d === 1){
    min = 1;
    max = 9;
  }
  return rand(min, max);
}

function hasCarry(a, b){
  const sa = a.toString().split('').reverse();
  const sb = b.toString().split('').reverse();
  const len = Math.max(sa.length, sb.length);
  for(let i = 0; i < len; i++){
    const da = parseInt(sa[i] || 0, 10);
    const db = parseInt(sb[i] || 0, 10);
    if(da + db >= 10) return true;
  }
  return false;
}

function hasBorrow(a, b){
  const sa = a.toString().split('').reverse();
  const sb = b.toString().split('').reverse();
  let borrow = 0;
  const len = Math.max(sa.length, sb.length);
  for(let i = 0; i < len; i++){
    let da = parseInt(sa[i] || 0, 10) - borrow;
    const db = parseInt(sb[i] || 0, 10);
    if(da < db){
      return true;
    }
    borrow = 0;
  }
  return false;
}

const MAX_GENERATION_ATTEMPTS = 5000;

function makeAdditionProblem(d1, d2){
  for(let i = 0; i < MAX_GENERATION_ATTEMPTS; i++) {
    const a = makeNumber(d1);
    const b = makeNumber(d2);
    if(hasCarry(a, b)) return [a, b];
  }
  return [makeNumber(d1), makeNumber(d2)];
}

function normalizeSubtractionDigits(d1, d2){
  let topDigits = d1;
  let bottomDigits = d2;

  if(topDigits < bottomDigits){
    topDigits = bottomDigits;
  }
  if(topDigits === 1 && bottomDigits === 1){
    topDigits = 2;
    bottomDigits = 1;
  }
  return { topDigits, bottomDigits };
}

function makeSubtractionProblem(d1, d2){
  const { topDigits, bottomDigits } = normalizeSubtractionDigits(d1, d2);

  for(let i = 0; i < MAX_GENERATION_ATTEMPTS; i++) {
    const a = makeNumber(topDigits);
    const b = makeNumber(bottomDigits);
    if(a > b && hasBorrow(a, b)) return [a, b];
  }

  for(let i = 0; i < MAX_GENERATION_ATTEMPTS; i++) {
    const a = makeNumber(topDigits);
    const b = makeNumber(bottomDigits);
    if(a > b) return [a, b];
  }

  return [makeNumber(Math.max(2, topDigits)), makeNumber(1)];
}

function makeMultiplicationProblem(d1, d2){
  return [makeNumber(d1), makeNumber(d2)];
}

// --- 割り算 ---
// d1=被除数の桁数, d2=除数の桁数
// remainderMode: 'exact'=割り切れる, 'remainder'=あまりあり, 'both'=両方混在
function makeDivisionProblem(d1, d2, remainderMode){
  const mode = remainderMode || 'exact';

  const dividendDigits = Math.max(d1, d2);
  const divisorDigits  = d2;
  const dividendMin = dividendDigits === 1 ? 1 : Math.pow(10, dividendDigits - 1);
  const dividendMax = Math.pow(10, dividendDigits) - 1;

  for(let i = 0; i < MAX_GENERATION_ATTEMPTS; i++){
    const divisor = makeNumber(divisorDigits);
    if(divisor === 0) continue;

    if(mode === 'exact'){
      const qMin = Math.max(Math.ceil(dividendMin / divisor), 2);
      const qMax = Math.floor(dividendMax / divisor);
      if(qMin > qMax) continue;
      const quotient = rand(qMin, qMax);
      const dividend = divisor * quotient;
      if(dividend >= dividendMin && dividend <= dividendMax && quotient >= 2) return [dividend, divisor, 0];

    } else if(mode === 'remainder'){
      const qMin = Math.max(Math.ceil(dividendMin / divisor), 2);
      const qMax = Math.floor((dividendMax - 1) / divisor);
      if(qMin > qMax) continue;
      const quotient = rand(qMin, qMax);
      const rem = rand(1, divisor - 1);
      const dividend = divisor * quotient + rem;
      if(dividend >= dividendMin && dividend <= dividendMax && quotient >= 2) return [dividend, divisor, rem];

    } else {
      // both: 半々
      if(rand(0, 1) === 0){
        const qMin = Math.max(Math.ceil(dividendMin / divisor), 2);
        const qMax = Math.floor(dividendMax / divisor);
        if(qMin > qMax) continue;
        const quotient = rand(qMin, qMax);
        const dividend = divisor * quotient;
        if(dividend >= dividendMin && dividend <= dividendMax && quotient >= 2) return [dividend, divisor, 0];
      } else {
        const qMin = Math.max(Math.ceil(dividendMin / divisor), 2);
        const qMax = Math.floor((dividendMax - 1) / divisor);
        if(qMin > qMax) continue;
        const quotient = rand(qMin, qMax);
        const rem = rand(1, divisor - 1);
        const dividend = divisor * quotient + rem;
        if(dividend >= dividendMin && dividend <= dividendMax && quotient >= 2) return [dividend, divisor, rem];
      }
    }
  }
  // フォールバック
  const divisor = makeNumber(divisorDigits);
  const quotient = rand(2, 9);
  return [divisor * quotient, divisor, 0];
}

function getPageConfig(){
  const pageType = document.body.dataset.pageType || 'addition-hissan';
  const map = {
    'addition-hissan': {
      title: '足し算（ひっ算）',
      operator: '＋',
      pdfName: 'tashizan_hissan.pdf',
      generator: makeAdditionProblem,
      note: '繰り上がりのある足し算を生成します。',
      mode: 'hissan'
    },
    'subtraction-hissan': {
      title: '引き算（ひっ算）',
      operator: '－',
      pdfName: 'hikizan_hissan.pdf',
      generator: makeSubtractionProblem,
      note: '繰り下がりのある引き算を生成します。',
      mode: 'hissan'
    },
    'multiplication-hissan': {
      title: '掛け算（ひっ算）',
      operator: '×',
      pdfName: 'kakezan_hissan.pdf',
      generator: makeMultiplicationProblem,
      note: 'ひっ算用の掛け算問題を生成します。',
      mode: 'hissan'
    },
    'division-hissan': {
      title: '割り算（ひっ算）',
      operator: '÷',
      pdfName: 'warizan_hissan.pdf',
      generator: makeDivisionProblem,
      note: '割り算のひっ算問題を生成します。',
      mode: 'hissan-division'
    },
    'addition-horizontal': {
      title: '足し算（横式）',
      operator: '＋',
      pdfName: 'tashizan_yokoshiki.pdf',
      generator: makeAdditionProblem,
      note: '繰り上がりのある足し算を生成します。',
      mode: 'horizontal'
    },
    'subtraction-horizontal': {
      title: '引き算（横式）',
      operator: '－',
      pdfName: 'hikizan_yokoshiki.pdf',
      generator: makeSubtractionProblem,
      note: '繰り下がりのある引き算を生成します。',
      mode: 'horizontal'
    },
    'multiplication-horizontal': {
      title: '掛け算（横式）',
      operator: '×',
      pdfName: 'kakezan_yokoshiki.pdf',
      generator: makeMultiplicationProblem,
      note: '掛け算の横式問題を生成します。',
      mode: 'horizontal'
    },
    'division-horizontal': {
      title: '割り算（横式）',
      operator: '÷',
      pdfName: 'warizan_yokoshiki.pdf',
      generator: makeDivisionProblem,
      note: '割り算の横式問題を生成します。',
      mode: 'horizontal-division'
    }
  };
  return map[pageType] || map['addition-hissan'];
}


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
    const page = wrapper.querySelector('.page');
    if(!scaleBox || !page) return;
    if(page.classList.contains('answer-page')) return;

    wrapper.classList.remove('is-scaled');
    scaleBox.style.width = '';
    scaleBox.style.height = '';
    page.style.transform = '';

    const pageWidth = page.offsetWidth;
    const pageHeight = page.offsetHeight;
    if(!pageWidth || !pageHeight) return;

    if(window.innerWidth > 640 || window.matchMedia('print').matches){
      scaleBox.style.width = pageWidth + 'px';
      scaleBox.style.height = pageHeight + 'px';
      return;
    }

    const availableWidth = Math.max(wrapper.clientWidth - 8, 0);
    if(!availableWidth) return;

    const scale = Math.min(1, availableWidth / pageWidth);
    wrapper.classList.add('is-scaled');
    scaleBox.style.width = (pageWidth * scale) + 'px';
    scaleBox.style.height = (pageHeight * scale) + 'px';
    page.style.transform = `scale(${scale})`;
  });
}

// ひっ算（足し算・引き算・掛け算）
function problemHTML(num, a, b, operator){
  return `
    <div class="problem">
      <div class="problem-number">(${num})</div>
      <div class="number-top">${a}</div>
      <div class="operator">${operator}</div>
      <div class="number-bottom">${b}</div>
      <div class="line"></div>
    </div>
  `;
}

// 割り算ひっ算
function divisionHissanHTML(num, dividend, divisor){
  return `
    <div class="problem problem-div-hissan">
      <div class="problem-number">(${num})</div>
      <div class="div-hissan-wrap">
        <span class="div-divisor">${divisor}</span>
        <span class="div-right">
          <span class="div-answer-line"></span>
          <span class="div-bracket-dividend">
            <span class="div-bracket">）</span><span class="div-dividend">${dividend}</span>
          </span>
        </span>
      </div>
    </div>
  `;
}

// 横式（÷以外）
function horizontalProblemHTML(num, a, b, operator){
  return `
    <div class="problem-horizontal">
      <span class="prob-num">(${num})</span>
      <span class="prob-expr">${a} ${operator} ${b} ＝</span>
      <span class="prob-answer-box"></span>
    </div>
  `;
}

// 割り算横式（あまりあり対応）
function divisionHorizontalProblemHTML(num, dividend, divisor, remainder){
  const hasRem = remainder > 0;
  const remPart = hasRem
    ? `<span class="prob-rem-label">あまり</span><span class="prob-answer-box"></span>`
    : '';
  return `
    <div class="problem-horizontal">
      <span class="prob-num">(${num})</span>
      <span class="prob-expr">${dividend} ÷ ${divisor} ＝</span>
      <span class="prob-answer-box"></span>
      ${remPart}
    </div>
  `;
}

function pageHeaderHTML(config, pageNo, total){
  return `
    <div class="sheet-header">
      <div>うちトレ</div>
      <div>${config.title}　${pageNo}/${total}</div>
    </div>
  `;
}

function syncProblemControls(config, d1, d2){
  const noteNode = document.getElementById('pageNote');
  const digit1Node = document.getElementById('digit1');
  const digit2Node = document.getElementById('digit2');

  if(config && config.pdfName === 'hikizan_hissan.pdf' || config && config.pdfName === 'hikizan_yokoshiki.pdf') {
    const normalized = normalizeSubtractionDigits(d1, d2);
    if(normalized.topDigits !== d1 || normalized.bottomDigits !== d2){
      if(digit1Node) digit1Node.value = String(normalized.topDigits);
      if(digit2Node) digit2Node.value = String(normalized.bottomDigits);
      if(noteNode){
        noteNode.textContent = '引き算は繰り下がりありで作るため、作れない桁組みは自動で調整しています。';
      }
      return normalized;
    }
  }

  if(noteNode){
    noteNode.textContent = config.note;
  }
  return { topDigits: d1, bottomDigits: d2 };
}

function generate(){
  const config = getPageConfig();
  const d1 = parseInt(document.getElementById('digit1').value, 10);
  const d2 = parseInt(document.getElementById('digit2').value, 10);
  const normalized = syncProblemControls(config, d1, d2);
  const topDigits = normalized.topDigits;
  const bottomDigits = normalized.bottomDigits;
  const pageCount = parseInt(document.getElementById('count').value, 10);

  // 割り算のあまりモード
  const remainderSelect = document.getElementById('remainder-mode');
  const remainderMode = remainderSelect ? remainderSelect.value : 'exact';

  const container = document.getElementById('pages');
  container.innerHTML = '';

  const isDivision = config.mode === 'hissan-division' || config.mode === 'horizontal-division';
  const isHorizontal = config.mode === 'horizontal' || config.mode === 'horizontal-division';

  // 全ページの問題を記録（答えページ用）
  const allProblems = []; // [{pageNo, num, label}]

  for(let p = 0; p < pageCount; p++){
    const page = document.createElement('div');
    page.className = isHorizontal ? 'page page-horizontal' : 'page';
    page.innerHTML = '';

    const usedKeys = new Set();
    function uniqueProblem(genFn, args, maxTries = 200) {
      for (let t = 0; t < maxTries; t++) {
        const result = genFn(...args);
        const key = result.join(',');
        if (!usedKeys.has(key)) { usedKeys.add(key); return result; }
      }
      return genFn(...args);
    }

    if(isHorizontal){
      const grid = document.createElement('div');
      grid.className = 'problem-horizontal-grid';
      for(let i = 1; i <= 20; i++){
        if(isDivision){
          const [dividend, divisor, rem] = uniqueProblem(config.generator, [topDigits, bottomDigits, remainderMode]);
          grid.innerHTML += divisionHorizontalProblemHTML(i, dividend, divisor, rem);
          const ans = Math.floor(dividend / divisor);
          const label = rem > 0 ? `${ans} あまり ${rem}` : `${ans}`;
          allProblems.push({ pageNo: p+1, num: i, label });
        } else {
          const [a, b] = uniqueProblem(config.generator, [topDigits, bottomDigits]);
          grid.innerHTML += horizontalProblemHTML(i, a, b, config.operator);
          const ans = calcAnswer(a, b, config.operator);
          allProblems.push({ pageNo: p+1, num: i, label: String(ans) });
        }
      }
      page.appendChild(grid);
    } else {
      const isDivHissan = config.mode === 'hissan-division';
      const grid = document.createElement('div');
      grid.className = isDivHissan ? 'problem-grid problem-grid-division' : 'problem-grid';
      const problemCount = isDivHissan ? 12 : 18;
      for(let i = 1; i <= problemCount; i++){
        if(isDivision){
          const [dividend, divisor, rem] = uniqueProblem(config.generator, [topDigits, bottomDigits, remainderMode]);
          grid.innerHTML += divisionHissanHTML(i, dividend, divisor);
          const ans = Math.floor(dividend / divisor);
          const label = rem > 0 ? `${ans} あまり ${rem}` : `${ans}`;
          allProblems.push({ pageNo: p+1, num: i, label });
        } else {
          const [a, b] = uniqueProblem(config.generator, [topDigits, bottomDigits]);
          grid.innerHTML += problemHTML(i, a, b, config.operator);
          const ans = calcAnswer(a, b, config.operator);
          allProblems.push({ pageNo: p+1, num: i, label: String(ans) });
        }
      }
      page.appendChild(grid);
    }

    container.appendChild(wrapPageForPreview(page));
  }

  // 答えページを追加
  appendAnswerPage(container, allProblems, config.title, pageCount);

  applyMobilePageScaling();
}

function calcAnswer(a, b, op){
  if(op === '＋') return a + b;
  if(op === '－') return a - b;
  if(op === '×') return a * b;
  if(op === '÷') return Math.floor(a / b);
  return '';
}

function appendAnswerPage(container, allProblems, title, pageCount){
  const wrap = document.createElement('div');
  wrap.className = 'page-preview';
  const scaleBox = document.createElement('div');
  scaleBox.className = 'page-scale-box';

  const page = document.createElement('div');
  page.className = 'page answer-page';

  // ヘッダー
  const header = document.createElement('div');
  header.className = 'answer-page-header';
  header.textContent = `${title}　答え`;
  page.appendChild(header);

  // 答えグリッド（ページごとにセクション分け）
  for(let p = 1; p <= pageCount; p++){
    const probs = allProblems.filter(x => x.pageNo === p);
    if(!probs.length) continue;

    const section = document.createElement('div');
    section.className = 'answer-section';

    const label = document.createElement('div');
    label.className = 'answer-section-label';
    label.textContent = pageCount > 1 ? `${p}枚目` : '';
    if(pageCount > 1) section.appendChild(label);

    const grid = document.createElement('div');
    grid.className = 'answer-grid';

    probs.forEach(({ num, label }) => {
      const item = document.createElement('div');
      item.className = 'answer-item';
      item.innerHTML = `<span class="answer-num">(${num})</span><span class="answer-val">${label}</span>`;
      grid.appendChild(item);
    });

    section.appendChild(grid);
    page.appendChild(section);
  }

  scaleBox.appendChild(page);
  wrap.appendChild(scaleBox);
  container.appendChild(wrap);
}

async function downloadPDF(){
  const pageNodes = document.querySelectorAll('.page');
  if(!pageNodes.length){
    alert('先に「生成」を押して問題を作成してください。');
    return;
  }
  if(!window.html2canvas || !window.jspdf){
    alert('PDF保存ライブラリの読み込みに失敗しました。ネット接続を確認して再度お試しください。');
    return;
  }

  const { jsPDF } = window.jspdf;
  const config = getPageConfig();
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  for(let i = 0; i < pageNodes.length; i++){
    const canvas = await html2canvas(pageNodes[i], { scale: 2, useCORS: true });
    const img = canvas.toDataURL('image/png');
    if(i > 0) pdf.addPage();
    pdf.addImage(img, 'PNG', 0, 0, 210, 297);
  }
  pdf.save(config.pdfName);
}

window.addEventListener('DOMContentLoaded', () => {
  const config = getPageConfig();
  const titleNode = document.getElementById('pageTitle');
  const noteNode = document.getElementById('pageNote');
  if(titleNode) titleNode.textContent = config.title;
  if(noteNode) noteNode.textContent = config.note;
  generate();
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(applyMobilePageScaling, 80);
  });
  window.addEventListener('beforeprint', applyMobilePageScaling);
  window.addEventListener('afterprint', applyMobilePageScaling);
});
