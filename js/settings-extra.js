"use strict";
/* Billing settings modal + full local Backup & Restore. Owner-only guarded. */
(function(){
  const $ = id => document.getElementById(id);
  const STORES = ["customers","invoices","old_gold","repairs","estimates","orders","dayend_closings","settings"];

  function isOwner(){
    const ctx = window.JewelCloud?.context?.() || {};
    if(!ctx.ready) return true; // local test mode
    return ["owner","manager"].includes(ctx.role);
  }

  /* ---- Billing settings modal (reuses CRM modal shell) ---- */
  function openBilling(){
    pendingLogo=undefined;
    const s = window.Billing.settings;
    const body = `<div class="form-grid">
      <label><span>Shop name</span><input name="shop" value="${attr(s.shop)}"></label>
      <label><span>GSTIN</span><input name="gstin" value="${attr(s.gstin)}" placeholder="Required for GST bills"></label>
      <label><span>Phone</span><input name="phone" value="${attr(s.phone)}"></label>
      <label><span>WhatsApp</span><input name="whatsapp" value="${attr(s.whatsapp)}"></label>
      <label class="full"><span>Address</span><input name="address" value="${attr(s.address)}"></label>
      <label><span>Invoice prefix</span><input name="prefix" value="${attr(s.prefix)}"></label>
      <label><span>Default GST %</span><input name="gstRate" type="number" step=".01" value="${attr(s.gstRate)}"></label>
      <label><span>HSN</span><input name="hsn" value="${attr(s.hsn)}"></label>
      <label><span>Signatory</span><input name="sign" value="${attr(s.sign)}"></label>
      <label><span>Payment PIN (4 digits, required)</span><input name="paymentPin" inputmode="numeric" maxlength="4" value="${attr(s.paymentPin)}"></label>
      <label class="full"><span>Invoice terms</span><textarea name="terms" rows="3">${attr(s.terms)}</textarea></label>
      <label class="full"><span>Shop logo (optional)</span><input type="file" accept="image/*" id="bl-logo-file"></label>
      <div class="full" id="bl-logo-prevwrap">${s.logo?`<img src="${s.logo}" style="max-height:60px;border:1px solid #ddd;border-radius:6px;padding:4px"> <button type="button" id="bl-logo-clear" class="button secondary">Remove logo</button>`:""}</div>
    </div>`;
    if(window.__openModal){
      window.__openModal({title:"Billing settings",kicker:"INVOICE & TAX",submit:"Save settings",body,handler:async data=>{
        window.Billing.settings = {
          shop:(data.shop||"").trim()||"JEWELOS JEWELLERY", gstin:(data.gstin||"").trim(),
          phone:(data.phone||"").trim(), whatsapp:(data.whatsapp||"").trim(), address:(data.address||"").trim(),
          prefix:(data.prefix||"").trim()||"INV", gstRate:+data.gstRate||3, hsn:(data.hsn||"").trim(),
          sign:(data.sign||"").trim()||"Authorised Signatory", terms:(data.terms||"").trim(),
          paymentPin:((data.paymentPin||"").replace(/\D/g,"").slice(0,4)),
          logo:pendingLogo!==undefined?pendingLogo:(s.logo||"")
        };
        await window.Billing.saveSettingsToDB();
        const shopName=window.Billing.settings.shop||"";
        const sl=$("shopLabel"); if(sl) sl.textContent=(shopName||"JEWELOS").toUpperCase();
        const gr=$("todayGreeting"); if(gr) gr.textContent=shopName?("Today at "+shopName):"Today";
        toast("Billing settings saved.");
      }});
    } else {
      // fallback: prompt-based minimal
      const gstin = prompt("Shop GSTIN (blank to clear):", s.gstin||"");
      if(gstin!==null){ s.gstin=gstin.trim(); window.Billing.settings=s; window.Billing.saveSettingsToDB(); toast("GSTIN saved."); }
    }
    // wire logo controls (modal is now in the DOM)
    setTimeout(()=>{
      const lf=$("bl-logo-file");
      if(lf) lf.onchange=async e=>{ try{ pendingLogo=await window.Billing.compressImage(e.target.files&&e.target.files[0]); const w=$("bl-logo-prevwrap"); if(w) w.innerHTML=pendingLogo?`<img src="${pendingLogo}" style="max-height:60px;border:1px solid #ddd;border-radius:6px;padding:4px">`:""; }catch(_){}};
      const lc=$("bl-logo-clear"); if(lc) lc.onclick=()=>{ pendingLogo=""; const w=$("bl-logo-prevwrap"); if(w) w.innerHTML=""; };
    },50);
  }
  let pendingLogo; // undefined = unchanged
  function attr(v){ return String(v??"").replace(/"/g,"&quot;").replace(/</g,"&lt;"); }

  /* ---- Backup ---- */
  async function backup(){
    if(!isOwner()) return toast("Owner or manager permission is required.");
    try{
      const dump={ _app:"JewelOS", _version:16, _exported_at:new Date().toISOString(), data:{} };
      for(const st of STORES){ try{ dump.data[st]=await dbService.getAll(st); }catch(_){ dump.data[st]=[]; } }
      try{ dump.crm=window.CRMData?.exportAll?.()||null; }catch(_){ dump.crm=null; }   // CRM customers, visits, follow-ups, groups...
      const blob=new Blob([JSON.stringify(dump)],{type:"application/json"});
      const a=document.createElement("a");
      a.href=URL.createObjectURL(blob);
      a.download="JewelOS-backup-"+new Date().toISOString().slice(0,10)+".json";
      a.click(); URL.revokeObjectURL(a.href);
      toast("Backup downloaded.");
    }catch(e){ toast("Backup failed: "+e.message); }
  }

  /* ---- Restore ---- */
  function pickRestore(){ if(!isOwner()) return toast("Owner or manager permission is required."); $("bl-restoreFile").click(); }
  async function restore(file){
    if(!file) return;
    if(!confirm("Restore will merge the backup into this device's data. Continue?")) return;
    try{
      const text=await file.text(); const dump=JSON.parse(text);
      if(!dump||dump._app!=="JewelOS"||!dump.data) throw new Error("Not a JewelOS backup file.");
      let count=0;
      for(const st of STORES){
        const rows=dump.data[st]||[];
        for(const r of rows){ try{ await dbService.put(st,r); count++; }catch(_){} }
      }
      let crmCount=0; try{ if(dump.crm) crmCount=window.CRMData?.importAll?.(dump.crm)||0; }catch(_){}
      await window.Billing.loadCache(); await window.Billing.loadSettings();
      toast("Restored "+count+" billing records and "+crmCount+" CRM records.");
      const active=document.querySelector(".nav-item.active")?.dataset.page;
      window.BillingPages?.renderBillingPage(active||"home");
    }catch(e){ toast("Restore failed: "+e.message); }
  }

  function wire(){
    $("bl-openBilling")&&($("bl-openBilling").onclick=openBilling);
    $("bl-backupBtn")&&($("bl-backupBtn").onclick=backup);
    $("bl-restoreBtn")&&($("bl-restoreBtn").onclick=pickRestore);
    $("bl-restoreFile")&&($("bl-restoreFile").onchange=e=>{ const f=e.target.files[0]; e.target.value=""; restore(f); });
  }
  if(document.readyState!=="loading") setTimeout(wire,100);
  else window.addEventListener("DOMContentLoaded",()=>setTimeout(wire,100));
  window.BillingSettings={openBilling,backup,restore};
})();
