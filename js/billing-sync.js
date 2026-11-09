"use strict";
/* =====================================================================
   JewelOS Billing ⇄ Supabase realtime sync  (cloud-first, offline-safe)
   ---------------------------------------------------------------------
   • Supabase is the main database. Every billing change is uploaded
     immediately; other devices receive it live (Supabase Realtime).
   • IndexedDB is only the device's working copy + offline outbox: if the
     internet drops, bills are still saved and upload automatically later.
   • Payments made on two devices for the same bill are MERGED (union by
     payment id) — none are lost.
   • A device is bound to one shop. Data of one shop never uploads into
     another shop's account.
   • The 4-digit Payment PIN never leaves the device.
   Runs only when Supabase is configured and a shop user is signed in.
   ===================================================================== */
(function(){
  const $ = id => document.getElementById(id);

  // local IndexedDB store  →  cloud table (+ typed columns for reports)
  const num = v => Math.round((Number(v)||0)*100)/100;
  const day = v => (typeof v==="string" && /^\d{4}-\d{2}-\d{2}/.test(v)) ? v.slice(0,10) : null;
  const ts  = v => { const t=Date.parse(v||""); return isNaN(t) ? null : new Date(t).toISOString(); };
  const MAP = {
    customers:      { table:"bill_customers", key:"phone", cols:r=>({ phone:r.phone||null, name:r.name||null }) },
    invoices:       { table:"bill_invoices",  key:"id",    cols:r=>({ customer_phone:r.customer_phone||null, invoice_no:r.no||null, invoice_date:ts(r.finalized_at),
                                                                      gst:!!r.gst, total:num(r.total), paid:num(r.paid), due:num(r.due), advance_adjusted:num(r.advance_adjusted||0) }) },
    old_gold:       { table:"bill_old_gold",  key:"og_id", cols:r=>({ invoice_id:r.linked_inv||null, customer_phone:r.phone||null }) },
    estimates:      { table:"bill_estimates", key:"id",    cols:r=>({ customer_phone:r.customer_phone||null }) },
    orders:         { table:"bill_orders",    key:"id",    cols:r=>({ customer_phone:r.customer_phone||null, status:r.status||null, delivery_date:day(r.delivery_date) }) },
    repairs:        { table:"bill_repairs",   key:"id",    cols:r=>({ customer_phone:r.customer_phone||null, status:r.status||null, expected_date:day(r.expected_date) }) },
    dayend_closings:{ table:"bill_dayend",    key:"id",    cols:r=>({ close_date:day(r.date) }) }
  };
  const SETTINGS_ID = "billing";
  const KNOWN = new Set([...Object.keys(MAP), "settings"]);
  const STORE_BY_TABLE = Object.fromEntries(Object.entries(MAP).map(([s,m])=>[m.table,s]));

  const config = { pageSize:1000, overlapMs:5*60*1000, pushBatch:50, pullEveryMs:5*60*1000, retryBaseMs:4000 };
  let client=null, shopId=null, active=false, channel=null, live=false;
  let flushing=false, pullPromise=null, applyingRemote=false, initialPullDone=false, gen=0;
  let retryTimer=null, retryDelay=config.retryBaseMs, pullTimer=null, uiTimer=null, fetchTimer=null;
  let fetchQueue={}; let state={ code:"local", pending:0, lastSync:null, error:"" };

  /* ---------- status line (sidebar) ---------- */
  function setState(code, extra={}){
    state={ ...state, code, ...extra };
    const el=$("blSyncState"); if(!el) return;
    const p=state.pending;
    const text={
      local:   "",
      syncing: `Syncing ${p} change${p===1?"":"s"}…`,
      synced:  "Billing synced · live",
      offline: p ? `Offline · ${p} change${p===1?"":"s"} saved on this device` : "Offline · will sync when back online",
      readonly:"Read-only subscription · uploads paused",
      error:   "Sync problem · retrying" + (state.error?` (${state.error})`:""),
      blocked: "Unsynced data from another shop on this device — sign in to that shop first"
    }[code] ?? "";
    el.textContent=text; el.dataset.state=code; el.hidden=!text;
  }

  /* ---------- write capture: every local billing write enters the outbox ---------- */
  const rawPut = dbService.put.bind(dbService);
  dbService.put = async function(store, data){
    const result = await rawPut(store, data);
    try{
      if(!applyingRemote && data){
        if(MAP[store]) await dbService.queue("upsert", store, data[MAP[store].key], data);  // ✓ Pass data, not null
        else if(store==="settings" && data.id===SETTINGS_ID) await dbService.queue("upsert","settings",SETTINGS_ID,data);  // ✓ Pass data
      }
    }catch(e){ console.warn("sync queue",e); }
    return result;
  };
  async function putRemote(store,row){ applyingRemote=true; try{ await rawPut(store,row); } finally{ applyingRemote=false; } }

  async function pendingEntries(){ return (await dbService.getAll("sync_queue")).filter(e=>KNOWN.has(e.table)); }
  async function pendingKeySet(){ return new Set((await pendingEntries()).map(e=>e.table+"\u0001"+e.record_id)); }

  /* ---------- cloud row builders ---------- */
  function cleanPayload(row){ const p={...row}; delete p.sync_state; return p; }
  function toCloud(store,row){
    if(store==="settings"){ const v={...(row.value||{})}; delete v.paymentPin; return { shop_id:shopId, payload:v }; }
    const m=MAP[store];
    return { id:String(row[m.key]), shop_id:shopId, ...m.cols(row), payload:cleanPayload(row) };
  }

  /* ---------- settings upload: only fields changed on this device ---------- */
  async function pushSettings(){
    const loc=await dbService.get("settings",SETTINGS_ID); if(!loc) return;
    const mine={...(loc.value||{})}; const pin=mine.paymentPin||""; delete mine.paymentPin;
    const base=(await dbService.get("app_meta","settings_base:"+shopId))?.value||{};
    const patch={}; for(const k of Object.keys(mine)) if(JSON.stringify(mine[k])!==JSON.stringify(base[k])) patch[k]=mine[k];
    if(!Object.keys(patch).length) return;                            // e.g. only the PIN changed: nothing to upload
    const cur=await client.from("bill_settings").select("payload").eq("shop_id",shopId).maybeSingle();
    if(cur.error) throw new Error(cur.error.message||String(cur.error));
    const merged={ ...((cur.data&&cur.data.payload)||{}), ...patch };
    const r=await client.from("bill_settings").upsert({ shop_id:shopId, payload:merged },{ onConflict:"shop_id" });
    if(r.error) throw new Error(r.error.message||String(r.error));
    await rawPut("app_meta",{ key:"settings_base:"+shopId, value:merged });
    await putRemote("settings",{ id:SETTINGS_ID, value:{ ...mine, ...merged, paymentPin:pin } });
  }

  /* ---------- upload (outbox flush) ---------- */
  function canPush(){ return !window.Access || window.Access.canWrite(); }
  async function flush(){
    if(!active || flushing || !initialPullDone) return;
    const entries=await pendingEntries();
    state.pending=entries.length;
    if(!navigator.onLine){ setState("offline"); return; }
    if(!canPush()){ setState("readonly"); return; }
    if(!entries.length){ if(live) setState("synced",{lastSync:new Date().toISOString(),error:""}); return; }
    flushing=true; setState("syncing");
    try{
      const groups=new Map();
      for(const e of entries){ const k=e.table+"\u0001"+e.record_id; if(!groups.has(k)) groups.set(k,[]); groups.get(k).push(e.id); }
      const batches={}, stale=[];
      for(const [k,ids] of groups){
        const [store,rid]=k.split("\u0001");
        if(store==="settings"){ await pushSettings(); for(const id of ids) await dbService.delete("sync_queue",id); continue; }
        const local=await dbService.get(store, rid);
        if(!local){ stale.push(...ids); continue; }               // nothing left to upload
        const table=store==="settings"?"bill_settings":MAP[store].table;
        (batches[table] ||= { rows:[], ids:[] });
        batches[table].rows.push(toCloud(store,local)); batches[table].ids.push(...ids);
      }
      for(const id of stale) await dbService.delete("sync_queue",id);
      for(const [table,b] of Object.entries(batches)){
        for(let i=0;i<b.rows.length;i+=config.pushBatch){
          const rows=b.rows.slice(i,i+config.pushBatch);
          const r=await client.from(table).upsert(rows,{ onConflict: table==="bill_settings"?"shop_id":"shop_id,id" });
          if(r.error) throw new Error(r.error.message||String(r.error));
        }
        for(const id of b.ids) await dbService.delete("sync_queue",id);
      }
      retryDelay=config.retryBaseMs;
      state.pending=(await pendingEntries()).length;
      if(state.pending) { flushing=false; clearTimeout(retryTimer); retryTimer=setTimeout(flush, 0); return; }  // ✓ Defer, don't recurse
      setState("synced",{ lastSync:new Date().toISOString(), error:"" });
    }catch(err){
      state.pending=(await pendingEntries()).length;
      setState(navigator.onLine?"error":"offline",{ error:(err.message||"").slice(0,60) });
      clearTimeout(retryTimer); retryTimer=setTimeout(flush, retryDelay); retryDelay=Math.min(retryDelay*2, 60000);
    }finally{ flushing=false; }
  }
  window.addEventListener("jewelgrow:queued", ()=>{ if(active) setTimeout(flush, 50); });

  /* ---------- download: merge rules ---------- */
  function mergeInvoice(remote, local){
    const seen=new Set((remote.payments||[]).map(p=>p.id));
    const localOnly=(local.payments||[]).filter(p=>p && p.id && !seen.has(p.id));
    if(!localOnly.length) return { row:remote, changed:false };
    const extra=localOnly.reduce((s,p)=>s+Number(p.amount||0),0);
    const paid=num(Number(remote.paid||0)+extra);
    return { row:{ ...remote, payments:[...(remote.payments||[]), ...localOnly], paid, due:num(Math.max(0, Number(remote.total||0)-paid)) }, changed:true };
  }
  async function applyRemote(store, payload, cloudId, pending){
    if(!payload || typeof payload!=="object") return false;
    if(store==="settings"){
      const local=await dbService.get("settings",SETTINGS_ID);
      const mine={...(local?.value||{})}; const pin=mine.paymentPin||""; delete mine.paymentPin;
      const baseRow=await dbService.get("app_meta","settings_base:"+shopId);
      const oldBase=baseRow?.value||{};
      const patch={};                                                     // this device's not-yet-uploaded edits
      if(baseRow && pending.has("settings\u0001"+SETTINGS_ID))            // a device new to this shop has no edits: cloud wins
        for(const k of Object.keys(mine)) if(JSON.stringify(mine[k])!==JSON.stringify(oldBase[k])) patch[k]=mine[k];
      const base={ ...oldBase, ...payload };                              // what the cloud now holds
      await rawPut("app_meta",{ key:"settings_base:"+shopId, value:base });
      await putRemote("settings",{ id:SETTINGS_ID, value:{ ...mine, ...payload, ...patch, paymentPin:pin } });   // PIN stays on device
      return true;
    }
    const m=MAP[store]; const row={...payload};
    if(row[m.key]==null || row[m.key]==="") row[m.key]=cloudId;
    const key=String(row[m.key]);
    const local=await dbService.get(store,key);
    if(store==="invoices" && local){
      const { row:merged, changed }=mergeInvoice(row, local);
      await putRemote(store, merged);
      if(changed) await dbService.queue("upsert","invoices",key,null);   // send the union back to the cloud
      return true;
    }
    if(local && pending.has(store+"\u0001"+key)) return false;           // our newer local edit uploads next
    await putRemote(store,row);
    return true;
  }

  /* ---------- download: full/incremental catch-up ---------- */
  const cursorKey = table => `jewelos_sync_cursor:${shopId}:${table}`;
  function pull(){
    if(!active || !navigator.onLine) return Promise.resolve();
    if(pullPromise) return pullPromise;                       // callers wait for the download in progress
    pullPromise=doPull().finally(()=>{ pullPromise=null; });
    return pullPromise;
  }
  async function doPull(){
    const myGen=gen; let changed=false;
    try{
      const pending=await pendingKeySet();
      for(const [store,m] of Object.entries(MAP)){
        const cur=localStorage.getItem(cursorKey(m.table));
        const since=cur ? new Date(Date.parse(cur)-config.overlapMs).toISOString() : "1970-01-01T00:00:00.000Z";
        let offset=0, maxT=cur?Date.parse(cur):0;
        for(;;){
          const r=await client.from(m.table).select("id,payload,updated_at").eq("shop_id",shopId)
            .gte("updated_at",since).order("updated_at",{ascending:true}).order("id",{ascending:true})
            .range(offset, offset+config.pageSize-1);
          if(r.error) throw new Error(r.error.message||String(r.error));
          if(myGen!==gen) return;                              // shop changed meanwhile: discard
          for(const row of (r.data||[])){
            if(await applyRemote(store,row.payload,row.id,pending)) changed=true;
            const t=Date.parse(row.updated_at); if(t>maxT) maxT=t;
          }
          if(!r.data || r.data.length<config.pageSize) break;
          offset+=config.pageSize;
        }
        if(maxT) localStorage.setItem(cursorKey(m.table), new Date(maxT).toISOString());
      }
      const s=await client.from("bill_settings").select("payload,updated_at").eq("shop_id",shopId).maybeSingle();
      if(myGen!==gen) return;
      if(!s.error){
        const cloudHas=!!(s.data && s.data.payload && Object.keys(s.data.payload).length);
        if(cloudHas){ await applyRemote("settings",s.data.payload,null,pending); changed=true; }   // cloud settings win
        else { const loc=await dbService.get("settings",SETTINGS_ID); if(loc && loc.value && (loc.value.shop||loc.value.gstin)) await dbService.queue("upsert","settings",SETTINGS_ID,null); }
      }
      initialPullDone=true;
      if(changed) refreshUI(true);
    }catch(err){
      setState(navigator.onLine?"error":"offline",{ error:(err.message||"").slice(0,60) });
    }
  }

  /* ---------- realtime: fetch changed rows by id (robust to large photos) ---------- */
  function onRealtime(store, payload){
    const id=(payload.new&&payload.new.id)||(payload.old&&payload.old.id);
    if(store==="settings"){ (fetchQueue.settings ||= new Set()).add("1"); }
    else if(id){ (fetchQueue[store] ||= new Set()).add(String(id)); }
    clearTimeout(fetchTimer); fetchTimer=setTimeout(drainFetches, 250);
  }
  async function drainFetches(){
    const q=fetchQueue, myGen=gen; fetchQueue={}; let changed=false;
    try{
      const pending=await pendingKeySet();
      for(const [store,ids] of Object.entries(q)){
        if(store==="settings"){
          const s=await client.from("bill_settings").select("payload").eq("shop_id",shopId).maybeSingle();
          if(!s.error && s.data){ await applyRemote("settings",s.data.payload,null,pending); changed=true; }
          continue;
        }
        const list=[...ids];
        for(let i=0;i<list.length;i+=100){
          const r=await client.from(MAP[store].table).select("id,payload,updated_at").eq("shop_id",shopId).in("id",list.slice(i,i+100));
          if(r.error) throw new Error(r.error.message||String(r.error));
          if(myGen!==gen) return;
          for(const row of (r.data||[])) if(await applyRemote(store,row.payload,row.id,pending)) changed=true;
        }
      }
      if(changed) refreshUI(!!q.settings);
      flush();
    }catch(err){ Object.entries(q).forEach(([s,ids])=>ids.forEach(id=>(fetchQueue[s] ||= new Set()).add(id))); setTimeout(drainFetches, 3000); }
  }
  function subscribe(){
    if(channel){ try{ client.removeChannel(channel); }catch(_){} }
    channel=client.channel(`bill-${shopId}`);
    for(const [store,m] of Object.entries(MAP))
      channel.on("postgres_changes",{ event:"*", schema:"public", table:m.table, filter:`shop_id=eq.${shopId}` }, p=>onRealtime(store,p));
    channel.on("postgres_changes",{ event:"*", schema:"public", table:"bill_settings", filter:`shop_id=eq.${shopId}` }, p=>onRealtime("settings",p));
    channel.subscribe(status=>{
      if(status==="SUBSCRIBED"){ live=true; pull().then(flush); }             // (re)connected: catch up, then upload
      else if(status==="CHANNEL_ERROR"||status==="TIMED_OUT"||status==="CLOSED"){ live=false; setState(navigator.onLine?"error":"offline",{error:"realtime "+status.toLowerCase()}); }
    });
  }

  /* ---------- refresh screens after remote changes ---------- */
  function refreshUI(settingsChanged){
    clearTimeout(uiTimer);
    uiTimer=setTimeout(async()=>{
      try{
        if(settingsChanged && window.Billing?.loadSettings){
          await window.Billing.loadSettings();
          const n=window.Billing.settings.shop||"";
          const sl=$("shopLabel"); if(sl) sl.textContent=(n||"JEWELOS").toUpperCase();
          const gr=$("todayGreeting"); if(gr) gr.textContent=n?("Today at "+n):"Today";
        }
        await window.Billing?.loadCache?.();
        const page=document.querySelector(".nav-item.active")?.dataset.page;
        if(page) window.BillingPages?.renderBillingPage(page);
        const modal=$("blAccModal");
        if(modal && !modal.hidden && window.BillingPages?.currentAccount?.()) window.BillingPages.openAccount(window.BillingPages.currentAccount());
      }catch(e){ console.warn("sync refresh",e); }
    },400);
  }

  /* ---------- one shop per device ---------- */
  async function bindShop(){
    const meta=await dbService.get("app_meta","bound_shop");
    const bound=meta&&meta.value;
    if(bound===shopId) return true;
    if(!bound){
      // first cloud sign-in on this device: upload anything recorded locally before
      for(const store of Object.keys(MAP)){
        for(const row of await dbService.getAll(store)) await dbService.queue("upsert",store,row[MAP[store].key],null);
      }
      await rawPut("app_meta",{ key:"bound_shop", value:shopId });
      return true;
    }
    if((await pendingEntries()).length){ setState("blocked"); window.toast?.("This device has unsynced bills from another shop. Sign in to that shop to upload them first."); return false; }
    for(const store of Object.keys(MAP)) await dbService.clear(store);   // previous shop's copy (already in its cloud)
    const s=await dbService.get("settings",SETTINGS_ID);
    if(s) await putRemote("settings",{ id:SETTINGS_ID, value:{ paymentPin:s.value?.paymentPin||"" } });
    for(const e of (await dbService.getAll("sync_queue")).filter(e=>e.table==="settings")) await dbService.delete("sync_queue",e.id);
    await rawPut("app_meta",{ key:"bound_shop", value:shopId });
    refreshUI(true);
    return true;
  }

  /* ---------- lifecycle ---------- */
  async function start(detail){
    const c=window.JewelCloud?.client?.();
    if(!c || !detail?.shopId) return;
    if(active && shopId===detail.shopId) { flush(); return; }
    stop();
    gen++; initialPullDone=false;
    client=c; shopId=detail.shopId;
    for(let i=0;i<100;i++){ try{ await dbService.getAll("app_meta"); break; }catch(_){ await new Promise(r=>setTimeout(r,100)); } }   // wait for local DB
    const myGen=gen;
    if(!(await bindShop()) || myGen!==gen) return;
    active=true; setState(navigator.onLine?"syncing":"offline",{ pending:(await pendingEntries()).length });
    subscribe();
    await pull(); await flush();
    clearInterval(pullTimer); pullTimer=setInterval(()=>{ pull(); flush(); }, config.pullEveryMs);   // safety net
  }
  function stop(){
    active=false; live=false; initialPullDone=false;
    clearTimeout(retryTimer); clearInterval(pullTimer); clearTimeout(fetchTimer);
    if(channel && client){ try{ client.removeChannel(channel); }catch(_){} }
    channel=null;
  }
  window.addEventListener("jewelcloud-context", e=>{
    const d=e.detail||{};
    if(d.mode==="shop" && d.accessState!=="suspended") start(d);
    else { stop(); setState("local"); }
  });
  window.addEventListener("online",  ()=>{ if(active){ setState("syncing"); pull().then(flush); } });
  window.addEventListener("offline", ()=>{ if(active) setState("offline"); });

  // Local-only installs never upload, so don't let the outbox grow forever.
  window.addEventListener("load", ()=>setTimeout(async()=>{
    try{
      if(window.JewelCloud?.context?.().configured) return;
      if(await dbService.get("app_meta","bound_shop")) return;            // keep outbox if it ever synced
      for(const e of await pendingEntries()) await dbService.delete("sync_queue",e.id);
    }catch(_){}
  },3000));

  window.BillingSync = { flush, pull, config, status:()=>({ ...state, active, live, shopId }), _start:start, _stop:stop };
})();
