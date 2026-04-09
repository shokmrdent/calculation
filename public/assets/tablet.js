/**
 * うちトレ タブレットモード v3
 * signature_pad スタイルのベジェ補間で滑らかな描画を実現
 */

class Point {
  constructor(x, y, pressure, time) {
    this.x = x; this.y = y;
    this.pressure = pressure || 0.5;
    this.time = time || Date.now();
  }
  distanceTo(o) { return Math.sqrt((this.x-o.x)**2 + (this.y-o.y)**2); }
  velocityFrom(o) { const dt = this.time - o.time; return dt > 0 ? this.distanceTo(o)/dt : 0; }
}

class Bezier {
  constructor(p1, c1, c2, p2, w1, w2) {
    this.p1=p1; this.c1=c1; this.c2=c2; this.p2=p2; this.w1=w1; this.w2=w2;
  }
  static fromPoints(pts) {
    const [p0,p1,p2,p3] = pts;
    const c1 = { x: p1.x+(p2.x-p0.x)/6, y: p1.y+(p2.y-p0.y)/6 };
    const c2 = { x: p2.x-(p3.x-p1.x)/6, y: p2.y-(p3.y-p1.y)/6 };
    return new Bezier(p1, c1, c2, p2, p1._w, p2._w);
  }
  length() {
    let len=0, prev=this._at(0);
    for(let i=1;i<=10;i++){const c=this._at(i/10);len+=Math.sqrt((c.x-prev.x)**2+(c.y-prev.y)**2);prev=c;}
    return len;
  }
  _at(t) {
    const mt=1-t;
    return {
      x: mt**3*this.p1.x + 3*mt**2*t*this.c1.x + 3*mt*t**2*this.c2.x + t**3*this.p2.x,
      y: mt**3*this.p1.y + 3*mt**2*t*this.c1.y + 3*mt*t**2*this.c2.y + t**3*this.p2.y,
    };
  }
  draw(ctx) {
    const steps = Math.max(2, Math.round(this.length()*2));
    for(let i=0;i<steps;i++){
      const p1=this._at(i/steps), p2=this._at((i+1)/steps);
      ctx.lineWidth = this.w1 + (this.w2-this.w1)*(i/steps);
      ctx.beginPath(); ctx.moveTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.stroke();
    }
  }
}

