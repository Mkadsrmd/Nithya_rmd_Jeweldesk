"use strict";
/* JewelOS Billing workspace — POS, Sales Register, Repairs, Client Accounts,
   Estimates, Orders & Advance, Day-End Closing. Shares the ERP IndexedDB
   (dbService) so every bill reaches the Sales Register, Home and Accounts.
   All ids/functions/classes are prefixed `bl`/`.bl-` to avoid clashing with
   the CRM layer. */
(function(){
  const $ = id => document.getElementById(id);
  const money = n => "₹" + (Number(n)||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});
  const round2 = n => Math.round((Number(n)||0)*100)/100;   // ₹/gram rounding to 2 decimals
  const esc = v => String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const localDate = d => { const x=new Date(d); return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0"); };
  const today = () => localDate(new Date());
  const nowLocal = () => new Date().toLocaleString("en-IN");

  /* Compress any picked image: max 600px wide, JPEG q0.6, returns data URL.
     Same method as the original ERP — keeps quality, cuts storage a lot. */
  /* Aggressive offline-test compression. Production will upload this WebP blob to private Supabase Storage. */
  function compressImage(file){
    return new Promise((resolve,reject)=>{
      if(!file) return resolve("");
      const reader=new FileReader();
      reader.onload=e=>{
        const img=new Image();
        img.onload=()=>{
          let max=720, quality=.55, result="";
          const attempt=()=>{
            const scale=Math.min(1,max/img.width,img.height?max/img.height:1);
            const cvs=document.createElement("canvas");
            cvs.width=Math.max(1,Math.round(img.width*scale)); cvs.height=Math.max(1,Math.round(img.height*scale));
            cvs.getContext("2d").drawImage(img,0,0,cvs.width,cvs.height);
            result=cvs.toDataURL("image/webp",quality);
            const bytes=Math.ceil((result.length-result.indexOf(',')-1)*.75);
            if(bytes>150*1024 && (quality>.32 || max>480)){ quality=Math.max(.32,quality-.08); max=Math.max(480,max-80); return attempt(); }
            resolve(result);
          }; attempt();
        };
        img.onerror=reject; img.src=e.target.result;
      }; reader.onerror=reject; reader.readAsDataURL(file);
    });
  }

  /* Indian-system rupees in words, e.g. 75065 -> "Seventy Five Thousand Sixty Five Rupees Only". */
  function amountInWords(num){
    num=Math.round(Number(num)||0);
    if(num===0) return "Zero Rupees Only";
    const a=["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"];
    const b=["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"];
    const two=n=>n<20?a[n]:b[Math.floor(n/10)]+(n%10?" "+a[n%10]:"");
    const three=n=>{const h=Math.floor(n/100);const r=n%100;return (h?a[h]+" Hundred"+(r?" ":""):"")+(r?two(r):"");};
    let out="",n=num;
    const crore=Math.floor(n/10000000); n%=10000000;
    const lakh=Math.floor(n/100000); n%=100000;
    const thou=Math.floor(n/1000); n%=1000;
    const hund=n;
    if(crore) out+=three(crore)+" Crore ";
    if(lakh) out+=three(lakh)+" Lakh ";
    if(thou) out+=three(thou)+" Thousand ";
    if(hund) out+=three(hund);
    return out.trim().replace(/\s+/g," ")+" Rupees Only";
  }

  let ready=false;
  let lines=[], oldGold=[], finalized=null, itemMode="custom", editingOrderId="", orderAdvance=0, finalizing=false;
  let splitPayments=[{amount:0,mode:"Cash"}];   // multi-mode payment lines (part cash / part UPI...)
  const PAY_MODES=["Cash","UPI","Card","Bank Transfer"];
  let cache={ invoices:[], customers:[], repairs:[], estimates:[], orders:[] };
  let settings={ shop:"Nithya Jewellery", gstin:"", phone:"", whatsapp:"", address:"Tamil Nadu",
    prefix:"INV", gstRate:3, hsn:"", sign:"Authorised Signatory", paymentPin:"1234", logo:"",
    terms:"Goods once sold are subject to the shop exchange / return policy. Please retain this invoice for service and warranty reference." };

  /* ---------- data ---------- */
  async function loadCache(){
    const [invoices,customers,repairs,estimates,orders,dayend]=await Promise.all([
      dbService.getAll("invoices"), dbService.getAll("customers"), dbService.getAll("repairs"),
      dbService.getAll("estimates"), dbService.getAll("orders"), dbService.getAll("dayend_closings")
    ]);
    cache={invoices,customers,repairs,estimates,orders,__dayend:dayend};
  }
  async function loadSettings(){
    try{ const s=await dbService.get("settings","billing"); if(s&&s.value) settings={...settings,...s.value}; }catch(_){}
  }
  async function saveSettingsToDB(){ await dbService.put("settings",{id:"billing",value:settings}); }

  /* ---------- POS bill state ---------- */
  function resetBill(){
    lines=[]; oldGold=[]; finalized=null; editingOrderId=""; orderAdvance=0;
    ["bl-phone","bl-name","bl-address","bl-place","bl-pin","bl-email","bl-idesc","bl-ihuid","bl-iwt","bl-irate"].forEach(id=>{const el=$(id); if(el) el.value="";});
    { const el=$("bl-discount"); if(el) el.value="0"; }
    splitPayments=[{amount:0,mode:"Cash"}]; renderPayments();
    const ic=$("bl-icharge"); if(ic) ic.value="0";
    const iw=$("bl-iwastage"); if(iw) iw.value="0";
    const gst=$("bl-gstToggle"); if(gst) gst.checked=false;
    toggleGstUI();
    const ogb=$("bl-ogBody"); if(ogb) ogb.classList.add("bl-hidden");
    const ogl=$("bl-ogList"); if(ogl) ogl.innerHTML="";
    const inv=$("bl-invno"); if(inv) inv.textContent="New bill";
    const pb=$("bl-printBtn"); if(pb) pb.disabled=true;
    renderLines();
  }

  let pendingItemPhoto="";
  async function captureItemPhoto(input){
    try{ pendingItemPhoto=await compressImage(input.files&&input.files[0]); }catch(_){ pendingItemPhoto=""; }
    const prev=$("bl-iphoto-prev"); if(prev){ prev.src=pendingItemPhoto; prev.style.display=pendingItemPhoto?"block":"none"; }
  }
  function addItem(){
    const d=$("bl-idesc").value.trim(), w=+$("bl-iwt").value||0, r=+$("bl-irate").value||0, c=+$("bl-icharge").value||0, wg=Math.max(0,+$("bl-iwastage")?.value||0);
    if(!d||w<=0||r<=0){ toast("Enter item, net weight and rate."); return; }
    const wv=round2(wg*r);                         // wastage value ₹ = wastage(g) × live rate
    const a=round2(w*r + wv + c);                  // line taxable = (net wt × rate) + wastage value + making
    lines.push({ d, h:$("bl-ihuid").value.trim(), p:$("bl-ipurity").value||"—", w, r, c, wg, wv, a, img:pendingItemPhoto });
    $("bl-idesc").value=""; $("bl-ihuid").value=""; $("bl-iwt").value=""; $("bl-icharge").value="0"; const iw=$("bl-iwastage"); if(iw) iw.value="0";
    pendingItemPhoto=""; const fi=$("bl-iphoto"); if(fi) fi.value=""; const pv=$("bl-iphoto-prev"); if(pv){ pv.src=""; pv.style.display="none"; }
    renderLines();
  }
  function removeItem(i){ lines.splice(i,1); renderLines(); }

  function renderLines(){
    const body=$("bl-items"); if(!body) return;
    body.innerHTML = lines.length ? lines.map((x,i)=>`<tr>
      <td><b>${esc(x.d)}</b>${x.img?` <img src="${x.img}" class="bl-line-thumb" alt="">`:""}</td><td>${esc(x.h||"—")}</td><td>${esc(x.p)}</td>
      <td class="bl-r">${x.w.toFixed(3)}</td><td class="bl-r">${money(x.r)}</td>
      <td class="bl-r">${money(x.c)}</td><td class="bl-r">${(Number(x.wg)||0).toFixed(3)}</td><td class="bl-r"><b>${money(x.a)}</b></td>
      <td><button class="bl-x" onclick="Billing.removeItem(${i})">×</button></td></tr>`).join("")
      : `<tr><td colspan="9" class="bl-empty">No items added yet</td></tr>`;
    calc();
  }

  /* ---------- old gold ---------- */
  function toggleExchange(){
    const b=$("bl-ogBody"); b.classList.toggle("bl-hidden");
    $("bl-ogToggle").textContent=b.classList.contains("bl-hidden")?"+ Add exchange":"Hide exchange";
    if(!b.classList.contains("bl-hidden")&&!oldGold.length) addOldGold();
  }
  function addOldGold(){ oldGold.push({desc:"",gross:0,less:0,purity:91.6,rate:0,ded:0,credit:null,note:""}); renderOldGold(); }
  function removeOldGold(i){ oldGold.splice(i,1); renderOldGold(); }
  function ogField(i,k,v){ oldGold[i][k]=(k==="credit")?(v===""?null:+v):(k==="desc"||k==="note"?v:(+v||0)); calc(); }
  async function captureOgPhoto(i,input){
    try{ oldGold[i].img=await compressImage(input.files&&input.files[0]); }catch(_){ oldGold[i].img=""; }
    renderOldGold();
  }
  function renderOldGold(){
    const l=$("bl-ogList"); if(!l) return;
    l.innerHTML=oldGold.map((x,i)=>`<div class="bl-og-item"><div class="bl-og-head"><b>Old gold #${i+1}</b>
      <button class="bl-link" onclick="Billing.removeOldGold(${i})">Remove</button></div>
      <div class="bl-og-grid">
        <label>Description<input value="${esc(x.desc)}" oninput="Billing.ogField(${i},'desc',this.value)"></label>
        <label>Gross g<input type="number" step=".001" value="${x.gross||""}" oninput="Billing.ogField(${i},'gross',this.value)"></label>
        <label>Less g<input type="number" step=".001" value="${x.less||0}" oninput="Billing.ogField(${i},'less',this.value)"></label>
        <label>Purity %<input type="number" step=".01" value="${x.purity}" oninput="Billing.ogField(${i},'purity',this.value)"></label>
        <label>Pure rate ₹/g<input type="number" step=".01" value="${x.rate||""}" oninput="Billing.ogField(${i},'rate',this.value)"></label>
        <label>Deduction %<input type="number" step=".01" value="${x.ded||0}" oninput="Billing.ogField(${i},'ded',this.value)"></label>
        <label>Credit ₹<input type="number" step=".01" value="${x.credit??""}" placeholder="Auto" oninput="Billing.ogField(${i},'credit',this.value)"></label>
      </div>
      <label class="bl-og-note">Valuation note<input value="${esc(x.note)}" placeholder="Stone / melting / test note" oninput="Billing.ogField(${i},'note',this.value)"></label>
      <label class="bl-photo-field">Old gold photo<input type="file" accept="image/*" onchange="Billing.captureOgPhoto(${i},this)"></label>
      ${x.img?`<div class="bl-photo-prev"><img src="${x.img}" alt=""></div>`:""}
    </div>`).join("");
    calc();
  }
  function oldTotals(){
    const round2=n=>Math.round(n*100)/100;  // ✓ Helper for ₹ rounding
    let gross=0,pure=0,val=0,credit=0;
    oldGold.forEach(x=>{
      const net=Math.max(0,(+x.gross||0)-(+x.less||0));
      const pw=round2(net*Math.min(100,+x.purity||0)/100);  // ✓ Round after calc
      const cv=round2(pw*(+x.rate||0)*(1-Math.min(100,+x.ded||0)/100));  // ✓ Round after calc
      const cr=x.credit===null?cv:(+x.credit||0);
      gross+=+x.gross||0; pure+=pw; val+=cv; credit+=cr;
      x.net=net; x.pure=pw; x.calc=cv; x.applied=cr;
    });
    return {gross,pure,val,credit:round2(credit)};  // ✓ Round final credit
  }

  /* ---------- totals ---------- */
  function gstOn(){ return !!($("bl-gstToggle")&&$("bl-gstToggle").checked); }
  function toggleGstUI(){
    const on=gstOn();
    const wrap=$("bl-gstRateWrap"); if(wrap) wrap.classList.toggle("bl-hidden",!on);
    const rows=document.querySelectorAll(".bl-gst-row"); rows.forEach(r=>r.classList.toggle("bl-hidden",!on));
    if(on&&$("bl-gstRate")&&!$("bl-gstRate").value) $("bl-gstRate").value=settings.gstRate||3;
    calc();
  }
  /* ---- split payments (part cash / part UPI / card / bank) ---- */
  function paidSum(){ return round2(splitPayments.reduce((a,p)=>a+(+p.amount||0),0)); }
  function renderPayments(){
    const host=$("bl-payList"); if(!host) return;
    host.innerHTML=splitPayments.map((p,i)=>`<div class="bl-pay-line">
      <input type="number" step=".01" value="${p.amount||0}" placeholder="0.00" oninput="Billing.payField(${i},'amount',this.value)">
      <select onchange="Billing.payField(${i},'mode',this.value)">${PAY_MODES.map(m=>`<option ${p.mode===m?"selected":""}>${m}</option>`).join("")}</select>
      ${splitPayments.length>1?`<button type="button" class="bl-x" onclick="Billing.removePayment(${i})">×</button>`:`<span class="bl-pay-x-sp"></span>`}
    </div>`).join("");
  }
  function addPayment(){ splitPayments.push({amount:0,mode:"Cash"}); renderPayments(); calc(); }
  function removePayment(i){ splitPayments.splice(i,1); if(!splitPayments.length) splitPayments=[{amount:0,mode:"Cash"}]; renderPayments(); calc(); }
  function payField(i,key,val){ if(!splitPayments[i]) return; splitPayments[i][key]= key==="amount"?Math.max(0,+val||0):val; calc(); }

  function calc(){
    const og=oldTotals();
    const sub=lines.reduce((s,x)=>s+x.a,0);
    const dis=Math.max(0,+($("bl-discount")?.value||0));
    const tv=Math.max(0,sub-dis);
    const rate=gstOn()?Math.max(0,+($("bl-gstRate")?.value||0)):0;
    const gst=round2(tv*rate/100);                 // total GST, rounded
    const cgst=round2(gst/2), sgst=round2(gst-cgst);   // split in two: CGST + SGST
    const adv=Math.max(0,Number(orderAdvance)||0);
    const pay=Math.max(0,tv+gst-og.credit-adv);
    const rec=paidSum();
    { const pt=$("bl-paidTotal"); if(pt) pt.textContent=money(rec); }
    const due=Math.max(0,pay-rec);
    const set=(id,v)=>{const el=$(id); if(el) el.textContent=v;};
    // money() here is the ₹ formatter (module scope) — values are rounded with round2 first
    const gstLbl=rate?` @ ${rate/2}%`:"";
    set("bl-cgstLabel","CGST"+gstLbl); set("bl-sgstLabel","SGST"+gstLbl);
    set("bl-subtotal",money(sub)); set("bl-taxable",money(tv));
    set("bl-cgstAmt",money(cgst)); set("bl-sgstAmt",money(sgst)); set("bl-credit","− "+money(og.credit));
    set("bl-payable",money(pay)); set("bl-due",money(due));
    set("bl-advance","− "+money(adv)); const ar=$("bl-advRow"); if(ar) ar.classList.toggle("bl-hidden",!(adv>0));
    set("bl-ogGrossTotal",og.gross.toFixed(3)+" g"); set("bl-ogPureTotal",og.pure.toFixed(3)+" g");
    set("bl-ogApplied",money(og.credit));
    // (old-gold editor visibility is controlled only by the +Add exchange toggle / reset, never here)
    return {sub,dis,tv,rate,gst,cgst,sgst,og:og.credit,adv,pay,rec,due};
  }

  function snapshot(){
    const c=calc();
    return {
      no:(settings.prefix||"INV")+"-"+new Date().getFullYear()+"-"+String(Date.now()).slice(-6),
      date:nowLocal(),
      shop:{...settings},
      customer:{name:$("bl-name").value.trim(),phone:$("bl-phone").value.trim(),address:$("bl-address").value.trim(),place:$("bl-place").value.trim(),pin:$("bl-pin").value.trim(),email:$("bl-email").value.trim(),img:""},
      lines:JSON.parse(JSON.stringify(lines)),
      old:JSON.parse(JSON.stringify(oldGold)),
      oldRef:c.og?"OG-"+String(Date.now()).slice(-7):"",
      gst:gstOn(), gst_rate:c.rate,
      payments:splitPayments.filter(p=>(+p.amount||0)>0).map(p=>({amount:round2(p.amount),mode:p.mode||"Cash"})),
      pay_mode:(()=>{ const a=splitPayments.filter(p=>(+p.amount||0)>0); return a.length>1?"Split":(a[0]?.mode||"Cash"); })(),
      totals:c
    };
  }

  /* ---------- finalize ---------- */
  /* ---- MATH CHECK-GATE: recompute every figure and block finalize on any mismatch ---- */
  function verifyTotals(s){
    const t=s.totals||{}, eps=0.01, near=(a,b)=>Math.abs((Number(a)||0)-(Number(b)||0))<=eps;
    for(let i=0;i<(s.lines||[]).length;i++){
      const q=s.lines[i], w=+q.w||0, r=+q.r||0, c=+q.c||0, wg=+q.wg||0;
      const expect=round2(w*r+round2(wg*r)+c);
      if(!near(expect,q.a)) return {ok:false,msg:`Line ${i+1} amount ₹${q.a} should be ₹${expect} (net×rate + wastage×rate + making).`};
    }
    const sub=round2((s.lines||[]).reduce((a,q)=>a+(+q.a||0),0));
    if(!near(sub,t.sub)) return {ok:false,msg:`Subtotal ₹${t.sub} ≠ sum of items ₹${sub}.`};
    const tv=round2(Math.max(0,sub-(+t.dis||0)));
    if(!near(tv,t.tv)) return {ok:false,msg:`Taxable ₹${t.tv} ≠ subtotal − discount ₹${tv}.`};
    const gst=round2(tv*(+t.rate||0)/100);
    if(!near(gst,t.gst)) return {ok:false,msg:`GST ₹${t.gst} ≠ ₹${gst} on ₹${tv} @ ${t.rate||0}%.`};
    if(t.cgst!=null && !near(round2((+t.cgst||0)+(+t.sgst||0)),t.gst)) return {ok:false,msg:`CGST + SGST ≠ total GST.`};
    const pay=round2(Math.max(0,tv+gst-(+t.og||0)-(+t.adv||0)));
    if(!near(pay,t.pay)) return {ok:false,msg:`Payable ₹${t.pay} ≠ taxable + GST − old-gold − advance (₹${pay}).`};
    if(Array.isArray(s.payments)&&s.payments.length){
      const psum=round2(s.payments.reduce((a,p)=>a+(+p.amount||0),0));
      if(!near(psum,t.rec)) return {ok:false,msg:`Split payments total ₹${psum} ≠ paid ₹${t.rec}.`};
    }
    if((+t.rec||0) > pay+eps) return {ok:false,msg:`Paid ₹${t.rec} is more than payable ₹${pay}.`};
    const due=round2(Math.max(0,pay-(+t.rec||0)));
    if(!near(due,t.due)) return {ok:false,msg:`Balance ₹${t.due} ≠ payable − paid (₹${due}).`};
    return {ok:true};
  }

  /* ---- native-feel save animation (replaces the browser alert) ---- */
  function savedAnim(msg){
    document.getElementById("bl-saved")?.remove();
    const el=document.createElement("div");
    el.id="bl-saved"; el.className="bl-saved-overlay";
    el.innerHTML=`<div class="bl-saved-card"><svg class="bl-saved-check" viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M14 27l8 8 16-16"/></svg><p>${esc(msg||"Saved")}</p></div>`;
    document.body.appendChild(el);
    requestAnimationFrame(()=>el.classList.add("show"));
    setTimeout(()=>{ el.classList.remove("show"); setTimeout(()=>el.remove(),240); },1400);
  }
  window.savedAnim=savedAnim;

  async function finalize(){
    if(!window.Access?.canWrite?.()){ toast("Read-only mode. Renew the subscription to make changes."); return; }
    if(!lines.length){ toast("Add at least one sale item."); return; }
    if(!$("bl-phone").value.trim()||!$("bl-name").value.trim()){ toast("Customer mobile number and name are required."); return; }
    if(!$("bl-place").value.trim()){ toast("Customer place is required."); const pl=$("bl-place"); if(pl) pl.focus(); return; }
    if(gstOn()&&!settings.gstin){ toast("GST bill ticked. Add the shop GSTIN in Settings → Billing first."); return; }
    if(!ready){ toast("Local database is still starting. Please retry."); return; }
    if(finalizing) return;            // blocks double-click / repeat taps while saving
    // soft-lock: warn (don't block) if today is already closed in Day-End
    try{
      const closed=(cache.__dayend||[]).find(d=>d.date===today());
      if(closed && !confirm("Day-End for today is already closed. Add this bill anyway? (You'll need to re-close the day.)")) return;
    }catch(_){}
    finalizing=true;
    const snap=snapshot();
    const gate=verifyTotals(snap);
    if(!gate.ok){ toast("Maths check failed — bill not saved. "+gate.msg); finalizing=false; return; }
    snap.id=snap.no; snap.source=editingOrderId?"ORDER":"POS"; snap.order_id=editingOrderId;
    try{
      const inv=await dbService.finalizeBill(snap);
      if(editingOrderId){
        const o=cache.orders.find(x=>x.id===editingOrderId);
        if(o){ o.status="Delivered"; o.invoice_id=inv.id; await dbService.saveOrder(o); }
      }
      // integrate buyer into the CRM customer database (phone = key)
      try{ window.CRMData?.upsertCustomer({name:snap.customer.name,phone:snap.customer.phone,place:snap.customer.place}); }catch(_){}
      const last={...snap,invoice:inv};
      buildPrint(last);
      resetBill();                     // clear form so the same bill can't be saved twice
      finalized=last;                  // ...but keep it available for "Print A4 invoice"
      $("bl-invno").textContent=snap.no+" ✓ saved"; $("bl-printBtn").disabled=false;
      await loadCache();
      // #18: reflect this customer in the CRM database automatically (live-join by phone)
      try{ window.CRMData?.upsertCustomer?.({name:snap.customer.name, phone:snap.customer.phone, place:snap.customer.place, area:snap.customer.place}); }catch(_){}
      savedAnim("Invoice "+snap.no+" saved");
      try{ await window.ThangamOS?.afterInvoiceFinalized?.(last); }catch(e){ console.warn("ThangamOS invoice hook",e); }
      window.Billing.afterChange&&window.Billing.afterChange();
    }catch(e){ toast("Finalize failed: "+e.message); }
    finally{ finalizing=false; }
  }

  /* drafts + hold */
  async function saveDraft(){
    if(!ready) return toast("Database starting, retry.");
    if(!$("bl-phone").value.trim()&&!lines.length) return toast("Enter customer or items first.");
    const x=snapshot(); x.id="DRAFT-CURRENT"; x.status="DRAFT"; x.updated_at=new Date().toISOString();
    await dbService.put("pos_drafts",x); toast("Draft saved on this device.");
  }
  async function holdBill(){
    if(!ready) return toast("Database starting, retry.");
    if(!$("bl-phone").value.trim()&&!lines.length) return toast("Enter customer or items first.");
    const x=snapshot(); x.id="HOLD-"+Date.now(); x.status="HOLD"; x.held_at=new Date().toISOString();
    await dbService.put("held_bills",x); toast("Bill held."); resetBill();
  }
  async function resumeHeld(){
    if(!ready) return;
    const held=(await dbService.getAll("held_bills")).sort((a,b)=>new Date(b.held_at)-new Date(a.held_at));
    if(!held.length) return toast("No held bills.");
    loadSnapshot(held[0]); await dbService.delete("held_bills",held[0].id); toast("Held bill resumed.");
  }
  function loadSnapshot(x){
    $("bl-phone").value=x.customer?.phone||""; $("bl-name").value=x.customer?.name||"";
    $("bl-address").value=x.customer?.address||""; $("bl-place").value=x.customer?.place||"";
    $("bl-pin").value=x.customer?.pin||""; $("bl-email").value=x.customer?.email||"";
    lines=JSON.parse(JSON.stringify(x.lines||[])); oldGold=JSON.parse(JSON.stringify(x.old||[]));
    $("bl-discount").value=x.totals?.dis||0;
    splitPayments=(Array.isArray(x.payments)&&x.payments.length)
      ? x.payments.map(p=>({amount:+p.amount||0,mode:p.mode||"Cash"}))
      : [{amount:+(x.totals?.rec)||0,mode:x.pay_mode&&x.pay_mode!=="Split"?x.pay_mode:"Cash"}];
    renderPayments();
    $("bl-gstToggle").checked=!!x.gst; if($("bl-gstRate")) $("bl-gstRate").value=x.gst_rate||settings.gstRate||3;
    toggleGstUI();
    if(oldGold.length){ $("bl-ogBody").classList.remove("bl-hidden"); $("bl-ogToggle").textContent="Hide exchange"; renderOldGold(); }
    else { $("bl-ogBody").classList.add("bl-hidden"); $("bl-ogList").innerHTML=""; }
    renderLines();
  }
  async function lookupCustomer(){
    const key=$("bl-phone").value.trim(); if(!key||!ready) return;
    let c=await dbService.get("customers",key);
    if(!c){ const cc=window.CRMData?.getCustomer?.(key); if(cc) c={name:cc.name,address:"",place:cc.area||"",pin:"",email:""}; }
    if(!c) return;
    $("bl-name").value=c.name||""; $("bl-address").value=c.address||"";
    $("bl-place").value=c.place||""; $("bl-pin").value=c.pin||""; $("bl-email").value=c.email||"";
    toast("Existing customer loaded.");
  }

  /* ---------- A4 print (layout lives in js/invoice-template.js) ---------- */
  function buildPrint(x){
    if(window.InvoiceTemplate&&window.InvoiceTemplate.render) return window.InvoiceTemplate.render(x);
    const h=document.getElementById("bl-print"); if(h) h.innerHTML="<p style='padding:20px'>Invoice template not loaded.</p>";
  }
  function printA4(snap){
    const x=snap||finalized; if(!x){ toast("Finalize the invoice first."); return; }
    buildPrint(x); document.body.classList.add("bl-printing"); setTimeout(()=>{window.print(); document.body.classList.remove("bl-printing");},60);
  }
  function reprint(invId){
    const inv=cache.invoices.find(i=>i.id===invId); if(!inv) return;
    const x={ no:inv.no,date:inv.date,shop:{...settings},
      customer:{name:inv.customer_name,phone:inv.customer_phone,address:"",place:"",pin:""},
      lines:inv.lines||[], old:inv.old||[], oldRef:inv.oldRef||"", gst:!!inv.gst, gst_rate:inv.gst_rate||0, pay_mode:inv.pay_mode||"Cash",
      totals:{sub:inv.subtotal,dis:inv.discount,tv:inv.taxable,gst:inv.gst_amount,og:inv.old_gold_credit,adv:inv.advance_adjusted||0,pay:inv.total,rec:inv.paid,due:inv.due} };
    const custPhone=inv.customer_phone, c=cache.customers.find(k=>k.phone===custPhone);
    if(c){ x.customer.address=c.address||""; x.customer.place=c.place||""; x.customer.pin=c.pin||""; }
    printA4(x);
  }

  window.Billing = {
    attachReady:(v)=>ready=v, loadCache, loadSettings, saveSettingsToDB,
    get settings(){return settings;}, set settings(v){settings=v;},
    get cache(){return cache;},
    resetBill, addItem, removeItem, toggleExchange, addOldGold, removeOldGold, ogField,
    captureItemPhoto, captureOgPhoto, compressImage,
    toggleGstUI, calc, finalize, saveDraft, holdBill, resumeHeld, lookupCustomer,
    addPayment, removePayment, payField,
    printA4, reprint, loadSnapshot, snapshot,
    setItemMode:(m)=>{itemMode=m;}, setEditingOrder:(id,adv)=>{editingOrderId=id; orderAdvance=Math.max(0,Number(adv)||0); calc();},
    afterChange:null
  };
  document.addEventListener("DOMContentLoaded",()=>{ try{ renderPayments(); }catch(_){} });
})();
