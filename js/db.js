/* JewelGrow offline-first data layer. IndexedDB is the local source of truth. */
const DB_NAME = "ThangamOS_Offline_NoScheme_Test"; // production offline working copy
const DB_VERSION = 18;
let erpDB;

const memCache = { groups: [], products: [], tags: [], purchase_items: [], old_gold: [], customers: [], invoices: [], karigars: [], karigar_tx: [], repairs: [], sync_queue: [], settings: {}, audit_logs: [] };

const STORE_DEFS = [
    { name:"product_groups", key:"id", auto:true, indexes:[["shop_id","shop_id"],["updated_at","updated_at"]] },
    { name:"product_master", key:"id", auto:true, indexes:[["shop_id","shop_id"],["groupId","groupId"],["updated_at","updated_at"]] },
    { name:"purchase_invoices", key:"id", auto:true, indexes:[["shop_id","shop_id"],["supplier","supplier"],["updated_at","updated_at"]] },
    { name:"purchase_items", key:"id", auto:true, indexes:[["purchase_invoice_id","purchase_invoice_id"],["product_id","product_id"],["updated_at","updated_at"]] },
    { name:"tags", key:"tag_id", indexes:[["shop_id","shop_id"],["status","status"],["product_id","product_id"],["updated_at","updated_at"]] },
    { name:"customers", key:"phone", indexes:[["shop_id","shop_id"],["updated_at","updated_at"]] },
    { name:"invoices", key:"id", indexes:[["shop_id","shop_id"],["customer_phone","customer_phone"],["date","date"],["updated_at","updated_at"]] },
    { name:"old_gold", key:"og_id", indexes:[["shop_id","shop_id"],["phone","phone"],["used","used"],["updated_at","updated_at"]] },
    { name:"karigars", key:"id", indexes:[["shop_id","shop_id"],["updated_at","updated_at"]] },
    { name:"karigar_transactions", key:"tx_id", indexes:[["karigar_id","karigar_id"],["date","date"],["updated_at","updated_at"]] },
    { name:"repairs", key:"id", indexes:[["shop_id","shop_id"],["customer_phone","customer_phone"],["status","status"],["updated_at","updated_at"]] },
    { name:"audit_logs", key:"id", indexes:[["shop_id","shop_id"],["date","date"]] },
    { name:"sync_queue", key:"id", indexes:[["status","status"],["created_at","created_at"]] },
    { name:"estimates", key:"id", indexes:[["phone","phone"],["date","date"],["updated_at","updated_at"]] },
    { name:"crm_leads", key:"id", indexes:[["phone","phone"],["updated_at","updated_at"]] },
    { name:"pawn_pledges", key:"id", indexes:[["phone","phone"],["status","status"],["updated_at","updated_at"]] },
    { name:"pawn_events", key:"id", indexes:[["pledge_id","pledge_id"],["created_at","created_at"]] },
    { name:"settings", key:"id" }, { name:"app_meta", key:"key" },
    { name:"sync_conflicts", key:"id", indexes:[["status","status"]] },
    /* v16 additive billing stores — no existing store is modified. */
    { name:"orders", key:"id", indexes:[["phone","customer_phone"],["status","status"],["delivery_date","delivery_date"],["updated_at","updated_at"]] },
    { name:"dayend_closings", key:"id", indexes:[["date","date"]] },
    { name:"pos_drafts", key:"id", indexes:[["updated_at","updated_at"]] },
    { name:"held_bills", key:"id", indexes:[["held_at","held_at"]] },
    /* v17 ThangamOS unified offline-test stores */
    { name:"payment_followups", key:"id", indexes:[["customer_phone","customer_phone"],["invoice_id","invoice_id"],["next_date","next_date"],["status","status"]] },
    { name:"device_sessions", key:"id", indexes:[["last_seen","last_seen"],["active","active"]] }
];

function requestPromise(request) { return new Promise((resolve,reject) => { request.onsuccess=()=>resolve(request.result); request.onerror=()=>reject(request.error); }); }
function txPromise(tx) { return new Promise((resolve,reject) => { tx.oncomplete=()=>resolve(); tx.onerror=()=>reject(tx.error||new Error("Database transaction failed")); tx.onabort=()=>reject(tx.error||new Error("Database transaction aborted")); }); }
function nowIso(){ return new Date().toISOString(); }
function erpUid(prefix){ return `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`; }
function syncRecord(operation,table,recordId,payload){ const ts=nowIso(); return {id:erpUid("SYNC"),operation,table,record_id:String(recordId),payload,status:"pending",attempts:0,last_error:null,created_at:ts,updated_at:ts}; }
function notifyCloudQueue(){
    // Do this only after the local transaction has succeeded. IndexedDB remains
    // the offline safety layer; sync.js uploads the same queued change immediately.
    if(typeof window!=="undefined") window.dispatchEvent(new Event("jewelgrow:queued"));
}

