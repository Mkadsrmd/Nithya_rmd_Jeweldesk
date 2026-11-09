"use strict";
/* Glue between the CRM shell (crm.js) and the billing layer (billing*.js).
   - boots the shared ERP IndexedDB
   - wraps navigate() so billing pages render and "home" maps to the CRM today page
   - wires the sidebar Logout button and user label
   - exposes Access.canWrite() and a CRM-profile bridge for Client Accounts */
(function(){
  const $ = id => document.getElementById(id);

  /* ----- access (subscription write gate), mirrors crm.js canWrite ----- */
  window.Access = {
    canWrite(){
      const ctx = window.__subCtx || {state:"local"};
      return !["read_only","suspended"].includes(ctx.state);
    }
  };
  window.addEventListener("jewelcloud-context", e=>{
    window.__subCtx = {state:e.detail.accessState||"active"};
    // user label + logout visibility
    const name=$("sbUserName"), role=$("sbUserRole"), lo=$("logoutButton");
    if(e.detail.mode==="admin"){ if(name) name.textContent="Platform admin"; if(role) role.textContent="Admin console"; }
    else { if(name) name.textContent=e.detail.shopName||"Signed in"; if(role) role.textContent=(e.detail.role||"staff")+" · "+(e.detail.sessionDays||3)+"d session"; }
    if(lo) lo.hidden=false;
  });
  // In local (no-cloud) mode there is no session event; keep logout usable.

  /* ----- logout ----- */
  function wireLogout(){
    const lo=$("logoutButton");
    if(lo) lo.onclick=()=>{ if(window.JewelCloud?.signOut) window.JewelCloud.signOut(); else { if(confirm("Log out of this device?")) location.reload(); } };
  }

  /* ----- navigation wrapper ----- */
  const BILLING_PAGES = ["home","pos","sales","accounts","places","repairs","estimates","orders","dayend","crmhub"];
  const LABELS = {home:"Home",pos:"POS Billing",sales:"Sales Register",accounts:"Client Accounts",places:"Places",
    repairs:"Repairs",estimates:"Estimates",orders:"Orders & Advance",dayend:"Day-End Closing",crmhub:"CRM Hub"};

  function activate(pageId){
    document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
    const t=$(pageId); if(t) t.classList.add("active");
  }
  function setNavActive(page){
    document.querySelectorAll(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.page===page));
  }

  // Our own navigate that cooperates with crm.js's navigate for CRM pages.
  window.navigateTo = function(page){
    const sb=$("sidebar"); if(sb) sb.classList.remove("open");
    syncBottomBar(page);
    if(page==="crmhub") updateHubBadges();
    if(page==="home"){
      // CRM "today" page doubles as Home
      if(window.__crmNavigate) window.__crmNavigate("today");
      activate("todayPage"); setNavActive("home");
      $("pageTitle").textContent="Home";
      window.BillingPages?.renderBillingPage("home");
      window.scrollTo({top:0,behavior:"smooth"});
      return;
    }
    if(BILLING_PAGES.includes(page)){
      activate(page+"Page"); setNavActive(page);
      $("pageTitle").textContent=LABELS[page]||page;
      window.BillingPages?.renderBillingPage(page);
      window.scrollTo({top:0,behavior:"smooth"});
      return;
    }
    // CRM-owned page
    if(window.__crmNavigate) window.__crmNavigate(page);
  };

  // Intercept clicks on billing nav items before crm.js sees them.
  document.addEventListener("click", e=>{
    const nav=e.target.closest("[data-page]");
    if(!nav) return;
    const page=nav.dataset.page;
    if(page==="home"||BILLING_PAGES.includes(page)){
      e.stopImmediatePropagation(); e.preventDefault();
      window.navigateTo(page);
    }
  }, true); // capture phase: runs before crm.js document click listener

  // After any nav click (incl. CRM pages handled by crm.js), sync bottom bar.
  document.addEventListener("click", e=>{
    const nav=e.target.closest("[data-page]");
    if(nav) syncBottomBar(nav.dataset.page);
  });

  /* ----- bottom bar + hub tiles + sidebar search ----- */
  const BOTTOM_PAGES = ["home","pos","customers","sales"];
  function syncBottomBar(page){
    document.querySelectorAll(".bb-item").forEach(b=>{
      if(b.id==="bbMore") b.classList.toggle("active", !BOTTOM_PAGES.includes(page));
      else b.classList.toggle("active", b.dataset.page===page);
    });
  }
  function wireChrome(){
    // bottom bar
    document.querySelectorAll(".bb-item[data-page]").forEach(b=>{
      b.onclick=()=>window.navigateTo(b.dataset.page);
    });
    const more=$("bbMore");
    if(more) more.onclick=()=>{ const sb=$("sidebar"); if(sb) sb.classList.add("open"); };
    // hub tiles
    document.querySelectorAll(".hub-tile[data-page]").forEach(t=>{
      t.onclick=()=>window.navigateTo(t.dataset.page);
    });
    // sidebar search
    const ns=$("navSearch");
    if(ns) ns.oninput=()=>{
      const q=ns.value.trim().toLowerCase();
      document.querySelectorAll("#mainNav .nav-item").forEach(it=>{
        const show=!q || it.textContent.toLowerCase().includes(q);
        it.style.display=show?"":"none";
      });
      document.querySelectorAll("#mainNav .nav-group").forEach(g=>{
        // hide a group header if every item until the next header is hidden
        let n=g.nextElementSibling, any=false;
        while(n && !n.classList.contains("nav-group")){ if(n.style.display!=="none") any=true; n=n.nextElementSibling; }
        g.style.display=any?"":"none";
      });
    };
  }
  function updateHubBadges(){
    const fu=$("hub-followups"), badge=$("followupBadge");
    if(fu && badge) fu.textContent=(badge.textContent&&badge.textContent!=="0")?(badge.textContent+" pending"):"No pending reminders";
  }

  /* ----- CRM profile bridge (Client Accounts -> Customers) ----- */
  window.CRMBridge = {
    openByPhone(phone){
      window.navigateTo("customers");
      const search=$("customerSearch"); if(search){ search.value=phone; search.dispatchEvent(new Event("input")); }
      toast && toast("Showing CRM profile for "+phone);
    }
  };

  /* ----- boot the shared database, then prime billing caches ----- */
  async function bootWithRetry(maxAttempts=5){  // ✓ Retry helper
    for(let attempt=1; attempt<=maxAttempts; attempt++){
      try{
        await dbService.init();
        window.Billing.attachReady(true);
        await window.Billing.loadSettings();
        const sl=$("shopLabel"); if(sl) sl.textContent=(window.Billing.settings.shop||"JEWELOS").toUpperCase();
        const gr=document.getElementById("todayGreeting"); if(gr&&window.Billing.settings.shop) gr.textContent="Today at "+window.Billing.settings.shop;
        await window.Billing.loadCache();
        // restore any saved POS draft
        try{ const draft=await dbService.get("pos_drafts","DRAFT-CURRENT"); if(draft) window.Billing.loadSnapshot(draft); }catch(_){}
        // refresh billing views when sync queue changes
        window.addEventListener("jewelgrow:queued", async ()=>{ await window.Billing.loadCache(); const p=document.querySelector(".nav-item.active")?.dataset.page; window.BillingPages?.renderBillingPage(p==="home"?"home":p); });
        return true;  // Success
      }catch(e){
        if(attempt < maxAttempts){
          console.warn(`DB init attempt ${attempt} failed, retrying in ${attempt}s...`, e.message);
          await new Promise(r=>setTimeout(r, 1000*attempt));
        } else {
          console.error("DB init failed permanently", e);
          const msg=e.message||"Unknown error";
          if(document.body){
            document.body.innerHTML=`<div style="padding:20px;font-family:sans-serif"><h2>Database Error</h2><p style="color:#666">${msg}</p><button onclick="location.reload()" style="padding:8px 16px;background:#172231;color:#fff;border:0;border-radius:4px;cursor:pointer">Retry</button></div>`;
          }
          throw e;
        }
      }
    }
  }
  
  async function boot(){
    wireLogout();
    wireChrome();
    await bootWithRetry();  // ✓ Call retry version
    window.navigateTo("home");
  }

  // crm.js finishes by calling renderAll(); wait a tick so its globals exist.
  if(document.readyState==="complete"||document.readyState==="interactive") setTimeout(boot,0);
  else window.addEventListener("DOMContentLoaded", ()=>setTimeout(boot,0));
})();
