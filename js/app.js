(()=>{
const $=s=>document.querySelector(s);
let level='facil',game=null,score=Number(localStorage.getItem('nexar_crossword_score')||0);

async function start(){
  $('#mensaje').textContent='Cargando preguntas…';
  const data=await QuestionSource.get(level);
  const isRemote=data.source && data.source!=='local';
  $('#origen').textContent=isRemote
    ? `Preguntas dinámicas: ${data.source==='wikipedia-es'?'Wikipedia en español':data.source}`
    : 'Modo local: usando banco de respaldo';
  game=Crossword.build(data.questions,level);
  if(!game){$('#mensaje').textContent='No se pudo generar el crucigrama.';return;}
  $('#mensaje').textContent=`Grilla ${game.size}×${game.size}`;
  render();
}

function cellKey(r,c){return `${r}:${c}`;}

function render(){
  const board=$('#tablero');
  board.innerHTML='';
  board.style.gridTemplateColumns=`repeat(${game.grid[0].length},38px)`;

  const starts=new Map();
  const sorted=[...game.words].sort((a,b)=>a.row-b.row||a.col-b.col||a.dir.localeCompare(b.dir));
  let number=0;
  sorted.forEach(w=>{
    const key=cellKey(w.row,w.col);
    if(!starts.has(key)) starts.set(key,++number);
    w.number=starts.get(key);
  });

  const wordCells=new Map();
  game.words.forEach(w=>{
    const keys=[];
    for(let i=0;i<w.a.length;i++){
      const r=w.row+(w.dir==='V'?i:0);
      const c=w.col+(w.dir==='H'?i:0);
      keys.push(cellKey(r,c));
    }
    wordCells.set(w,keys);
  });

  game.grid.forEach((row,r)=>row.forEach((letter,c)=>{
    if(!letter){
      const d=document.createElement('div');
      d.className='celda bloqueada';
      board.appendChild(d);
      return;
    }
    const wrap=document.createElement('div');
    wrap.className='casilla';
    const key=cellKey(r,c);
    if(starts.has(key)){
      const n=document.createElement('span');
      n.className='numero-casilla';
      n.textContent=starts.get(key);
      wrap.appendChild(n);
    }
    const input=document.createElement('input');
    input.className='celda';
    input.maxLength=1;
    input.dataset.r=r;
    input.dataset.c=c;
    input.dataset.answer=letter;
    input.setAttribute('aria-label',`Fila ${r+1}, columna ${c+1}`);
    input.addEventListener('input',e=>{
      e.target.value=e.target.value.toUpperCase().replace(/[^A-ZÑ]/g,'');
      updateProgress();
    });
    wrap.appendChild(input);
    board.appendChild(wrap);
  }));

  const clues=$('#pistas');
  const horizontal=game.words.filter(w=>w.dir==='H').sort((a,b)=>a.number-b.number);
  const vertical=game.words.filter(w=>w.dir==='V').sort((a,b)=>a.number-b.number);

  const section=(title,words)=>`<section class="grupo-pistas"><h3>${title}</h3>${words.map(w=>
    `<button class="pista" type="button" data-row="${w.row}" data-col="${w.col}" data-dir="${w.dir}"><strong>${w.number}.</strong> ${w.q} <small>(${w.a.length})</small></button>`
  ).join('')}</section>`;
  clues.innerHTML=section('Horizontales',horizontal)+section('Verticales',vertical);

  clues.querySelectorAll('.pista').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('.casilla.resaltada').forEach(x=>x.classList.remove('resaltada'));
    const word=game.words.find(w=>w.row===Number(btn.dataset.row)&&w.col===Number(btn.dataset.col)&&w.dir===btn.dataset.dir);
    if(!word)return;
    wordCells.get(word).forEach(key=>{
      const [r,c]=key.split(':');
      const input=board.querySelector(`input[data-r="${r}"][data-c="${c}"]`);
      input?.parentElement.classList.add('resaltada');
    });
    board.querySelector(`input[data-r="${word.row}"][data-c="${word.col}"]`)?.focus();
  }));

  $('#puntaje').textContent=score;
  updateProgress();
}

function updateProgress(){
  const cells=[...document.querySelectorAll('input.celda')];
  const ok=cells.filter(x=>x.value===x.dataset.answer).length;
  $('#progreso').textContent=(cells.length?Math.round(ok/cells.length*100):0)+'%';
}

function verify(){
  let wrong=0,empty=0;
  document.querySelectorAll('input.celda').forEach(x=>{
    x.classList.remove('ok','error');
    if(!x.value){empty++;return;}
    if(x.value===x.dataset.answer)x.classList.add('ok');else{x.classList.add('error');wrong++;}
  });
  if(!wrong&&!empty){
    score+=level==='facil'?200:level==='medio'?400:600;
    localStorage.setItem('nexar_crossword_score',score);
    $('#puntaje').textContent=score;
    $('#mensaje').textContent='🎉 ¡Crucigrama completo!';
  }else $('#mensaje').textContent=wrong?`Hay ${wrong} letra(s) incorrecta(s).`:`Faltan ${empty} casilla(s).`;
}

$('#niveles').addEventListener('click',e=>{
  const b=e.target.closest('button[data-nivel]');
  if(!b)return;
  level=b.dataset.nivel;
  document.querySelectorAll('#niveles button').forEach(x=>x.classList.toggle('activo',x===b));
  start();
});
$('#nuevo').addEventListener('click',start);
$('#verificar').addEventListener('click',verify);
start();
})();