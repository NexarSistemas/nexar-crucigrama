(()=>{
const $=s=>document.querySelector(s);
let level='facil',game=null,score=Number(localStorage.getItem('nexar_crossword_score')||0),loadToken=0;

async function start(){
  const token=++loadToken;
  const requestedLevel=level;
  $('#mensaje').textContent='Cargando preguntas…';
  try{
    const data=await QuestionSource.get(requestedLevel);
    if(token!==loadToken||requestedLevel!==level)return;
    const isRemote=data.source && data.source!=='local';
    $('#origen').textContent=isRemote
      ? `Preguntas dinámicas: ${data.source==='wikipedia-es'?'Wikipedia en español':data.source}`
      : 'Modo local: usando banco de respaldo';
    const nextGame=Crossword.build(data.questions,requestedLevel);
    if(token!==loadToken||requestedLevel!==level)return;
    game=nextGame;
    if(!game){$('#mensaje').textContent='No se pudo generar el crucigrama.';return;}
    if(isRemote&&typeof QuestionSource.markUsed==='function') QuestionSource.markUsed(game.words);
    $('#mensaje').textContent=`Grilla ${game.size}×${game.size}`;
    render();
  }catch(error){
    if(token!==loadToken)return;
    console.error(error);
    $('#mensaje').textContent='No se pudo cargar una nueva partida.';
  }
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
  const wordsByCell=new Map();
  game.words.forEach(w=>{
    const keys=[];
    for(let i=0;i<w.a.length;i++){
      const r=w.row+(w.dir==='V'?i:0);
      const c=w.col+(w.dir==='H'?i:0);
      const key=cellKey(r,c);
      keys.push(key);
      if(!wordsByCell.has(key)) wordsByCell.set(key,[]);
      wordsByCell.get(key).push(w);
    }
    wordCells.set(w,keys);
  });

  let activeWord=null;

  function inputForKey(key){
    const [r,c]=key.split(':');
    return board.querySelector(`input[data-r="${r}"][data-c="${c}"]`);
  }

  function activateWord(word,focusKey=null){
    if(!word)return;
    activeWord=word;
    document.querySelectorAll('.casilla.resaltada').forEach(x=>x.classList.remove('resaltada'));
    document.querySelectorAll('.pista.seleccionada').forEach(x=>x.classList.remove('seleccionada'));

    wordCells.get(word).forEach(key=>inputForKey(key)?.parentElement.classList.add('resaltada'));
    const clue=document.querySelector(`.pista[data-row="${word.row}"][data-col="${word.col}"][data-dir="${word.dir}"]`);
    clue?.classList.add('seleccionada');

    const target=inputForKey(focusKey||wordCells.get(word)[0]);
    target?.focus();
  }

  function chooseWordAt(r,c,toggle=false){
    const key=cellKey(r,c);
    const options=wordsByCell.get(key)||[];
    if(!options.length)return null;
    if(!toggle||!activeWord||!options.includes(activeWord)) return options[0];
    if(options.length===1)return options[0];
    return options[(options.indexOf(activeWord)+1)%options.length];
  }

  function moveWithinActive(input,delta,skipFilled=false){
    if(!activeWord)return;
    const key=cellKey(Number(input.dataset.r),Number(input.dataset.c));
    const keys=wordCells.get(activeWord);
    const index=keys.indexOf(key);
    if(index<0)return;

    let next=index+delta;
    while(next>=0&&next<keys.length){
      const target=inputForKey(keys[next]);
      if(!target)return;
      if(!skipFilled||!target.value){
        target.focus();
        return;
      }
      next+=delta;
    }
  }

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

    input.addEventListener('click',()=>{
      const word=chooseWordAt(r,c,true);
      if(word)activateWord(word,key);
    });

    input.addEventListener('focus',()=>{
      if(activeWord&&wordCells.get(activeWord)?.includes(key))return;
      const word=chooseWordAt(r,c,false);
      if(word)activateWord(word,key);
    });

    input.addEventListener('input',e=>{
      e.target.value=e.target.value.toUpperCase().replace(/[^A-ZÑ]/g,'');
      updateProgress();
      if(e.target.value) moveWithinActive(e.target,1,true);
    });

    input.addEventListener('keydown',e=>{
      if(e.key==='Backspace'&&!e.target.value){
        e.preventDefault();
        moveWithinActive(e.target,-1,false);
        const focused=document.activeElement;
        if(focused?.classList?.contains('celda')){
          focused.value='';
          updateProgress();
        }
      }
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
    const word=game.words.find(w=>w.row===Number(btn.dataset.row)&&w.col===Number(btn.dataset.col)&&w.dir===btn.dataset.dir);
    if(word)activateWord(word);
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