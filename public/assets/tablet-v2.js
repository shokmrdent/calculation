/**
 * うちトレ タブレットモード v6
 *
 * 【v6の変更点】
 *   ・問題ごとの個別canvas → スクロールエリア全体に1枚の大きなcanvas
 *   ・行の区切り線なし → 大きなノートのような感覚で自由に書ける
 *   ・touch-action:none + 指スクロールはJS手動制御
 */

// ===================== Point / Bezier =====================
class TbPoint {
  constructor(x, y, p, t) {
    this.x=x; this.y=y;
    this.pressure=p>0?p:0.5;
    this.time=t||Date.now();
  }
  distanceTo(o){ return Math.hypot(this.x-o.x,this.y-o.y); }
  velocityFrom(o){ const dt=this.time-o.time; return dt>0?this.distanceTo(o)/dt:0; }
}

class TbBezier {
  constructor(p1,c1,c2,p2,w1,w2){this.p1=p1;this.c1=c1;this.c2=c2;this.p2=p2;this.w1=w1;this.w2=w2;}
  static from4(p0,p1,p2,p3){
    return new TbBezier(
      p1,{x:p1.x+(p2.x-p0.x)/6,y:p1.y+(p2.y-p0.y)/6},
         {x:p2.x-(p3.x-p1.x)/6,y:p2.y-(p3.y-p1.y)/6},
      p2,p1._w,p2._w
    );
  }
  len(){ let l=0,prev=this._at(0); for(let i=1;i<=10;i++){const c=this._at(i/10);l+=Math.hypot(c.x-prev.x,c.y-prev.y);prev=c;} return l; }
  _at(t){
    const m=1-t;
    return {x:m**3*this.p1.x+3*m**2*t*this.c1.x+3*m*t**2*this.c2.x+t**3*this.p2.x,
            y:m**3*this.p1.y+3*m**2*t*this.c1.y+3*m*t**2*this.c2.y+t**3*this.p2.y};
  }
  draw(ctx){
    const n=Math.max(2,Math.round(this.len()*2));
    for(let i=0;i<n;i++){
      const a=this._at(i/n),b=this._at((i+1)/n);
      ctx.lineWidth=this.w1+(this.w2-this.w1)*(i/n);
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    }
  }
}

