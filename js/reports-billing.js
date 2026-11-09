"use strict";
/* Billing reports: Sales, Outstanding, Collections, Old Gold, Repairs,
   Estimates&Orders, GST. Excel (CSV) export + clean A4 print. Reads the
   billing caches via window.Billing. */
(function(){
  const money = n => "₹"+Math.round(Number(n)||0).toLocaleString("en-IN");
  const esc = v => String(v??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const dISO = d => { try{ const x=new Date(d); return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0"); }catch(_){ return ""; } };
  const dShow = d => { try{ return new Date(d).toLocaleDateString("en-IN"); }catch(_){ return ""; } };
  const C = () => window.Billing.cache;

  function build(kind){
    const cust=C().customers||[], reps=C().repairs||[], est=C().estimates||[], ord=C().orders||[];
    const custBy=new Map(cust.map(c=>[c.phone,c]));
    // optional date range (reports page inputs) applied to invoice-based reports
    const RF=document.getElementById("bRepFrom")?.value||"", RT=document.getElementById("bRepTo")?.value||"";
    const inRange=i=>{ const d=dISO(i.finalized_at||i.date); return (!RF||d>=RF)&&(!RT||d<=RT); };
    const allInv=C().invoices||[];
    const inv=(RF||RT)?allInv.filter(inRange):allInv;
    if(kind==="sales"){
      const rows=inv.slice().sort((a,b)=>new Date(b.finalized_at||b.date)-new Date(a.finalized_at||a.date))
        .map(i=>[i.no||i.id,dShow(i.finalized_at||i.date),i.customer_name||"",i.customer_phone||"",i.gst?("GST "+(i.gst_rate||0)+"%"):"No tax",i.total||0,i.paid||0,i.due||0]);
      return {title:"Sales Report",head:["Bill","Date","Customer","Mobile","Tax","Total","Paid","Due"],rows,
        totals:["","","","","",sum(inv,"total"),sum(inv,"paid"),sum(inv,"due")]};
    }
    if(kind==="outstanding"){
      const map=new Map();
      inv.forEach(i=>{ if(Number(i.due||0)<=0)return; const k=i.customer_phone; const r=map.get(k)||{name:i.customer_name||k,phone:k,place:custBy.get(k)?.place||"",due:0,bills:0}; r.due+=Number(i.due||0); r.bills++; if(i.customer_name)r.name=i.customer_name; map.set(k,r); });
      // sort by place (grouped), then biggest due first within a place
      const list=[...map.values()].sort((a,b)=> (a.place||"~").localeCompare(b.place||"~") || b.due-a.due);
      return {title:"Outstanding / Pending Report",head:["Customer","Mobile","Place","Pending bills","Balance due"],
        rows:list.map(r=>[r.name,r.phone,r.place||"—",r.bills,r.due]),
        totals:["","","","",list.reduce((s,r)=>s+r.due,0)]};
    }
    if(kind==="collections"){
      const map=new Map();
      inv.forEach(i=>{ const d=dISO(i.finalized_at||i.date); const r=map.get(d)||{d,Cash:0,UPI:0,Card:0,Bank:0,total:0};
        const pays=(i.payments&&i.payments.length)?i.payments:[{mode:i.pay_mode||"Cash",amount:Number(i.paid||0)}];
        pays.forEach(p=>{ let m=p.mode||"Cash"; if(m==="Bank Transfer")m="Bank"; if(!(m in r))m="Cash"; const amt=Number(p.amount||0); r[m]+=amt; r.total+=amt; });
        map.set(d,r); });
      const list=[...map.values()].sort((a,b)=>b.d.localeCompare(a.d));
      return {title:"Day-End / Collections Report",head:["Date","Cash","UPI","Card","Bank","Total collected"],
        rows:list.map(r=>[new Date(r.d+"T00:00:00").toLocaleDateString("en-IN"),r.Cash,r.UPI,r.Card,r.Bank,r.total]),
        totals:["",list.reduce((s,r)=>s+r.Cash,0),list.reduce((s,r)=>s+r.UPI,0),list.reduce((s,r)=>s+r.Card,0),list.reduce((s,r)=>s+r.Bank,0),list.reduce((s,r)=>s+r.total,0)]};
    }
    if(kind==="oldgold"){
      const rows=[];
      inv.forEach(i=>(i.old||[]).forEach(o=>rows.push([i.no||i.id,dShow(i.finalized_at||i.date),i.customer_name||"",o.desc||"Old gold",(o.net||o.gross||0),(o.purity||0),(o.applied||o.calc||0)])));
      return {title:"Old Gold Report",head:["Bill","Date","Customer","Description","Net g","Purity %","Credit"],rows,
        totals:["","","","","","",rows.reduce((s,r)=>s+Number(r[6]||0),0)]};
    }
    if(kind==="repairs"){
      const rows=reps.slice().sort((a,b)=>new Date(a.expected_date)-new Date(b.expected_date))
        .map(r=>[r.customer_name||"",r.customer_phone||"",r.item||"",r.problem||"",dShow(r.expected_date),r.status||""]);
      return {title:"Repairs Report",head:["Customer","Mobile","Item","Problem","Expected","Status"],rows,totals:null};
    }
    if(kind==="ordersest"){
      const rows=[];
      est.forEach(e=>rows.push(["Estimate",e.no||e.id,e.customer_name||"",e.customer_phone||"",(e.totals?e.totals.pay:0),"—","ESTIMATE"]));
      ord.forEach(o=>rows.push(["Order",o.id,o.customer_name||"",o.customer_phone||"",o.advance||0,dShow(o.delivery_date),o.status||""]));
      return {title:"Estimates & Orders Report",head:["Type","Ref","Customer","Mobile","Amount/Advance","Delivery","Status"],rows,totals:null};
    }
    if(kind==="gst"){
      const g=inv.filter(i=>i.gst);
      const rows=g.map(i=>[i.no||i.id,dShow(i.finalized_at||i.date),i.customer_name||"",(i.gst_rate||0)+"%",(i.taxable||0),(i.gst_amount||0)]);
      return {title:"GST Summary",head:["Bill","Date","Customer","Rate","Taxable value","GST amount"],rows,
        totals:["","","","",g.reduce((s,i)=>s+Number(i.taxable||0),0),g.reduce((s,i)=>s+Number(i.gst_amount||0),0)]};
    }
    return {title:"Report",head:[],rows:[],totals:null};
  }
  function sum(arr,k){ return arr.reduce((s,x)=>s+Number(x[k]||0),0); }

  /* money columns per report (for formatting) */
  const MONEY_COLS={sales:[5,6,7],outstanding:[4],collections:[1,2,3,4,5],oldgold:[6],repairs:[],ordersest:[4],gst:[4,5]};

  function exportCSV(kind){
    const r=build(kind); const mc=MONEY_COLS[kind]||[];
    const lines=[r.head.join(",")];
    r.rows.forEach(row=>lines.push(row.map((c,i)=>csvCell(mc.includes(i)?Math.round(Number(c)||0):c)).join(",")));
    if(r.totals) lines.push(r.totals.map((c,i)=>csvCell(c===""?"":(mc.includes(i)?Math.round(Number(c)||0):c))).join(","));
    const blob=new Blob(["\ufeff"+lines.join("\r\n")],{type:"text/csv;charset=utf-8"}); // BOM: Excel reads ₹ and Tamil correctly
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
    a.download=r.title.replace(/[^\w]+/g,"_")+"_"+new Date().toISOString().slice(0,10)+".csv";
    a.click(); URL.revokeObjectURL(a.href); toast&&toast(r.title+" exported.");
  }
  function csvCell(v){ v=String(v??""); return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; }

  function printReport(kind){
    const r=build(kind); const mc=MONEY_COLS[kind]||[];
    const s=window.Billing.settings;
    const head=`<tr>${r.head.map(h=>`<th>${esc(h)}</th>`).join("")}</tr>`;
    const body=r.rows.map(row=>`<tr>${row.map((c,i)=>`<td class="${mc.includes(i)?"bl-r":""}">${mc.includes(i)?money(c):esc(c)}</td>`).join("")}</tr>`).join("");
    const tot=r.totals?`<tr class="bl-rep-tot">${r.totals.map((c,i)=>`<td class="${mc.includes(i)?"bl-r":""}">${c===""?"":(mc.includes(i)?money(c):esc(c))}</td>`).join("")}</tr>`:"";
    const area=document.getElementById("bl-report-print");
    area.innerHTML=`<div class="bl-rep-doc">
      <div class="bl-rep-head"><div><h1>${esc(s.shop||"JEWELOS")}</h1><p>${esc(s.address||"")}</p></div>
        <div class="bl-rep-meta"><h2>${esc(r.title)}</h2><p>${new Date().toLocaleString("en-IN")}</p></div></div>
      <table class="bl-rep-table"><thead>${head}</thead><tbody>${body}${tot}</tbody></table>
      <p class="bl-rep-count">${r.rows.length} record(s)</p>
    </div>`;
    document.body.classList.add("bl-printing-report");
    setTimeout(()=>{window.print();document.body.classList.remove("bl-printing-report");},60);
  }

  // event delegation for billing report buttons
  document.addEventListener("click",e=>{
    const ex=e.target.closest("[data-bexport]"); if(ex){ exportCSV(ex.dataset.bexport); return; }
    const pr=e.target.closest("[data-bprint]"); if(pr){ printReport(pr.dataset.bprint); return; }
  });

  window.BillingReports={build,exportCSV,printReport};
})();