const dbService = {
    async init(){
        erpDB = await new Promise((resolve,reject)=>{
            const req=indexedDB.open(DB_NAME,DB_VERSION);
            req.onupgradeneeded=event=>{
                const database=event.target.result;
                STORE_DEFS.forEach(def=>{
                    const store=database.objectStoreNames.contains(def.name)?event.target.transaction.objectStore(def.name):database.createObjectStore(def.name,{keyPath:def.key,autoIncrement:!!def.auto});
                    (def.indexes||[]).forEach(([name,keyPath,options])=>{ if(!store.indexNames.contains(name)) store.createIndex(name,keyPath,options||{unique:false}); });
                });
            };
            req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
            req.onblocked=()=>reject(new Error("Close other JewelGrow tabs and reopen the app to upgrade its database."));
        });
        erpDB.onversionchange=()=>{ erpDB.close(); location.reload(); };
        await this.migrateLegacyData();
        await this.repairInvoiceLinks();
        return erpDB;
    },
    add(store,data){ return this._single(store,"add",data); }, put(store,data){ return this._single(store,"put",data); },
    delete(store,key){ return this._single(store,"delete",key); }, clear(store){ return this._single(store,"clear"); }, get(store,key){ return this._single(store,"get",key,"readonly"); },
    getAll(store){ return this._single(store,"getAll",undefined,"readonly"); },
    async _single(store,method,value,mode="readwrite"){
        if(!erpDB) throw new Error("Database is not initialized"); const tx=erpDB.transaction(store,mode); const os=tx.objectStore(store);
        const result=await requestPromise(value===undefined?os[method]():os[method](value)); await txPromise(tx); return result;
    },
    async getAllByIndex(store,index,value){ const tx=erpDB.transaction(store,"readonly"); const result=await requestPromise(tx.objectStore(store).index(index).getAll(value)); await txPromise(tx); return result; },
    // Writes a trusted cloud row without adding it back to the upload queue.
    // This prevents a restore from creating an upload loop.
    async applyCloudRecord(store,recordId,data,remoteUpdatedAt){
        const def=STORE_DEFS.find(item=>item.name===store);
        if(!def || store==="sync_queue" || store==="app_meta" || !data || typeof data!=="object") return false;
        const row={...data};
        if(row[def.key]===undefined || row[def.key]===null || row[def.key]===""){
            if(def.auto && /^\d+$/.test(String(recordId))) row[def.key]=Number(recordId);
            else if(!def.auto) row[def.key]=recordId;
            else return false; // Old malformed cloud rows cannot be safely restored.
        }
        const current=await this.get(store,row[def.key]);
        const localTime=Date.parse(current?.updated_at||current?.created_at||0);
        const cloudTime=Date.parse(remoteUpdatedAt||row.updated_at||row.created_at||0);
        if(current && cloudTime && localTime && localTime>cloudTime) return false;
        row.updated_at=remoteUpdatedAt||row.updated_at||nowIso();
        row.sync_state="synced";
        await this._single(store,"put",row);
        return true;
    },
    async queue(operation,table,recordId,payload){ const result=await this.add("sync_queue",syncRecord(operation,table,recordId,payload)); notifyCloudQueue(); return result; },

    // Keep a pledge, its immutable event and both outgoing sync records in one
    // IndexedDB transaction. The cloud must still validate these server-side.
    async commitPawnEvent(pledge,event,expectedRevision=0){
        const tx=erpDB.transaction(["pawn_pledges","pawn_events","sync_queue"],"readwrite");
        const ps=tx.objectStore("pawn_pledges"), es=tx.objectStore("pawn_events"), qs=tx.objectStore("sync_queue");
        try {
            const previous=await requestPromise(ps.get(pledge.id));
            if(Number(previous?.revision||0)!==expectedRevision) throw new Error("Pledge changed on this device. Refresh and retry.");
            if(await requestPromise(es.get(event.id))) throw new Error("Duplicate pawn event");
            const next={...pledge,revision:expectedRevision+1,updated_at:nowIso(),sync_state:"pending"};
            ps.put(next); es.add(event);
            qs.add(syncRecord("upsert","pawn_pledges",next.id,next));
            qs.add(syncRecord("upsert","pawn_events",event.id,event));
            await txPromise(tx); notifyCloudQueue(); return next;
        } catch(error){ try{tx.abort();}catch(_){} throw error; }
    },

    async saveRelationalInvoice(header,items){
        const tx=erpDB.transaction(["purchase_invoices","purchase_items","sync_queue"],"readwrite"), ts=nowIso();
        const clean={...header,shop_id:header.shop_id||"local-shop",updated_at:ts,sync_state:"pending"};
        const invoiceId=await requestPromise(tx.objectStore("purchase_invoices").add(clean)); const saved=[];
        for(const raw of items){ const item={...raw,purchase_invoice_id:invoiceId,purity:Number(raw.purity||0),pure_weight:Number(raw.pure_weight||0),rate:Number(raw.rate||0),updated_at:ts,sync_state:"pending"}; const id=await requestPromise(tx.objectStore("purchase_items").add(item)); saved.push({...item,id}); }
        tx.objectStore("sync_queue").add(syncRecord("upsert","purchase_invoices",invoiceId,{...clean,id:invoiceId,items:saved})); await txPromise(tx); notifyCloudQueue(); return invoiceId;
    },

    async saveBulkTags(tags,purchaseItemId,taggedWeight){
        const tx=erpDB.transaction(["tags","purchase_items","sync_queue"],"readwrite"), itemStore=tx.objectStore("purchase_items");
        const item=await requestPromise(itemStore.get(Number(purchaseItemId))); if(!item){ tx.abort(); throw new Error("Purchase item not found"); }
        if(tags.length>Number(item.qty||0)-Number(item.tagged_qty||0)){ tx.abort(); throw new Error("Tag quantity exceeds pending quantity"); }
        if(Number(taggedWeight)>Number(item.gross_weight||0)-Number(item.tagged_weight||0)+0.001){ tx.abort(); throw new Error("Tagged weight exceeds pending gross weight"); }
        const ts=nowIso(); tags.forEach(tag=>{ const row={...tag,purchase_item_id:item.id,shop_id:tag.shop_id||"local-shop",updated_at:ts,sync_state:"pending"}; tx.objectStore("tags").add(row); tx.objectStore("sync_queue").add(syncRecord("upsert","tags",row.tag_id,row)); });
        item.tagged_qty=Number(item.tagged_qty||0)+tags.length; item.tagged_weight=Number(item.tagged_weight||0)+Number(taggedWeight||0); item.updated_at=ts; item.sync_state="pending"; itemStore.put(item);
        tx.objectStore("sync_queue").add(syncRecord("upsert","purchase_items",item.id,item)); await txPromise(tx); notifyCloudQueue();
    },

    async saveCustomerInvoice(customer,invoice,options={}){
        const stores=["customers","invoices","sync_queue"]; if(options.tagId) stores.push("tags"); if(options.oldGoldId) stores.push("old_gold");
        const tx=erpDB.transaction(stores,"readwrite"), ts=nowIso();
        const customerRow={...customer,updated_at:ts,sync_state:"pending",shop_id:customer.shop_id||"local-shop"}; delete customerRow.invoices;
        const invoiceRow={...invoice,customer_phone:customer.phone,updated_at:ts,sync_state:"pending",shop_id:invoice.shop_id||"local-shop"};
        tx.objectStore("customers").put(customerRow); tx.objectStore("invoices").put(invoiceRow);
        tx.objectStore("sync_queue").add(syncRecord("upsert","customers",customerRow.phone,customerRow)); tx.objectStore("sync_queue").add(syncRecord("upsert","invoices",invoiceRow.id,invoiceRow));
        if(options.tagId){ const tag=await requestPromise(tx.objectStore("tags").get(options.tagId)); if(!tag||tag.status!=="in_stock"){ tx.abort(); throw new Error("Selected tag is no longer available"); } tag.status="sold"; tag.sold_invoice_id=invoice.id; tag.updated_at=ts; tag.sync_state="pending"; tx.objectStore("tags").put(tag); tx.objectStore("sync_queue").add(syncRecord("upsert","tags",tag.tag_id,tag)); }
        if(options.oldGoldId){ const og=await requestPromise(tx.objectStore("old_gold").get(options.oldGoldId)); if(!og||og.used){ tx.abort(); throw new Error("Old-gold receipt is invalid or already used"); } og.used=true; og.linked_inv=invoice.id; og.updated_at=ts; og.sync_state="pending"; tx.objectStore("old_gold").put(og); tx.objectStore("sync_queue").add(syncRecord("upsert","old_gold",og.og_id,og)); }
        await txPromise(tx); notifyCloudQueue();
    },

    async applyPayment(phone,amount,mode,targetInvoiceId){
        // STEP 1: VALIDATE ALL CONDITIONS BEFORE OPENING TRANSACTION
        const invoices=(await this.getAllByIndex("invoices","customer_phone",phone)).sort((a,b)=>new Date(a.date)-new Date(b.date));
        const totalDue=invoices.reduce((s,i)=>s+Number(i.due||0),0);
        if(amount<=0||amount>totalDue) throw new Error("Payment exceeds the customer balance");
        const targets=targetInvoiceId==="AUTO"?invoices:invoices.filter(i=>i.id===targetInvoiceId);
        if(!targets.length) throw new Error("Invoice not found");
        if(targetInvoiceId!=="AUTO"&&amount>Number(targets[0].due||0)) throw new Error("Payment exceeds the balance on this bill");
        
        // STEP 2: NOW OPEN TRANSACTION WITH VALIDATED STATE
        const tx=erpDB.transaction(["invoices","sync_queue"],"readwrite"), store=tx.objectStore("invoices");
        let remaining=amount; const ts=nowIso();
        for(const inv of targets){ if(remaining<=0) break; const applied=Math.min(Number(inv.due||0),remaining); if(applied<=0) continue; inv.due=Number(inv.due||0)-applied; inv.paid=Number(inv.paid||0)+applied; inv.payments=[...(inv.payments||[]),{id:erpUid("PAY"),date:ts,amount:applied,mode,note:targetInvoiceId==="AUTO"?"AUTO":"SPECIFIC"}]; inv.updated_at=ts; inv.sync_state="pending"; store.put(inv); tx.objectStore("sync_queue").add(syncRecord("upsert","invoices",inv.id,inv)); remaining-=applied; }
        if(remaining>0.001) throw new Error("Payment could not be fully allocated");
        await txPromise(tx); notifyCloudQueue(); return amount;
    },

    async migrateLegacyData(){
        if(await this.get("app_meta","canonical_invoice_migration_v1")) return;
        const tx=erpDB.transaction(["customers","invoices","app_meta"],"readwrite"), cs=tx.objectStore("customers"), ins=tx.objectStore("invoices"), customers=await requestPromise(cs.getAll()), ts=nowIso();
        customers.forEach(c=>{ (c.invoices||[]).forEach(inv=>ins.put({...inv,customer_phone:c.phone,updated_at:inv.updated_at||ts,shop_id:inv.shop_id||"local-shop"})); if(Object.prototype.hasOwnProperty.call(c,"invoices")){ delete c.invoices; c.updated_at=c.updated_at||ts; cs.put(c); } });
        tx.objectStore("app_meta").put({key:"canonical_invoice_migration_v1",completed_at:ts}); await txPromise(tx);
    },

    // Repairs records created by builds that still embedded invoices inside
    // customers after the v1 migration marker had already been written.
    async repairInvoiceLinks(){
        if(await this.get("app_meta","canonical_invoice_repair_v2")) return;
        const tx=erpDB.transaction(["customers","invoices","app_meta"],"readwrite"), customersStore=tx.objectStore("customers"), invoicesStore=tx.objectStore("invoices"), customers=await requestPromise(customersStore.getAll()), ts=nowIso();
        customers.forEach(customer=>{
            (customer.invoices||[]).forEach(invoice=>invoicesStore.put({...invoice,customer_phone:customer.phone,updated_at:invoice.updated_at||ts,shop_id:invoice.shop_id||customer.shop_id||"local-shop"}));
            if(Object.prototype.hasOwnProperty.call(customer,"invoices")){ delete customer.invoices; customer.updated_at=customer.updated_at||ts; customersStore.put(customer); }
        });
        tx.objectStore("app_meta").put({key:"canonical_invoice_repair_v2",completed_at:ts});
        await txPromise(tx);
    },

    /* ---- v16 billing: finalize a POS bill into the shared ERP database ---- */
    /* Writes the full invoice snapshot, upserts the customer, stores each old-gold
       exchange line, and queues everything for cloud sync. One bill updates the
       Sales Register, Home dues and Client Accounts because they all read these
       same stores. */
    async finalizeBill(snapshot){
        const ts=nowIso(), shop=snapshot.shop_id||"local-shop";
        const phone=String(snapshot.customer?.phone||"").trim();
        if(!phone) throw new Error("Customer mobile number is required");
        if(!(snapshot.lines||[]).length) throw new Error("Add at least one sale item");
        const stores=["customers","invoices","old_gold","sync_queue","pos_drafts"];
        const tx=erpDB.transaction(stores,"readwrite");
        // Customer: merge onto any existing record, phone is the key.
        const existing=await requestPromise(tx.objectStore("customers").get(phone));
        const customerRow={
            ...(existing||{}), phone,
            name:snapshot.customer.name||existing?.name||"",
            address:snapshot.customer.address??existing?.address??"",
            place:snapshot.customer.place??existing?.place??"",
            pin:snapshot.customer.pin??existing?.pin??"",
            email:snapshot.customer.email??existing?.email??"",
            img:snapshot.customer.img||existing?.img||"",
            updated_at:ts, sync_state:"pending", shop_id:existing?.shop_id||shop
        };
        delete customerRow.invoices;
        const t=snapshot.totals||{};
        const invoiceRow={
            id:snapshot.id, no:snapshot.no, date:snapshot.date,
            customer_phone:phone, customer_name:customerRow.name,
            lines:snapshot.lines||[], old:snapshot.old||[], oldRef:snapshot.oldRef||"",
            gst:!!snapshot.gst, gst_rate:Number(snapshot.gst_rate||0),
            subtotal:Number(t.sub||0), discount:Number(t.dis||0), taxable:Number(t.tv||0),
            gst_amount:Number(t.gst||0), old_gold_credit:Number(t.og||0), advance_adjusted:Number(t.adv||0),
            total:Number(t.pay||0), paid:Number(t.rec||0), due:Number(t.due||0),
            payments:(Array.isArray(snapshot.payments)&&snapshot.payments.length)
                ? snapshot.payments.filter(p=>Number(p.amount||0)>0).map(p=>({id:erpUid("PAY"),date:ts,amount:Number(p.amount||0),mode:p.mode||"Cash",note:"POS"}))
                : (Number(t.rec||0)>0?[{id:erpUid("PAY"),date:ts,amount:Number(t.rec||0),mode:snapshot.pay_mode||"Cash",note:"POS"}]:[]),
            pay_mode:snapshot.pay_mode||"Cash",
            source:snapshot.source||"POS", order_id:snapshot.order_id||"",
            status:"FINALIZED", finalized_at:ts, updated_at:ts, sync_state:"pending", shop_id:shop
        };
        tx.objectStore("customers").put(customerRow);
        tx.objectStore("invoices").put(invoiceRow);
        tx.objectStore("sync_queue").add(syncRecord("upsert","customers",phone,customerRow));
        tx.objectStore("sync_queue").add(syncRecord("upsert","invoices",invoiceRow.id,invoiceRow));
        (snapshot.old||[]).forEach((o,i)=>{
            const og={...o, og_id:(snapshot.oldRef||("OG-"+String(Date.now()).slice(-7)))+"-"+(i+1),
                phone, linked_inv:invoiceRow.id, used:true, shop_id:shop, updated_at:ts, created_at:ts};
            tx.objectStore("old_gold").put(og);
            tx.objectStore("sync_queue").add(syncRecord("upsert","old_gold",og.og_id,og));
        });
        try{ tx.objectStore("pos_drafts").delete("DRAFT-CURRENT"); }catch(_){}
        await txPromise(tx); notifyCloudQueue();
        return invoiceRow;
    },

    async saveEstimate(est){
        const ts=nowIso(); const row={...est,status:est.status||"ESTIMATE",updated_at:ts,sync_state:"pending",shop_id:est.shop_id||"local-shop"};
        await this.put("estimates",row); await queueOnly("upsert","estimates",row.id,row); return row;
    },
    async saveOrder(order){
        const ts=nowIso(); const row={...order,updated_at:ts,sync_state:"pending",shop_id:order.shop_id||"local-shop"};
        await this.put("orders",row); await queueOnly("upsert","orders",row.id,row); return row;
    },
    async saveDayEnd(closing){
        const ts=nowIso(); const row={...closing,created_at:ts,updated_at:ts,sync_state:"pending",shop_id:closing.shop_id||"local-shop"};
        await this.put("dayend_closings",row); await queueOnly("upsert","dayend_closings",row.id,row); return row;
    }
};

async function queueOnly(operation,table,recordId,payload){
    const tx=erpDB.transaction(["sync_queue"],"readwrite");
    tx.objectStore("sync_queue").add(syncRecord(operation,table,recordId,payload));
    await txPromise(tx); notifyCloudQueue();
}