// ===================== TabletMode =====================
const TabletMode = (() => {

  let isActive=false, tool='pen', color='#000000';
  let penSize=5, eraserSize=48, penOnly=true, showAnswer=false;

  // ── 1枚のキャンバス ──
  let bigCanvas=null, bigCtx=null;
  const hyakuRows=[];  // 100マス行を後でリスケール
  let drawing=false, points=[];

  // 指スクロール用
  let touchScrollY=null;

  // 消しゴムカーソル
  let eraserEl=null;

  // 解答テキスト
  let answers=[];

  // IndexedDB
  let db=null;

  // ── IndexedDB ──
  function initDB(){
    return new Promise(resolve=>{
      const req=indexedDB.open('UchiToreTabletV6',1);
      req.onupgradeneeded=e=>e.target.result.createObjectStore('d');
      req.onsuccess=e=>{db=e.target.result;resolve();};
      req.onerror=()=>resolve();
    });
  }
  function dbSave(key,url){ if(!db)return; try{db.transaction('d','readwrite').objectStore('d').put(url,key);}catch(e){} }
  function dbLoad(key){ return new Promise(resolve=>{ if(!db)return resolve(null); try{const req=db.transaction('d','readonly').objectStore('d').get(key); req.onsuccess=()=>resolve(req.result||null); req.onerror=()=>resolve(null);}catch(e){resolve(null);} }); }
  function makeKey(){
    const type=document.body.dataset.pageType||'frac';
    const op=document.getElementById('op')?.value||'';
    const md=document.getElementById('max-den')?.value||'';
    return `v6_${type}_${op}_${md}`;
  }

  // ── 解答収集 ──
  function collectAnswers(){
    answers=[];
    document.querySelectorAll('.answer-page .answer-item').forEach(el=>{
      answers.push(el.querySelector('.answer-val')?.textContent||'');
    });
  }

  // ── 消しゴムカーソル（赤いリング）──
  function ensureEraserEl(){
    if(eraserEl)return;
    eraserEl=document.createElement('div');
    Object.assign(eraserEl.style,{position:'fixed',pointerEvents:'none',zIndex:'99999',
      borderRadius:'50%',border:'2.5px solid #ef4444',background:'rgba(239,68,68,0.1)',
      boxShadow:'0 0 0 1.5px rgba(0,0,0,0.2)',display:'none',transform:'translate(-50%,-50%)'});
    document.body.appendChild(eraserEl);
  }
  function moveEraserEl(cx,cy){ ensureEraserEl(); const s=eraserSize+'px'; Object.assign(eraserEl.style,{display:'block',width:s,height:s,left:cx+'px',top:cy+'px'}); }
  function hideEraserEl(){ if(eraserEl)eraserEl.style.display='none'; }

  // ── 座標（スクロール量を考慮してcanvas上の座標に変換）──
  function getXY(e){
    if(!bigCanvas)return{x:0,y:0,p:0.5};
    const r=bigCanvas.getBoundingClientRect();
    // canvasはscrollエリアの中にfixedではなくabsoluteで配置
    // → clientX/Y からcanvasのbounding rectを引けばOK
    return{x:e.clientX-r.left, y:e.clientY-r.top, p:e.pressure>0?e.pressure:0.5};
  }
  function calcW(prev,curr){
    // 均一な太さ（筆圧・速度による変化なし）
    return penSize;
  }

  // ── Pointer イベント（全て passive:false）──
  function onDown(e){
    e.preventDefault();
    // 指スクロール（ペン専用モード）
    if(penOnly && e.pointerType==='touch'){ touchScrollY=e.clientY; return; }

    drawing=true; points=[];
    bigCtx.globalCompositeOperation=tool==='eraser'?'destination-out':'source-over';
    if(tool!=='eraser') bigCtx.strokeStyle=color;
    bigCanvas.setPointerCapture(e.pointerId);
    const{x,y,p}=getXY(e);
    const pt=new TbPoint(x,y,p); pt._w=calcW(null,pt); points.push(pt);
  }

  function onMove(e){
    e.preventDefault();
    // 指スクロール（手動）
    if(penOnly && e.pointerType==='touch'){
      if(touchScrollY!==null){
        const sc=document.getElementById('tb-scroll');
        if(sc)sc.scrollTop+=touchScrollY-e.clientY;
        touchScrollY=e.clientY;
      }
      return;
    }
    if(tool==='eraser') moveEraserEl(e.clientX,e.clientY);
    if(!drawing||!bigCtx)return;

    // ★ getCoalescedEvents: ブラウザが間引いた中間点を全て処理 → なめらかさ向上
    const events = (e.getCoalescedEvents ? e.getCoalescedEvents() : null) || [e];

    function drawPoint(re){
      const{x,y,p}=getXY(re);
      if(tool==='eraser'){
        bigCtx.beginPath(); bigCtx.arc(x,y,eraserSize/2,0,Math.PI*2); bigCtx.fill();
        return;
      }
      const curr=new TbPoint(x,y,p); points.push(curr);
      const n=points.length;
      if(n>=3){
        const p1=points[n-3], p2=points[n-2], p3=points[n-1];
        bigCtx.lineWidth=penSize;
        bigCtx.beginPath();
        bigCtx.moveTo((p1.x+p2.x)/2,(p1.y+p2.y)/2);
        bigCtx.quadraticCurveTo(p2.x,p2.y,(p2.x+p3.x)/2,(p2.y+p3.y)/2);
        bigCtx.stroke();
      } else if(n>=2){
        const prev=points[n-2];
        bigCtx.lineWidth=penSize;
        bigCtx.beginPath(); bigCtx.moveTo(prev.x,prev.y); bigCtx.lineTo(curr.x,curr.y); bigCtx.stroke();
      }
    }

    for(const re of events) drawPoint(re);

  }

  function onUp(e){
    e.preventDefault();
    if(penOnly && e.pointerType==='touch'){ touchScrollY=null; return; }
    if(!drawing)return;
    drawing=false; hideEraserEl();
    // 保存
    dbSave(makeKey(), bigCanvas.toDataURL());
    bigCtx.globalCompositeOperation='source-over';
  }

  // ── 問題リストエリア（canvasは1枚、背面に配置）──
  function buildProblemArea(items){
    const ROW_H=140; // 1問あたりの高さ（px）

    // 外側コンテナ（相対配置の基準）
    const area=document.createElement('div');
    area.id='tb-prob-area';
    area.style.cssText='position:relative;';

    // ── 問題リスト（テキスト）──
    const list=document.createElement('div');
    list.id='tb-prob-list';
    list.style.cssText='position:relative;z-index:1;pointer-events:none;';

    items.forEach((item,i)=>{
      const row=document.createElement('div');
      row.style.cssText=`
        display:flex; align-items:center;
        min-height:${ROW_H}px;
        padding:0 24px;
        box-sizing:border-box;
        position:relative;
        border:none;
      `;

      // 問題本体（クローン）
      const clone=item.cloneNode(true);
      // 区切り線を消す（100マス・各種横線は残す）
      const isHyakuItem = item.classList.contains('hyaku-wrap');
      if(!isHyakuItem){
        clone.style.borderBottom='none'; clone.style.border='none';
        clone.querySelectorAll('*').forEach(el=>{
          if(el.classList.contains('frac-num')) return;      // 分数の横線
          if(el.classList.contains('line')) return;           // ひっ算の横線
          if(el.classList.contains('div-answer-line')) return;// 割り算の横線
          if(el.classList.contains('dec-line')) return;       // 小数ひっ算の横線
          el.style.borderBottom='none'; el.style.borderTop='none';
        });
      }

      // ひっ算は元のグリッドセルサイズを再現したラッパーに入れてスケールアップ
      // → operator等の absolute 配置が元通り動く
      const isHissan    = item.classList.contains('problem') &&
                         !item.classList.contains('problem-horizontal') &&
                         !item.classList.contains('problem-div-hissan');
      const isDivHissan = item.classList.contains('problem-div-hissan');
      const isDecHissan = item.classList.contains('dec-problem');
      // 文章題・100マスは font-size:2em で普通に拡大
      const isSimple    = item.classList.contains('story-item');
      const isHyaku     = item.classList.contains('hyaku-wrap');

      if(isHissan || isDivHissan || isDecHissan){
        // 元のグリッドセルサイズに近い箱を用意
        const CELL_W = isDivHissan ? 320 : isDecHissan ? 220 : 270;
        const CELL_H = isDivHissan ? 160 : isDecHissan ? 110 : 130;
        const SCALE  = 1.6;

        const wrapper = document.createElement('div');
        Object.assign(wrapper.style,{
          display:'inline-block',
          width: CELL_W+'px', height: CELL_H+'px',
          transform:`scale(${SCALE})`, transformOrigin:'left center',
          pointerEvents:'none', userSelect:'none',
          position:'relative', zIndex:'1',
          flexShrink:'0',
        });
        // clone を 100%×100% で埋める
        Object.assign(clone.style,{
          position:'relative', width:'100%', height:'100%',
          pointerEvents:'none', userSelect:'none',
        });
        wrapper.appendChild(clone);
        row.appendChild(wrapper);
        // 行高さを scale 後の高さに合わせる
        row.style.minHeight = Math.round(CELL_H * SCALE + 200) + 'px';  // ひっ算は答えスペース広め
        row.style.paddingLeft = '24px';
        row.style.overflow = 'visible';
      } else if(isHyaku){
        // 100マス：DOM追加後に実サイズを測ってスケール計算
        Object.assign(clone.style,{
          pointerEvents:'none', userSelect:'none',
          display:'inline-block', flexShrink:'0',
          transformOrigin:'top left',
        });
        row.style.overflow = 'visible';
        row.style.paddingLeft = '8px';
        row.appendChild(clone);
        // 実際の幅が確定してからスケール適用
        requestAnimationFrame(()=>{
          const actualW = clone.offsetWidth || 600;
          const targetW = (row.offsetWidth || window.innerWidth) * 0.94;
          const sc = Math.min(targetW / actualW, 1.0); // 最大1倍（縮小のみ）
          clone.style.transform = `scale(${sc})`;
          row.style.minHeight = Math.round(clone.offsetHeight * sc + 20) + 'px';
        });
        // initCanvases後にスケールを正確に再計算するため記録
        hyakuRows.push({row, clone});
      } else {
        // 横式・分数など：font-size:2em で拡大
        const isStory = item.classList.contains('story-item');
      const isZukei = item.classList.contains('zukei-item');
        Object.assign(clone.style,{
          fontSize: isStory ? '1.3em' : '1.6em',
          pointerEvents:'none', userSelect:'none',
          position:'relative', zIndex:'1', flex:'1',
          overflow: 'visible',
        });
        if(isStory) row.style.minHeight = '260px';
        if(isZukei){
          // 図形SVGが切れないよう余裕を持たせる
          row.style.minHeight = '300px';
          row.style.overflow = 'visible';
          clone.style.fontSize = '1.2em';
        }
        row.appendChild(clone);
      }

      // 解答ラベル
      const ansEl=document.createElement('div');
      ansEl.className='tb-ans-label';
      Object.assign(ansEl.style,{
        position:'absolute', right:'24px', top:'50%', transform:'translateY(-50%)',
        fontSize:'1.6em', fontWeight:'700', color:'#dc2626',
        display:'none', background:'rgba(255,255,255,0.0)',  // 透明背景（canvas上に乗る）
        padding:'2px 10px', borderRadius:'8px', zIndex:'2', pointerEvents:'none',
      });
      ansEl.textContent=answers[i]||'';
      row.appendChild(ansEl);

      list.appendChild(row);
    });

    // 100マス：答えシートを末尾に追加（初期非表示）
    const allHyakuWraps = [...document.querySelectorAll('.hyaku-wrap')];
    if(allHyakuWraps.length >= 2){
      // 2つ目以降が答えシート
      const ansDiv = document.createElement('div');
      ansDiv.id = 'tb-hyaku-ans';
      Object.assign(ansDiv.style,{
        display:'none', padding:'16px 8px 8px', borderTop:'2px dashed #94a3b8',
        marginTop:'16px',
      });
      const ansTitle = document.createElement('div');
      ansTitle.style.cssText='font-size:14px;font-weight:700;color:#475569;margin-bottom:8px;padding-left:8px;';
      ansTitle.textContent='💡 解答';
      ansDiv.appendChild(ansTitle);
      // 答えのhyaku-wrapをクローンして追加
      allHyakuWraps.slice(1).forEach(aw=>{
        const ac = aw.cloneNode(true);
        Object.assign(ac.style,{
          pointerEvents:'none', userSelect:'none',
          display:'inline-block', transformOrigin:'top left',
        });
        ansDiv.appendChild(ac);
        // サイズ調整（rAFで）
        requestAnimationFrame(()=>{
          const w = ac.offsetWidth||600;
          const tw = (ansDiv.offsetWidth||window.innerWidth)*0.94;
          const sc = Math.min(tw/w, 1.0);
          ac.style.transform=`scale(${sc})`;
          ansDiv.style.minHeight = Math.round(ac.offsetHeight*sc+40)+'px';
        });
      });
      list.appendChild(ansDiv);
    }

    area.appendChild(list);

    // ── 1枚の大きなCanvas（全問題を覆う）──
    // サイズは list が DOM に入ってから確定するため、あとで resize する
    const canvas=document.createElement('canvas');
    canvas.id='tb-big-canvas';
    Object.assign(canvas.style,{
      position:'absolute', left:'0', top:'0',
      width:'100%', height:'100%',
      touchAction:'none',    // ★ 常にnone
      zIndex:'10',
      cursor:tool==='eraser'?'none':'crosshair',
    });
    area.appendChild(canvas);

    bigCanvas=canvas;

    // イベント（passive:false）
    canvas.addEventListener('pointerdown', onDown, {passive:false});
    canvas.addEventListener('pointermove', onMove, {passive:false});
    canvas.addEventListener('pointerup',   onUp,   {passive:false});
    canvas.addEventListener('pointercancel',onUp,  {passive:false});
    canvas.addEventListener('pointerleave', ()=>hideEraserEl());

    return area;
  }

  // ── Canvas サイズ確定 & 保存データ読み込み ──
  function initCanvas(){
    if(!bigCanvas)return;
    const area=document.getElementById('tb-prob-area');
    if(!area)return;
    const dpr=window.devicePixelRatio||1;
    const w=area.offsetWidth, h=area.offsetHeight;
    bigCanvas.width=w*dpr; bigCanvas.height=h*dpr;
    const ctx=bigCanvas.getContext('2d', {desynchronized:true});  // ★ 遅延低減
    ctx.scale(dpr,dpr);
    ctx.lineCap='round'; ctx.lineJoin='round';
    bigCtx=ctx;

    // 100マスのスケールを実際の幅で再計算
    hyakuRows.forEach(({row, clone})=>{
      const available = row.offsetWidth - 16;
      const natural   = clone.scrollWidth;  // 実際のテーブル幅
      if(natural > 0){
        const newSc = Math.min(available / natural, 1.0);  // 縮小のみ（拡大しない）
        clone.style.transform = `scale(${newSc})`;
        row.style.minHeight = Math.round(natural * newSc * 1.1 + 20) + 'px';
      }
    });

    // 保存データ読み込み
    dbLoad(makeKey()).then(url=>{
      if(!url)return;
      const img=new Image();
      img.onload=()=>ctx.drawImage(img,0,0,w,h);
      img.src=url;
    });
  }

  // ── ツールバー ──
  const bs=(bg,sz='13px')=>`background:${bg};color:#fff;border:none;border-radius:7px;padding:7px 12px;font-size:${sz};font-weight:700;cursor:pointer;flex-shrink:0;`;

  function buildToolbar(){
    const bar=document.createElement('div');
    bar.id='tb-bar';
    bar.style.cssText='display:flex;flex-direction:column;background:#1e293b;box-shadow:0 2px 10px rgba(0,0,0,.4);flex-shrink:0;';

    bar.innerHTML=`
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 14px;">
        <button id="tbb-close"  style="${bs('#475569')}">← 印刷モードへ</button>
        <div style="width:1px;height:28px;background:#475569;flex-shrink:0;"></div>
        <button id="tbb-pen"   style="${bs('#1d4ed8')}">🖊 ペン</button>
        <button id="tbb-eraser"style="${bs('#64748b')}">🧹 消しゴム</button>
        <div style="display:flex;gap:5px;">
          ${['#000000','#1d4ed8','#dc2626','#16a34a'].map((c,i)=>
            `<button class="tbb-c" data-c="${c}" style="width:26px;height:26px;border-radius:50%;border:none;background:${c};cursor:pointer;outline:${i===0?'3px solid #fff':'none'};outline-offset:2px;"></button>`
          ).join('')}
        </div>
        <div style="width:1px;height:28px;background:#475569;flex-shrink:0;"></div>
        <button id="tbb-clear" style="${bs('#7f1d1d')}">🗑 全消し</button>
        <button id="tbb-cfg"   style="${bs('#334155')}">⚙️ 設定</button>
      </div>

      <div id="tbb-cfg-panel" style="display:none;padding:4px 14px 10px;gap:16px;align-items:center;flex-wrap:wrap;">
        <label style="color:#94a3b8;font-size:13px;display:flex;align-items:center;gap:6px;">
          ペンの太さ
          <input type="range" id="tbb-ps" min="1" max="16" value="5">
          <span id="tbb-ps-v" style="color:#fff;">5</span>
        </label>
        <label style="color:#94a3b8;font-size:13px;display:flex;align-items:center;gap:6px;">
          消しゴム
          <input type="range" id="tbb-es" min="16" max="120" value="48">
          <span id="tbb-es-v" style="color:#fff;">48</span>
        </label>
        <label style="color:#94a3b8;font-size:13px;display:flex;align-items:center;gap:6px;">
          <input type="checkbox" id="tbb-po" checked>指スクロール・ペン描画
        </label>
      </div>

      <div style="display:flex;align-items:center;gap:10px;padding:8px 14px;background:#0f172a;border-top:1px solid #334155;">
        <button id="tbb-gen" style="${bs('#16a34a','14px')}">🔄 新しい問題</button>
        <button id="tbb-ans" style="${bs('#92400e','14px')}">💡 解答を見る</button>
        <span style="color:#475569;font-size:12px;margin-left:auto;">18問 | タブレットモード</span>
      </div>`;

    setTimeout(()=>{
      bar.querySelector('#tbb-close').onclick  = ()=>deactivate();
      bar.querySelector('#tbb-pen').onclick    = ()=>setTool('pen');
      bar.querySelector('#tbb-eraser').onclick = ()=>setTool('eraser');
      bar.querySelectorAll('.tbb-c').forEach(b=>{
        b.onclick=()=>{
          color=b.dataset.c; setTool('pen');
          bar.querySelectorAll('.tbb-c').forEach(x=>x.style.outline='none');
          b.style.outline='3px solid #fff'; b.style.outlineOffset='2px';
        };
      });
      bar.querySelector('#tbb-clear').onclick = clearAll;
      bar.querySelector('#tbb-cfg').onclick   = toggleSettings;
      bar.querySelector('#tbb-ps').oninput=function(){ penSize=parseInt(this.value); bar.querySelector('#tbb-ps-v').textContent=this.value; };
      bar.querySelector('#tbb-es').oninput=function(){ eraserSize=parseInt(this.value); bar.querySelector('#tbb-es-v').textContent=this.value; };
      bar.querySelector('#tbb-po').onchange=function(){ penOnly=this.checked; if(!penOnly)touchScrollY=null; };

      bar.querySelector('#tbb-gen').onclick=()=>{
        // ★ 書き込みをクリア（保存しない・DBも削除）
        if(db) try{ db.transaction('d','readwrite').objectStore('d').delete(makeKey()); }catch(e){}
        if(bigCtx&&bigCanvas){
          const dpr=window.devicePixelRatio||1;
          bigCtx.clearRect(0,0,bigCanvas.width/dpr,bigCanvas.height/dpr);
        }
        bigCanvas=null; bigCtx=null;
        window._origGenerate?.();
        setTimeout(rebuildContent,250);
      };

      bar.querySelector('#tbb-ans').onclick=()=>{
        showAnswer=!showAnswer;
        bar.querySelector('#tbb-ans').style.background=showAnswer?'#b45309':'#92400e';
        bar.querySelector('#tbb-ans').textContent=showAnswer?'💡 解答を隠す':'💡 解答を見る';

        // 100マス計算：印刷モードの答えシートを表示/非表示
        const hyakuAns = document.getElementById('tb-hyaku-ans');
        if(hyakuAns){
          hyakuAns.style.display = showAnswer ? 'block' : 'none';
          return;
        }
        // 通常問題：各問題の解答ラベル
        document.querySelectorAll('.tb-ans-label').forEach(el=>{
          el.style.display=showAnswer?'block':'none';
        });
      };
    },0);
    return bar;
  }

  let settingsOpen=false;
  function toggleSettings(){ settingsOpen=!settingsOpen; const p=document.getElementById('tbb-cfg-panel'); if(p)p.style.display=settingsOpen?'flex':'none'; }

  function setTool(t){
    tool=t;
    const pen=document.getElementById('tbb-pen'), er=document.getElementById('tbb-eraser');
    if(pen)pen.style.background=t==='pen'?'#1d4ed8':'#64748b';
    if(er)er.style.background=t==='eraser'?'#dc2626':'#64748b';
    if(bigCanvas) bigCanvas.style.cursor=t==='eraser'?'none':'crosshair';
    if(t!=='eraser')hideEraserEl();
  }

  function clearAll(){
    if(!confirm('書き込みをすべて消しますか？'))return;
    if(bigCtx&&bigCanvas){
      const dpr=window.devicePixelRatio||1;
      bigCtx.clearRect(0,0,bigCanvas.width/dpr,bigCanvas.height/dpr);
      dbSave(makeKey(),bigCanvas.toDataURL());
    }
  }

  // ── 問題取得（18問）── 全ページ対応
  function getItems(){
    // 答えページを除外してから問題要素を探す
    // .answer-page内の要素は .problem 等のクラスを持たないが念のため除外
    const answerPages = new Set(document.querySelectorAll('.answer-page'));
    function notInAnswerPage(el){
      let p = el.parentElement;
      while(p){ if(answerPages.has(p)) return false; p = p.parentElement; }
      return true;
    }
    const sel = [
      '.problem-frac-item',    // 分数
      '.problem-tsubun-item',  // 約分・通分
      '.problem-horizontal',   // 横式
      '.problem',              // ひっ算（通常）
      '.dec-problem',          // 小数ひっ算
      '.story-item',           // 文章題
      '.yoji-prob-item',       // 幼児・小1
      '.kaku-row',             // すうじをかこう
      '.tansaku-item',         // 単位換算
      '.simple-prob-item',     // がい数
      '.zukei-item',           // 図形
      '.tokei-item',           // 時計
      '.seikatsu-item',       // 生活算数（単位変換・面積・速さ等）
      '.hyaku-wrap',           // 100マス計算（テーブル全体を1つとして）
    ].join(',');
    const all = [...document.querySelectorAll(sel)].filter(notInAnswerPage);
    return all.slice(0, 18);
  }

  // ── オーバーレイ構築 ──
  function buildOverlay(){
    const items=getItems();
    if(!items.length){ alert('先に「生成」ボタンで問題を作成してください。'); return false; }
    collectAnswers();

    const overlay=document.createElement('div');
    overlay.id='tb-overlay';
    overlay.style.cssText=`position:fixed;inset:0;z-index:500;display:flex;flex-direction:column;background:#f8fafc;font-family:'Noto Sans JP',sans-serif;`;

    overlay.appendChild(buildToolbar());

    // スクロールエリア（ここだけスクロール）
    const scroll=document.createElement('div');
    scroll.id='tb-scroll';
    scroll.style.cssText='flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;position:relative;';

    scroll.appendChild(buildProblemArea(items));

    overlay.appendChild(scroll);
    document.body.appendChild(overlay);
    document.body.style.overflow='hidden';

    // DOMサイズ確定後にcanvasを初期化
    requestAnimationFrame(()=>{
      requestAnimationFrame(initCanvas);
    });
    return true;
  }

  // ── 内容再構築（生成後）──
  function rebuildContent(){
    const scroll=document.getElementById('tb-scroll');
    if(!scroll)return;
    // 新規生成時はDB保存しない（bigCanvasは既に処理済み）
    bigCanvas=null; bigCtx=null; drawing=false; showAnswer=false; touchScrollY=null;
    hyakuRows.length=0;
    const ansBtn=document.getElementById('tbb-ans');
    if(ansBtn){ansBtn.textContent='💡 解答を見る';ansBtn.style.background='#92400e';}
    scroll.innerHTML='';
    collectAnswers();
    const items=getItems();
    if(!items.length)return;
    scroll.appendChild(buildProblemArea(items));
    requestAnimationFrame(()=>requestAnimationFrame(initCanvas));
  }

  // ── activate / deactivate ──
  function activate(){
    if(!buildOverlay())return;
    isActive=true;
    const btn=document.getElementById('tb-toggle');
    if(btn){btn.classList.add('active');btn.textContent='✏️ タブレット中';}
  }
  function deactivate(){
    // 保存してから閉じる
    if(bigCanvas&&bigCtx) dbSave(makeKey(),bigCanvas.toDataURL());
    document.getElementById('tb-overlay')?.remove();
    bigCanvas=null; bigCtx=null; drawing=false;
    touchScrollY=null; showAnswer=false; settingsOpen=false;
    document.body.style.overflow='';
    isActive=false; hideEraserEl();
    const btn=document.getElementById('tb-toggle');
    if(btn){btn.classList.remove('active');btn.textContent='✏️ タブレットモード';}
  }

  // ── generate() フック ──
  function hookGenerate(){
    const orig=window.generate;
    if(!orig||window._origGenerate)return;
    window._origGenerate=orig;
    window.generate=function(...args){
      const was=isActive; if(was)deactivate();
      orig.apply(this,args);
      if(was)setTimeout(activate,200);
    };
  }

  // ── 印刷画面のボタン ──
  function buildToggleButton(){
    const wrap=document.createElement('div');
    wrap.id='tablet-bar'; wrap.className='no-print'; wrap.style.marginBottom='12px';
    wrap.innerHTML=`<button id="tb-toggle" class="tb-toggle" onclick="TabletMode.toggle()">✏️ タブレットモード</button>`;
    const ctrl=document.querySelector('.card.controls');
    if(ctrl)ctrl.after(wrap); else document.querySelector('.container')?.prepend(wrap);
  }

  return {
    init(){
      initDB();
      buildToggleButton();
      if(document.readyState!=='loading') hookGenerate();
      else window.addEventListener('DOMContentLoaded',hookGenerate,{once:true});
    },
    toggle(){ isActive?deactivate():activate(); },
  };
})();

window.addEventListener('DOMContentLoaded',()=>TabletMode.init());
