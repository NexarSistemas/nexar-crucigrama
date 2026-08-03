(()=>{
  const promos={
    sistemas:{label:'Nexar Sistemas',copy:'Software simple para organizar tu negocio.',href:'https://nexarsistemas.com.ar/'},
    comercio:{label:'Nexar Comercio',copy:'Ventas, stock, caja y gestión comercial en un solo lugar.',href:'https://nexarsistemas.com.ar/'},
    finanzas:{label:'Nexar Finanzas',copy:'Organizá tus finanzas de forma simple y clara.',href:'https://nexarsistemas.com.ar/'}
  };

  const label=document.getElementById('nexar-promo-label');
  const copy=document.getElementById('nexar-promo-copy');
  const link=document.getElementById('nexar-promo-link');
  const message=document.getElementById('mensaje');

  if(!label||!copy||!link)return;

  function setPromo(name){
    const promo=promos[name]||promos.sistemas;
    label.textContent=promo.label;
    copy.textContent=promo.copy;
    link.href=promo.href;
    link.setAttribute('aria-label',`Conocer más sobre ${promo.label}`);
  }

  document.getElementById('nuevo')?.addEventListener('click',()=>setPromo('comercio'));
  document.getElementById('niveles')?.addEventListener('click',event=>{
    if(event.target.closest('button[data-nivel]'))setPromo('sistemas');
  });

  if(message){
    new MutationObserver(()=>{
      if(message.textContent.includes('¡Crucigrama completo!'))setPromo('finanzas');
    }).observe(message,{childList:true,characterData:true,subtree:true});
  }

  setPromo('sistemas');
})();
