"use strict";
/* =====================================================================
   ThangamOS — A4 INVOICE TEMPLATE  (standalone)
   ---------------------------------------------------------------------
   This is the ONLY file to edit when a shop wants the printed bill
   changed. It owns the full A4 layout (HTML) + its print styles (CSS).
   Nothing else in the app needs to change.

   Entry point:  window.InvoiceTemplate.render(invoice)
   `invoice` shape (built by billing.js snapshot / reprint):
     { no, date, pay_mode, gst, gst_rate,
       shop:{shop,address,phone,gstin,logo,sign,terms,...},
       customer:{name,phone,place,address,pin,gstin,state,...},
       lines:[{d,h,p,hsn,stone,w,r,c,wg,wv,a}],
       old:[{desc,net,purity,applied,note}],
       totals:{sub,dis,tv,gst,cgst,sgst,og,adv,pay,rec,due} }
   ===================================================================== */
(function(){
  /* ---- self-contained helpers (so this file stands alone) ---- */
  const money = n => "\u20B9" + (Number(n)||0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});
  const round2 = n => Math.round((Number(n)||0)*100)/100;
  const esc = v => String(v==null?"":v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const has = v => v!==undefined && v!==null && String(v).trim()!=="";
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
    if(crore) out+=three(crore)+" Crore ";
    if(lakh) out+=three(lakh)+" Lakh ";
    if(thou) out+=three(thou)+" Thousand ";
    if(n) out+=three(n);
    return out.trim().replace(/\s+/g,"  ").replace(/\s+/g," ")+" Rupees Only";
  }

  /* ---- CSS injected once ---- */
  const CSS = `
.pinv{max-width:190mm;margin:0 auto;color:#1a1a1a;font-family:"IBM Plex Sans","Segoe UI",Arial,sans-serif;font-size:11px;line-height:1.35;display:flex;flex-direction:column;min-height:262mm}
.pinv *{box-sizing:border-box}
.pinv-grow{flex:1 1 auto;min-height:10mm}
/* non-GST bills: 12 columns (GST% and GST Amt removed) re-balanced to fill width */
.pinv-table.pinv-nogst th:nth-child(n),.pinv-table.pinv-nogst td:nth-child(n){width:auto}
.pinv-table.pinv-nogst th:nth-child(1),.pinv-table.pinv-nogst td:nth-child(1){width:3%}
.pinv-table.pinv-nogst th:nth-child(2),.pinv-table.pinv-nogst td:nth-child(2){width:14%}
.pinv-table.pinv-nogst th:nth-child(3),.pinv-table.pinv-nogst td:nth-child(3){width:7%}
.pinv-table.pinv-nogst th:nth-child(4),.pinv-table.pinv-nogst td:nth-child(4){width:6%}
.pinv-table.pinv-nogst th:nth-child(5),.pinv-table.pinv-nogst td:nth-child(5){width:7%}
.pinv-table.pinv-nogst th:nth-child(6),.pinv-table.pinv-nogst td:nth-child(6){width:5%}
.pinv-table.pinv-nogst th:nth-child(7),.pinv-table.pinv-nogst td:nth-child(7){width:8.5%}
.pinv-table.pinv-nogst th:nth-child(8),.pinv-table.pinv-nogst td:nth-child(8){width:7%}
.pinv-table.pinv-nogst th:nth-child(9),.pinv-table.pinv-nogst td:nth-child(9){width:7%}
.pinv-table.pinv-nogst th:nth-child(10),.pinv-table.pinv-nogst td:nth-child(10){width:9%}
.pinv-table.pinv-nogst th:nth-child(11),.pinv-table.pinv-nogst td:nth-child(11){width:13%}
.pinv-table.pinv-nogst th:nth-child(12),.pinv-table.pinv-nogst td:nth-child(12){width:13.5%}
.pinv .c{text-align:center}.pinv .r{text-align:right}
.pinv-lbl{display:block;font-size:8.5px;letter-spacing:1px;color:#8a8a8a;font-weight:700;margin-bottom:3px}
.pinv-top{position:relative;border:1px solid #d7d7d7;border-radius:4px;padding:12px 14px}
.pinv-copy{position:absolute;top:10px;right:14px;font-size:10px;color:#777}
.pinv-head{display:flex;align-items:flex-start;gap:14px}
.pinv-logo{width:64px;height:64px;object-fit:contain}
.pinv-logo-sp{width:64px;flex:0 0 64px}
.pinv-title-wrap{flex:1;text-align:center}
.pinv-doc{font-size:14px;font-weight:700;letter-spacing:1px;color:#222;margin-bottom:2px}
.pinv-head h1{margin:2px 0 4px;font-size:25px;font-weight:700;color:#111}
.pinv-head p{margin:1px 0;font-size:11px;color:#444}
.pinv-gstin{font-weight:700;color:#222}
.pinv-parties{display:grid;grid-template-columns:1fr 250px;gap:12px;margin:12px 0;align-items:stretch}
.pinv-party{border:1px solid #e0e0e0;border-radius:4px;overflow:hidden}
.pinv-party-h{background:#f2f2f2;padding:6px 10px;font-weight:700;font-size:10.5px;border-bottom:1px solid #e0e0e0}
.pinv-party p{margin:2px 0;padding:0 10px;font-size:10.5px}
.pinv-party p:first-of-type{margin-top:7px}.pinv-party p:last-of-type{margin-bottom:8px}
.pinv-cname{font-size:12.5px!important;font-weight:700;color:#111}
.pinv-meta{border:1px solid #e0e0e0;border-radius:4px;padding:10px}
.pinv-meta table{width:100%;border-collapse:collapse;font-size:11px}
.pinv-meta td{padding:4px 2px;vertical-align:top}
.pinv-meta td:first-child{color:#555;font-weight:600;white-space:nowrap}
.pinv-meta td:nth-child(2){color:#999;padding:4px 6px}
.pinv-table{width:100%;border-collapse:collapse;margin:4px 0;font-size:9.5px;table-layout:fixed}
.pinv-table th:nth-child(1),.pinv-table td:nth-child(1){width:2.5%}
.pinv-table th:nth-child(2),.pinv-table td:nth-child(2){width:12%;word-break:break-word}
.pinv-table th:nth-child(3),.pinv-table td:nth-child(3){width:6%}
.pinv-table th:nth-child(4),.pinv-table td:nth-child(4){width:5%}
.pinv-table th:nth-child(5),.pinv-table td:nth-child(5){width:6%}
.pinv-table th:nth-child(6),.pinv-table td:nth-child(6){width:4.5%}
.pinv-table th:nth-child(7),.pinv-table td:nth-child(7){width:7.5%}
.pinv-table th:nth-child(8),.pinv-table td:nth-child(8){width:6%}
.pinv-table th:nth-child(9),.pinv-table td:nth-child(9){width:6%}
.pinv-table th:nth-child(10),.pinv-table td:nth-child(10){width:8%}
.pinv-table th:nth-child(11),.pinv-table td:nth-child(11){width:11.5%}
.pinv-table th:nth-child(12),.pinv-table td:nth-child(12){width:4.5%}
.pinv-table th:nth-child(13),.pinv-table td:nth-child(13){width:8%}
.pinv-table th:nth-child(14),.pinv-table td:nth-child(14){width:10%}
.pinv-table th{background:#fff;color:#333;border-top:1px solid #cfcfcf;border-bottom:1.5px solid #333;padding:7px 4px;font-weight:700;font-size:9px;text-align:left}
.pinv-table th.r{text-align:right}.pinv-table th.c{text-align:center}
.pinv-table td{padding:7px 4px;border-bottom:1px solid #ededed;vertical-align:top}
.pinv-sum-row td{border-top:1.5px solid #333;border-bottom:none;padding-top:8px}
.pinv-ognote{margin:8px 0;padding:8px 10px;border:1px solid #e4e4e4;border-radius:4px;background:#fafafa;font-size:10px}
.pinv-ognote p{margin:2px 0}
.pinv-foot{display:flex;justify-content:space-between;gap:24px;margin-top:14px;align-items:flex-start}
.pinv-foot-l{flex:1;max-width:54%}
.pinv-words p{margin:2px 0 0;font-size:11px;font-weight:600;font-style:italic;color:#333}
.pinv-foot-r{width:290px}
.pinv-foot-r>div{display:flex;justify-content:space-between;padding:6px 2px;font-size:11.5px;border-bottom:1px solid #ededed}
.pinv-foot-r .pinv-grand{border-top:1.5px solid #333;border-bottom:1.5px solid #333;font-weight:700;font-size:15px;color:#111;padding:9px 2px}
.pinv-foot-r .pinv-due{font-weight:700;color:#c0314a;border-bottom:none}
.pinv-terms{margin-top:16px;padding-top:10px;border-top:1px solid #e6e6e6}
.pinv-terms ul{margin:6px 0 0;padding-left:16px}
.pinv-terms li{font-size:9.5px;color:#555;margin:2px 0}
.pinv-sign{margin-top:26px;display:flex;justify-content:flex-end}
.pinv-sign-box{text-align:center;min-width:220px}
.pinv-sign-box p{margin:2px 0;font-size:11px}
.pinv-sign-role{color:#555}
.pinv-sign-space{height:30px}
.pinv-sign-line{border-bottom:1px solid #333;margin:0 10px 6px}
@media print{ @page{size:A4 portrait;margin:10mm;} .pinv{font-size:10.5px} }`;

  function injectCss(){
    if(document.getElementById("pinv-style")) return;
    const st=document.createElement("style"); st.id="pinv-style"; st.textContent=CSS;
    document.head.appendChild(st);
  }

  function render(x){
    injectCss();
    const host=document.getElementById("bl-print"); if(!host) return;
    const s=x.shop||{}, cust=x.customer||{}, t=x.totals||{};
    const gstOn=!!x.gst, rate=Number(x.gst_rate||0);

    // ----- line rows + column totals -----
    let sumW=0,sumWg=0,sumMk=0,sumTax=0,sumGst=0,sumTot=0;
    const rows=(x.lines||[]).map((q,i)=>{
      const w=Number(q.w||0), r=Number(q.r||0), c=Number(q.c||0), wg=Number(q.wg||0);
      const lineVal=Number(q.a!=null?q.a:round2(w*r+round2(wg*r)+c));
      const lineGst=gstOn?round2(lineVal*rate/100):0;
      const lineTot=round2(lineVal+lineGst);
      sumW+=w; sumWg+=wg; sumMk+=c; sumTax+=lineVal; sumGst+=lineGst; sumTot+=lineTot;
      return `<tr>
        <td class="c">${i+1}</td><td>${esc(q.d)}</td><td>${esc(q.hsn||"\u2014")}</td><td class="c">${esc(q.p||"\u2014")}</td>
        <td class="r">${w.toFixed(3)}</td><td class="r">${has(q.stone)?esc(q.stone):"\u2014"}</td>
        <td class="r">${money(c)}</td><td class="r">${wg.toFixed(3)}</td>
        <td class="r">${w.toFixed(3)}</td><td class="r">${money(r)}</td>
        <td class="r">${money(lineVal)}</td>${gstOn?`<td class="c">${rate}%</td><td class="r">${money(lineGst)}</td>`:""}<td class="r"><b>${money(lineTot)}</b></td></tr>`;
    }).join("");
    const totalRow=`<tr class="pinv-sum-row">
        <td colspan="4" class="r"><b>Total :</b></td>
        <td class="r"><b>${sumW.toFixed(3)}</b></td><td class="r">\u2014</td>
        <td class="r"><b>${money(sumMk)}</b></td><td class="r"><b>${sumWg.toFixed(3)}</b></td>
        <td class="r"><b>${sumW.toFixed(3)}</b></td><td></td>
        <td class="r"><b>${money(sumTax)}</b></td>${gstOn?`<td></td><td class="r"><b>${money(sumGst)}</b></td>`:""}<td class="r"><b>${money(sumTot)}</b></td></tr>`;

    // ----- summary (reconciles with the actual bill incl. discount/old gold/advance) -----
    const grand=Math.round(Number(t.pay||0));
    const roundOff=round2(grand-Number(t.pay||0));
    const cgst=gstOn?round2(Number(t.gst||0)/2):0, sgst=gstOn?round2(Number(t.gst||0)-cgst):0;
    const due=Math.max(0,grand-Number(t.rec||0));
    const srow=(lbl,val,cls="")=>`<div class="${cls}"><span>${lbl}</span><b>${val}</b></div>`;
    const summary=[
      srow("Taxable Value",money(t.tv)),
      Number(t.dis)>0?srow("Discount","\u2212 "+money(t.dis)):"",
      gstOn?srow("CGST @ "+(rate/2)+"%",money(cgst)):"",
      gstOn?srow("SGST @ "+(rate/2)+"%",money(sgst)):"",
      Number(t.og)>0?srow("Old gold credit","\u2212 "+money(t.og)):"",
      Number(t.adv)>0?srow("Advance adjusted","\u2212 "+money(t.adv)):"",
      srow("Round Off",(roundOff<0?"\u2212 ":"")+money(Math.abs(roundOff))),
      srow("Total","\u20B9 "+money(grand).replace("\u20B9",""),"pinv-grand"),
      srow("Paid",money(t.rec)),
      srow("Balance Due",money(due),"pinv-due")
    ].join("");

    const ogNote=(x.old&&x.old.length)?`<div class="pinv-ognote"><span class="pinv-lbl">OLD GOLD EXCHANGE${x.oldRef?" \u00B7 "+esc(x.oldRef):""}</span>${x.old.map((o,i)=>`<p>${i+1}. ${esc(o.desc||"Old gold")} \u00B7 Net ${(Number(o.net)||0).toFixed(3)} g \u00B7 Purity ${(Number(o.purity)||0).toFixed(2)}% \u00B7 Credit ${money(o.applied)}${o.note?" \u00B7 "+esc(o.note):""}</p>`).join("")}</div>`:"";

    const termLines=String(s.terms||"").split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
    const termsBlock=termLines.length?`<div class="pinv-terms"><span class="pinv-lbl">DECLARATION &amp; TERMS</span><ul>${termLines.map(l=>`<li>${esc(l)}</li>`).join("")}</ul></div>`:"";

    const custAddr=[cust.address,cust.place,cust.pin].filter(Boolean).join(", ");
    const dateShow=String(x.date||"").split(",")[0].trim();
    const title=gstOn?"GST INVOICE":"INVOICE";

    host.innerHTML=`<div class="pinv">
      <div class="pinv-top">
        <div class="pinv-copy">Original Copy</div>
        <div class="pinv-head">
          ${has(s.logo)?`<img class="pinv-logo" src="${esc(s.logo)}" alt="">`:`<span class="pinv-logo-sp"></span>`}
          <div class="pinv-title-wrap">
            <div class="pinv-doc">${title}</div>
            <h1>${esc(s.shop||"Your Shop Name")}</h1>
            ${has(s.address)?`<p>${esc(s.address)}</p>`:""}
            ${has(s.phone)?`<p>Contact: ${esc(s.phone)}</p>`:""}
            ${has(s.gstin)?`<p class="pinv-gstin">GSTIN: ${esc(s.gstin)}</p>`:""}
          </div>
          <span class="pinv-logo-sp"></span>
        </div>
      </div>

      <div class="pinv-parties">
        <div class="pinv-party">
          <div class="pinv-party-h">Details of Customer | Billed to:</div>
          <p class="pinv-cname">${esc(cust.name||"")}</p>
          ${custAddr?`<p>${esc(custAddr)}</p>`:""}
          ${has(cust.phone)?`<p><b>Contact:</b> ${esc(cust.phone)}</p>`:""}
          ${has(cust.gstin)?`<p><b>GSTIN:</b> ${esc(cust.gstin)}</p>`:""}
          ${has(cust.state)?`<p><b>State:</b> ${esc(cust.state)}</p>`:""}
        </div>
        <div class="pinv-meta">
          <table>
            <tr><td>Invoice No</td><td>:</td><td><b>${esc(x.no||"")}</b></td></tr>
            <tr><td>Date</td><td>:</td><td>${esc(dateShow)}</td></tr>
            <tr><td>Payment Mode</td><td>:</td><td>${esc(x.pay_mode||"\u2014")}</td></tr>
          </table>
        </div>
      </div>

      <table class="pinv-table${gstOn?'':' pinv-nogst'}">
        <thead><tr>
          <th class="c">#</th><th>Product</th><th>HSN</th><th class="c">Purity</th>
          <th class="r">Weight</th><th class="r">Stone</th><th class="r">Mkg. Chg.</th><th class="r">Wastage (g)</th>
          <th class="r">Net Wt.</th><th class="r">Rate</th><th class="r">Taxable Value</th>${gstOn?`<th class="c">GST%</th><th class="r">GST Amt</th>`:""}<th class="r">Total</th>
        </tr></thead>
        <tbody>${rows||`<tr><td colspan="${gstOn?14:12}" class="c">No items</td></tr>`}${rows?totalRow:""}</tbody>
      </table>

      ${ogNote}

      <div class="pinv-foot">
        <div class="pinv-foot-l">
          <div class="pinv-words"><span class="pinv-lbl">AMOUNT IN WORDS</span><p>${esc(amountInWords(grand))}</p></div>
        </div>
        <div class="pinv-foot-r">${summary}</div>
      </div>

      <div class="pinv-grow"></div>

      ${termsBlock}

      <div class="pinv-sign">
        <div class="pinv-sign-box">
          <div class="pinv-sign-space"></div>
          <div class="pinv-sign-line"></div>
          <p>For <b>${esc(s.shop||"")}</b></p>
          <p class="pinv-sign-role">${esc(s.sign||"Authorised Signatory")}</p>
        </div>
      </div>
    </div>`;
  }

  window.InvoiceTemplate = { render };
})();
