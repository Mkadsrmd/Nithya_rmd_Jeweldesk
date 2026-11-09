"use strict";
(function(){
 const module=document.body.dataset.module||"home";
 const map={
  sales:["pos","estimates","orders","sales","accounts","places","repairs","dayend","paymentfollowups"],
  crm:["crmhub","customers","visit","followups","groups","campaigns"],
  shop:["reports","staff","compliance","activity","settings"]
 };
 const defaults={sales:"pos",crm:"crmhub",shop:"reports"};
 function boot(){
  if(module==="home"){
    const routes={pos:"sales.html?page=pos",estimates:"sales.html?page=estimates",orders:"sales.html?page=orders",sales:"sales.html?page=sales",accounts:"sales.html?page=accounts",places:"sales.html?page=places",repairs:"sales.html?page=repairs",dayend:"sales.html?page=dayend",paymentfollowups:"sales.html?page=paymentfollowups",crmhub:"crm.html?page=crmhub",customers:"crm.html?page=customers",visit:"crm.html?page=visit",followups:"crm.html?page=followups",groups:"crm.html?page=groups",campaigns:"crm.html?page=campaigns",reports:"shop.html?page=reports",staff:"shop.html?page=staff",compliance:"shop.html?page=compliance",activity:"shop.html?page=activity",settings:"shop.html?page=settings"};
    document.addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(!b)return;const r=routes[b.dataset.page];if(r){e.preventDefault();e.stopImmediatePropagation();location.href=r;}},true);
    return;
  }
  const allowed=new Set(map[module]||[]);
  document.querySelectorAll('#mainNav .nav-item').forEach(b=>{ b.hidden=!allowed.has(b.dataset.page); });
  document.querySelectorAll('#mainNav .nav-group').forEach(g=>{
    let n=g.nextElementSibling,any=false;
    while(n&&!n.classList.contains('nav-group')){if(n.classList.contains('nav-item')&&!n.hidden)any=true;n=n.nextElementSibling;}
    g.hidden=!any;
  });
  const brand=document.querySelector('.brand');
  if(brand){const h=document.createElement('a');h.href='index.html';h.className='module-home-link';h.innerHTML='⌂ <span>Home Dashboard</span>';brand.after(h);}
  const requested=new URLSearchParams(location.search).get('page');
  const page=allowed.has(requested)?requested:defaults[module];
  setTimeout(()=>window.navigateTo?.(page),350);
  document.querySelectorAll('.bottom-bar .bb-item').forEach(b=>{
   const p=b.dataset.page;
   if(p==='home'){b.onclick=()=>location.href='index.html';return;}
   if(p && !allowed.has(p)) b.hidden=true;
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