const TabletMode = (() => {
  let isActive=false, currentTool='pen', currentColor='#1d4ed8';
  let penSize=4, eraserSize=32, penOnlyMode=true, settingsOpen=false;
  const pads = new Map();
  let activePad=null, db=null;
  const touchPts = new Map();

  function initDB() {
    return new Promise(resolve => {
      const req = indexedDB.open('TabletDrawings2', 1);
      req.onupgradeneeded = e => e.target.result.createObjectStore('drawings');
      req.onsuccess = e => { db=e.target.result; resolve(); };
      req.onerror = () => resolve();
    });
  }
  function save(key, url) {
    if(!db) return;
    db.transaction('drawings','readwrite').objectStore('drawings').put(url, key);
  }
  function load(key) {
    return new Promise(resolve => {
      if(!db) return resolve(null);
      const req = db.transaction('drawings','readonly').objectStore('drawings').get(key);
      req.onsuccess = () => resolve(req.result||null);
      req.onerror = () => resolve(null);
    });
  }
  function pageKey(idx) {
    const type = document.body.dataset.pageType||'page';
    const d1 = document.getElementById('digit1')?.value || document.getElementById('op')?.value || '0';
    const d2 = document.getElementById('digit2')?.value || '0';
    return `v3_${type}_${d1}_${d2}_${idx}`;
  }

  function getScale(scaleBox) {
    const m = (scaleBox.querySelector('.page')?.style.transform||'').match(/scale\(([\d.]+)\)/);
    return m ? parseFloat(m[1]) : 1;
  }
  function getXY(canvas, scaleBox, e) {
    const scale=getScale(scaleBox), rect=canvas.getBoundingClientRect();
    return { x:(e.clientX-rect.left)/scale, y:(e.clientY-rect.top)/scale, p:e.pressure>0?e.pressure:0.5 };
  }

  function calcWidth(prev, curr) {
    if(!prev) return penSize;
    const vel = curr.velocityFrom(prev);
    return Math.max(1, penSize * (0.5 + curr.pressure*0.7) * Math.max(0.3, 1.2 - vel*0.4));
  }

  function createPad(pageEl, scaleBox, idx) {
    if(scaleBox.querySelector('canvas.tb-canvas')) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'tb-canvas';
    canvas.width = pageEl.offsetWidth;
    canvas.height = pageEl.offsetHeight;
    Object.assign(canvas.style, {
      position:'absolute', left:'0', top:'0',
      width:canvas.width+'px', height:canvas.height+'px',
      zIndex:'10', cursor:'crosshair',
      touchAction: penOnlyMode ? 'pan-y' : 'none',
      userSelect:'none', WebkitUserSelect:'none', WebkitTouchCallout:'none',
    });
    canvas.dataset.padIdx = idx;
    const ctx = canvas.getContext('2d');
    ctx.lineCap='round'; ctx.lineJoin='round';
    scaleBox.appendChild(canvas);
    pads.set(idx, { canvas, ctx, scaleBox, points:[] });
    load(pageKey(idx)).then(url => {
      if(!url) return;
      const img=new Image(); img.onload=()=>ctx.drawImage(img,0,0); img.src=url;
    });
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup',   onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('pointerleave', onUp);
  }

  function onDown(e) {
    if(!isActive) return;
    e.preventDefault();
    if(e.pointerType==='touch') {
      touchPts.set(e.pointerId, e.clientY);
      if(penOnlyMode || touchPts.size>=2) return;
    }
    const idx=parseInt(e.currentTarget.dataset.padIdx);
    const pad=pads.get(idx);
    if(!pad) return;
    activePad=pad; pad.points=[];
    pad.ctx.globalCompositeOperation = currentTool==='eraser' ? 'destination-out' : 'source-over';
    if(currentTool!=='eraser') pad.ctx.strokeStyle = currentColor;
    pad.canvas.setPointerCapture(e.pointerId);
    const {x,y,p} = getXY(pad.canvas, pad.scaleBox, e);
    const pt = new Point(x,y,p); pt._w = calcWidth(null, pt);
    pad.points.push(pt);
  }

  function onMove(e) {
    if(!isActive) return;
    e.preventDefault();
    if(e.pointerType==='touch') {
      if(penOnlyMode) { touchPts.set(e.pointerId, e.clientY); return; }
      if(touchPts.size>=2) {
        const prev=touchPts.get(e.pointerId);
        if(prev!=null) window.scrollBy(0, prev-e.clientY);
        touchPts.set(e.pointerId, e.clientY); return;
      }
      touchPts.set(e.pointerId, e.clientY);
    }
    if(!activePad) return;
    const {canvas, ctx, scaleBox, points} = activePad;
    const {x,y,p} = getXY(canvas, scaleBox, e);
    if(currentTool==='eraser') {
      ctx.beginPath(); ctx.arc(x,y,eraserSize/2,0,Math.PI*2); ctx.fill(); return;
    }
    const prev=points[points.length-1];
    const curr=new Point(x,y,p); curr._w=calcWidth(prev, curr);
    points.push(curr);
    if(points.length>=4) {
      const n=points.length;
      Bezier.fromPoints([points[n-4],points[n-3],points[n-2],points[n-1]]).draw(ctx);
    } else if(points.length>=2) {
      ctx.lineWidth=curr._w; ctx.beginPath(); ctx.moveTo(prev.x,prev.y); ctx.lineTo(curr.x,curr.y); ctx.stroke();
    }
  }

  function onUp(e) {
    if(e.pointerType==='touch') touchPts.delete(e.pointerId);
    if(!activePad) return;
    const idx=parseInt(activePad.canvas.dataset.padIdx);
    save(pageKey(idx), activePad.canvas.toDataURL());
    activePad.ctx.globalCompositeOperation='source-over';
    activePad=null;
  }

  function activate() {
    isActive=true;
    document.body.classList.add('tablet-mode-active');
    document.querySelectorAll('.page-preview').forEach((preview,i)=>{
      const scaleBox=preview.querySelector('.page-scale-box');
      const page=preview.querySelector('.page');
      if(scaleBox&&page) createPad(page, scaleBox, i);
    });
  }
  function deactivate() { isActive=false; touchPts.clear(); document.body.classList.remove('tablet-mode-active'); }
  function clearAll() {
    if(!confirm('このページの書き込みをすべて消しますか？')) return;
    pads.forEach(({canvas,ctx},idx)=>{ ctx.clearRect(0,0,canvas.width,canvas.height); save(pageKey(idx),canvas.toDataURL()); });
  }
  function rebuildPads() { pads.forEach(({canvas})=>canvas.remove()); pads.clear(); if(isActive) activate(); }
  function updateLabel(id,val) { const el=document.getElementById(id); if(el) el.textContent=val; }

  function buildUI() {
    const bar=document.createElement('div'); bar.id='tablet-bar'; bar.className='no-print';
    bar.innerHTML=`
      <div class="tb-row">
        <button id="tb-toggle" class="tb-toggle" onclick="TabletMode.toggle()">✏️ タブレットモード</button>
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
          <button class="tb-clear" onclick="TabletMode.clearAll()">🗑 全消し</button>
          <button class="tb-settings-btn" id="tb-settings-btn" onclick="TabletMode.toggleSettings()">⚙️ 設定</button>
        </div>
      </div>
      <div class="tb-settings-panel" id="tb-settings-panel">
        <div class="tb-settings-inner">
          <div class="tb-setting-row">
            <span class="tb-setting-label">ペンの太さ</span>
            <input type="range" id="tb-pen-size" min="1" max="16" value="4" oninput="TabletMode.setPenSize(this.value)">
            <span class="tb-setting-val" id="tb-pen-size-val">4</span>
          </div>
          <div class="tb-setting-row">
            <span class="tb-setting-label">消しゴムの大きさ</span>
            <input type="range" id="tb-eraser-size" min="8" max="120" value="32" oninput="TabletMode.setEraserSize(this.value)">
            <span class="tb-setting-val" id="tb-eraser-size-val">32</span>
          </div>
          <div class="tb-setting-row">
            <span class="tb-setting-label">ペン専用モード</span>
            <label class="tb-toggle-switch">
              <input type="checkbox" id="tb-pen-only" checked onchange="TabletMode.setPenOnly(this.checked)">
              <span class="tb-toggle-slider"></span>
            </label>
            <span class="tb-setting-note" id="tb-pen-only-note">ON：指スクロール／ペン描画</span>
          </div>
        </div>
      </div>`;
    const controls=document.querySelector('.card.controls');
    if(controls) controls.after(bar); else document.querySelector('.container')?.prepend(bar);
  }

  return {
    init() {
      initDB(); buildUI();
      const orig=window.generate;
      window.generate=function(){ orig.apply(this,arguments); setTimeout(rebuildPads,150); };
    },
    toggle() {
      const tools=document.getElementById('tb-tools'), btn=document.getElementById('tb-toggle');
      const panel=document.getElementById('tb-settings-panel');
      if(isActive){
        deactivate(); tools.classList.remove('tb-tools-visible');
        panel?.classList.remove('tb-settings-panel-open'); settingsOpen=false;
        btn.classList.remove('active'); btn.textContent='✏️ タブレットモード';
      } else {
        activate(); tools.classList.add('tb-tools-visible');
        btn.classList.add('active'); btn.textContent='✏️ タブレットモード ON';
      }
    },
    toggleSettings() {
      settingsOpen=!settingsOpen;
      document.getElementById('tb-settings-panel')?.classList.toggle('tb-settings-panel-open',settingsOpen);
      document.getElementById('tb-settings-btn')?.classList.toggle('active',settingsOpen);
    },
    setTool(tool) {
      currentTool=tool;
      document.querySelectorAll('.tb-tool').forEach(b=>b.classList.remove('active'));
      document.getElementById(`tool-${tool}`)?.classList.add('active');
      pads.forEach(({canvas})=>{ canvas.style.cursor=tool==='eraser'?'cell':'crosshair'; });
    },
    setColor(btn) {
      currentColor=btn.dataset.color; this.setTool('pen');
      document.querySelectorAll('.tb-color').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
    },
    setPenSize(v)    { penSize=parseInt(v);    updateLabel('tb-pen-size-val',v); },
    setEraserSize(v) { eraserSize=parseInt(v); updateLabel('tb-eraser-size-val',v); },
    setPenOnly(checked) {
      penOnlyMode=checked; touchPts.clear();
      const note=document.getElementById('tb-pen-only-note');
      if(note) note.textContent=checked?'ON：指スクロール／ペン描画':'OFF：1本指で描画／2本指でスクロール';
      pads.forEach(({canvas})=>{ canvas.style.touchAction=checked?'pan-y':'none'; });
    },
    clearAll, rebuildPads,
  };
})();

window.addEventListener('DOMContentLoaded', ()=>TabletMode.init());
