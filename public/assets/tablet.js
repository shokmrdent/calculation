
const TabletMode = (() => {
  let isActive   = false;
  let currentTool  = 'pen';
  let currentColor = '#1d4ed8';
  let currentSize  = 4;
  let eraserSize   = 24;

  const canvases  = new Map(); // pageIndex -> { canvas, ctx, scaleBox }
  let activeEntry = null;
  let isDrawing   = false;
  let lastX = 0, lastY = 0;
  let db = null;

  /* ---- IndexedDB ---- */
  function initDB() {
    return new Promise((resolve) => {
      const req = indexedDB.open('TabletDrawings', 1);
      req.onupgradeneeded = e => e.target.result.createObjectStore('drawings');
      req.onsuccess = e => { db = e.target.result; resolve(); };
      req.onerror   = () => resolve();
    });
  }

  function saveDrawing(key, dataURL) {
    if (!db) return;
    const tx = db.transaction('drawings', 'readwrite');
    tx.objectStore('drawings').put(dataURL, key);
  }

  function loadDrawing(key) {
    return new Promise(resolve => {
      if (!db) return resolve(null);
      const tx  = db.transaction('drawings', 'readonly');
      const req = tx.objectStore('drawings').get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror   = () => resolve(null);
    });
  }

  function pageKey(idx) {
    const type = document.body.dataset.pageType || 'unknown';
    const d1   = document.getElementById('digit1')?.value || '0';
    const d2   = document.getElementById('digit2')?.value || '0';
    return `${type}_${d1}_${d2}_${idx}`;
  }

  /* ---- Canvas helpers ---- */
  function getScale(scaleBox) {
    const page = scaleBox.querySelector('.page');
    if (!page) return 1;
    const m = (page.style.transform || '').match(/scale\(([\d.]+)\)/);
    return m ? parseFloat(m[1]) : 1;
  }

  function getCoords(canvas, scaleBox, e) {
    const scale = getScale(scaleBox);
    const rect  = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top)  / scale,
    };
  }

  function createCanvas(pageEl, scaleBox, idx) {
    if (scaleBox.querySelector('canvas')) return; // already exists

    const w = pageEl.offsetWidth;
    const h = pageEl.offsetHeight;

    const canvas = document.createElement('canvas');
    canvas.width  = w;
    canvas.height = h;
    Object.assign(canvas.style, {
      position:    'absolute',
      left:        '0', top: '0',
      width:       w + 'px',
      height:      h + 'px',
      zIndex:      '10',
      cursor:      'crosshair',
      touchAction: 'none',
    });
    canvas.dataset.pageIndex = idx;

    const ctx = canvas.getContext('2d');
    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';

    scaleBox.appendChild(canvas);
    canvases.set(idx, { canvas, ctx, scaleBox });

    // Load saved strokes
    loadDrawing(pageKey(idx)).then(dataURL => {
      if (!dataURL) return;
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = dataURL;
    });

    canvas.addEventListener('pointerdown',  onDown);
    canvas.addEventListener('pointermove',  onMove);
    canvas.addEventListener('pointerup',    onUp);
    canvas.addEventListener('pointercancel',onUp);
    canvas.addEventListener('pointerleave', onUp);
  }

  /* ---- Pointer handlers ---- */
  function onDown(e) {
    if (!isActive) return;
    e.preventDefault();
    const idx   = parseInt(e.currentTarget.dataset.pageIndex);
    const entry = canvases.get(idx);
    if (!entry) return;
    activeEntry = entry;
    isDrawing   = true;
    entry.canvas.setPointerCapture(e.pointerId);
    const { x, y } = getCoords(entry.canvas, entry.scaleBox, e);
    lastX = x; lastY = y;
    applyStyle(entry.ctx, e);
    entry.ctx.beginPath();
    entry.ctx.moveTo(x, y);
  }

  function onMove(e) {
    if (!isActive || !isDrawing || !activeEntry) return;
    e.preventDefault();
    const { canvas, ctx, scaleBox } = activeEntry;
    const { x, y } = getCoords(canvas, scaleBox, e);
    applyStyle(ctx, e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastX = x; lastY = y;
  }

  function onUp(e) {
    if (!isDrawing || !activeEntry) return;
    isDrawing = false;
    const idx = parseInt(activeEntry.canvas.dataset.pageIndex);
    saveDrawing(pageKey(idx), activeEntry.canvas.toDataURL());
    activeEntry = null;
  }

  function applyStyle(ctx, e) {
    if (currentTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth   = eraserSize;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = currentColor;
      const pressure  = (e.pressure && e.pressure > 0) ? e.pressure : 0.5;
      ctx.lineWidth   = currentSize * (0.4 + pressure * 0.9);
    }
  }

  /* ---- Activate / Deactivate ---- */
  function activate() {
    isActive = true;
    document.body.classList.add('tablet-mode-active');
    document.querySelectorAll('.page-preview').forEach((preview, i) => {
      const scaleBox = preview.querySelector('.page-scale-box');
      const page     = preview.querySelector('.page');
      if (scaleBox && page) createCanvas(page, scaleBox, i);
    });
  }

  function deactivate() {
    isActive = false;
    document.body.classList.remove('tablet-mode-active');
  }

  function clearAll() {
    if (!confirm('このページの書き込みをすべて消しますか？')) return;
    canvases.forEach(({ canvas, ctx }, idx) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      saveDrawing(pageKey(idx), canvas.toDataURL());
    });
  }

  function rebuildCanvases() {
    canvases.forEach(({ canvas }) => canvas.remove());
    canvases.clear();
    if (isActive) activate();
  }

  /* ---- UI ---- */
  function buildUI() {
    const bar = document.createElement('div');
    bar.id        = 'tablet-bar';
    bar.className = 'no-print';
    bar.innerHTML = `
      <div class="tb-row">
        <button id="tb-toggle" class="tb-toggle" onclick="TabletMode.toggle()">
          ✏️ タブレットモード
        </button>
        <div class="tb-tools" id="tb-tools">
          <div class="tb-group">
            <button class="tb-tool active" id="tool-pen"    onclick="TabletMode.setTool('pen')">🖊 ペン</button>
            <button class="tb-tool"        id="tool-eraser" onclick="TabletMode.setTool('eraser')">🧹 消しゴム</button>
          </div>
          <div class="tb-group tb-colors">
            <button class="tb-color active" data-color="#1d4ed8" style="background:#1d4ed8" onclick="TabletMode.setColor(this)"></button>
            <button class="tb-color"        data-color="#dc2626" style="background:#dc2626" onclick="TabletMode.setColor(this)"></button>
            <button class="tb-color"        data-color="#16a34a" style="background:#16a34a" onclick="TabletMode.setColor(this)"></button>
            <button class="tb-color"        data-color="#000000" style="background:#000000" onclick="TabletMode.setColor(this)"></button>
          </div>
          <div class="tb-group tb-size-group">
            <label class="tb-size-label">太さ</label>
            <input type="range" id="tb-size" min="2" max="16" value="4" oninput="TabletMode.setSize(this.value)">
          </div>
          <button class="tb-clear" onclick="TabletMode.clearAll()">🗑 全消し</button>
        </div>
      </div>
    `;

    // Insert after controls card
    const controls = document.querySelector('.card.controls');
    if (controls) controls.after(bar);
    else document.querySelector('.container')?.prepend(bar);
  }

  /* ---- Public API ---- */
  return {
    init() {
      initDB();
      buildUI();
      // Wrap generate() so canvases rebuild after new problems
      const orig = window.generate;
      window.generate = function () {
        orig.apply(this, arguments);
        setTimeout(rebuildCanvases, 150);
      };
    },

    toggle() {
      const tools = document.getElementById('tb-tools');
      const btn   = document.getElementById('tb-toggle');
      if (isActive) {
        deactivate();
        tools.classList.remove('tb-tools-visible');
        btn.classList.remove('active');
        btn.textContent = '✏️ タブレットモード';
      } else {
        activate();
        tools.classList.add('tb-tools-visible');
        btn.classList.add('active');
        btn.textContent = '✏️ タブレットモード ON';
      }
    },

    setTool(tool) {
      currentTool = tool;
      document.querySelectorAll('.tb-tool').forEach(b => b.classList.remove('active'));
      document.getElementById(`tool-${tool}`)?.classList.add('active');
      // Switch cursor
      canvases.forEach(({ canvas }) => {
        canvas.style.cursor = tool === 'eraser' ? 'cell' : 'crosshair';
      });
    },

    setColor(btn) {
      currentColor = btn.dataset.color;
      currentTool  = 'pen';
      this.setTool('pen');
      document.querySelectorAll('.tb-color').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    },

    setSize(v) { currentSize = parseInt(v); },
    clearAll,
    rebuildCanvases,
  };
})();

window.addEventListener('DOMContentLoaded', () => TabletMode.init());
