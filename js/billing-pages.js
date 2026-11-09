"use strict";
/* Renderers for the billing screens + Home metrics. Runs after crm.js so it can
   reuse its navigate()/toast(). Each render reads dbService caches via Billing. */
(function(){
  const $ = id => document.getElementById(id);
  const money = n => "₹" + (Number(n)||0).toLocaleString("en-IN",{minimumFractionDigits:0,maximumFractionDigits:0});
  const esc = v => String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const localDate = d => { const x=new Date(d); return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0"); };
  const today = () => localDate(new Date());
  const dISO = d => localDate(d);
  const showDay = (iso,opts) => new Date(iso+"T00:00:00").toLocaleDateString("en-IN",opts);
  const C = () => window.Billing.cache;

  /* ---------- Home metrics (merged Dashboard + Today) ---------- */
  function renderHomeBilling(){
    const inv=C().invoices||[];
    const td=today();
    const todaySales=inv.filter(i=>dISO(i.finalized_at||i.date)===td);
    const salesTotal=todaySales.reduce((s,i)=>s+Number(i.total||0),0);
    const collected=todaySales.reduce((s,i)=>s+Number(i.paid||0),0);
    const dues=inv.reduce((s,i)=>s+Number(i.due||0),0);
    const set=(id,v)=>{const el=$(id); if(el) el.textContent=v;};
    set("bl-home-sales",money(salesTotal));
    set("bl-home-collected",money(collected));
    set("bl-home-due",money(dues));
    set("bl-home-bills",String(todaySales.length));
    // pending collections list
    const byCust=new Map();                                   // one card per customer, total balance
    inv.filter(i=>Number(i.due||0)>0).forEach(i=>{ const k=i.customer_phone; const r=byCust.get(k)||{phone:k,name:i.customer_name||k,due:0,bills:0}; r.due+=Number(i.due||0); r.bills++; if(i.customer_name) r.name=i.customer_name; byCust.set(k,r); });
    const pend=[...byCust.values()].sort((a,b)=>b.due-a.due).slice(0,8);
    const pc=$("bl-home-pending");
    if(pc) pc.innerHTML=pend.length?`<div class="bl-pend-cards">`+pend.map(r=>`<div class="bl-pend-card"><div class="bl-pend-name">${esc(r.name)}</div><div class="bl-pend-due">${money(r.due)}</div>${r.bills>1?`<small class="bl-pend-bills">${r.bills} bills</small>`:""}<button class="bl-btn-sm bl-pend-open" onclick="BillingPages.openAccount('${esc(r.phone)}')">Open</button></div>`).join("")+`</div>`:`<div class="bl-empty">No pending dues. Nice and clean.</div>`;
  }

  /* ---------- Sales Register ---------- */
  function renderSales(){
    const body=$("bl-sales-body"); if(!body) return;
    const q=($("bl-sales-search")?.value||"").toLowerCase();
    const cq=($("bl-sales-cust")?.value||"").toLowerCase();
    const from=($("bl-sales-from")?.value||""), to=($("bl-sales-to")?.value||"");
    // Sales Register lists purchases only — cash loans/udhaar are account entries, not bills.
    let inv=(C().invoices||[]).filter(i=>i.source!=="LOAN").slice()
      .sort((a,b)=>new Date(b.finalized_at||b.date)-new Date(a.finalized_at||a.date));
    if(q) inv=inv.filter(i=>(i.customer_name||"").toLowerCase().includes(q)||(i.customer_phone||"").includes(q)||(i.no||"").toLowerCase().includes(q));
    if(cq) inv=inv.filter(i=>(i.customer_name||"").toLowerCase().includes(cq)||(i.customer_phone||"").includes(cq));
    if(from||to) inv=inv.filter(i=>{const d=dISO(i.finalized_at||i.date); return (!from||d>=from)&&(!to||d<=to);});
    const sum=inv.reduce((a,i)=>{a.total+=Number(i.total||0);a.paid+=Number(i.paid||0);a.due+=Number(i.due||0);return a;},{total:0,paid:0,due:0});
    $("bl-sales-total").textContent=money(sum.total);
    $("bl-sales-paid").textContent=money(sum.paid);
    $("bl-sales-due").textContent=money(sum.due);
    body.innerHTML=inv.length?inv.map(i=>`<tr>
      <td data-label="Bill"><b>${esc(i.no)}</b><br><small>${new Date(i.finalized_at||i.date).toLocaleDateString("en-IN")}</small></td>
      <td data-label="Customer">${esc(i.customer_name||"—")}<br><small>${esc(i.customer_phone||"")}</small></td>
      <td class="bl-r" data-label="Total">${money(i.total)}</td>
      <td class="bl-r" data-label="Paid">${money(i.paid)}</td>
      <td class="bl-r ${Number(i.due)>0?"bl-danger":""}" data-label="Due">${money(i.due)}</td>
      <td class="bl-r" data-label=""><button class="bl-btn-sm" onclick="BillingPages.openAccount('${esc(i.customer_phone)}')">View</button> <button class="bl-link" onclick="Billing.reprint('${esc(i.id)}')">Print</button> <button class="bl-link" onclick="ThangamOS.sendInvoiceWhatsApp('${esc(i.id)}')">WhatsApp</button></td>
    </tr>`).join(""):`<tr><td colspan="6" class="bl-empty">No bills match. Finalize one in POS Billing or clear the filters.</td></tr>`;
  }
  function clearSalesFilters(){ ["bl-sales-search","bl-sales-cust","bl-sales-from","bl-sales-to"].forEach(id=>{const el=$(id); if(el) el.value="";}); renderSales(); }

  /* ---------- Client Accounts (money side) ---------- */
  function renderAccounts(){
    const body=$("bl-acc-body"); if(!body) return;
    const q=($("bl-acc-search")?.value||"").toLowerCase();
    const inv=C().invoices||[];
    const custBy=new Map((C().customers||[]).map(c=>[c.phone,c]));
    const map=new Map();
    inv.forEach(i=>{
      const k=i.customer_phone; if(!k) return;
      const row=map.get(k)||{phone:k,name:i.customer_name||k,place:custBy.get(k)?.place||"",bills:0,total:0,paid:0,due:0};
      row.bills++; row.total+=Number(i.total||0); row.paid+=Number(i.paid||0); row.due+=Number(i.due||0);
      if(i.customer_name) row.name=i.customer_name;
      map.set(k,row);
    });
    // include customers that exist but have no bills yet
    (C().customers||[]).forEach(c=>{ if(!map.has(c.phone)) map.set(c.phone,{phone:c.phone,name:c.name||c.phone,place:c.place||"",bills:0,total:0,paid:0,due:0}); });
    let rows=[...map.values()].sort((a,b)=>b.due-a.due);
    if(q) rows=rows.filter(r=>r.name.toLowerCase().includes(q)||r.phone.includes(q)||(r.place||"").toLowerCase().includes(q));
    body.innerHTML=rows.length?rows.map(r=>`<tr>
      <td data-label="Customer"><b>${esc(r.name)}</b><br><small>${esc(r.phone)}${r.place?" · "+esc(r.place):""}</small></td>
      <td class="bl-r" data-label="Bills">${r.bills}</td>
      <td class="bl-r" data-label="Billed">${money(r.total)}</td>
      <td class="bl-r" data-label="Paid">${money(r.paid)}</td>
      <td class="bl-r ${r.due>0?"bl-danger":""}" data-label="Due">${money(r.due)}</td>
      <td class="bl-r" data-label=""><button class="bl-btn-sm" onclick="BillingPages.openAccount('${esc(r.phone)}')">Open account</button>
        <button class="bl-link" onclick="BillingPages.openCrmProfile('${esc(r.phone)}')">CRM profile</button></td>
    </tr>`).join(""):`<tr><td colspan="6" class="bl-empty">No client accounts yet.</td></tr>`;
  }
  /* ---------- Client Account detail view (matches original ERP) ---------- */
  let accPhone="";
  const fmt = n => "₹"+Math.round(Number(n)||0).toLocaleString("en-IN");
  function custInvoices(phone){
    return (C().invoices||[]).filter(i=>i.customer_phone===phone)
      .sort((a,b)=>new Date(a.finalized_at||a.date)-new Date(b.finalized_at||b.date));
  }
  function openAccount(phone){
    accPhone=phone;
    const c=(C().customers||[]).find(x=>x.phone===phone)||{phone,name:phone};
    const inv=custInvoices(phone);
    const totalDue=inv.reduce((s,i)=>s+Number(i.due||0),0);
    const lifetime=inv.reduce((s,i)=>s+Number(i.total||0),0);
    const pending=inv.filter(i=>Number(i.due||0)>0).length;
    $("blAccName").textContent=c.name||phone;
    $("blAccPhone").textContent=phone+(c.place?" | "+c.place:"");
    $("blAccBalance").textContent=fmt(totalDue);
    // payment section only when something is due
    const pay=$("blAccPaySection"); pay.style.display=totalDue>0?"block":"none";
    if(totalDue>0){
      const unpaid=inv.filter(i=>Number(i.due||0)>0);
      let opt=`<option value="AUTO">[ Auto-Pay Oldest Bills ]</option>`;
      unpaid.forEach(iv=>{ const label=(iv.lines&&iv.lines[0]?iv.lines[0].d:iv.no||iv.id); opt+=`<option value="${esc(iv.id)}">${esc(String(label).substring(0,18))}... (Due: ${fmt(iv.due)})</option>`; });
      $("blAccInvoice").innerHTML=opt; $("blAccAmount").value=""; $("blAccMode").value="Cash";
    }
    // contact buttons
    const digits=String(phone).replace(/\D/g,"");
    $("blAccWa").onclick=()=>window.open("https://wa.me/91"+digits,"_blank");
    $("blAccCall").onclick=()=>window.open("tel:"+phone,"_self");
    // ledger stats + cards
    $("blAccBills").textContent=inv.length;
    $("blAccPending").textContent=pending;
    $("blAccLifetime").textContent=fmt(lifetime);
    $("blAccInvList").innerHTML = inv.length ? [...inv].reverse().map(iv=>{
      const cleared=Number(iv.due||0)<=0;
      const badge=cleared?`<span class="bl-badge bl-badge-ok">CLEARED</span>`:`<span class="bl-badge bl-badge-due">DUE: ${fmt(iv.due)}</span>`;
      const title=(iv.lines&&iv.lines[0]?iv.lines[0].d:iv.no||"Bill");
      const typeTag=iv.source==="LOAN"?`<span class="bl-inv-dettag" style="background:#fdecef;color:#c0314a">LOAN / UDHAAR</span>`
                   :iv.source==="LEGACY_OLD_BILL"?`<span class="bl-inv-dettag" style="background:#fff3e0;color:#9a6a00">OLD BILL</span>`
                   :`<span class="bl-inv-dettag">DETAILS</span>`;
      const logs=(iv.payments&&iv.payments.length)?iv.payments.map(p=>`<div class="bl-rcpt"><span class="bl-rcpt-amt">+ ${fmt(p.amount)} (${esc(p.mode)})</span><span>${new Date(p.date).toLocaleDateString("en-IN")}</span></div>`).join(""):`<div class="bl-rcpt bl-rcpt-none">No payment logs.</div>`;
      // #17: real bill breakdown (line items + totals) for this customer's bill
      const hasItems=iv.source!=="LOAN" && Array.isArray(iv.lines) && iv.lines.length;
      const detail=hasItems?`<div class="bl-billdetail">
        <p class="bl-rcpt-h">Bill details</p>
        <table class="bl-billdetail-t"><thead><tr><th>Item</th><th class="bl-r">Wt g</th><th class="bl-r">Rate</th><th class="bl-r">Making</th><th class="bl-r">Wastage g</th><th class="bl-r">Amount</th></tr></thead>
        <tbody>${iv.lines.map(l=>`<tr><td>${esc(l.d||"")}</td><td class="bl-r">${(Number(l.w)||0).toFixed(3)}</td><td class="bl-r">${fmt(l.r)}</td><td class="bl-r">${fmt(l.c)}</td><td class="bl-r">${(Number(l.wg)||0).toFixed(3)}</td><td class="bl-r">${fmt(l.a)}</td></tr>`).join("")}</tbody></table>
        <div class="bl-billdetail-tot">
          ${Number(iv.discount)>0?`<div><span>Discount</span><b>− ${fmt(iv.discount)}</b></div>`:""}
          ${iv.gst?`<div><span>GST (${iv.gst_rate||0}%)</span><b>${fmt(iv.gst_amount)}</b></div>`:""}
          ${Number(iv.old_gold_credit)>0?`<div><span>Old gold credit</span><b>− ${fmt(iv.old_gold_credit)}</b></div>`:""}
          ${Number(iv.advance_adjusted)>0?`<div><span>Advance adjusted</span><b>− ${fmt(iv.advance_adjusted)}</b></div>`:""}
          <div class="bl-bd-grand"><span>Total</span><b>${fmt(iv.total)}</b></div>
          <div><span>Paid</span><b>${fmt(iv.paid)}</b></div>
          <div class="${Number(iv.due)>0?"bl-bd-due":""}"><span>Balance</span><b>${fmt(iv.due)}</b></div>
        </div></div>`:"";
      return `<div class="bl-inv-card ${cleared?"":"bl-inv-card-due"}">
        <div class="bl-inv-card-head" onclick="this.nextElementSibling.classList.toggle('bl-hidden')">
          <div><p class="bl-inv-title">${esc(title)} ${typeTag}</p>
            <p class="bl-inv-sub">${new Date(iv.finalized_at||iv.date).toLocaleDateString("en-IN")} | Total: ${fmt(iv.total)}</p></div>
          ${badge}
        </div>
        <div class="bl-inv-card-body bl-hidden">
          <div class="bl-inv-ref"><span>INVOICE REF</span><b>${esc(iv.no||iv.id)}</b></div>
          ${detail}
          ${iv.source!=="LOAN"?`<button class="button secondary bl-viewbill" onclick="event.stopPropagation();BillingPages.viewFullBill('${esc(iv.id)}')">🧾 View / print full A4 bill</button>`:""}
          <div class="bl-rcpt-box"><p class="bl-rcpt-h">Receipt Logs</p>${logs}</div>
        </div>
      </div>`;
    }).join("") : `<p class="bl-empty">No purchase history found.</p>`;
    $("blAccModal").hidden=false;
  }
  function closeAccount(){ $("blAccModal").hidden=true; accPhone=""; }
  async function applyAccountPayment(){
    const amt=+($("blAccAmount").value||0);
    const mode=$("blAccMode").value;
    const target=$("blAccInvoice").value;
    if(!(amt>0)) return toast("Enter a valid amount.");
    try{
      await dbService.applyPayment(accPhone,amt,mode,target);
      await window.Billing.loadCache();
      openAccount(accPhone);          // refresh the open view
      renderAccounts(); renderSales(); renderHomeBilling();
      try{ await window.ThangamOS?.afterAccountPayment?.(accPhone,amt,mode,target); }catch(e){ console.warn('ThangamOS payment hook',e); }
      toast("Payment of "+fmt(amt)+" logged.");
    }catch(e){ toast(e.message); }
  }
  function openCrmProfile(phone){
    const c=(C().customers||[]).find(x=>x.phone===phone);
    if(window.CRMBridge?.openByPhone) window.CRMBridge.openByPhone(phone,c);
    else toast("Open Customers to view the CRM profile.");
  }


  /* ---------- Client Account onboarding / legacy bill migration ---------- */
  /* ---------- premium modal helper (replaces native prompt dialogs) ---------- */
  function blModal(title, fields, onSubmit, submitLabel){
    document.getElementById("blModal")?.remove();
    const body=fields.map(f=>{
      if(f.type==="static") return `<div class="bl-m-static">${f.label}</div>`;
      const req=f.required?' <span class="bl-m-req">*</span>':"";
      const attr=`id="blm-${f.key}" ${f.input==="number"?'type="number"':f.input==="date"?'type="date"':'type="text"'} ${f.step?`step="${f.step}"`:""} ${f.placeholder?`placeholder="${esc(f.placeholder)}"`:""} ${f.value!=null?`value="${esc(f.value)}"`:""} ${f.readonly?"readonly":""} ${f.inputmode?`inputmode="${f.inputmode}"`:""}`;
      return `<label class="bl-m-field ${f.full?"bl-m-full":""}"><span>${esc(f.label)}${req}</span><input ${attr}></label>`;
    }).join("");
    const wrap=document.createElement("div");
    wrap.id="blModal"; wrap.className="bl-modal-overlay";
    wrap.innerHTML=`<div class="bl-modal-sheet"><div class="bl-modal-head"><h2>${esc(title)}</h2><button class="bl-modal-x" aria-label="Close">✕</button></div>
      <div class="bl-modal-grid">${body}</div>
      <div class="bl-modal-actions"><button class="button secondary" data-cancel>Cancel</button><button class="button primary" data-ok>${esc(submitLabel||"Save")}</button></div></div>`;
    document.body.appendChild(wrap);
    const val=k=>{const el=document.getElementById("blm-"+k);return el?el.value:"";};
    const setv=(k,v)=>{const el=document.getElementById("blm-"+k);if(el)el.value=v;};
    const close=()=>wrap.remove();
    wrap.querySelector(".bl-modal-x").onclick=close;
    wrap.querySelector("[data-cancel]").onclick=close;
    wrap.addEventListener("click",e=>{ if(e.target===wrap) close(); });
    // live recompute hook (e.g. balance)
    if(onSubmit.recompute){ wrap.querySelectorAll("input").forEach(i=>i.addEventListener("input",()=>onSubmit.recompute(val,setv))); onSubmit.recompute(val,setv); }
    wrap.querySelector("[data-ok]").onclick=async()=>{ try{ const ok=await onSubmit(val,setv,close); if(ok!==false) close(); }catch(e){ console.warn(e); } };
    const first=wrap.querySelector("input:not([readonly])"); if(first) first.focus();
    return {val,setv,close};
  }
  const normPhone = v => String(v||"").replace(/\D/g,"").slice(-10);
  // #19: when a known phone is typed in a modal, auto-fill name / place / address
  function wirePhoneAutofill(){
    const ph=document.getElementById("blm-phone"); if(!ph) return;
    ph.addEventListener("input",()=>{
      const p=normPhone(ph.value); if(p.length!==10) return;
      const c=(C().customers||[]).find(x=>normPhone(x.phone)===p); if(!c) return;
      const set=(id,v)=>{ const el=document.getElementById(id); if(el&&!el.value.trim()&&v) el.value=v; };
      set("blm-name",c.name); set("blm-place",c.place); set("blm-address",c.address);
    });
  }

  async function addAccountCustomer(){
    blModal("Add Customer",[
      {key:"name",label:"Customer name",required:true,placeholder:"Full name"},
      {key:"phone",label:"Mobile number",required:true,input:"number",inputmode:"numeric",placeholder:"10-digit mobile"},
      {key:"place",label:"Place",required:true,placeholder:"Town / area"},
      {key:"address",label:"Address",full:true,placeholder:"Door no, street (optional)"},
      {key:"email",label:"Email",full:true,placeholder:"Optional"}
    ], async (val)=>{
      const name=val("name").trim(), phone=normPhone(val("phone")), place=val("place").trim();
      if(!name) return toast("Customer name is required."),false;
      if(phone.length!==10) return toast("Enter a valid 10-digit mobile number."),false;
      if(!place) return toast("Place is required."),false;
      if((C().customers||[]).some(x=>x.phone===phone)){ toast("Customer already exists — opening account."); openAccount(phone); return true; }
      const row={phone,name,place,address:val("address").trim(),email:val("email").trim(),created_at:new Date().toISOString(),updated_at:new Date().toISOString(),sync_state:"pending",shop_id:"local-shop"};
      await dbService.put("customers",row); try{window.CRMData?.upsertCustomer?.({name,phone,place,area:place})}catch(_){}
      await window.Billing.loadCache(); renderAccounts(); toast("Customer added to Client Accounts."); openAccount(phone);
      return true;
    },"Add customer");
    wirePhoneAutofill();
  }

  async function ensureCustomer(phone,name,place){
    let c=(C().customers||[]).find(x=>x.phone===phone);
    if(c) return c;
    c={phone,name,place,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),sync_state:"pending",shop_id:"local-shop"};
    await dbService.put("customers",c); try{window.CRMData?.upsertCustomer?.({name,phone,place,area:place})}catch(_){}
    return c;
  }

  async function addOldBill(){
    const m=blModal("Add Old Bill",[
      {key:"phone",label:"Customer mobile",required:true,input:"number",inputmode:"numeric",placeholder:"10-digit mobile"},
      {key:"name",label:"Customer name",required:true,placeholder:"Name (if new customer)"},
      {key:"place",label:"Place",required:true,placeholder:"Town / area (if new)"},
      {key:"ref",label:"Bill / invoice no",required:true,value:"OLD-"},
      {key:"date",label:"Bill date",input:"date",value:new Date().toISOString().slice(0,10)},
      {key:"desc",label:"What they purchased",full:true,value:"Previous jewellery purchase"},
      {key:"total",label:"Bill value ₹",required:true,input:"number",step:"0.01",placeholder:"0.00"},
      {key:"paid",label:"Paid ₹",input:"number",step:"0.01",value:"0"},
      {key:"bal",label:"Balance ₹ (auto)",input:"number",readonly:true,value:"0"}
    ], async (val)=>{
      const phone=normPhone(val("phone")), name=val("name").trim(), place=val("place").trim();
      if(phone.length!==10) return toast("Enter a valid 10-digit mobile number."),false;
      const existing=(C().customers||[]).find(x=>x.phone===phone);
      if(!existing){ if(!name) return toast("Enter the customer name."),false; if(!place) return toast("Place is required."),false; }
      const ref=val("ref").trim(); if(!ref) return toast("Enter the bill number."),false;
      const total=Number(val("total")||0), paid=Number(val("paid")||0);
      if(!(total>0)) return toast("Enter the bill value."),false;
      if(!(paid>=0)||paid>total) return toast("Paid cannot exceed the bill value."),false;
      const c=await ensureCustomer(phone, name||existing?.name||phone, place||existing?.place||"");
      const date=val("date").trim(), due=Math.max(0,total-paid), now=new Date().toISOString();
      const inv={id:"OLD-"+Date.now(),no:ref,date,customer_phone:phone,customer_name:c.name||phone,lines:[{d:val("desc").trim()||"Previous jewellery purchase",w:0,r:0,c:0,a:total}],old:[],gst:false,gst_rate:0,subtotal:total,discount:0,taxable:total,gst_amount:0,old_gold_credit:0,total,paid,due,pay_mode:"Legacy",payments:paid>0?[{id:"PAY-"+Date.now(),amount:paid,mode:"Legacy opening",date:date||now}]:[],status:"FINAL",source:"LEGACY_OLD_BILL",finalized_at:date?date+"T12:00:00":now,created_at:now,updated_at:now,sync_state:"pending",shop_id:"local-shop"};
      await dbService.put("invoices",inv); await window.Billing.loadCache(); renderAccounts(); renderSales();
      toast(due>0?"Old bill added — balance pending.":"Old bill added — fully paid."); openAccount(phone);
      return true;
    },"Add old bill");
    // live balance = value − paid
    m && (document.getElementById("blModal")?.querySelectorAll("input").forEach(i=>i.addEventListener("input",()=>{
      const t=Number(document.getElementById("blm-total")?.value||0), p=Number(document.getElementById("blm-paid")?.value||0);
      const b=document.getElementById("blm-bal"); if(b) b.value=(Math.max(0,t-p)).toFixed(2);
    })));
    wirePhoneAutofill();
  }

  async function addLoan(){
    blModal("Record Borrowed Money (Loan / Udhaar)",[
      {key:"phone",label:"Customer mobile",required:true,input:"number",inputmode:"numeric",placeholder:"10-digit mobile"},
      {key:"name",label:"Customer name",required:true,placeholder:"Name (if new customer)"},
      {key:"place",label:"Place",required:true,placeholder:"Town / area (if new)"},
      {key:"amount",label:"Amount borrowed ₹",required:true,input:"number",step:"0.01",placeholder:"0.00"},
      {key:"date",label:"Date",input:"date",value:new Date().toISOString().slice(0,10)},
      {key:"note",label:"Note",full:true,placeholder:"Reason / reference (optional)"}
    ], async (val)=>{
      const phone=normPhone(val("phone")), name=val("name").trim(), place=val("place").trim();
      if(phone.length!==10) return toast("Enter a valid 10-digit mobile number."),false;
      const existing=(C().customers||[]).find(x=>x.phone===phone);
      if(!existing){ if(!name) return toast("Enter the customer name."),false; if(!place) return toast("Place is required."),false; }
      const amount=Number(val("amount")||0);
      if(!(amount>0)) return toast("Enter the amount borrowed."),false;
      const c=await ensureCustomer(phone, name||existing?.name||phone, place||existing?.place||"");
      const date=val("date").trim(), now=new Date().toISOString(), note=val("note").trim();
      // Loan = its own ledger line. Adds to the client's Due, tagged distinctly (not a sale).
      const inv={id:"LOAN-"+Date.now(),no:"LOAN-"+String(Date.now()).slice(-6),date,customer_phone:phone,customer_name:c.name||phone,lines:[{d:note||"Cash loan / Udhaar",w:0,r:0,c:0,a:amount}],old:[],gst:false,gst_rate:0,subtotal:amount,discount:0,taxable:amount,gst_amount:0,old_gold_credit:0,total:amount,paid:0,due:amount,pay_mode:"Loan",payments:[],note,status:"FINAL",source:"LOAN",finalized_at:date?date+"T12:00:00":now,created_at:now,updated_at:now,sync_state:"pending",shop_id:"local-shop"};
      await dbService.put("invoices",inv); await window.Billing.loadCache(); renderAccounts();
      toast("Loan recorded in the customer account."); openAccount(phone);
      return true;
    },"Record loan");
    wirePhoneAutofill();
  }

  /* ---------- Repairs ---------- */
  let repairPhotoData="";
  function repairLookup(){
    const key=($("bl-rep-phone").value||"").trim(); if(!key) return;
    let c=(C().customers||[]).find(x=>x.phone===key);
    if(!c){ const cc=window.CRMData?.getCustomer?.(key); if(cc) c={name:cc.name}; }
    if(c){ $("bl-rep-name").value=c.name||""; toast("Existing customer loaded."); }
  }
  async function repairPhoto(input){
    try{ repairPhotoData=await window.Billing.compressImage(input.files&&input.files[0]); }catch(_){ repairPhotoData=""; }
    const prev=$("bl-rep-photo-prev"); if(prev){ prev.src=repairPhotoData; prev.style.display=repairPhotoData?"block":"none"; }
  }
  function renderRepairs(){
    const body=$("bl-rep-body"); if(!body) return;
    const reps=(C().repairs||[]).slice().sort((a,b)=>new Date(a.expected_date)-new Date(b.expected_date));
    body.innerHTML=reps.length?reps.map(r=>`<tr>
      <td><b>${esc(r.customer_name||"")}</b><br><small>${esc(r.customer_phone||"")}</small></td>
      <td><b>${esc(r.item||"")}</b><br><small>${esc(r.problem||"")}</small></td>
      <td>${r.expected_date?new Date(r.expected_date).toLocaleDateString("en-IN"):"—"}</td>
      <td><span class="bl-tag bl-tag-${(r.status||"").replace(/\s/g,"")}">${esc(r.status||"")}</span></td>
      <td class="bl-r">${r.status==="Under Repair"?`<button class="bl-btn-sm" onclick="BillingPages.repairStatus('${esc(r.id)}','Ready')">Mark ready</button>`:r.status==="Ready"?`<button class="bl-btn-sm" onclick="BillingPages.repairStatus('${esc(r.id)}','Delivered')">Mark delivered</button>`:"—"}</td>
    </tr>`).join(""):`<tr><td colspan="5" class="bl-empty">No repairs logged.</td></tr>`;
  }
  async function saveRepair(){
    if(!window.Access?.canWrite?.()) return toast("Read-only mode.");
    const phone=($("bl-rep-phone").value||"").trim(), name=($("bl-rep-name").value||"").trim();
    const item=$("bl-rep-item").value.trim(), prob=$("bl-rep-problem").value.trim(), dt=$("bl-rep-date").value;
    if(!phone||!item||!dt) return toast("Mobile number, item and expected date are required.");
    const c=(C().customers||[]).find(x=>x.phone===phone);
    const r={id:"REP-"+Date.now(),customer_phone:phone,customer_name:name||(c?c.name:"")||"Customer",item,problem:prob,expected_date:dt,img:repairPhotoData,status:"Under Repair",created_at:new Date().toISOString(),shop_id:"local-shop",updated_at:new Date().toISOString(),sync_state:"pending"};
    await dbService.put("repairs",r);
    // keep the customer record in sync (phone is the key)
    if(!c && name){ try{ await dbService.put("customers",{phone,name,updated_at:new Date().toISOString(),sync_state:"pending",shop_id:"local-shop"}); }catch(_){} }
    try{ window.CRMData?.upsertCustomer({name,phone}); }catch(_){}
    ["bl-rep-phone","bl-rep-name","bl-rep-item","bl-rep-problem","bl-rep-date"].forEach(id=>{const e=$(id); if(e) e.value="";});
    repairPhotoData=""; const fi=$("bl-rep-photo"); if(fi) fi.value=""; const pv=$("bl-rep-photo-prev"); if(pv){ pv.src=""; pv.style.display="none"; }
    await window.Billing.loadCache(); renderRepairs(); toast("Repair logged.");
  }
  async function repairStatus(id,status){
    const r=(C().repairs||[]).find(x=>x.id===id); if(!r) return;
    r.status=status; r.updated_at=new Date().toISOString(); r.sync_state="pending";
    await dbService.put("repairs",r); await window.Billing.loadCache(); renderRepairs();
    toast("Repair marked "+status+".");
  }

  /* ---------- Estimates ---------- */
  async function saveEstimate(){
    const snap=window.Billing.snapshot();
    if(!snap.lines.length) return toast("Add items before saving an estimate.");
    const est={ id:"EST-"+Date.now(), no:"EST-"+new Date().getFullYear()+"-"+String(Date.now()).slice(-6),
      date:new Date().toISOString(), customer_phone:snap.customer.phone, customer_name:snap.customer.name,
      lines:snap.lines, old:snap.old, gst:snap.gst, gst_rate:snap.gst_rate, totals:snap.totals, status:"ESTIMATE" };
    await dbService.saveEstimate(est); await window.Billing.loadCache();
    toast("Estimate "+est.no+" saved."); renderEstimates();
  }
  function renderEstimates(){
    const body=$("bl-est-body"); if(!body) return;
    const rows=(C().estimates||[]).slice().sort((a,b)=>new Date(b.date)-new Date(a.date));
    body.innerHTML=rows.length?rows.map(e=>`<tr>
      <td><b>${esc(e.no)}</b><br><small>${new Date(e.date).toLocaleDateString("en-IN")}</small></td>
      <td>${esc(e.customer_name||"—")}<br><small>${esc(e.customer_phone||"")}</small></td>
      <td class="bl-r">${money(e.totals?.pay||0)}</td>
      <td class="bl-r"><button class="bl-btn-sm" onclick="BillingPages.convertEstimate('${esc(e.id)}')">Convert to bill</button></td>
    </tr>`).join(""):`<tr><td colspan="4" class="bl-empty">No estimates saved.</td></tr>`;
  }
  function convertEstimate(id){
    const e=(C().estimates||[]).find(x=>x.id===id); if(!e) return;
    window.Billing.loadSnapshot({customer:{phone:e.customer_phone,name:e.customer_name},lines:e.lines,old:e.old,totals:e.totals,gst:e.gst,gst_rate:e.gst_rate,pay_mode:"Cash"});
    window.navigateTo&&window.navigateTo("pos");
    toast("Estimate loaded into POS. Review and finalize.");
  }

  /* ---------- Orders & Advance ---------- */
  let orderPhotoData="";
  function orderLookup(){
    const key=($("bl-ord-phone").value||"").trim(); if(!key) return;
    let c=(C().customers||[]).find(x=>x.phone===key);
    if(!c){ const cc=window.CRMData?.getCustomer?.(key); if(cc) c={name:cc.name}; }
    if(c){ $("bl-ord-name").value=c.name||""; toast("Existing customer loaded."); }
  }
  async function orderPhoto(input){
    try{ orderPhotoData=await window.Billing.compressImage(input.files&&input.files[0]); }catch(_){ orderPhotoData=""; }
    const prev=$("bl-ord-photo-prev"); if(prev){ prev.src=orderPhotoData; prev.style.display=orderPhotoData?"block":"none"; }
  }
  async function saveOrder(){
    if(!window.Access?.canWrite?.()) return toast("Read-only mode.");
    const phone=$("bl-ord-phone").value.trim(), name=$("bl-ord-name").value.trim();
    const item=$("bl-ord-item").value.trim(), adv=+$("bl-ord-advance").value||0, dd=$("bl-ord-date").value;
    if(!phone||!name||!item||!dd) return toast("Mobile, name, item and delivery date are required.");
    const o={ id:"ORD-"+Date.now(), customer_phone:phone, customer_name:name, item, advance:adv,
      delivery_date:dd, status:"Booked", note:$("bl-ord-note").value.trim(), img:orderPhotoData, created_at:new Date().toISOString() };
    await dbService.saveOrder(o);
    if(adv>0){
      // record advance as a credit note on the customer account via a zero-item advance invoice
      const invId="ADV-"+Date.now();
      const snap={ id:invId, no:invId, date:new Date().toLocaleString("en-IN"), shop_id:"local-shop",
        customer:{phone,name}, lines:[{d:"Advance for order "+o.id,h:"",p:"—",w:0,r:0,c:adv,a:adv}], old:[],
        gst:false, gst_rate:0, pay_mode:"Cash",
        totals:{sub:adv,dis:0,tv:adv,gst:0,og:0,pay:adv,rec:adv,due:0}, source:"ADVANCE", order_id:o.id };
      try{ await dbService.finalizeBill(snap); }catch(_){}
    }
    try{ window.CRMData?.upsertCustomer({name,phone}); }catch(_){}
    ["bl-ord-phone","bl-ord-name","bl-ord-item","bl-ord-advance","bl-ord-date","bl-ord-note"].forEach(id=>{const el=$(id); if(el) el.value="";});
    orderPhotoData=""; const fi=$("bl-ord-photo"); if(fi) fi.value=""; const pv=$("bl-ord-photo-prev"); if(pv){ pv.src=""; pv.style.display="none"; }
    await window.Billing.loadCache(); renderOrders(); toast("Order booked.");
  }
  function renderOrders(){
    const body=$("bl-ord-body"); if(!body) return;
    const rows=(C().orders||[]).slice().sort((a,b)=>new Date(a.delivery_date)-new Date(b.delivery_date));
    body.innerHTML=rows.length?rows.map(o=>`<tr>
      <td><b>${esc(o.customer_name)}</b><br><small>${esc(o.customer_phone)}</small></td>
      <td>${esc(o.item)}</td>
      <td>${o.delivery_date?new Date(o.delivery_date).toLocaleDateString("en-IN"):"—"}</td>
      <td class="bl-r">${money(o.advance||0)}</td>
      <td><span class="bl-tag bl-tag-${esc(o.status)}">${esc(o.status)}</span></td>
      <td class="bl-r">${o.status!=="Delivered"?`<button class="bl-btn-sm" onclick="BillingPages.billOrder('${esc(o.id)}')">Bill order</button>`:"—"}</td>
    </tr>`).join(""):`<tr><td colspan="6" class="bl-empty">No orders booked.</td></tr>`;
  }
  function billOrder(id){
    const o=(C().orders||[]).find(x=>x.id===id); if(!o) return;
    window.Billing.resetBill();
    $("bl-phone").value=o.customer_phone; $("bl-name").value=o.customer_name;
    window.navigateTo&&window.navigateTo("pos");
    window.Billing.setEditingOrder(id,o.advance||0);
    toast(o.advance>0?`Advance ₹${o.advance} will be deducted automatically — add items, then finalize.`:"Add items, then finalize.");
  }

  /* ---------- Day-End Closing ---------- */
  let dayExpenses=[];
  function dayTotals(){
    const td=today();
    const inv=(C().invoices||[]).filter(i=>dISO(i.finalized_at||i.date)===td);
    const byMode={Cash:0,UPI:0,Card:0};
    let sales=0,collected=0,advances=0;
    inv.forEach(i=>{ sales+=Number(i.total||0); collected+=Number(i.paid||0);
      if(i.source==="ADVANCE") advances+=Number(i.paid||0);
      const m=i.pay_mode||"Cash"; byMode[m]=(byMode[m]||0)+Number(i.paid||0); });
    return {inv,byMode,sales,collected,advances};
  }
  function renderDayEnd(){
    if(!$("bl-de-metrics")) return;
    dayExpenses=dayExpenses||[];
    const t=dayTotals();
    $("bl-de-date").textContent=new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
    // already closed today?
    const closed=(C_dayend()).find(d=>d.date===today());
    const st=$("bl-de-status");
    if(st){ st.textContent=closed?"CLOSED":"OPEN"; st.className="bl-de-status "+(closed?"bl-de-closed":"bl-de-open"); }
    $("bl-de-metrics").innerHTML=`
      <div class="bl-metric"><span>Bills today</span><strong>${t.inv.length}</strong></div>
      <div class="bl-metric"><span>Sales value</span><strong>${money(t.sales)}</strong></div>
      <div class="bl-metric"><span>Collected</span><strong>${money(t.collected)}</strong></div>
      <div class="bl-metric bl-metric-cash"><span>Cash</span><strong>${money(t.byMode.Cash||0)}</strong></div>
      <div class="bl-metric"><span>UPI</span><strong>${money(t.byMode.UPI||0)}</strong></div>
      <div class="bl-metric"><span>Card</span><strong>${money(t.byMode.Card||0)}</strong></div>`;
    renderExpenses(); recalcDayEnd(); renderHistory();
  }
  function renderExpenses(){
    const el=$("bl-de-explist"); if(!el) return;
    el.innerHTML=dayExpenses.length?dayExpenses.map((e,i)=>`<div class="bl-de-exprow-item"><span>${esc(e.note||"Expense")}</span><b>${money(e.amount)}</b><button class="bl-x" onclick="BillingPages.removeExpense(${i})">×</button></div>`).join(""):`<div class="bl-empty">No cash expenses added.</div>`;
  }
  function addExpense(){
    const note=($("bl-de-expnote").value||"").trim(); const amt=+($("bl-de-expamt").value||0);
    if(!(amt>0)) return toast("Enter an expense amount.");
    dayExpenses.push({note,amount:amt});
    $("bl-de-expnote").value=""; $("bl-de-expamt").value="";
    renderExpenses(); recalcDayEnd();
  }
  function removeExpense(i){ dayExpenses.splice(i,1); renderExpenses(); recalcDayEnd(); }
  function recalcDayEnd(){
    const t=dayTotals();
    const float=+($("bl-de-float")?.value||0);
    const expense=dayExpenses.reduce((s,e)=>s+Number(e.amount||0),0);
    const cashIn=t.byMode.Cash||0;
    const expected=float+cashIn-expense;
    const counted=$("bl-de-counted").value===""?null:+$("bl-de-counted").value;
    const set=(id,v)=>{const e=$(id); if(e) e.textContent=v;};
    set("bl-de-cashin",money(cashIn)); set("bl-de-expout",money(expense)); set("bl-de-expected",money(expected));
    const vEl=$("bl-de-variance");
    if(counted===null){ vEl.textContent="—"; vEl.className=""; }
    else { const v=counted-expected; vEl.textContent=(v>=0?"+ ":"− ")+money(Math.abs(v)); vEl.className=v===0?"bl-de-ok":"bl-de-off"; }
  }
  function C_dayend(){ return C().__dayend||[]; }
  async function refreshDayEndCache(){ try{ C().__dayend=await dbService.getAll("dayend_closings"); }catch(_){ C().__dayend=[]; } }
  function renderHistory(){
    const body=$("bl-de-history"); if(!body) return;
    const rows=(C_dayend()).slice().sort((a,b)=>b.date.localeCompare(a.date));
    body.innerHTML=rows.length?rows.map(r=>`<tr>
      <td><b>${showDay(r.date)}</b></td>
      <td class="bl-r">${r.bills}</td>
      <td class="bl-r">${money(r.sales)}</td>
      <td class="bl-r">${money(r.collected)}</td>
      <td class="bl-r ${(r.variance||0)===0?"":"bl-danger"}">${(r.variance>0?"+ ":r.variance<0?"− ":"")}${money(Math.abs(r.variance||0))}</td>
      <td class="bl-r"><button class="bl-btn-sm" onclick="BillingPages.reprintDay('${r.date}')">Slip</button></td>
    </tr>`).join(""):`<tr><td colspan="6" class="bl-empty">No past closings.</td></tr>`;
  }
  async function closeDay(){
    if(!window.Access?.canWrite?.()) return toast("Read-only mode.");
    const t=dayTotals();
    const float=+($("bl-de-float")?.value||0);
    const expense=dayExpenses.reduce((s,e)=>s+Number(e.amount||0),0);
    const cashIn=t.byMode.Cash||0;
    const expected=float+cashIn-expense;
    const counted=$("bl-de-counted").value===""?expected:+$("bl-de-counted").value;
    const rec={id:"DAY-"+today(),date:today(),bills:t.inv.length,sales:t.sales,collected:t.collected,
      by_mode:t.byMode,opening_float:float,expenses:dayExpenses.slice(),expense_total:expense,
      expected_cash:expected,counted_cash:counted,variance:counted-expected,closed_at:new Date().toISOString()};
    await dbService.saveDayEnd(rec);
    await refreshDayEndCache();
    buildDaySlip(rec); doSlipPrint();
    renderDayEnd();
    toast("Day closed. Slip ready to print.");
  }
  function currentDraftRec(){
    const t=dayTotals();
    const float=+($("bl-de-float")?.value||0);
    const expense=dayExpenses.reduce((s,e)=>s+Number(e.amount||0),0);
    const cashIn=t.byMode.Cash||0; const expected=float+cashIn-expense;
    const counted=$("bl-de-counted").value===""?expected:+$("bl-de-counted").value;
    return {date:today(),bills:t.inv.length,sales:t.sales,collected:t.collected,by_mode:t.byMode,
      opening_float:float,expenses:dayExpenses.slice(),expense_total:expense,expected_cash:expected,
      counted_cash:counted,variance:counted-expected,closed_at:new Date().toISOString()};
  }
  function printDaySlipCurrent(){ buildDaySlip(currentDraftRec()); doSlipPrint(); }
  function reprintDay(date){ const r=(C_dayend()).find(d=>d.date===date); if(r){ buildDaySlip(r); doSlipPrint(); } }
  function buildDaySlip(rec){
    const s=window.Billing.settings;
    const v=rec.variance||0;
    $("bl-dayslip").innerHTML=`
      <div class="bl-slip">
        <h2>${esc(s.shop||"JEWELOS")}</h2>
        <p class="bl-slip-sub">DAY-END CLOSING</p>
        <p class="bl-slip-date">${showDay(rec.date,{weekday:"short",day:"numeric",month:"short",year:"numeric"})}</p>
        <div class="bl-slip-sep"></div>
        <div class="bl-slip-row"><span>Bills</span><b>${rec.bills}</b></div>
        <div class="bl-slip-row"><span>Sales value</span><b>${money(rec.sales)}</b></div>
        <div class="bl-slip-row"><span>Collected</span><b>${money(rec.collected)}</b></div>
        <div class="bl-slip-sep"></div>
        <div class="bl-slip-row"><span>Cash</span><b>${money(rec.by_mode.Cash||0)}</b></div>
        <div class="bl-slip-row"><span>UPI</span><b>${money(rec.by_mode.UPI||0)}</b></div>
        <div class="bl-slip-row"><span>Card</span><b>${money(rec.by_mode.Card||0)}</b></div>
        <div class="bl-slip-sep"></div>
        <div class="bl-slip-row"><span>Opening float</span><b>${money(rec.opening_float)}</b></div>
        <div class="bl-slip-row"><span>Cash expenses</span><b>${money(rec.expense_total)}</b></div>
        ${(rec.expenses||[]).map(e=>`<div class="bl-slip-exp">· ${esc(e.note||"Expense")} ${money(e.amount)}</div>`).join("")}
        <div class="bl-slip-row"><span>Expected cash</span><b>${money(rec.expected_cash)}</b></div>
        <div class="bl-slip-row"><span>Counted cash</span><b>${money(rec.counted_cash)}</b></div>
        <div class="bl-slip-row bl-slip-var"><span>Variance</span><b>${(v>0?"+ ":v<0?"− ":"")}${money(Math.abs(v))}</b></div>
        <div class="bl-slip-sep"></div>
        <p class="bl-slip-foot">Closed ${new Date(rec.closed_at).toLocaleString("en-IN")}</p>
      </div>`;
  }
  function doSlipPrint(){ document.body.classList.add("bl-printing-slip"); setTimeout(()=>{window.print();document.body.classList.remove("bl-printing-slip");},60); }

  /* ---------- #20 Places (area directory) ---------- */
  function placeCodeOf(name){
    const s=window.Billing?.settings||{}; const codes=s.placeCodes||{};
    if(codes[name]) return codes[name];
    return (String(name||"").replace(/[^a-zA-Z]/g,"").slice(0,3)||"GEN").toUpperCase();
  }
  async function savePlaceCode(name,code){
    try{
      const s=window.Billing.settings||{}; s.placeCodes=s.placeCodes||{};
      s.placeCodes[name]=String(code||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,4)||placeCodeOf(name);
      window.Billing.settings=s; await window.Billing.saveSettingsToDB?.();
      toast("Place code saved.");
    }catch(_){ toast("Could not save code."); }
  }
  function placeAggregates(){
    const custBy=new Map((C().customers||[]).map(c=>[c.phone,c]));
    const map=new Map();
    // seed from customers (so places with no bills still show)
    (C().customers||[]).forEach(c=>{ const pl=(c.place||"").trim()||"— No place —"; const r=map.get(pl)||{place:pl,phones:new Set(),billed:0,paid:0,due:0,bills:0}; r.phones.add(c.phone); map.set(pl,r); });
    (C().invoices||[]).forEach(i=>{ const pl=((custBy.get(i.customer_phone)?.place)||"").trim()||"— No place —"; const r=map.get(pl)||{place:pl,phones:new Set(),billed:0,paid:0,due:0,bills:0}; r.phones.add(i.customer_phone); r.billed+=+i.total||0; r.paid+=+i.paid||0; r.due+=+i.due||0; r.bills++; map.set(pl,r); });
    return [...map.values()].map(r=>({...r,clients:r.phones.size})).sort((a,b)=> b.due-a.due || b.billed-a.billed);
  }
  function renderPlaces(){
    const list=$("bl-places-list"); if(!list) return;
    $("bl-place-detail")?.classList.add("bl-hidden"); list.classList.remove("bl-hidden");
    const q=($("bl-places-search")?.value||"").toLowerCase();
    let rows=placeAggregates();
    if(q) rows=rows.filter(r=>r.place.toLowerCase().includes(q)||placeCodeOf(r.place).toLowerCase().includes(q));
    list.innerHTML=rows.length?`<div class="bl-place-grid">${rows.map(r=>`
      <div class="bl-place-card" onclick="BillingPages.openPlace('${esc(r.place).replace(/'/g,"\\'")}')">
        <div class="bl-place-top">
          <input class="bl-place-code" value="${esc(placeCodeOf(r.place))}" title="Short code" onclick="event.stopPropagation()" onchange="BillingPages.savePlaceCode('${esc(r.place).replace(/'/g,"\\'")}',this.value)">
          <b class="bl-place-name">${esc(r.place)}</b>
        </div>
        <div class="bl-place-stats">
          <div><span>Clients</span><b>${r.clients}</b></div>
          <div><span>Lifetime</span><b>${money(r.billed)}</b></div>
          <div><span>Pending</span><b class="${r.due>0?"bl-danger":""}">${money(r.due)}</b></div>
        </div>
      </div>`).join("")}</div>`
      : `<p class="bl-empty">No places yet. They appear automatically as you bill customers with a place.</p>`;
  }
  function openPlace(place){
    const list=$("bl-places-list"), box=$("bl-place-detail"); if(!box) return;
    list.classList.add("bl-hidden"); box.classList.remove("bl-hidden");
    const custBy=new Map((C().customers||[]).map(c=>[c.phone,c]));
    const due=new Map();
    (C().invoices||[]).forEach(i=>{ const pl=((custBy.get(i.customer_phone)?.place)||"").trim()||"— No place —"; if(pl!==place)return; const r=due.get(i.customer_phone)||{phone:i.customer_phone,name:i.customer_name||i.customer_phone,billed:0,due:0,bills:0}; r.billed+=+i.total||0; r.due+=+i.due||0; r.bills++; if(i.customer_name)r.name=i.customer_name; due.set(i.customer_phone,r); });
    // include customers of this place with no bills
    (C().customers||[]).forEach(c=>{ const pl=(c.place||"").trim()||"— No place —"; if(pl!==place)return; if(!due.has(c.phone)) due.set(c.phone,{phone:c.phone,name:c.name||c.phone,billed:0,due:0,bills:0}); });
    const people=[...due.values()].sort((a,b)=> b.due-a.due || a.name.localeCompare(b.name));
    const totDue=people.reduce((s,p)=>s+p.due,0), totBilled=people.reduce((s,p)=>s+p.billed,0);
    box.innerHTML=`<button class="button secondary" onclick="BillingPages.renderPlaces()">← All places</button>
      <div class="page-heading" style="margin-top:12px"><div><h2>${esc(placeCodeOf(place))} — ${esc(place)}</h2><p>${people.length} clients · Lifetime ${money(totBilled)} · Pending ${money(totDue)}</p></div></div>
      <div class="table-card"><div class="table-scroll"><table><thead><tr><th>Customer</th><th class="bl-r">Bills</th><th class="bl-r">Billed</th><th class="bl-r">Pending</th><th></th></tr></thead>
      <tbody>${people.length?people.map(p=>`<tr>
        <td data-label="Customer"><b>${esc(p.name)}</b><br><small>${esc(p.phone)}</small></td>
        <td class="bl-r" data-label="Bills">${p.bills}</td>
        <td class="bl-r" data-label="Billed">${money(p.billed)}</td>
        <td class="bl-r ${p.due>0?"bl-danger":""}" data-label="Pending">${money(p.due)}</td>
        <td class="bl-r"><button class="bl-btn-sm" onclick="BillingPages.openAccount('${esc(p.phone)}')">Open account</button></td>
      </tr>`).join(""):`<tr><td colspan="5" class="bl-empty">No customers in this place.</td></tr>`}</tbody></table></div></div>`;
  }

  function fillPlaceList(){
    const dl=$("bl-place-list"); if(!dl) return;
    const places=[...new Set((C().customers||[]).map(c=>(c.place||"").trim()).filter(Boolean))].sort();
    dl.innerHTML=places.map(p=>`<option value="${esc(p)}">${esc(placeCodeOf(p))}</option>`).join("");
  }
    function renderBillingPage(page){
    if(page==="pos"){ fillPlaceList(); window.Billing.calc(); }
    else if(page==="sales") renderSales();
    else if(page==="accounts") renderAccounts();
    else if(page==="places") renderPlaces();
    else if(page==="repairs") renderRepairs();
    else if(page==="estimates") renderEstimates();
    else if(page==="orders") renderOrders();
    else if(page==="dayend"){ refreshDayEndCache().then(renderDayEnd); }
    else if(page==="home") renderHomeBilling();
  }

  window.BillingPages = {
    renderBillingPage, renderHomeBilling, renderSales, renderAccounts, renderRepairs,
    renderEstimates, renderOrders, renderDayEnd,
    openAccount, closeAccount, applyAccountPayment, addAccountCustomer, addOldBill, addLoan, clearSalesFilters,
    renderPlaces, openPlace, savePlaceCode,
    viewFullBill:(id)=>{ try{ window.Billing?.reprint?.(id); }catch(_){ toast("Unable to open the bill."); } }, currentAccount:()=>accPhone, openCrmProfile, saveRepair, repairStatus,
    repairLookup, repairPhoto, orderLookup, orderPhoto,
    saveEstimate, convertEstimate, saveOrder, billOrder,
    closeDay, renderDayEnd, recalcDayEnd, addExpense, removeExpense, printDaySlipCurrent, reprintDay, refreshDayEndCache
  };
  window.Billing.afterChange = ()=>{ renderSales(); renderAccounts(); renderHomeBilling(); };
})();
