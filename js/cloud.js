"use strict";

/* Supabase Auth, tenant isolation, subscription enforcement and Realtime adapter. */
(function(){
  const cfg=window.JEWELOS_SUPABASE||{};
  const configured=Boolean(cfg.url&&cfg.publishableKey&&window.supabase?.createClient);
  let client=null,shopId=null,role="staff",staffId=null,userId=null,mode="local",accessState="local",modules={},ready=false,saving=false,pending=null,channel=null,deviceId=null,sessionTimer=null;
  const tableMap={customers:"crm_customers",visits:"crm_visits",followups:"crm_followups",groups:"crm_groups",campaigns:"crm_campaigns",campaignRecipients:"crm_campaign_recipients",messageLogs:"crm_message_logs",privacyRequests:"crm_privacy_requests",consentLogs:"crm_consent_logs",securityIncidents:"crm_security_incidents",activity:"crm_activity_logs",staff:"crm_staff",attendance:"crm_attendance"};

  function status(state,label){window.dispatchEvent(new CustomEvent("jewelcloud-status",{detail:{state,label}}));}
  function emitContext(detail){window.dispatchEvent(new CustomEvent("jewelcloud-context",{detail}));}
  function emitData(data){window.dispatchEvent(new CustomEvent("jewelcloud-data",{detail:data}));}
  function cleanPhone(v){const n=String(v||"").replace(/\D/g,"");return n.length>10?n.slice(-10):n;}
  function base(row){return {id:String(row.id),shop_id:shopId,payload:row,updated_at:new Date().toISOString()};}
  function mapRows(result){return (result.data||[]).map(x=>x.payload||{});}
  function canWrite(){return mode==="shop"&&ready&&!['read_only','suspended'].includes(accessState)&&role!=="readonly";}
  function dateOnly(){return new Date().toISOString().slice(0,10);}
  function effectiveState(sub,shopStatus){
    if(shopStatus!=="active"||sub?.status==="suspended")return "suspended";
    if(sub?.status==="read_only")return "read_only";
    if(!sub)return "active";
    const today=dateOnly();
    if(sub.expires_on&&today>sub.expires_on)return sub.grace_until&&today<=sub.grace_until?"grace":"read_only";
    if(sub.status==="due"||sub.payment_status==="due"||sub.payment_status==="overdue")return "due";
    return sub.status||"active";
  }
  function sessionDays(){
    const s=cfg.sessionDays||{};
    const value=mode==="admin"?s.admin:role==="owner"?s.owner:s.staff;
    return Math.max(1,Number(value|| (mode==="admin"?1:role==="owner"?7:3)));
  }
  function getDeviceId(){
    const key="jewelos_crm_device_id";
    let id=localStorage.getItem(key);
    if(!id){
      id=(crypto.randomUUID&&crypto.randomUUID())||`D${Date.now()}${Math.random().toString(16).slice(2)}`;
      localStorage.setItem(key,id);
    }
    return id;
  }
  function deviceLabel(){
    const ua=navigator.userAgent||"";
    const os=/Android/i.test(ua)?"Android":/iPhone|iPad/i.test(ua)?"iOS":/Windows/i.test(ua)?"Windows":/Mac/i.test(ua)?"Mac":"Device";
    const browser=/Edg/i.test(ua)?"Edge":/Chrome/i.test(ua)?"Chrome":/Firefox/i.test(ua)?"Firefox":/Safari/i.test(ua)?"Safari":"Browser";
    return `${browser} on ${os}`;
  }
  async function signOutLocal(message){
    ready=false;
    try{if(client)await client.auth.signOut()}catch(_){}
    if(message)sessionStorage.setItem("jewelos_session_message",message);
    location.reload();
  }
  async function touchSession(reason="heartbeat"){
    if(!client||!userId)return;
    deviceId=getDeviceId();
    const r=await client.rpc("crm_touch_user_session",{
      p_device_id:deviceId,
      p_shop_id:mode==="shop"?shopId:null,
      p_device_name:deviceLabel(),
      p_user_agent:navigator.userAgent||"",
      p_session_days:sessionDays(),
      p_reason:reason
    });
    if(r.error)throw r.error;
    if(r.data?.allowed===false)await signOutLocal(r.data.message||"Session expired. Please sign in again.");
  }
  function startSessionWatch(){
    clearInterval(sessionTimer);
    sessionTimer=setInterval(()=>touchSession("heartbeat").catch(err=>signOutLocal(err.message||"Session check failed. Please sign in again.")),5*60*1000);
  }

  async function query(name){const r=await client.from(name).select("payload").eq("shop_id",shopId);if(r.error)throw r.error;return r;}
  async function load(){
    if(mode!=="shop"||accessState==="suspended")return null;
    status("syncing","Syncing");
    const [settings,...sets]=await Promise.all([client.from("crm_settings").select("payload").eq("shop_id",shopId).maybeSingle(),...Object.values(tableMap).map(query)]);
    if(settings.error)throw settings.error;
    const [customers,visits,followups,groups,campaigns,campaignRecipients,messageLogs,privacyRequests,consentLogs,securityIncidents,activity,staff,attendance]=sets.map(mapRows);
    const cloudHasData=[customers,visits,followups,groups,campaigns,staff,attendance].some(x=>x.length);
    const data={settings:settings.data?.payload||{},customers,visits,followups,groups,campaigns,campaignRecipients,messageLogs,privacyRequests,consentLogs,securityIncidents,activity,staff,attendance,queue:settings.data?.payload?.queue||null,__cloudEmpty:!cloudHasData};
    status("live",accessState==="read_only"?"Read only":"Live");emitData(data);return data;
  }

  async function resolveIdentity(){
    const userResult=await client.auth.getUser();if(userResult.error||!userResult.data.user)throw userResult.error||new Error("Sign in required.");
    userId=userResult.data.user.id;
    const admin=await client.from("crm_platform_admins").select("role,active").eq("user_id",userId).eq("active",true).maybeSingle();
    if(admin.error)throw admin.error;
    if(admin.data){mode="admin";role=admin.data.role||"subscription_admin";accessState="admin";ready=true;await touchSession("login");return {mode:"admin",email:userResult.data.user.email,role,sessionDays:sessionDays(),deviceName:deviceLabel()};}
    mode="shop";
    let q=client.from("crm_shop_users").select("shop_id,role,staff_id").eq("user_id",userId).eq("active",true);
    if(cfg.preferredShopId)q=q.eq("shop_id",cfg.preferredShopId);
    const membership=await q.limit(1).maybeSingle();if(membership.error)throw membership.error;if(!membership.data)throw new Error("No active CRM shop is assigned to this account.");
    shopId=membership.data.shop_id;role=membership.data.role||"staff";staffId=membership.data.staff_id||null;
    const [shop,sub,moduleRows]=await Promise.all([
      client.from("crm_shops").select("name,status").eq("id",shopId).single(),
      client.from("crm_subscriptions").select("*").eq("shop_id",shopId).maybeSingle(),
      client.from("crm_module_access").select("module_key,enabled").eq("shop_id",shopId)
    ]);
    if(shop.error)throw shop.error;if(sub.error)throw sub.error;if(moduleRows.error)throw moduleRows.error;
    modules=Object.fromEntries((moduleRows.data||[]).map(x=>[x.module_key,x.enabled]));accessState=effectiveState(sub.data,shop.data.status);ready=true;await touchSession("login");
    return {mode:"shop",shopId,role,staffId,shopName:shop.data.name,accessState,modules,reminderMessage:sub.data?.reminder_message||"",adminContact:sub.data?.admin_contact||"",expiresOn:sub.data?.expires_on||null,graceUntil:sub.data?.grace_until||null,sessionDays:sessionDays(),deviceName:deviceLabel()};
  }

  async function init(){
    const sessionMessage=sessionStorage.getItem("jewelos_session_message");
    if(sessionMessage){sessionStorage.removeItem("jewelos_session_message");const el=document.getElementById("loginError");if(el)el.textContent=sessionMessage;}
    if(!configured){ready=false;document.body.classList.remove("booting");status("local","Local mode");return;}
    client=window.supabase.createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true}});
    const session=(await client.auth.getSession()).data.session;
    if(!session){document.getElementById("authScreen").hidden=false;status("offline","Sign in required");return;}
    await connect();
  }
  async function connect(){
    try{
      const identity=await resolveIdentity();document.getElementById("authScreen").hidden=true;emitContext(identity);document.body.classList.remove("booting");startSessionWatch();
      if(identity.mode==="admin"){status("live","Admin");return}
      if(identity.accessState!=="suspended"){await load();subscribeShop()}else status("offline","Account on hold");
    }catch(err){ready=false;document.getElementById("authScreen").hidden=false;status("error",err.message||"Cloud connection failed");throw err;}
  }
  async function signIn(email,password,expectedMode="client"){if(!client)throw new Error("Supabase is not configured.");const r=await client.auth.signInWithPassword({email,password});if(r.error)throw r.error;try{const identity=await resolveIdentity();const wanted=expectedMode==="admin"?"admin":"shop";if(identity.mode!==wanted){await client.auth.signOut();ready=false;throw new Error(expectedMode==="admin"?"This account is not an Admin account.":"This account is not a Client account.");}document.getElementById("authScreen").hidden=true;emitContext(identity);document.body.classList.remove("booting");startSessionWatch();if(identity.mode==="admin"){status("live","Admin");return identity}if(identity.accessState!=="suspended"){await load();subscribeShop()}else status("offline","Account on hold");return identity}catch(err){ready=false;document.getElementById("authScreen").hidden=false;throw err;}}
  async function signOut(){
    try{if(client&&deviceId)await client.rpc("crm_end_user_session",{p_device_id:deviceId,p_reason:"manual_logout"});}catch(_){}
    await signOutLocal();
  }

  function subscribeShop(){
    if(channel)client.removeChannel(channel);channel=client.channel(`crm-${shopId}`);
    const tables=[...Object.values(tableMap),"crm_settings","crm_subscriptions","crm_module_access"];
    tables.forEach(table=>channel.on("postgres_changes",{event:"*",schema:"public",table,filter:`shop_id=eq.${shopId}`},()=>scheduleRefetch(table)));
    channel.subscribe(s=>{if(s==="SUBSCRIBED")status("live",accessState==="read_only"?"Read only":"Live");else if(s==="CHANNEL_ERROR"||s==="TIMED_OUT")status("offline","Reconnecting");});
  }
  let refetchTimer=null;
  function scheduleRefetch(table){clearTimeout(refetchTimer);refetchTimer=setTimeout(async()=>{if(saving)return;if(table==="crm_subscriptions"||table==="crm_module_access"){const identity=await resolveIdentity();emitContext(identity);if(identity.accessState==="suspended")return}load().catch(e=>status("error",e.message));},350);}

  async function upsert(name,rows){if(!rows.length)return;const r=await client.from(name).upsert(rows,{onConflict:"shop_id,id"});if(r.error)throw r.error;}
  async function saveAll(data){
    if(!canWrite())return;saving=true;status("syncing","Syncing");
    try{
      const contacts=new Map();(data.customers||[]).forEach(c=>{const p=cleanPhone(c.phone);if(p)contacts.set(p,{id:`P${p}`,shop_id:shopId,phone_normalized:p,updated_at:new Date().toISOString()});});
      await upsert("crm_contacts",[...contacts.values()]);
      await upsert("crm_customers",(data.customers||[]).map(c=>({...base(c),contact_id:`P${cleanPhone(c.phone)}`,name:c.name,deleted_at:c.deletedAt||null})));
      await upsert("crm_visits",(data.visits||[]).map(v=>({...base(v),customer_id:String(v.customerId),visit_date:v.date,cancelled_at:v.cancelledAt||null})));
      await upsert("crm_followups",(data.followups||[]).map(f=>({...base(f),customer_id:String(f.customerId),due_date:f.date,status:f.status||"Open",cancelled_at:f.cancelledAt||null})));
      await upsert("crm_groups",(data.groups||[]).map(base));await upsert("crm_campaigns",(data.campaigns||[]).map(base));
      await upsert("crm_campaign_recipients",(data.campaignRecipients||[]).map(r=>({...base(r),campaign_id:String(r.campaignId),customer_id:String(r.customerId),status:r.status||"Pending"})));
      await upsert("crm_message_logs",(data.messageLogs||[]).map(m=>({...base(m),customer_id:String(m.customerId),channel:m.channel||"whatsapp",status:m.status||"Opened",created_at:m.openedAt||new Date().toISOString()})));
      await upsert("crm_privacy_requests",(data.privacyRequests||[]).map(r=>({...base(r),customer_id:String(r.customerId),request_type:r.type,status:r.status||"Open",received_at:r.receivedAt||new Date().toISOString()})));
      const consentRows=(data.consentLogs||[]).map(c=>({...base(c),customer_id:String(c.customerId),consent_type:c.consentType,granted:Boolean(c.granted),recorded_at:c.recordedAt||new Date().toISOString()}));
      if(consentRows.length){const cr=await client.from("crm_consent_logs").upsert(consentRows,{onConflict:"shop_id,id",ignoreDuplicates:true});if(cr.error)throw cr.error;}
      if(role==="owner"||role==="manager")await upsert("crm_security_incidents",(data.securityIncidents||[]).map(i=>({...base(i),severity:i.severity,status:i.status||"Open",discovered_at:i.discoveredAt||new Date().toISOString()})));
      if(role==="owner"||role==="manager")await upsert("crm_staff",(data.staff||[]).map(s=>({...base(s),name:s.name,active:s.active!==false})));
      await upsert("crm_attendance",(data.attendance||[]).map(a=>({...base(a),staff_id:String(a.staffId),work_date:a.date})));
      if(role==="owner"||role==="manager"){const settingsPayload={...(data.settings||{}),queue:data.queue||null};const sr=await client.from("crm_settings").upsert({shop_id:shopId,payload:settingsPayload,updated_at:new Date().toISOString()},{onConflict:"shop_id"});if(sr.error)throw sr.error;}
      const logs=(data.activity||[]).map(a=>({...base(a),event_type:a.type||"System",actor_user_id:userId,actor_staff_id:staffId,created_at:a.at||new Date().toISOString()}));if(logs.length){const lr=await client.from("crm_activity_logs").upsert(logs,{onConflict:"shop_id,id",ignoreDuplicates:true});if(lr.error)throw lr.error;}
      status("live","Live");
    }catch(err){status("error","Sync failed");throw err}finally{saving=false;if(pending){const next=pending;pending=null;saveAll(next)}}
  }
  function queueSave(data){if(!canWrite())return;pending=JSON.parse(JSON.stringify(data));clearTimeout(queueSave.timer);queueSave.timer=setTimeout(()=>{if(saving)return;const next=pending;pending=null;saveAll(next).catch(console.error)},450);}
  async function importLocal(data){if(!canWrite())throw new Error("Write access is required.");await saveAll(data);await load();}
  async function softDeleteCustomer(id,reason){if(!ready)return {local:true};const r=await client.rpc("crm_soft_delete_customer",{p_customer_id:String(id),p_reason:String(reason||"")});if(r.error)throw r.error;return r.data;}
  async function restoreCustomer(id,reason){if(!ready)return {local:true};const r=await client.rpc("crm_restore_customer",{p_customer_id:String(id),p_reason:String(reason||"")});if(r.error)throw r.error;return r.data;}

  async function adminLoad(){if(mode!=="admin")throw new Error("Platform administrator permission required.");const [shops,subs,moduleRows,logs]=await Promise.all([client.rpc("crm_admin_shop_overview"),client.from("crm_subscriptions").select("*"),client.from("crm_module_access").select("shop_id,module_key,enabled"),client.rpc("crm_admin_recent_logs",{p_limit:100})]);for(const r of [shops,subs,moduleRows,logs])if(r.error)throw r.error;return {shops:(shops.data||[]).map(x=>({id:x.shop_id,shop_code:x.shop_code,name:x.shop_name,status:x.shop_status,created_at:x.created_at,user_count:Number(x.user_count||0),owner_count:Number(x.owner_count||0)})),subscriptions:subs.data||[],modules:moduleRows.data||[],logs:logs.data||[]};}
  async function adminUpdate(values){if(mode!=="admin")throw new Error("Platform administrator permission required.");const r=await client.rpc("crm_admin_update_shop_access",values);if(r.error)throw r.error;return r.data;}
  function context(){return {configured,ready,mode,shopId,role,staffId,userId,accessState,modules};}

  window.JewelCloud={init,signIn,signOut,queueSave,importLocal,softDeleteCustomer,restoreCustomer,adminLoad,adminUpdate,context,load,client:()=>client};
  window.addEventListener("DOMContentLoaded",()=>init().catch(e=>{const el=document.getElementById("loginError");if(el)el.textContent=e.message;}));
})();
