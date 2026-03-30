
function currentSelection(){
  const op = document.querySelector('input[name="operation"]:checked')?.value || 'addition';
  const layout = document.querySelector('input[name="layout"]:checked')?.value || 'hissan';
  return { op, layout };
}

function targetMap(op, layout){
  const key = `${op}-${layout}`;
  return {
    'addition-hissan': 'addition-hissan.html',
    'subtraction-hissan': 'subtraction-hissan.html',
    'multiplication-hissan': 'multiplication-hissan.html',
    'division-hissan': 'division-hissan.html',
    'addition-horizontal': 'addition-horizontal.html',
    'subtraction-horizontal': 'subtraction-horizontal.html',
    'multiplication-horizontal': 'multiplication-horizontal.html',
    'division-horizontal': 'division-horizontal.html'
  }[key];
}

function labelMap(op, layout){
  const ops = { addition: '足し算', subtraction: '引き算', multiplication: '掛け算', division: '割り算' };
  const layouts = { horizontal: '横式', hissan: 'ひっ算' };
  return `${ops[op]} × ${layouts[layout]}`;
}

function updatePreview(){
  const { op, layout } = currentSelection();
  const link = targetMap(op, layout);
  const label = labelMap(op, layout);
  const preview = document.getElementById('selectionPreview');
  const go = document.getElementById('goButton');
  preview.textContent = `選択中：${label}`;
  go.href = link;
}

window.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('input[name="operation"], input[name="layout"]').forEach(el => {
    el.addEventListener('change', updatePreview);
  });
  updatePreview();
});
