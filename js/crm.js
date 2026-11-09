"use strict";

const STORAGE_KEY = "jewelos_prod_crm_v1";
const TODAY = () => new Date().toISOString().slice(0, 10);
const isoDaysAgo = days => { const d = new Date(); d.setDate(d.getDate() - days); return d.toISOString().slice(0, 10); };
const isoDaysAhead = days => isoDaysAgo(-days);

const seed = {
  settings:{shopName:"Nithya Jewellery",staff:["Owner","Meena","Saravanan","Kavitha"],language:"en",textSize:"comfortable",privacyContactName:"Shop Owner",privacyContactValue:"",retentionNote:"Customer information is retained only while required for service, follow-up or applicable law.",privacyNoticeVersion:"2026-10"},
  customers:[
    {id:"C1001",name:"Meena Raman",phone:"9876543210",area:"Paramakudi",language:"Tamil",birthday:"1988-10-03",anniversary:"2010-02-14",groups:["VIP Customers","Bangle Interest"],optOut:false,createdAt:isoDaysAgo(240)},
    {id:"C1002",name:"Lakshmi Devi",phone:"9842112233",area:"Ramanathapuram",language:"Tamil",birthday:"1992-04-18",anniversary:"2015-10-03",groups:["Regular Customers","Bridal Interest"],optOut:false,createdAt:isoDaysAgo(190)},
    {id:"C1003",name:"Fathima Banu",phone:"9790012345",area:"Keelakarai",language:"Tamil",birthday:"1990-12-11",anniversary:"",groups:["Regular Customers","Chain Interest"],optOut:false,createdAt:isoDaysAgo(150)},
    {id:"C1004",name:"Selvi Murugan",phone:"9443156789",area:"Sayalkudi",language:"Tamil",birthday:"1985-07-21",anniversary:"2007-08-30",groups:["VIP Customers","Wedding Customers"],optOut:false,createdAt:isoDaysAgo(400)},
    {id:"C1005",name:"Priya Kumar",phone:"9894011122",area:"Mudukulathur",language:"English",birthday:"1995-01-09",anniversary:"",groups:["New Customers"],optOut:true,createdAt:isoDaysAgo(7)}
  ],
  visits:[
    {id:"V2001",customerId:"C1001",date:TODAY(),time:"10:25",purpose:"New purchase",interest:"Antique bangles",weight:"24–30 g",budget:"₹2–3 lakh",staff:"Meena",outcome:"Asked to show new arrivals",notes:"Prefers broad temple design",followupDate:isoDaysAhead(3)},
    {id:"V2002",customerId:"C1002",date:TODAY(),time:"11:40",purpose:"Wedding enquiry",interest:"Bridal haram",weight:"60–80 g",budget:"₹6–8 lakh",staff:"Owner",outcome:"Family will revisit",notes:"Wedding in January",followupDate:isoDaysAhead(2)},
    {id:"V2003",customerId:"C1003",date:isoDaysAgo(19),time:"16:10",purpose:"New purchase",interest:"Lightweight chain",weight:"8–12 g",budget:"₹80,000–₹1.2 lakh",staff:"Kavitha",outcome:"Waiting for designs",notes:"Send photos when available",followupDate:TODAY()},
    {id:"V2004",customerId:"C1004",date:isoDaysAgo(112),time:"12:15",purpose:"Exchange enquiry",interest:"Wedding jewellery",weight:"",budget:"₹4–5 lakh",staff:"Owner",outcome:"Follow up later",notes:"",followupDate:isoDaysAgo(4)},
    {id:"V2005",customerId:"C1005",date:isoDaysAgo(7),time:"17:30",purpose:"Just browsing",interest:"Stud earrings",weight:"3–5 g",budget:"₹30,000–₹50,000",staff:"Saravanan",outcome:"No immediate plan",notes:"",followupDate:isoDaysAhead(10)}
  ],
  followups:[
    {id:"F3001",customerId:"C1003",date:TODAY(),purpose:"Share lightweight chain arrivals",channel:"WhatsApp",priority:"Normal",status:"Open",result:"",createdAt:isoDaysAgo(19)},
    {id:"F3002",customerId:"C1004",date:isoDaysAgo(4),purpose:"Check wedding jewellery requirement",channel:"Call",priority:"High",status:"Open",result:"",createdAt:isoDaysAgo(112)},
    {id:"F3003",customerId:"C1002",date:isoDaysAhead(2),purpose:"Confirm bridal collection revisit",channel:"Call",priority:"High",status:"Open",result:"",createdAt:TODAY()},
    {id:"F3004",customerId:"C1001",date:isoDaysAhead(3),purpose:"Send antique bangle images",channel:"WhatsApp",priority:"Normal",status:"Open",result:"",createdAt:TODAY()}
  ],
  groups:[
    {id:"G01",name:"All Contactable Customers",type:"smart",rule:"all",description:"All customers with a valid mobile number who have not opted out."},
    {id:"G02",name:"VIP Customers",type:"manual",members:["C1001","C1004"],description:"Important repeat customers requiring personal attention."},
    {id:"G03",name:"Visited Last 30 Days",type:"smart",rule:"visited30",description:"Customers with a recorded showroom visit during the last 30 days."},
    {id:"G04",name:"Inactive 90+ Days",type:"smart",rule:"inactive90",description:"Customers who have not visited for at least 90 days."},
    {id:"G05",name:"Bangle Interest",type:"smart",rule:"interest:bangle",description:"Customers whose visit history includes bangles."},
    {id:"G06",name:"Bridal & Wedding",type:"smart",rule:"interest:bridal|wedding",description:"Customers interested in bridal or wedding jewellery."}
  ],
  campaigns:[],campaignRecipients:[],messageLogs:[],privacyRequests:[],consentLogs:[],securityIncidents:[],
  activity:[{id:"A1",type:"System",title:"CRM test data prepared",detail:"Visit, follow-up, group and reporting modules are ready for testing.",at:new Date().toISOString()}],
  staff:[
    {id:"S01",name:"Owner",phone:"",role:"Owner",active:true,createdAt:TODAY()},
    {id:"S02",name:"Meena",phone:"",role:"Staff",active:true,createdAt:TODAY()},
    {id:"S03",name:"Saravanan",phone:"",role:"Staff",active:true,createdAt:TODAY()},
    {id:"S04",name:"Kavitha",phone:"",role:"Staff",active:true,createdAt:TODAY()}
  ],
  attendance:[],queue:null
};

// Production starts clean. Demo/sample CRM records are never loaded in this build.
seed.settings.shopName = "";
seed.settings.staff = ["Owner"];
for (const key of ["customers","visits","followups","groups","campaigns","campaignRecipients","messageLogs","privacyRequests","consentLogs","securityIncidents","activity","attendance"]) seed[key] = [];
seed.staff = [{id:"S01",name:"Owner",phone:"",role:"Owner",active:true,createdAt:TODAY()}];
seed.queue = null;

let db = loadDB();
db.settings={...clone(seed.settings),...(db.settings||{})};
db.staff=(db.staff?.length?db.staff:(db.settings.staff||[]).map((name,i)=>({id:`S${i+1}`,name,phone:"",role:i===0?"Owner":"Staff",active:true,createdAt:TODAY()})));
db.attendance=db.attendance||[];
db.campaignRecipients=db.campaignRecipients||[];db.messageLogs=db.messageLogs||[];
db.privacyRequests=db.privacyRequests||[];db.consentLogs=db.consentLogs||[];db.securityIncidents=db.securityIncidents||[];
db.customers.forEach(c=>{if(c.dataConsent===undefined)c.dataConsent=false;if(c.marketingConsent===undefined)c.marketingConsent=false});
let currentPage = "today";
let followupFilter = "open";
let modalHandler = null;
let pendingBatch = null;
let pendingMessage = null;
let subscriptionContext={state:"local",modules:{}};

const $ = id => document.getElementById(id);
const $$ = selector => [...document.querySelectorAll(selector)];
function clone(obj){ return JSON.parse(JSON.stringify(obj)); }
function loadDB(){ try { return {...clone(seed), ...JSON.parse(localStorage.getItem(STORAGE_KEY)||"null")}; } catch { return clone(seed); } }
function saveDB(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); window.JewelCloud?.queueSave(db); }
function uid(prefix){ return prefix + (crypto.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2)); }
function cleanPhone(value){ const n=String(value||"").replace(/\D/g,""); return n.length>10?n.slice(-10):n; }
function customer(id){ return db.customers.find(c=>c.id===id); }
function activeCustomers(){return db.customers.filter(c=>!c.deletedAt)}
function activeStaff(){return db.staff.filter(s=>s.active!==false)}
function initials(name){ return String(name||"?").split(/\s+/).slice(0,2).map(s=>s[0]).join("").toUpperCase(); }
function esc(value){ return String(value??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c])); }
function formatDate(value){ if(!value)return "—"; return new Date(value+"T00:00:00").toLocaleDateString(db.settings.language==="ta"?"ta-IN":"en-IN",{day:"2-digit",month:"short",year:"numeric"}); }
function formatDateTime(value){ return new Date(value).toLocaleString(db.settings.language==="ta"?"ta-IN":"en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}); }
function daysSince(value){ if(!value)return Infinity; return Math.floor((new Date(TODAY())-new Date(value))/(86400000)); }
function latestVisit(customerId){ return db.visits.filter(v=>v.customerId===customerId&&!v.cancelledAt).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time))[0]; }
function visitsFor(customerId){ return db.visits.filter(v=>v.customerId===customerId&&!v.cancelledAt).sort((a,b)=>(b.date+b.time).localeCompare(a.date+a.time)); }
function nextFollowup(customerId){ return db.followups.filter(f=>f.customerId===customerId&&f.status!=="Completed"&&!f.cancelledAt).sort((a,b)=>a.date.localeCompare(b.date))[0]; }
function followupState(f){ if(f.status==="Completed")return "completed"; if(f.date<TODAY())return "overdue"; if(f.date===TODAY())return "today"; return "upcoming"; }
function logActivity(type,title,detail){const ctx=window.JewelCloud?.context?.()||{},staff=db.staff?.find(s=>s.id===ctx.staffId);db.activity.unshift({id:uid("A"),type,title,detail,actorStaffId:ctx.staffId||"",actorName:staff?.name||"Local user",at:new Date().toISOString()});db.activity=db.activity.slice(0,300);saveDB();}
function toast(message){ const el=$("toast"); el.textContent=message; el.classList.add("show"); clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove("show"),2600); }
function setEmpty(tbody,cols,text){ tbody.innerHTML=`<tr><td colspan="${cols}" style="text-align:center;padding:28px;color:#747c83">${esc(text)}</td></tr>`; }

const TA={
  "Today":"இன்று","Quick Visit":"விரைவு வருகை","Customers":"வாடிக்கையாளர்கள்","Follow-ups":"தொடர் நடவடிக்கைகள்","Customer Groups":"வாடிக்கையாளர் குழுக்கள்","Campaigns":"பிரச்சாரங்கள்","Reports":"அறிக்கைகள்","Activity Log":"செயல்பாட்டு பதிவு","Settings":"அமைப்புகள்",
  "Customer CRM":"வாடிக்கையாளர் தொடர்பு","Local test version":"உள்ளூர் சோதனை பதிப்பு","Data is saved in this browser":"தரவு இந்த உலாவியில் சேமிக்கப்படுகிறது","Record visit":"வருகையை பதிவு செய்க","Search name or mobile":"பெயர் அல்லது கைபேசி எண்ணைத் தேடுக",
  "DAILY WORK DESK":"தினசரி பணிப்பலகை","Today":"இன்று","Visits, pending follow-ups and customer occasions that need attention.":"வருகைகள், நிலுவைத் தொடர்புகள் மற்றும் கவனிக்க வேண்டிய வாடிக்கையாளர் நிகழ்வுகள்.",
  "Today’s visit register":"இன்றைய வருகைப் பதிவு","Latest showroom visitors recorded by staff":"பணியாளர்கள் பதிவு செய்த சமீபத்திய கடை வருகைகள்","Add visit":"வருகையைச் சேர்க்க","Follow-ups due":"தொடர்பு கொள்ள வேண்டியவர்கள்","Call or message before the day ends":"இன்றைய தினம் முடிவதற்கு முன் அழைக்கவும் அல்லது செய்தி அனுப்பவும்","View all":"அனைத்தையும் பார்க்க","Customer occasions":"வாடிக்கையாளர் சிறப்பு நாட்கள்","Birthdays and anniversaries":"பிறந்தநாள் மற்றும் திருமணநாள்","Customers to reconnect":"மீண்டும் தொடர்பு கொள்ள வேண்டியவர்கள்","No visit during the last 90 days":"கடந்த 90 நாட்களில் வருகை இல்லை","Print list":"பட்டியலை அச்சிடுக",
  "Visits today":"இன்றைய வருகைகள்","Showroom register":"கடை வருகைப் பதிவு","New customers":"புதிய வாடிக்கையாளர்கள்","Created today":"இன்று சேர்க்கப்பட்டவர்கள்","Today and overdue":"இன்று மற்றும் காலதாமதம்","Overdue":"காலதாமதம்","Needs attention":"கவனம் தேவை","Inactive 90+ days":"90+ நாட்கள் வருகையில்லை","Reconnect list":"மீண்டும் தொடர்பு பட்டியல்",
  "Time":"நேரம்","Customer":"வாடிக்கையாளர்","Mobile":"கைபேசி","Purpose":"நோக்கம்","Interest":"விருப்பம்","Staff":"பணியாளர்","Next action":"அடுத்த நடவடிக்கை",
  "VISIT DESK":"வருகைப் பதிவு","Find customer by mobile number":"கைபேசி எண்ணால் வாடிக்கையாளரைத் தேடுக","Existing number adds a visit to the customer. A new number creates a new customer.":"ஏற்கனவே உள்ள எண்ணில் புதிய வருகை சேர்க்கப்படும். புதிய எண்ணில் புதிய வாடிக்கையாளர் உருவாக்கப்படுவார்.","Customer mobile number":"வாடிக்கையாளர் கைபேசி எண்","Enter 10-digit mobile number":"10 இலக்க கைபேசி எண்ணை உள்ளிடுக","Find customer":"வாடிக்கையாளரைத் தேடுக","Spaces and country codes are cleaned automatically. Duplicate records are not created silently.":"இடைவெளி மற்றும் நாட்டுக் குறியீடு தானாகச் சரிசெய்யப்படும். நகல் பதிவுகள் தானாக உருவாக்கப்படாது.","Start with the mobile number":"கைபேசி எண்ணில் தொடங்குங்கள்","The customer’s last visit and preferences will appear here.":"வாடிக்கையாளரின் கடைசி வருகையும் விருப்பங்களும் இங்கே தெரியும்.","Enter mobile":"கைபேசி எண்ணை உள்ளிடுக","Search the customer database":"வாடிக்கையாளர் தரவுத்தளத்தில் தேடுக","Confirm customer":"வாடிக்கையாளரை உறுதிசெய்க","Check name and last visit":"பெயர் மற்றும் கடைசி வருகையைச் சரிபார்க்கவும்","Save today’s visit":"இன்றைய வருகையைச் சேமிக்கவும்","Add interest and next follow-up":"விருப்பம் மற்றும் அடுத்த தொடர்பைச் சேர்க்கவும்",
  "CUSTOMER DIRECTORY":"வாடிக்கையாளர் பட்டியல்","Search profiles, visit history, jewellery interests and upcoming follow-ups.":"சுயவிவரம், வருகை வரலாறு, நகை விருப்பம் மற்றும் அடுத்த தொடர்புகளைத் தேடுங்கள்.","Export Excel":"எக்செல் ஏற்றுமதி","New customer visit":"புதிய வாடிக்கையாளர் வருகை","Search name, mobile, area or interest":"பெயர், கைபேசி, ஊர் அல்லது விருப்பத்தைத் தேடுக","All customer groups":"அனைத்து வாடிக்கையாளர் குழுக்கள்","Any last visit":"எந்த கடைசி வருகையும்","Visited within 30 days":"30 நாட்களுக்குள் வந்தவர்கள்","Inactive 180+ days":"180+ நாட்கள் வருகையில்லை","Area":"ஊர்","Group":"குழு","Visits":"வருகைகள்","Last visit":"கடைசி வருகை","Last interest":"கடைசி விருப்பம்","Next follow-up":"அடுத்த தொடர்பு",
  "CUSTOMER FOLLOW-UP":"வாடிக்கையாளர் தொடர் நடவடிக்கை","Prioritise overdue work and record the result of every call or message.":"காலதாமதமான தொடர்புகளுக்கு முன்னுரிமை கொடுத்து ஒவ்வொரு அழைப்பு அல்லது செய்தியின் முடிவையும் பதிவு செய்யுங்கள்.","Add follow-up":"தொடர்பைச் சேர்க்க","Open":"திறந்தவை","Upcoming":"வரவிருப்பவை","Completed":"முடிந்தவை","Tomorrow":"நாளை","Complete":"முடிக்கவும்","Call":"அழைப்பு","Normal":"சாதாரணம்","High":"முக்கியம்","Priority":"முன்னுரிமை","Channel":"தொடர்பு முறை",
  "SEGMENTATION":"வகைப்படுத்தல்","Create clear audiences for staff follow-ups and safe festival campaigns.":"பணியாளர் தொடர்புகள் மற்றும் பாதுகாப்பான பண்டிகைப் பிரச்சாரங்களுக்கு தெளிவான குழுக்களை உருவாக்குங்கள்.","Create manual group":"கையேடு குழுவை உருவாக்குக","Smart groups update automatically.":"ஸ்மார்ட் குழுக்கள் தானாக புதுப்பிக்கப்படும்.","Campaign batches remain fixed snapshots, preventing duplicate or missing recipients while sending.":"பிரச்சாரப் பட்டியல் நிலையாகச் சேமிக்கப்படுவதால் நகல் அல்லது விடுபட்ட பெறுநர்கள் தவிர்க்கப்படுவர்.","Use for campaign":"பிரச்சாரத்திற்கு பயன்படுத்து","customers":"வாடிக்கையாளர்கள்","smart":"ஸ்மார்ட்","manual":"கையேடு",
  "FESTIVAL & CUSTOMER ENGAGEMENT":"பண்டிகை மற்றும் வாடிக்கையாளர் தொடர்பு","Select a customer group, prepare the message and send safely from the owner’s phone.":"வாடிக்கையாளர் குழுவைத் தேர்வு செய்து, செய்தியைத் தயாரித்து உரிமையாளரின் கைபேசியில் பாதுகாப்பாக அனுப்புங்கள்.","Manual WhatsApp queue":"கையேடு வாட்ஸ்அப் வரிசை","Prepare campaign":"பிரச்சாரத்தைத் தயாரிக்கவும்","A saved batch will not change after the queue is created.":"வரிசை உருவாக்கப்பட்ட பின் சேமிக்கப்பட்ட பட்டியல் மாறாது.","Campaign name":"பிரச்சாரப் பெயர்","Festival / occasion":"பண்டிகை / நிகழ்வு","Customer group":"வாடிக்கையாளர் குழு","Sending channel":"அனுப்பும் முறை","Message language":"செய்தி மொழி","Message":"செய்தி","Optional campaign image":"விருப்பமான பிரச்சார படம்","Eligible customers":"தகுதியான வாடிக்கையாளர்கள்","Opted out":"செய்தி வேண்டாம் என்றவர்கள்","Duplicate numbers removed":"நகல் எண்கள் நீக்கப்பட்டன","Review & create batch":"சரிபார்த்து பட்டியலை உருவாக்குக","Sending queue":"அனுப்பும் வரிசை","No active batch":"செயலில் உள்ள பட்டியல் இல்லை","Open WhatsApp":"வாட்ஸ்அப்பைத் திறக்கவும்","Open SMS":"SMS-ஐத் திறக்கவும்","Skip":"தவிர்க்க","Campaign history":"பிரச்சார வரலாறு","Saved recipient counts and sending progress":"சேமித்த பெறுநர் எண்ணிக்கை மற்றும் அனுப்பும் நிலை","Created":"உருவாக்கப்பட்டது","Recipients":"பெறுநர்கள்","Sent":"அனுப்பப்பட்டது","Opened":"திறக்கப்பட்டது","Skipped":"தவிர்க்கப்பட்டது","Status":"நிலை",
  "EXPORT & PRINT":"ஏற்றுமதி மற்றும் அச்சு","Download Excel data or produce clean A4 sheets for daily shop use.":"எக்செல் தரவைப் பதிவிறக்கவும் அல்லது தினசரி கடை பயன்பாட்டிற்கு தெளிவான A4 அறிக்கைகளை அச்சிடவும்.","Customer Master":"முதன்மை வாடிக்கையாளர் பட்டியல்","Daily Visit Register":"தினசரி வருகைப் பதிவு","Follow-ups Due":"தொடர்பு கொள்ள வேண்டியவர்கள்","Inactive Customers":"செயலற்ற வாடிக்கையாளர்கள்","Customer Group Membership":"வாடிக்கையாளர் குழு உறுப்பினர் பட்டியல்","Campaign History":"பிரச்சார வரலாறு","Excel":"எக்செல்","Print A4":"A4 அச்சு","Report date":"அறிக்கை தேதி",
  "ACCOUNTABILITY":"பொறுப்புணர்வு","Customer creation, visits, follow-ups, groups, campaigns and exports.":"வாடிக்கையாளர் உருவாக்கம், வருகைகள், தொடர்புகள், குழுக்கள், பிரச்சாரங்கள் மற்றும் ஏற்றுமதிகள்.","Export log":"பதிவை ஏற்றுமதி செய்க",
  "APPLICATION PREFERENCES":"செயலி விருப்பங்கள்","Choose the language and comfortable reading size for this device.":"இந்த சாதனத்திற்கு மொழி மற்றும் வசதியான வாசிப்பு அளவைத் தேர்வு செய்யுங்கள்.","Application language":"செயலி மொழி","The complete interface, messages and report headings will use this language.":"முழு இடைமுகம், செய்திகள் மற்றும் அறிக்கை தலைப்புகள் இந்த மொழியில் காணப்படும்.","Display language":"காட்சி மொழி","English remains the default. Customer names, areas and notes stay exactly as entered.":"ஆங்கிலம் இயல்புநிலை. வாடிக்கையாளர் பெயர், ஊர் மற்றும் குறிப்புகள் உள்ளீட்டைப் போலவே இருக்கும்.","Text size":"எழுத்து அளவு","Increase readability without changing the professional layout.":"தொழில்முறை வடிவத்தை மாற்றாமல் வாசிப்பை எளிதாக்குங்கள்.","Standard":"வழக்கமான","Comfortable":"வசதியான","Large":"பெரியது","Default":"இயல்புநிலை","PREVIEW":"முன்னோட்டம்","Customer visit and follow-up information":"வாடிக்கையாளர் வருகை மற்றும் தொடர்பு தகவல்","Clear text for owners and staff of every age group.":"அனைத்து வயதினருக்கும் தெளிவாக வாசிக்கக்கூடிய எழுத்து.","Current device preference":"தற்போதைய சாதன விருப்பம்","These choices are saved in this browser and applied whenever the CRM is opened.":"இந்த விருப்பங்கள் உலாவியில் சேமிக்கப்பட்டு CRM திறக்கும் ஒவ்வொரு முறையும் பயன்படுத்தப்படும்.","Language":"மொழி","Font":"எழுத்துரு",
  "CUSTOMER PROFILE":"வாடிக்கையாளர் சுயவிவரம்","Add visit":"வருகையைச் சேர்க்க","Total visits":"மொத்த வருகைகள்","Visit history":"வருகை வரலாறு","Follow-up history":"தொடர்பு வரலாறு","No follow-ups recorded.":"தொடர்புகள் எதுவும் பதிவு செய்யப்படவில்லை.",
  "CUSTOMER MESSAGE REVIEW":"வாடிக்கையாளர் செய்தி சரிபார்ப்பு","Preview WhatsApp message":"வாட்ஸ்அப் செய்தி முன்னோட்டம்","Preview SMS message":"SMS செய்தி முன்னோட்டம்","CUSTOMER":"வாடிக்கையாளர்","MOBILE NUMBER":"கைபேசி எண்","Customer follow-up":"வாடிக்கையாளர் தொடர் தொடர்பு","Message purpose":"செய்தி நோக்கம்","General follow-up":"பொது தொடர் தொடர்பு","New arrival":"புதிய வரவு","Visit reminder":"வருகை நினைவூட்டல்","Festival greeting":"பண்டிகை வாழ்த்து","Birthday greeting":"பிறந்தநாள் வாழ்த்து","Anniversary greeting":"திருமணநாள் வாழ்த்து","Custom message":"தனிப்பயன் செய்தி","Message preview — editable":"செய்தி முன்னோட்டம் — திருத்தலாம்","characters":"எழுத்துகள்","Review the customer name, number and wording before continuing.":"தொடர்வதற்கு முன் வாடிக்கையாளர் பெயர், எண் மற்றும் செய்தியைச் சரிபார்க்கவும்.","The CRM opens the owner’s WhatsApp or SMS application with this edited text. It does not send anything automatically.":"திருத்திய செய்தியுடன் உரிமையாளரின் வாட்ஸ்அப் அல்லது SMS செயலி திறக்கும். எந்தச் செய்தியும் தானாக அனுப்பப்படாது.","Reset template":"மாதிரியை மீட்டமைக்கவும்","Cancel":"ரத்து செய்க",
  "Save":"சேமிக்கவும்","Save visit":"வருகையைச் சேமிக்கவும்","Save follow-up":"தொடர்பைச் சேமிக்கவும்","Create group":"குழுவை உருவாக்குக","Close":"மூடுக","No records":"பதிவுகள் இல்லை","Needs action":"நடவடிக்கை தேவை","days":"நாட்கள்","Existing customer":"ஏற்கனவே உள்ள வாடிக்கையாளர்","New customer":"புதிய வாடிக்கையாளர்","New mobile number":"புதிய கைபேசி எண்","Different family member":"வேறு குடும்ப உறுப்பினர்","View history":"வரலாற்றைப் பார்க்க","Add today’s visit":"இன்றைய வருகையைச் சேர்க்க","Create customer & add visit":"வாடிக்கையாளரை உருவாக்கி வருகையைச் சேர்க்க","No match found":"பொருத்தம் இல்லை","Create customer":"வாடிக்கையாளரை உருவாக்குக","First visit":"முதல் வருகை","Last interest":"கடைசி விருப்பம்","Not recorded":"பதிவு செய்யப்படவில்லை",
  "Customer ID":"வாடிக்கையாளர் எண்","Name":"பெயர்","Groups":"குழுக்கள்","First Visit":"முதல் வருகை","Last Visit":"கடைசி வருகை","Days Since Last Visit":"கடைசி வருகைக்குப் பிந்தைய நாட்கள்","Date":"தேதி","Weight":"எடை","Budget":"பட்ஜெட்","Outcome":"முடிவு","Follow-up Date":"தொடர்பு தேதி","Days Inactive":"வருகையில்லா நாட்கள்","Assigned Staff":"ஒதுக்கப்பட்ட பணியாளர்","Type":"வகை","Opted Out":"செய்தி வேண்டாம்","Yes":"ஆம்","No":"இல்லை","Action":"நடவடிக்கை","Details":"விவரங்கள்","Date & Time":"தேதி மற்றும் நேரம்",
  "Create customer and record visit":"வாடிக்கையாளரை உருவாக்கி வருகையைப் பதிவு செய்க","Record visit":"வருகையைப் பதிவு செய்க","DAILY VISIT ENTRY":"தினசரி வருகைப் பதிவு","Customer name *":"வாடிக்கையாளர் பெயர் *","Mobile number *":"கைபேசி எண் *","Preferred language":"விருப்ப மொழி","Birthday":"பிறந்தநாள்","Anniversary":"திருமணநாள்","Visit date *":"வருகை தேதி *","Visit time *":"வருகை நேரம் *","Visit purpose *":"வருகை நோக்கம் *","New purchase":"புதிய வாங்குதல்","Jewellery enquiry":"நகை விசாரணை","Wedding enquiry":"திருமண நகை விசாரணை","Custom design":"தனிப்பயன் வடிவம்","Repair / service":"பழுது / சேவை","Collection / delivery":"பெறுதல் / விநியோகம்","Exchange enquiry":"மாற்று நகை விசாரணை","Just browsing":"பார்வைக்கு மட்டும்","Complaint / support":"புகார் / உதவி","Jewellery interest":"நகை விருப்பம்","Preferred weight":"விருப்ப எடை","Approximate budget":"தோராயமான பட்ஜெட்","Attended by *":"கவனித்தவர் *","Visit result":"வருகை முடிவு","Notes":"குறிப்புகள்","Next follow-up date":"அடுத்த தொடர்பு தேதி","Follow-up channel":"தொடர்பு முறை",
  "Add customer follow-up":"வாடிக்கையாளர் தொடர்பைச் சேர்க்க","FOLLOW-UP":"தொடர் நடவடிக்கை","Customer *":"வாடிக்கையாளர் *","Follow-up date *":"தொடர்பு தேதி *","Purpose *":"நோக்கம் *","WhatsApp":"வாட்ஸ்அப்","Normal SMS":"சாதாரண SMS","SMS":"SMS","Create manual customer group":"கையேடு வாடிக்கையாளர் குழுவை உருவாக்குக","CUSTOMER SEGMENT":"வாடிக்கையாளர் வகை","Group name *":"குழுப் பெயர் *","Description":"விளக்கம்","Select customers":"வாடிக்கையாளர்களைத் தேர்வு செய்க",
  "CONFIRM CAMPAIGN BATCH":"பிரச்சார பட்டியலை உறுதிசெய்க","Check recipients before sending":"அனுப்புவதற்கு முன் பெறுநர்களைச் சரிபார்க்கவும்","Campaign":"பிரச்சாரம்","Opt-outs excluded":"செய்தி வேண்டாம் என்றவர்கள் நீக்கப்பட்டனர்","Duplicates removed":"நகல்கள் நீக்கப்பட்டன","Go back":"திரும்பிச் செல்லவும்","Create fixed batch":"நிலையான பட்டியலை உருவாக்குக","Batch completed":"பட்டியல் முடிந்தது","Create a batch to begin":"தொடங்க பட்டியலை உருவாக்குக","Recipients will be reviewed one at a time.":"பெறுநர்கள் ஒவ்வொருவராகச் சரிபார்க்கப்படுவர்.","Ready":"தயார்","In progress":"செயலில் உள்ளது",
  "Deepavali":"தீபாவளி","Pongal":"பொங்கல்","Tamil New Year":"தமிழ்ப் புத்தாண்டு","Akshaya Tritiya":"அட்சய திருதியை","Aadi offers":"ஆடி சலுகைகள்","Wedding season":"திருமண காலம்","New arrivals":"புதிய வரவுகள்","Custom message":"தனிப்பயன் செய்தி","English":"ஆங்கிலம்","Tamil":"தமிழ்","Tamil + English":"தமிழ் + ஆங்கிலம்"
  ,"+ Record visit":"+ வருகையைப் பதிவு செய்க","+ New customer visit":"+ புதிய வாடிக்கையாளர் வருகை","+ Add follow-up":"+ தொடர்பைச் சேர்க்க","+ Create manual group":"+ கையேடு குழுவை உருவாக்குக","Normal SMS from owner phone":"உரிமையாளர் கைபேசியிலிருந்து சாதாரண SMS","Use {name} for personalisation.":"தனிப்பயனாக்க {name} பயன்படுத்தவும்.","WhatsApp Web/mobile will open with text. The selected image can be downloaded and attached manually.":"செய்தியுடன் வாட்ஸ்அப் திறக்கும். தேர்ந்தெடுத்த படத்தைப் பதிவிறக்கி கையேடாக இணைக்கலாம்.","BATCH PREVIEW":"பட்டியல் முன்னோட்டம்","Recipients will be sent one at a time.":"பெறுநர்கள் ஒவ்வொருவராக அனுப்பப்படுவர்.","Customer details, visit totals, last interest and next follow-up.":"வாடிக்கையாளர் விவரம், மொத்த வருகை, கடைசி விருப்பம் மற்றும் அடுத்த தொடர்பு.","Customers who visited on the selected date, with purpose and staff.":"தேர்ந்தெடுத்த தேதியில் வந்த வாடிக்கையாளர்கள், நோக்கம் மற்றும் பணியாளர் விவரம்.","Open and overdue follow-ups for calling or WhatsApp action.":"அழைப்பு அல்லது வாட்ஸ்அப் நடவடிக்கைக்கான திறந்த மற்றும் காலதாமதமான தொடர்புகள்.","Customers who have not visited during the last 90 days.":"கடந்த 90 நாட்களில் வருகை தராத வாடிக்கையாளர்கள்.","Group membership and contact list for staff verification.":"பணியாளர் சரிபார்ப்பிற்கான குழு உறுப்பினர் மற்றும் தொடர்புப் பட்டியல்.","Batch recipients, sent, skipped and remaining totals.":"பட்டியல் பெறுநர்கள், திறக்கப்பட்டவை, தவிர்க்கப்பட்டவை மற்றும் மீதமுள்ளவை.","I checked the customer group, message, recipient count and opt-out exclusions.":"வாடிக்கையாளர் குழு, செய்தி, பெறுநர் எண்ணிக்கை மற்றும் விலக்குகளைச் சரிபார்த்தேன்.","characters · Review the customer name, number and wording before continuing.":"எழுத்துகள் · தொடர்வதற்கு முன் வாடிக்கையாளர் பெயர், எண் மற்றும் செய்தியைச் சரிபார்க்கவும்.","Add record":"பதிவைச் சேர்க்க","JEWELOS CRM":"ஜுவல்ஓஎஸ் CRM"
};
Object.assign(TA,{
  "Staff & Attendance":"பணியாளர் மற்றும் வருகைப்பதிவு","TEAM ACCOUNTABILITY":"பணியாளர் பொறுப்புப் பதிவு","Add staff":"பணியாளரைச் சேர்க்க","Staff directory":"பணியாளர் பட்டியல்","Name, phone, role and today’s attendance":"பெயர், கைபேசி, பொறுப்பு மற்றும் இன்றைய வருகை","Recent attendance":"சமீபத்திய வருகைப்பதிவு","Latest check-in and check-out records":"சமீபத்திய வருகை மற்றும் வெளியேறும் பதிவுகள்","Phone":"கைபேசி","Role":"பொறுப்பு","Working time":"பணி நேரம்","Action":"நடவடிக்கை","Active staff":"செயலில் உள்ள பணியாளர்கள்","Checked in":"வருகை பதிவு செய்தவர்கள்","Checked out":"பணி முடித்தவர்கள்","Working now":"தற்போது பணியில்","Completed today":"இன்று முடித்தவர்கள்","Check in":"வருகை பதிவு","Check out":"வெளியேறும் பதிவு","Not checked in":"வருகை பதிவு இல்லை","Cloud migration & recovery":"கிளவுட் மாற்றம் மற்றும் மீட்பு","Import browser data to cloud":"உலாவி தரவை கிளவுட்-க்கு மாற்றுக","Customer trash":"நீக்கப்பட்ட வாடிக்கையாளர்கள்","Sign out":"வெளியேறு","Edit":"திருத்துக","Move to Trash":"மீட்பு பெட்டிக்கு மாற்றுக","Correct entry":"பதிவைத் திருத்துக","Cancel entry":"பதிவை ரத்து செய்க","Restore":"மீட்டெடுக்கவும்","Local mode":"உள்ளூர் நிலை","Live":"நேரடி இணைப்பு","Syncing":"ஒத்திசைக்கிறது",
  "Privacy & Compliance":"தனியுரிமை மற்றும் இணக்கம்","PRIVACY OPERATIONS":"தனியுரிமை நடவடிக்கைகள்","Customer privacy requests":"வாடிக்கையாளர் தனியுரிமை கோரிக்கைகள்","Consent quality":"ஒப்புதல் நிலை","Security incident register":"பாதுகாப்பு சம்பவப் பதிவு","Privacy notice":"தனியுரிமை அறிவிப்பு","Record request":"கோரிக்கையைப் பதிவு செய்க","Marketing consent":"விளம்பரச் செய்தி ஒப்புதல்","Consent withdrawn":"ஒப்புதல் திரும்பப் பெறப்பட்டது","Access request":"தரவு அணுகல் கோரிக்கை","Correction request":"திருத்தக் கோரிக்கை","Erasure request":"அழிப்புக் கோரிக்கை","Grievance":"குறைதீர் கோரிக்கை","Open requests":"நிலுவை கோரிக்கைகள்","Recorded consent":"பதிவு செய்யப்பட்ட ஒப்புதல்","Marketing eligible":"விளம்பரச் செய்திக்கு தகுதி","Privacy contact":"தனியுரிமை தொடர்பு","Responsible person":"பொறுப்பாளர்","Save privacy settings":"தனியுரிமை அமைப்பைச் சேமிக்கவும்","Subscription reminder":"சந்தா நினைவூட்டல்","Contact administrator":"நிர்வாகியைத் தொடர்புகொள்ளவும்","Read only":"பார்வை மட்டும்"
});
const originalTextNodes=new WeakMap();
function tr(value){ return db.settings.language==="ta"?(TA[value]||value):value; }
function translateDOM(){
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;
  while((node=walker.nextNode())){if(!node.nodeValue.trim())continue;if(!originalTextNodes.has(node))originalTextNodes.set(node,node.nodeValue);const base=originalTextNodes.get(node),key=base.trim(),translated=db.settings.language==="ta"?(TA[key]||key):key;node.nodeValue=base.replace(key,translated)}
  document.querySelectorAll("[placeholder]").forEach(el=>{if(!el.dataset.enPlaceholder)el.dataset.enPlaceholder=el.placeholder;el.placeholder=db.settings.language==="ta"?(TA[el.dataset.enPlaceholder]||el.dataset.enPlaceholder):el.dataset.enPlaceholder});
  document.documentElement.lang=db.settings.language==="ta"?"ta":"en";document.body.lang=document.documentElement.lang;
}

function groupMembers(group){
  if(!group)return [];
  const customers=activeCustomers();
  if(group.type==="manual")return customers.filter(c=>(group.members||[]).includes(c.id));
  if(group.rule==="all")return customers.filter(c=>cleanPhone(c.phone).length===10&&!c.optOut);
  if(group.rule==="visited30")return customers.filter(c=>daysSince(latestVisit(c.id)?.date)<=30);
  if(group.rule==="inactive90")return customers.filter(c=>{const days=daysSince(latestVisit(c.id)?.date);return days!==Infinity&&days>=90;});  // ✓ Exclude never-visited
  if(group.rule?.startsWith("interest:")){
    const terms=group.rule.slice(9).split("|");
    return customers.filter(c=>visitsFor(c.id).some(v=>terms.some(t=>(v.interest+" "+v.purpose).toLowerCase().includes(t))));
  }
  return [];
}

function navigate(page){
  if(subscriptionContext.modules[page]===false){toast("This page is not enabled for your shop.");return}
  currentPage=page;
  $$(".page").forEach(p=>p.classList.remove("active"));
  $$(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.page===page));
  const target=$(page+"Page"); if(target)target.classList.add("active");
  const label={today:"Today",visit:"Quick Visit",customers:"Customers",followups:"Follow-ups",groups:"Customer Groups",campaigns:"Campaigns",reports:"Reports",staff:"Staff & Attendance",compliance:"Privacy & Compliance",activity:"Activity Log",settings:"Settings"}[page];
  $("pageTitle").textContent=tr(label||"ThangamOS");
  $("sidebar").classList.remove("open");
  renderAll(); window.scrollTo({top:0,behavior:"smooth"});
}

function renderAll(){ renderToday(); renderCustomers(); renderFollowups(); renderGroups(); renderCampaigns(); renderStaff(); renderCompliance(); renderActivity(); refreshGroupSelects(); renderSettings(); applyPreferences(); applyAccessContext(); }

function renderSettings(){
  $("settingLanguage").value=db.settings.language||"en";
  $$("#textSizeOptions button").forEach(b=>b.classList.toggle("active",b.dataset.size===(db.settings.textSize||"comfortable")));
  $("currentLanguageLabel").textContent=db.settings.language==="ta"?"தமிழ்":"English";
  $("currentTextSizeLabel").textContent=({standard:"Standard",comfortable:"Comfortable",large:"Large"})[db.settings.textSize]||"Comfortable";
  $("privacyContactName").value=db.settings.privacyContactName||"";$("privacyContactValue").value=db.settings.privacyContactValue||"";$("retentionNote").value=db.settings.retentionNote||"";
}
function applyPreferences(){document.body.dataset.textSize=db.settings.textSize||"comfortable";document.title=db.settings.language==="ta"?"ThangamOS — வாடிக்கையாளர் வருகைகள் மற்றும் தொடர்புகள்":"ThangamOS — Customer Visits & Follow-ups";translateDOM();}
function canWrite(){return !["read_only","suspended"].includes(subscriptionContext.state)}
function applyAccessContext(){
  const modules=subscriptionContext.modules||{};
  $$('[data-page]').forEach(b=>{b.hidden=modules[b.dataset.page]===false});
  if(modules[currentPage]===false){const first=$$('[data-page]').find(b=>!b.hidden);if(first)navigate(first.dataset.page)}
  document.body.classList.toggle("read-only",!canWrite());
  const banner=$("subscriptionBanner"),state=subscriptionContext.state;
  if(!state||state==="active"||state==="local"){banner.hidden=true;return}
  const messages={due:"Your subscription payment is due. Please renew to avoid interruption.",grace:"Your subscription is in the grace period. Please renew before access becomes read-only.",read_only:"Payment is overdue. You can view and export records, but changes are temporarily disabled."};
  banner.hidden=false;banner.classList.toggle("danger",state==="read_only");$("subscriptionTitle").textContent=state==="read_only"?"Read-only access":"Subscription reminder";$("subscriptionMessage").textContent=subscriptionContext.reminderMessage||messages[state]||"Please contact the administrator.";
}

function renderToday(){
  const todayVisits=db.visits.filter(v=>v.date===TODAY()).sort((a,b)=>b.time.localeCompare(a.time));
  const newToday=activeCustomers().filter(c=>c.createdAt===TODAY()).length;
  const due=db.followups.filter(f=>!f.cancelledAt&&f.status!=="Completed"&&f.date<=TODAY());
  const overdue=due.filter(f=>f.date<TODAY()).length;
  const inactive=activeCustomers().filter(c=>daysSince(latestVisit(c.id)?.date)>=90);
  $("todayDate").textContent=new Date().toLocaleDateString("en-IN",{weekday:"long",day:"2-digit",month:"long"});
  $("reportDate").value=$("reportDate").value||TODAY();
  $("todayMetrics").innerHTML=[
    ["Visits today",todayVisits.length,"Showroom register"],["New customers",newToday,"Created today"],["Follow-ups due",due.length,"Today and overdue"],["Overdue",overdue,"Needs attention"],["Inactive 90+ days",inactive.length,"Reconnect list"]
  ].map(x=>`<div class="metric"><span>${x[0]}</span><strong>${x[1]}</strong><small>${x[2]}</small></div>`).join("");
  const body=$("todayVisitsTable");
  if(!todayVisits.length)setEmpty(body,7,"No customer visits recorded today.");
  else body.innerHTML=todayVisits.map(v=>{const c=customer(v.customerId);return `<tr><td>${esc(v.time)}</td><td><div class="cell-main"><b>${esc(c?.name)}</b><small>${esc(c?.area)}</small></div></td><td>${esc(c?.phone)}</td><td>${esc(v.purpose)}</td><td>${esc(v.interest||"—")}</td><td>${esc(v.staff)}</td><td>${v.followupDate?`<span class="status ${v.followupDate<=TODAY()?"today":"upcoming"}">${formatDate(v.followupDate)}</span>`:"—"}</td></tr>`}).join("");
  $("dueFollowups").innerHTML=due.slice(0,5).map(f=>listHTML(customer(f.customerId),f.purpose,formatDate(f.date),followupState(f))).join("")||emptyMini("No follow-ups due.");
  const md=TODAY().slice(5);
  const occasions=activeCustomers().filter(c=>c.birthday?.slice(5)===md||c.anniversary?.slice(5)===md);
  $("occasionsList").innerHTML=occasions.map(c=>listHTML(c,c.birthday?.slice(5)===md?"Birthday today":"Anniversary today",c.phone,"today")).join("")||emptyMini("No occasions recorded today.");
  $("inactiveList").innerHTML=inactive.slice(0,5).map(c=>{const v=latestVisit(c.id);return listHTML(c,v?.interest||"No recent interest",`${daysSince(v?.date)} days`,"overdue")}).join("")||emptyMini("No inactive customers.");
  $("followupBadge").textContent=due.length;
}
function listHTML(c,sub,meta,status=""){ return `<div class="list-row"><div class="initials">${initials(c?.name)}</div><div class="list-copy"><b>${esc(c?.name||"Unknown")}</b><span>${esc(sub)}</span></div><div class="list-meta"><b>${esc(meta)}</b><span>${status==="overdue"?"Needs action":status==="today"?"Today":""}</span></div></div>`; }
function emptyMini(text){ return `<div class="empty-mini">${esc(text)}</div>`; }

function renderCustomers(){
  const search=$("customerSearch").value.trim().toLowerCase();
  const group=$("customerGroupFilter").value;
  const activity=$("customerActivityFilter").value;
  let rows=activeCustomers().filter(c=>{
    const visit=latestVisit(c.id); const hay=[c.name,c.phone,c.area,c.groups?.join(" "),visit?.interest].join(" ").toLowerCase();
    if(search&&!hay.includes(search))return false;
    if(group!=="all"&&!groupMembers(db.groups.find(g=>g.id===group)).some(x=>x.id===c.id))return false;
    if(activity==="30"&&daysSince(visit?.date)>30)return false;
    if(activity==="90"&&daysSince(visit?.date)<90)return false;
    if(activity==="180"&&daysSince(visit?.date)<180)return false;
    return true;
  }).sort((a,b)=>(latestVisit(b.id)?.date||"").localeCompare(latestVisit(a.id)?.date||""));
  const tbody=$("customersTable");
  if(!rows.length)setEmpty(tbody,9,"No customers match the selected filters.");
  else tbody.innerHTML=rows.map(c=>{const visits=visitsFor(c.id),last=visits[0],next=nextFollowup(c.id);return `<tr><td><div class="cell-main"><b>${esc(c.name)}</b><small>${esc(c.id)}</small></div></td><td>${esc(c.phone)}</td><td>${esc(c.area||"—")}</td><td>${esc(c.groups?.[0]||"—")}</td><td>${visits.length}</td><td>${formatDate(last?.date)}</td><td>${esc(last?.interest||"—")}</td><td>${next?`<span class="status ${followupState(next)}">${formatDate(next.date)}</span>`:"—"}</td><td><button class="table-link" data-profile="${c.id}">View</button></td></tr>`}).join("");
  $("customerTableFooter").textContent=`Showing ${rows.length} of ${activeCustomers().length} customers`;
}

function renderFollowups(){
  const rows=db.followups.filter(f=>!f.cancelledAt).filter(f=>{
    const state=followupState(f);
    if(followupFilter==="open")return f.status!=="Completed";
    return state===followupFilter;
  }).sort((a,b)=>a.date.localeCompare(b.date));
  $("followupList").innerHTML=rows.map(f=>{const c=customer(f.customerId),state=followupState(f);return `<article class="followup-card ${state}"><i class="followup-priority"></i><div class="followup-main"><div><h3>${esc(c?.name)}</h3><p>${esc(c?.phone)} · ${esc(c?.area||"")}</p></div><div class="followup-purpose"><b>${esc(f.purpose)}</b><span>${esc(f.channel)} · ${esc(f.priority)} priority</span></div><span class="status ${state}">${state==="completed"?"Completed":formatDate(f.date)}</span></div><div class="followup-actions">${f.status!=="Completed"?`<button class="mini-button" data-message="${c?.id}" data-reason="${esc(f.purpose)}">WhatsApp</button><button class="mini-button" data-sms="${c?.id}" data-reason="${esc(f.purpose)}">SMS</button><button class="mini-button" data-edit-followup="${f.id}">Edit</button><button class="mini-button" data-snooze="${f.id}">Tomorrow</button><button class="mini-button done" data-complete="${f.id}">Complete</button><button class="mini-button" data-cancel-followup="${f.id}">Cancel</button>`:`<button class="mini-button" data-profile="${c?.id}">Customer</button>`}</div></article>`}).join("")||`<div class="empty-mini">No follow-ups in this view.</div>`;
  translateDOM();
}

function renderGroups(){
  $("groupGrid").innerHTML=db.groups.map(g=>`<article class="group-card"><div class="group-card-head"><h3>${esc(g.name)}</h3><span class="group-type ${g.type}">${g.type}</span></div><p>${esc(g.description)}</p><div class="group-count"><div><strong>${groupMembers(g).length}</strong><span> customers</span></div><button class="table-link" data-use-group="${g.id}">Use for campaign</button></div></article>`).join("");
}

function refreshGroupSelects(){
  const filter=$("customerGroupFilter"),campaign=$("campaignGroup"); const oldF=filter.value,oldC=campaign.value;
  filter.innerHTML=`<option value="all">All customer groups</option>`+db.groups.map(g=>`<option value="${g.id}">${esc(g.name)}</option>`).join("");
  campaign.innerHTML=db.groups.map(g=>`<option value="${g.id}">${esc(g.name)}</option>`).join("");
  if([...filter.options].some(o=>o.value===oldF))filter.value=oldF;
  if([...campaign.options].some(o=>o.value===oldC))campaign.value=oldC;
  renderBatchPreview();
}

function eligibleForCampaign(){
  const members=groupMembers(db.groups.find(g=>g.id===$("campaignGroup").value));
  const seen=new Set(),eligible=[],duplicates=[];
  members.filter(c=>c.marketingConsent&&!c.optOut&&cleanPhone(c.phone).length===10).forEach(c=>{const p=cleanPhone(c.phone);if(seen.has(p))duplicates.push(c);else{seen.add(p);eligible.push(c)}});
  return {members,eligible,duplicates,optouts:members.filter(c=>c.optOut||!c.marketingConsent)};
}
function renderBatchPreview(){
  const r=eligibleForCampaign(); $("eligibleCount").textContent=r.eligible.length; $("optoutCount").textContent=r.optouts.length; $("duplicateCount").textContent=r.duplicates.length; $("campaignChannelLabel").textContent=$("campaignChannel").value==="sms"?"Normal SMS":"WhatsApp";
}
function renderCampaigns(){
  renderBatchPreview();
  const q=db.queue;
  if(q){const camp=db.campaigns.find(c=>c.id===q.campaignId);const current=q.recipients[q.index];$("queueStatus").textContent=camp?.name||"Active batch";$("queueCounter").textContent=`${Math.min(q.index+1,q.recipients.length)} / ${q.recipients.length}`;$("sendNext").textContent=camp?.channel==="sms"?"Open SMS":"Open WhatsApp";if(current){const c=customer(current.customerId);$("queueCustomer").className="queue-customer queue-person";$("queueCustomer").innerHTML=`<b>${esc(c?.name)}</b><span>${esc(c?.phone)} · ${esc(c?.area||"")}</span><span>${q.index} opened · ${q.skipped} skipped</span>`;$("sendNext").disabled=false;$("skipNext").disabled=false}else{$("queueCustomer").className="queue-customer empty-state";$("queueCustomer").innerHTML=`<b>Batch completed</b><span>${q.sent} opened · ${q.skipped} skipped</span>`;$("sendNext").disabled=true;$("skipNext").disabled=true}}else{$("queueStatus").textContent="No active batch";$("queueCounter").textContent="0 / 0";$("sendNext").textContent="Open WhatsApp";$("queueCustomer").className="queue-customer empty-state";$("queueCustomer").innerHTML=`<b>Create a batch to begin</b><span>Recipients will be reviewed one at a time.</span>`;$("sendNext").disabled=true;$("skipNext").disabled=true}
  const body=$("campaignHistory"); if(!db.campaigns.length)setEmpty(body,7,"No campaign batches created yet."); else body.innerHTML=db.campaigns.map(c=>`<tr><td>${formatDate(c.createdAt.slice(0,10))}</td><td>${esc(c.name)}</td><td>${esc(c.groupName)}</td><td>${c.total}</td><td>${c.sent}</td><td>${c.skipped}</td><td><span class="status ${c.status==="Completed"?"completed":"today"}">${esc(c.status)}</span></td></tr>`).join("");
  translateDOM();
}

function attendanceFor(staffId,date=TODAY()){return db.attendance.find(a=>a.staffId===staffId&&a.date===date)}
function workingTime(a){if(!a?.checkIn)return "—";const end=a.checkOut?new Date(`${a.date}T${a.checkOut}`):new Date(),start=new Date(`${a.date}T${a.checkIn}`),mins=Math.max(0,Math.floor((end-start)/60000));return `${Math.floor(mins/60)}h ${mins%60}m`}
function renderStaff(){
  const staff=activeStaff(),present=staff.filter(s=>attendanceFor(s.id)?.checkIn&&!attendanceFor(s.id)?.checkOut).length,completed=staff.filter(s=>attendanceFor(s.id)?.checkOut).length;
  $("staffMetrics").innerHTML=[["Active staff",staff.length,"Staff directory"],["Checked in",present,"Working now"],["Checked out",completed,"Completed today"]].map(x=>`<div class="metric"><span>${x[0]}</span><strong>${x[1]}</strong><small>${x[2]}</small></div>`).join("");
  const body=$("staffTable");if(!staff.length)setEmpty(body,6,"No staff added.");else body.innerHTML=staff.map(s=>{const a=attendanceFor(s.id),state=!a?"Not checked in":a.checkOut?`Out · ${a.checkOut}`:`In · ${a.checkIn}`;return `<tr><td><div class="cell-main"><b>${esc(s.name)}</b><small>${esc(s.id)}</small></div></td><td>${esc(s.phone||"—")}</td><td>${esc(s.role||"Staff")}</td><td><span class="status ${a?.checkOut?"completed":a?.checkIn?"today":"upcoming"}">${state}</span></td><td>${workingTime(a)}</td><td>${!a?`<button class="table-link" data-check-in="${s.id}">Check in</button>`:!a.checkOut?`<button class="table-link" data-check-out="${s.id}">Check out</button>`:"Completed"}</td></tr>`}).join("");
  $("attendanceList").innerHTML=[...db.attendance].sort((a,b)=>(b.date+b.checkIn).localeCompare(a.date+a.checkIn)).slice(0,10).map(a=>{const s=db.staff.find(x=>x.id===a.staffId);return listHTML({name:s?.name||"Staff"},`${formatDate(a.date)} · ${a.checkIn}${a.checkOut?`–${a.checkOut}`:""}`,workingTime(a),a.checkOut?"":"today")}).join("")||emptyMini("No attendance recorded.");
}
function openStaffModal(){const ctx=window.JewelCloud?.context?.()||{};if(ctx.ready&&!['owner','manager'].includes(ctx.role)){toast("Owner or manager permission is required.");return}openModal({title:"Add staff member",kicker:"STAFF DIRECTORY",submit:"Add staff",body:`<div class="form-grid"><label><span>Staff name *</span><input name="name" required></label><label><span>Mobile number</span><input name="phone" inputmode="numeric" maxlength="10"></label><label><span>Role *</span><select name="role"><option>Staff</option><option>Manager</option><option>Owner</option><option>Read only</option></select></label></div>`,handler:data=>{const phone=cleanPhone(data.phone);if(data.phone&&phone.length!==10)throw new Error("Enter a valid mobile number.");const s={id:uid("S"),name:data.name.trim(),phone,role:data.role,active:true,createdAt:TODAY()};db.staff.push(s);db.settings.staff=activeStaff().map(x=>x.name);logActivity("Staff","Staff member added",`${s.name} · ${s.role}`);saveDB();renderAll();toast("Staff member added.")}})}
function checkIn(id){const s=db.staff.find(x=>x.id===id);if(!s||attendanceFor(id))return;const time=new Date().toTimeString().slice(0,5);db.attendance.push({id:uid("AT"),staffId:id,date:TODAY(),checkIn:time,checkOut:"",createdAt:new Date().toISOString()});logActivity("Attendance","Staff checked in",`${s.name} · ${time}`);saveDB();renderAll();toast(`${s.name} checked in.`)}
function checkOut(id){const s=db.staff.find(x=>x.id===id),a=attendanceFor(id);if(!s||!a||a.checkOut)return;const time=new Date().toTimeString().slice(0,5);a.checkOut=time;logActivity("Attendance","Staff checked out",`${s.name} · ${time}`);saveDB();renderAll();toast(`${s.name} checked out.`)}

function renderCompliance(){
  const open=db.privacyRequests.filter(r=>!['Completed','Rejected'].includes(r.status)),consented=activeCustomers().filter(c=>c.dataConsent).length,marketing=activeCustomers().filter(c=>c.marketingConsent&&!c.optOut).length;
  $("complianceMetrics").innerHTML=[["Open requests",open.length,"Needs follow-through"],["Recorded consent",consented,"Customer data use"],["Marketing eligible",marketing,"Consent active"],["Security incidents",db.securityIncidents.length,"Recorded events"]].map(x=>`<div class="metric"><span>${x[0]}</span><strong>${x[1]}</strong><small>${x[2]}</small></div>`).join("");
  const body=$("privacyRequestTable");if(!db.privacyRequests.length)setEmpty(body,7,"No privacy requests recorded.");else body.innerHTML=[...db.privacyRequests].sort((a,b)=>b.receivedAt.localeCompare(a.receivedAt)).map(r=>{const c=customer(r.customerId),s=db.staff.find(x=>x.id===r.assignedStaffId);return `<tr><td>${formatDate(r.receivedAt.slice(0,10))}</td><td>${esc(c?.name||"Customer")}</td><td>${esc(r.type)}</td><td><span class="status ${r.status==="Completed"?"completed":"today"}">${esc(r.status)}</span></td><td>${esc(s?.name||"Owner")}</td><td>${formatDate(r.targetDate)}</td><td>${r.status!=="Completed"?`<button class="table-link" data-complete-privacy="${r.id}">Complete</button>`:"—"}</td></tr>`}).join("");
  $("consentSummary").innerHTML=[listHTML({name:"Customer data consent"},`${consented} of ${activeCustomers().length} recorded`,"Purpose limited",consented?"completed":"overdue"),listHTML({name:"Marketing consent"},`${marketing} contactable customers`,"Optional consent",marketing?"completed":""),listHTML({name:"Withdrawals"},`${activeCustomers().filter(c=>c.consentWithdrawnAt||c.optOut).length} customers`,"Excluded from campaigns","")].join("");
  $("incidentList").innerHTML=[...db.securityIncidents].sort((a,b)=>b.discoveredAt.localeCompare(a.discoveredAt)).slice(0,8).map(i=>listHTML({name:i.title},i.summary,formatDate(i.discoveredAt.slice(0,10)),i.status==="Closed"?"completed":"overdue")).join("")||emptyMini("No security incidents recorded.");
}
function recordConsent(c,type,granted,source="In-store confirmation"){const entry={id:uid("CN"),customerId:c.id,consentType:type,granted,source,noticeVersion:db.settings.privacyNoticeVersion||"2026-10",recordedAt:new Date().toISOString(),staffId:window.JewelCloud?.context?.().staffId||""};db.consentLogs.push(entry);if(type==="data"){c.dataConsent=granted;c.consentRecordedAt=granted?entry.recordedAt:""}else{c.marketingConsent=granted;c.optOut=!granted;c.marketingConsentAt=granted?entry.recordedAt:"";c.consentWithdrawnAt=granted?"":entry.recordedAt}}
function openPrivacyNotice(){const shop=db.settings.shopName,contact=[db.settings.privacyContactName,db.settings.privacyContactValue].filter(Boolean).join(" · ")||"the shop owner";$("privacyNoticeBody").innerHTML=`<h3>Information collected</h3><p>Name, mobile number, area, preferred language, important dates voluntarily provided, jewellery interests, visit history, follow-ups and communication preferences.</p><h3>Why it is used</h3><ul><li>To recognise the customer and maintain visit history.</li><li>To respond to enquiries and arrange requested follow-ups.</li><li>To send festival, occasion or promotional messages only when separate marketing consent is recorded.</li><li>To maintain security, accountability and legally required records.</li></ul><h3>Customer choices</h3><p>A customer may ask ${esc(shop)} to access, correct or erase eligible information, withdraw marketing consent, or raise a grievance. Withdrawal is as easy as asking staff or contacting ${esc(contact)}.</p><h3>Retention and protection</h3><p>${esc(db.settings.retentionNote||"Information is retained only while needed for the stated purpose or applicable law.")} Access is role-controlled and important actions are logged.</p><p><b>Notice version:</b> ${esc(db.settings.privacyNoticeVersion||"2026-10")}</p>`;openBackdrop("privacyNoticeBackdrop")}
function openPrivacyRequestModal(customerId=""){openModal({title:"Record customer privacy request",kicker:"RIGHTS & GRIEVANCE",submit:"Save request",body:`<div class="form-grid"><label><span>Customer *</span><select name="customerId" required>${activeCustomers().map(c=>`<option value="${c.id}" ${c.id===customerId?"selected":""}>${esc(c.name)} · ${esc(c.phone)}</option>`).join("")}</select></label><label><span>Request type *</span><select name="type"><option>Access request</option><option>Correction request</option><option>Erasure request</option><option>Consent withdrawal</option><option>Grievance</option></select></label><label><span>Received date *</span><input type="date" name="receivedDate" value="${TODAY()}" required></label><label><span>Target date *</span><input type="date" name="targetDate" value="${isoDaysAhead(7)}" required></label><label><span>Assigned staff</span><select name="assignedStaffId">${activeStaff().map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("")}</select></label><label class="full"><span>Request details *</span><textarea name="details" rows="4" required></textarea></label></div>`,handler:data=>{const c=customer(data.customerId),r={id:uid("PR"),customerId:data.customerId,type:data.type,details:data.details.trim(),status:"Open",receivedAt:new Date(`${data.receivedDate}T00:00:00`).toISOString(),targetDate:data.targetDate,assignedStaffId:data.assignedStaffId,createdAt:new Date().toISOString()};db.privacyRequests.push(r);if(data.type==="Consent withdrawal")recordConsent(c,"marketing",false,"Customer request");logActivity("Privacy","Customer privacy request recorded",`${c?.name} · ${r.type}`);saveDB();renderAll();toast("Privacy request recorded.")}})}
function completePrivacyRequest(id){const r=db.privacyRequests.find(x=>x.id===id);if(!r)return;const note=prompt("Completion note / action taken:");if(!note?.trim())return;r.status="Completed";r.completedAt=new Date().toISOString();r.resolution=note.trim();logActivity("Privacy","Privacy request completed",`${customer(r.customerId)?.name} · ${r.type} · ${note}`);saveDB();renderAll();toast("Privacy request completed and logged.")}
function openIncidentModal(){const ctx=window.JewelCloud?.context?.()||{};if(ctx.ready&&!['owner','manager'].includes(ctx.role)){toast("Owner or manager permission is required.");return}openModal({title:"Record security incident",kicker:"INCIDENT REGISTER",submit:"Save incident",body:`<div class="form-grid"><label><span>Discovered date *</span><input type="date" name="date" value="${TODAY()}" required></label><label><span>Severity *</span><select name="severity"><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></label><label class="full"><span>Incident title *</span><input name="title" required></label><label class="full"><span>What happened *</span><textarea name="summary" rows="4" required></textarea></label><label class="full"><span>Immediate containment</span><textarea name="containment" rows="3"></textarea></label></div>`,handler:data=>{const i={id:uid("SI"),title:data.title.trim(),summary:data.summary.trim(),containment:data.containment.trim(),severity:data.severity,status:"Open",discoveredAt:new Date(`${data.date}T00:00:00`).toISOString(),createdAt:new Date().toISOString()};db.securityIncidents.push(i);logActivity("Security","Security incident recorded",`${i.severity} · ${i.title}`);saveDB();renderAll();toast("Incident recorded. Follow the documented response plan.")}})}

function renderActivity(){
  $("activityList").innerHTML=db.activity.map(a=>`<div class="activity-row"><div class="activity-icon">${esc(a.type.slice(0,2).toUpperCase())}</div><div class="activity-copy"><b>${esc(a.title)}</b><span>${esc(a.detail)} · By ${esc(a.actorName||"System")}</span></div><div class="activity-time">${formatDateTime(a.at)}</div></div>`).join("")||emptyMini("No activity recorded.");
}

function lookupVisitPhone(){
  const phone=cleanPhone($("visitPhone").value); $("visitPhone").value=phone;
  if(phone.length!==10){toast("Enter a valid 10-digit mobile number.");return}
  const matches=activeCustomers().filter(x=>cleanPhone(x.phone)===phone),c=matches[0];
  const box=$("visitLookupResult");
  if(c){const last=latestVisit(c.id),count=visitsFor(c.id).length;box.className="lookup-result";box.innerHTML=`<div class="lookup-profile"><div class="initials">${initials(c.name)}</div><div><h3>${esc(c.name)}</h3><p>${esc(c.phone)} · ${esc(c.area||"Area not entered")}${matches.length>1?` · ${matches.length} family profiles`:""}</p></div><span class="status completed">Existing customer</span></div><div class="lookup-details"><div class="lookup-detail"><span>Last visit</span><b>${formatDate(last?.date)}</b></div><div class="lookup-detail"><span>Total visits</span><b>${count}</b></div><div class="lookup-detail"><span>Last interest</span><b>${esc(last?.interest||"Not recorded")}</b></div></div><div class="lookup-actions">${matches.map(x=>`<button class="button primary" data-add-visit="${x.id}">Add visit — ${esc(x.name)}</button>`).join("")}<button class="button secondary" data-family-phone="${phone}">Different family member</button><button class="button secondary" data-profile="${c.id}">View history</button></div>`}
  else{box.className="lookup-result";box.innerHTML=`<div class="lookup-profile"><div class="initials">NEW</div><div><h3>New mobile number</h3><p>+91 ${phone} is not currently in the customer database.</p></div><span class="status upcoming">New customer</span></div><div class="lookup-details"><div class="lookup-detail"><span>Duplicate check</span><b>No match found</b></div><div class="lookup-detail"><span>Next step</span><b>Create customer</b></div><div class="lookup-detail"><span>First visit</span><b>${formatDate(TODAY())}</b></div></div><div class="lookup-actions"><button class="button primary" data-new-customer="${phone}">Create customer & add visit</button></div>`}
  translateDOM();
}

function openVisitModal(customerId,options={}){
  const c=customer(customerId); const isNew=!c;
  openModal({title:isNew?"Create customer and record visit":`Record visit — ${c.name}`,kicker:"DAILY VISIT ENTRY",submit:"Save visit",body:`
    ${isNew?`<div class="form-grid"><label><span>Customer name *</span><input name="name" required></label><label><span>Mobile number *</span><input name="phone" value="${esc(options.phone||"")}" maxlength="10" required ${options.shared?"":"readonly"}></label><label><span>Area</span><input name="area"></label><label><span>Preferred language</span><select name="language"><option>Tamil</option><option>English</option></select></label><label><span>Birthday</span><input type="date" name="birthday"></label><label><span>Anniversary</span><input type="date" name="anniversary"></label><label class="full confirm-check"><input type="checkbox" name="dataConsent" required><span>The customer was shown the privacy notice and agreed to store these details for CRM service and follow-up.</span></label><label class="full confirm-check"><input type="checkbox" name="marketingConsent"><span>The customer separately agreed to receive festival and promotional WhatsApp/SMS messages. Optional.</span></label></div><hr style="border:0;border-top:1px solid #dfe1e2;margin:17px 0">`:""}
    <div class="form-grid"><label><span>Visit date *</span><input type="date" name="date" value="${TODAY()}" required></label><label><span>Visit time *</span><input type="time" name="time" value="${new Date().toTimeString().slice(0,5)}" required></label><label><span>Visit purpose *</span><select name="purpose" required><option>New purchase</option><option>Jewellery enquiry</option><option>Wedding enquiry</option><option>Custom design</option><option>Repair / service</option><option>Collection / delivery</option><option>Exchange enquiry</option><option>Just browsing</option><option>Complaint / support</option></select></label><label><span>Jewellery interest</span><input name="interest" placeholder="Bangles, chain, bridal haram..."></label><label><span>Preferred weight</span><input name="weight" placeholder="Example: 20–25 g"></label><label><span>Approximate budget</span><input name="budget" placeholder="Example: ₹2–3 lakh"></label><label><span>Attended by *</span><select name="staff">${activeStaff().map(s=>`<option value="${esc(s.name)}">${esc(s.name)}</option>`).join("")}</select></label><label><span>Visit result</span><input name="outcome" placeholder="Asked to revisit / waiting for design"></label><label class="full"><span>Notes</span><textarea name="notes" rows="3" placeholder="Record useful customer preference, not sensitive personal information"></textarea></label><label><span>Next follow-up date</span><input type="date" name="followupDate"></label><label><span>Follow-up channel</span><select name="channel"><option>WhatsApp</option><option>Call</option><option>SMS</option></select></label></div>
  `,handler:data=>{
    let target=c;
    if(isNew){const phone=cleanPhone(data.phone);if(phone.length!==10)throw new Error("Enter a valid mobile number.");const existing=activeCustomers().find(x=>cleanPhone(x.phone)===phone);if(existing&&!options.shared)throw new Error(`This number already belongs to ${existing.name}. Add the visit to that profile.`);target={id:uid("C"),name:data.name.trim(),phone,area:data.area.trim(),language:data.language,birthday:data.birthday,anniversary:data.anniversary,groups:["New Customers"],optOut:true,dataConsent:false,marketingConsent:false,createdAt:TODAY()};db.customers.push(target);recordConsent(target,"data",data.dataConsent==="on");recordConsent(target,"marketing",data.marketingConsent==="on");logActivity("Customer","Customer created",`${target.name} · ${target.phone}${options.shared?" · shared family number confirmed":""}`)}
    const v={id:uid("V"),customerId:target.id,date:data.date,time:data.time,purpose:data.purpose,interest:data.interest.trim(),weight:data.weight.trim(),budget:data.budget.trim(),staff:data.staff,outcome:data.outcome.trim(),notes:data.notes.trim(),followupDate:data.followupDate};db.visits.push(v);
    if(data.followupDate)db.followups.push({id:uid("F"),customerId:target.id,date:data.followupDate,purpose:data.outcome.trim()||`Follow up: ${data.interest||data.purpose}`,channel:data.channel,priority:"Normal",status:"Open",result:"",createdAt:TODAY()});
    logActivity("Visit","Customer visit recorded",`${target.name} · ${v.purpose} · ${v.interest||"Interest not entered"}`);saveDB();$("visitPhone").value=target.phone;lookupVisitPhone();renderAll();toast("Visit saved to customer history.");
  }});
}

function openFollowupModal(){
  openModal({title:"Add customer follow-up",kicker:"FOLLOW-UP",submit:"Save follow-up",body:`<div class="form-grid"><label><span>Customer *</span><select name="customerId" required>${activeCustomers().map(c=>`<option value="${c.id}">${esc(c.name)} · ${esc(c.phone)}</option>`).join("")}</select></label><label><span>Follow-up date *</span><input type="date" name="date" value="${TODAY()}" required></label><label class="full"><span>Purpose *</span><input name="purpose" required placeholder="Example: Share new bangle arrivals"></label><label><span>Channel</span><select name="channel"><option>WhatsApp</option><option>Call</option><option>SMS</option></select></label><label><span>Priority</span><select name="priority"><option>Normal</option><option>High</option></select></label></div>`,handler:data=>{const c=customer(data.customerId);db.followups.push({id:uid("F"),customerId:data.customerId,date:data.date,purpose:data.purpose.trim(),channel:data.channel,priority:data.priority,status:"Open",result:"",createdAt:TODAY()});logActivity("Follow-up","Follow-up created",`${c.name} · ${data.purpose}`);saveDB();renderAll();toast("Follow-up added.")}});
}
function openEditFollowup(id){const f=db.followups.find(x=>x.id===id);if(!f)return;const c=customer(f.customerId);openModal({title:`Edit follow-up — ${c?.name||"Customer"}`,kicker:"FOLLOW-UP CORRECTION",submit:"Save correction",body:`<div class="form-grid"><label><span>Date *</span><input type="date" name="date" value="${esc(f.date)}" required></label><label><span>Channel</span><select name="channel"><option ${f.channel==="WhatsApp"?"selected":""}>WhatsApp</option><option ${f.channel==="Call"?"selected":""}>Call</option><option ${f.channel==="SMS"?"selected":""}>SMS</option></select></label><label class="full"><span>Purpose *</span><input name="purpose" value="${esc(f.purpose)}" required></label><label><span>Priority</span><select name="priority"><option ${f.priority==="Normal"?"selected":""}>Normal</option><option ${f.priority==="High"?"selected":""}>High</option></select></label><label class="full"><span>Correction reason *</span><input name="reason" required></label></div>`,handler:data=>{const old=`${f.date} · ${f.purpose} · ${f.channel}`;Object.assign(f,{date:data.date,purpose:data.purpose.trim(),channel:data.channel,priority:data.priority,updatedAt:new Date().toISOString()});logActivity("Follow-up","Follow-up corrected",`${c?.name} · ${old} → ${f.date} · ${f.purpose} · ${f.channel} · Reason: ${data.reason}`);saveDB();renderAll();toast("Follow-up correction saved.")}})}

function openGroupModal(){
  openModal({title:"Create manual customer group",kicker:"CUSTOMER SEGMENT",submit:"Create group",body:`<div class="form-grid"><label class="full"><span>Group name *</span><input name="name" required placeholder="Example: Wedding customers — December"></label><label class="full"><span>Description</span><input name="description" placeholder="Reason this group was created"></label><div class="full"><span style="display:block;margin-bottom:7px;font-size:9px;font-weight:600">Select customers</span><div style="max-height:260px;overflow:auto;border:1px solid #dfe1e2;border-radius:6px">${activeCustomers().map(c=>`<label style="display:flex;align-items:center;gap:9px;padding:9px 11px;border-bottom:1px solid #eceeed"><input style="width:auto" type="checkbox" name="members" value="${c.id}"><span><b style="display:block;font-size:9px">${esc(c.name)}</b><small style="font-size:8px;color:#6d747b">${esc(c.phone)} · ${esc(c.area||"")}</small></span></label>`).join("")}</div></div></div>`,handler:(data,form)=>{const members=[...form.querySelectorAll('[name="members"]:checked')].map(x=>x.value);const g={id:uid("G"),name:data.name.trim(),type:"manual",members,description:data.description.trim()||"Manually selected customer group."};db.groups.push(g);logActivity("Group","Customer group created",`${g.name} · ${members.length} customers`);saveDB();renderAll();toast("Customer group created.")}});
}

function inrShort(n){ return "₹"+(Number(n)||0).toLocaleString("en-IN",{minimumFractionDigits:0,maximumFractionDigits:0}); }
function billingHistory(phone){
  const p=String(phone||"").replace(/\D/g,"").slice(-10);
  const inv=(window.Billing&&window.Billing.cache&&window.Billing.cache.invoices||[])
    .filter(i=>String(i.customer_phone||"").replace(/\D/g,"").slice(-10)===p)
    .sort((a,b)=>new Date(b.finalized_at||b.date)-new Date(a.finalized_at||a.date));
  const sum=inv.reduce((s,i)=>{s.total+=+i.total||0;s.paid+=+i.paid||0;s.due+=+i.due||0;return s;},{total:0,paid:0,due:0});
  return {inv,sum};
}
function fmtBillDay(v){ const d=new Date(v); return isNaN(d.getTime())?"—":d.toLocaleDateString("en-IN"); }
function purchasePanel(phone){
  const {inv,sum}=billingHistory(phone);
  const tag=i=> i.source==="LOAN"?"Loan / Udhaar":i.source==="LEGACY_OLD_BILL"?"Old bill":"Sale";
  const rows=inv.length?inv.map(i=>{
    const items=(i.lines||[]).map(l=>l&&l.d).filter(Boolean).slice(0,3).join(", ");
    const due=Number(i.due||0);
    return `<div class="history-item"><b>${fmtBillDay(i.finalized_at||i.date)} · ${tag(i)} · ${esc(i.no||"")}</b><span>${esc(items||"—")}</span><span>Total ${inrShort(i.total)} · Paid ${inrShort(i.paid)}${due>0?` · <b style="color:#c0314a">Due ${inrShort(due)}</b>`:" · Cleared"}</span></div>`;
  }).join(""):emptyMini("No purchases recorded for this customer yet.");
  return `<div class="profile-panel"><h4>Purchase &amp; payment history</h4>
    <div class="profile-metrics" style="margin:0 0 10px">
      <div><span>Lifetime purchased</span><b>${inrShort(sum.total)}</b></div>
      <div><span>Total paid</span><b>${inrShort(sum.paid)}</b></div>
      <div><span>Balance due</span><b style="${sum.due>0?'color:#c0314a':''}">${inrShort(sum.due)}</b></div>
      <div><span>Bills</span><b>${inv.length}</b></div>
    </div>${rows}</div>`;
}
function openProfile(id){
  const c=customer(id);if(!c)return;const visits=visitsFor(id).filter(v=>!v.cancelledAt),last=visits[0],next=nextFollowup(id);$("profileTitle").textContent=c.name;$("profileBody").innerHTML=`<div class="profile-summary"><div class="initials">${initials(c.name)}</div><div><h3>${esc(c.name)}</h3><p>${esc(c.phone)} · ${esc(c.area||"Area not entered")} · ${esc(c.language||"Language not set")}</p><p>${esc((c.groups||[]).join(" · ")||"No manual tags")}</p><p><span class="consent-chip ${c.marketingConsent&&!c.optOut?"":"no"}">${c.marketingConsent&&!c.optOut?"Marketing consent recorded":"No marketing consent"}</span></p></div><div class="profile-actions"><button class="button primary" data-add-visit="${c.id}">Add visit</button><button class="button secondary" data-message="${c.id}">WhatsApp</button><button class="button secondary" data-edit-customer="${c.id}">Edit</button><button class="button secondary" data-privacy-customer="${c.id}">Privacy request</button><button class="button secondary danger-button" data-trash-customer="${c.id}">Move to Trash</button></div></div><div class="profile-metrics"><div><span>Total visits</span><b>${visits.length}</b></div><div><span>Last visit</span><b>${formatDate(last?.date)}</b></div><div><span>Last interest</span><b>${esc(last?.interest||"—")}</b></div><div><span>Next follow-up</span><b>${formatDate(next?.date)}</b></div></div><div class="profile-sections">${purchasePanel(c.phone)}<div class="profile-panel"><h4>Visit history</h4>${visits.map(v=>`<div class="history-item"><b>${formatDate(v.date)} · ${esc(v.purpose)} · ${esc(v.staff)}</b><span>${esc(v.interest||"No interest recorded")}${v.weight?` · ${esc(v.weight)}`:""}${v.budget?` · ${esc(v.budget)}`:""}</span><span>${esc(v.outcome||v.notes||"")}</span><div class="history-actions"><button class="table-link" data-edit-visit="${v.id}">Correct entry</button><button class="table-link" data-cancel-visit="${v.id}">Cancel entry</button></div></div>`).join("")||emptyMini("No visits recorded.")}</div><div class="profile-panel"><h4>Follow-up history</h4>${db.followups.filter(f=>f.customerId===id&&!f.cancelledAt).sort((a,b)=>b.date.localeCompare(a.date)).map(f=>`<div class="history-item"><b>${formatDate(f.date)} · ${esc(f.channel)} · ${esc(f.status)}</b><span>${esc(f.purpose)}</span><span>${esc(f.result||"")}</span></div>`).join("")||emptyMini("No follow-ups recorded.")}</div></div>`;openBackdrop("profileBackdrop");
}

function openEditCustomer(id){const c=customer(id);if(!c)return;closeBackdrop("profileBackdrop");openModal({title:`Edit customer — ${c.name}`,kicker:"SECURE CORRECTION",submit:"Save correction",body:`<div class="form-grid"><label><span>Customer name *</span><input name="name" value="${esc(c.name)}" required></label><label><span>Mobile number *</span><input name="phone" value="${esc(c.phone)}" maxlength="10" required></label><label><span>Area</span><input name="area" value="${esc(c.area||"")}"></label><label><span>Preferred language</span><select name="language"><option ${c.language==="Tamil"?"selected":""}>Tamil</option><option ${c.language==="English"?"selected":""}>English</option></select></label><label><span>Birthday</span><input type="date" name="birthday" value="${esc(c.birthday||"")}"></label><label><span>Anniversary</span><input type="date" name="anniversary" value="${esc(c.anniversary||"")}"></label><label class="full confirm-check"><input type="checkbox" name="dataConsent" ${c.dataConsent?"checked":""}><span>Customer data-use consent is recorded.</span></label><label class="full confirm-check"><input type="checkbox" name="marketingConsent" ${c.marketingConsent&&!c.optOut?"checked":""}><span>Customer agrees to festival and promotional messages.</span></label><label class="full"><span>Reason for correction *</span><input name="reason" required placeholder="Example: Customer corrected mobile number"></label></div>`,handler:data=>{const phone=cleanPhone(data.phone);if(phone.length!==10)throw new Error("Enter a valid mobile number.");const before=`${c.name} · ${c.phone} · ${c.area||""}`,newDataConsent=data.dataConsent==="on",newMarketingConsent=data.marketingConsent==="on",oldMarketingConsent=Boolean(c.marketingConsent&&!c.optOut);if(newDataConsent!==c.dataConsent)recordConsent(c,"data",newDataConsent,"Profile correction");if(newMarketingConsent!==oldMarketingConsent)recordConsent(c,"marketing",newMarketingConsent,"Profile correction");Object.assign(c,{name:data.name.trim(),phone,area:data.area.trim(),language:data.language,birthday:data.birthday,anniversary:data.anniversary,updatedAt:new Date().toISOString()});logActivity("Customer","Customer details corrected",`${before} → ${c.name} · ${c.phone} · ${c.area||""} · Reason: ${data.reason}`);saveDB();renderAll();toast("Customer details updated and logged.")}})}

function openEditVisit(id){const v=db.visits.find(x=>x.id===id);if(!v)return;const c=customer(v.customerId);closeBackdrop("profileBackdrop");openModal({title:`Correct visit — ${c?.name||"Customer"}`,kicker:"VISIT CORRECTION",submit:"Save correction",body:`<div class="form-grid"><label><span>Date *</span><input type="date" name="date" value="${esc(v.date)}" required></label><label><span>Time *</span><input type="time" name="time" value="${esc(v.time)}" required></label><label><span>Purpose *</span><input name="purpose" value="${esc(v.purpose)}" required></label><label><span>Interest</span><input name="interest" value="${esc(v.interest||"")}"></label><label><span>Attended by *</span><select name="staff">${activeStaff().map(s=>`<option ${s.name===v.staff?"selected":""}>${esc(s.name)}</option>`).join("")}</select></label><label class="full"><span>Correction reason *</span><input name="reason" required></label></div>`,handler:data=>{const old=`${v.date} ${v.time} · ${v.purpose} · ${v.staff}`;Object.assign(v,{date:data.date,time:data.time,purpose:data.purpose.trim(),interest:data.interest.trim(),staff:data.staff,updatedAt:new Date().toISOString()});logActivity("Visit","Visit entry corrected",`${c?.name} · ${old} → ${v.date} ${v.time} · ${v.purpose} · ${v.staff} · Reason: ${data.reason}`);saveDB();renderAll();toast("Visit correction saved and logged.")}})}

async function trashCustomer(id){const c=customer(id);if(!c)return;const ctx=window.JewelCloud?.context?.()||{};if(ctx.ready&&!['owner','manager'].includes(ctx.role)){toast("Owner or manager permission is required.");return}const reason=prompt(`Reason for moving ${c.name} to Trash:`);if(!reason?.trim())return;const confirmation=prompt('Type DELETE to confirm. The record can be restored for 30 days.');if(confirmation!=="DELETE")return;try{await window.JewelCloud?.softDeleteCustomer(id,reason);c.deletedAt=new Date().toISOString();logActivity("Customer","Customer moved to Trash",`${c.name} · ${reason}`);saveDB();closeBackdrop("profileBackdrop");renderAll();toast("Customer moved to Trash.")}catch(err){toast(err.message||"Unable to move customer to Trash.")}}

async function restoreCustomer(id){const c=customer(id);if(!c)return;try{await window.JewelCloud?.restoreCustomer(id,"Owner restored record");delete c.deletedAt;logActivity("Customer","Customer restored from Trash",c.name);saveDB();renderAll();openTrash();toast("Customer restored.")}catch(err){toast(err.message||"Unable to restore customer.")}}

function openTrash(){const rows=db.customers.filter(c=>c.deletedAt);openModal({title:"Customer trash",kicker:"RECOVERY",submit:"Close",body:`<div>${rows.map(c=>`<div class="trash-row"><div><b>${esc(c.name)}</b><br><small>${esc(c.phone)} · Deleted ${formatDateTime(c.deletedAt)}</small></div><button type="button" class="button secondary" data-restore-customer="${c.id}">Restore</button></div>`).join("")||emptyMini("Trash is empty.")}</div>`,handler:()=>{}})}

function openModal({title,kicker,submit,body,handler}){$("modalTitle").textContent=title;$("modalKicker").textContent=kicker;$("modalSubmit").textContent=submit;$("modalBody").innerHTML=body;modalHandler=handler;openBackdrop("modalBackdrop");}
function openBackdrop(id){const el=$(id);el.classList.add("open");el.setAttribute("aria-hidden","false");translateDOM();}
function closeBackdrop(id){const el=$(id);el.classList.remove("open");el.setAttribute("aria-hidden","true");}

function createBatchReview(){
  const name=$("campaignName").value.trim(),message=$("campaignMessage").value.trim(),group=db.groups.find(g=>g.id===$("campaignGroup").value),r=eligibleForCampaign();
  if(!name||!message){toast("Enter a campaign name and message.");return} if(!r.eligible.length){toast("This group has no eligible customers.");return}
  pendingBatch={name,message,occasion:$("campaignOccasion").value,language:$("campaignLanguage").value,channel:$("campaignChannel").value,group,recipients:r.eligible.map(c=>({customerId:c.id,phone:cleanPhone(c.phone)})),optouts:r.optouts.length,duplicates:r.duplicates.length};
  $("confirmBatchSummary").innerHTML=`<div><span>Campaign</span><b>${esc(name)}</b></div><div><span>Customer group</span><b>${esc(group.name)}</b></div><div><span>Channel</span><b>${pendingBatch.channel==="sms"?"Normal SMS":"WhatsApp"}</b></div><div><span>Recipients</span><b>${r.eligible.length}</b></div><div><span>Opt-outs excluded</span><b>${r.optouts.length}</b></div><div><span>Duplicates removed</span><b>${r.duplicates.length}</b></div>`;
  $("batchConfirmed").checked=false;$("confirmBatch").disabled=true;openBackdrop("confirmBackdrop");
}
function confirmBatch(){
  if(!pendingBatch)return;const id=uid("CP");const campaign={id,name:pendingBatch.name,occasion:pendingBatch.occasion,channel:pendingBatch.channel,language:pendingBatch.language,groupId:pendingBatch.group.id,groupName:pendingBatch.group.name,message:pendingBatch.message,total:pendingBatch.recipients.length,sent:0,skipped:0,status:"Ready",createdAt:new Date().toISOString()};db.campaigns.unshift(campaign);const recipients=pendingBatch.recipients.map((r,i)=>({id:uid("CR"),campaignId:id,customerId:r.customerId,phone:r.phone,position:i,status:"Pending",createdAt:new Date().toISOString()}));db.campaignRecipients.push(...recipients);db.queue={campaignId:id,recipients:recipients.map(r=>({recipientId:r.id,customerId:r.customerId,phone:r.phone})),index:0,sent:0,skipped:0};logActivity("Campaign","Fixed campaign batch created",`${campaign.name} · ${campaign.total} recipients · ${campaign.groupName}`);saveDB();closeBackdrop("confirmBackdrop");pendingBatch=null;renderAll();toast("Campaign batch created. Review one customer at a time.");
}
function sendQueueCurrent(){
  const q=db.queue;if(!q)return;const entry=q.recipients[q.index];if(!entry)return;const c=customer(entry.customerId),camp=db.campaigns.find(x=>x.id===q.campaignId);openMessagePreview(c.id,camp.channel,{text:camp.message.replaceAll("{name}",c.name),type:"festival",language:campaignLanguageCode(camp),reason:`${camp.name} · ${camp.groupName}`,queue:true});
}
function skipQueueCurrent(){const q=db.queue;if(!q||!q.recipients[q.index])return;const entry=q.recipients[q.index],recipient=db.campaignRecipients.find(x=>x.id===entry.recipientId),camp=db.campaigns.find(x=>x.id===q.campaignId);if(recipient){recipient.status="Skipped";recipient.updatedAt=new Date().toISOString()}q.skipped++;q.index++;camp.skipped=q.skipped;camp.status=q.index>=q.recipients.length?"Completed":"In progress";saveDB();renderCampaigns();toast("Customer skipped.");}
function campaignLanguageCode(camp){const v=camp?.language||$("campaignLanguage").value;return v==="tamil"?"ta":v==="both"?"both":"en";}
function customerMessageLanguage(c){return String(c?.language||"").toLowerCase().includes("tamil")?"ta":db.settings.language||"en";}
function politeCampaignTemplate(){
  const language=$("campaignLanguage").value,occasion=$("campaignOccasion").value,shop=db.settings.shopName,tamilOccasion=TA[occasion]||occasion;
  const en=`Dear {name}, warm ${occasion} wishes from ${shop}. May this occasion bring happiness and prosperity to your family. Thank you for being our valued customer.`;
  const ta=`அன்புள்ள {name}, ${shop} நிறுவனத்தின் இனிய ${tamilOccasion} நல்வாழ்த்துகள். இந்த நன்னாள் உங்கள் குடும்பத்திற்கு மகிழ்ச்சியும் வளமும் அளிக்கட்டும். எங்கள் மதிப்புமிக்க வாடிக்கையாளராக இருப்பதற்கு நன்றி.`;
  $("campaignMessage").value=language==="tamil"?ta:language==="both"?`${ta}\n\n${en}`:en;
}
function messageTemplate(type,language,c){
  const shop=db.settings.shopName,interest=latestVisit(c.id)?.interest||"your jewellery requirement",festival=$("campaignOccasion")?.value||"this festive occasion";
  const en={
    followup:`Vanakkam ${c.name}, greetings from ${shop}. Thank you for visiting us. We are following up regarding ${interest}. Please let us know a convenient time to assist you. Thank you.`,
    newarrival:`Vanakkam ${c.name}, the jewellery designs you were interested in are now available at ${shop}. You are welcome to visit us at your convenience. We will be happy to assist you. Thank you.`,
    visit:`Vanakkam ${c.name}, this is a gentle follow-up from ${shop}. Please visit us whenever convenient. If your requirement has changed, kindly let us know. Thank you.`,
    festival:`Dear ${c.name}, warm ${festival} wishes from ${shop}. May this occasion bring happiness and prosperity to your family. Thank you for being our valued customer.`,
    birthday:`Dear ${c.name}, warm birthday wishes from ${shop}. May your special day be filled with happiness and prosperity. Thank you for being our valued customer.`,
    anniversary:`Dear ${c.name}, warm anniversary wishes from ${shop}. We wish your family many more years of happiness and togetherness. Thank you.`,
    custom:`Vanakkam ${c.name}, greetings from ${shop}. Please let us know how we may assist you. Thank you.`
  };
  const ta={
    followup:`வணக்கம் ${c.name}, ${shop} நிறுவனத்திலிருந்து அன்பான வாழ்த்துகள். நீங்கள் எங்களைச் சந்தித்ததற்கு நன்றி. ${interest} தொடர்பாக உங்களுக்கு உதவ தயாராக உள்ளோம். உங்களுக்கு வசதியான நேரத்தைத் தெரிவிக்கவும். நன்றி.`,
    newarrival:`வணக்கம் ${c.name}, நீங்கள் விரும்பிய நகை வடிவங்கள் தற்போது ${shop} நிறுவனத்தில் கிடைக்கின்றன. உங்களுக்கு வசதியான நேரத்தில் வருகை தரலாம். உங்களுக்கு உதவ மகிழ்ச்சியுடன் காத்திருக்கிறோம். நன்றி.`,
    visit:`வணக்கம் ${c.name}, ${shop} நிறுவனத்திலிருந்து அன்பான நினைவூட்டல். உங்களுக்கு வசதியான நேரத்தில் எங்களைச் சந்திக்கலாம். உங்கள் தேவையில் மாற்றம் இருந்தால் தயவுசெய்து தெரிவிக்கவும். நன்றி.`,
    festival:`அன்புள்ள ${c.name}, ${shop} நிறுவனத்தின் இனிய ${festival} நல்வாழ்த்துகள். இந்த நன்னாள் உங்கள் குடும்பத்திற்கு மகிழ்ச்சியும் வளமும் அளிக்கட்டும். எங்கள் மதிப்புமிக்க வாடிக்கையாளராக இருப்பதற்கு நன்றி.`,
    birthday:`அன்புள்ள ${c.name}, ${shop} நிறுவனத்தின் இனிய பிறந்தநாள் நல்வாழ்த்துகள். உங்கள் சிறப்பு நாள் மகிழ்ச்சியும் வளமும் நிறைந்ததாக அமையட்டும். நன்றி.`,
    anniversary:`அன்புள்ள ${c.name}, ${shop} நிறுவனத்தின் இனிய திருமணநாள் நல்வாழ்த்துகள். உங்கள் குடும்பம் என்றும் மகிழ்ச்சியுடனும் ஒற்றுமையுடனும் வாழ வாழ்த்துகிறோம். நன்றி.`,
    custom:`வணக்கம் ${c.name}, ${shop} நிறுவனத்திலிருந்து அன்பான வாழ்த்துகள். உங்களுக்கு எவ்வாறு உதவலாம் என்பதைத் தெரிவிக்கவும். நன்றி.`
  };
  if(language==="both")return `${ta[type]||ta.followup}\n\n${en[type]||en.followup}`;
  return language==="ta"?(ta[type]||ta.followup):(en[type]||en.followup);
}
function openMessagePreview(customerId,channel="whatsapp",options={}){
  const c=customer(customerId);if(!c)return;pendingMessage={customerId,channel,type:options.type||"followup",reason:options.reason||"Customer follow-up",queue:!!options.queue,originalText:options.text||""};
  $("messageModalTitle").textContent=channel==="sms"?"Preview SMS message":"Preview WhatsApp message";$("messageRecipientName").textContent=c.name;$("messageRecipientPhone").textContent=`+91 ${cleanPhone(c.phone)}`;$("messageReason").textContent=pendingMessage.reason;$("messageTemplateType").value=pendingMessage.type;$("messageLanguage").value=options.language||customerMessageLanguage(c);$("confirmOpenMessage").textContent=channel==="sms"?"Open SMS":"Open WhatsApp";resetMessagePreview();openBackdrop("messageBackdrop");
}
function resetMessagePreview(){if(!pendingMessage)return;const c=customer(pendingMessage.customerId),type=$("messageTemplateType").value,language=$("messageLanguage").value;$("messageEditor").value=pendingMessage.originalText&&type===pendingMessage.type?pendingMessage.originalText:messageTemplate(type,language,c);updateMessageCount();}
function updateMessageCount(){$("messageCharCount").textContent=$("messageEditor").value.length;}
function confirmOpenMessage(){
  if(!pendingMessage)return;const c=customer(pendingMessage.customerId),message=$("messageEditor").value.trim();if(!message){toast("Please enter a message.");return}const phone=cleanPhone(c.phone);if(pendingMessage.channel==="sms")window.location.href=`sms:+91${phone}?body=${encodeURIComponent(message)}`;else window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(message)}`,"_blank","noopener");logActivity("Message",`${pendingMessage.channel==="sms"?"Normal SMS":"WhatsApp"} opened for customer`,`${c.name} · ${c.phone} · ${pendingMessage.reason}`);
  db.messageLogs.unshift({id:uid("ML"),customerId:c.id,channel:pendingMessage.channel,status:"Opened",reason:pendingMessage.reason,message,openedAt:new Date().toISOString()});
  if(pendingMessage.queue){const q=db.queue,entry=q.recipients[q.index],recipient=db.campaignRecipients.find(x=>x.id===entry?.recipientId),camp=db.campaigns.find(x=>x.id===q.campaignId);if(recipient){recipient.status="Opened";recipient.openedAt=new Date().toISOString()}q.sent++;q.index++;camp.sent=q.sent;camp.status=q.index>=q.recipients.length?"Completed":"In progress";if(camp.status==="Completed")logActivity("Campaign","Campaign batch completed",`${camp.name} · ${camp.sent} opened · ${camp.skipped} skipped`)}
  saveDB();closeBackdrop("messageBackdrop");pendingMessage=null;renderAll();toast("Message application opened. Please review once more before sending.");
}
function openWhatsApp(customerId,text=""){openMessagePreview(customerId,"whatsapp",{text,type:text?"custom":"followup",reason:"Customer follow-up"});}
function openSMS(customerId,text=""){openMessagePreview(customerId,"sms",{text,type:text?"custom":"followup",reason:"Customer follow-up"});}

function reportData(type){
  const h=a=>a.map(tr);
  if(type==="customers")return {title:tr("Customer Master"),headers:h(["Customer ID","Name","Mobile","Area","Groups","Total Visits","First Visit","Last Visit","Days Since Last Visit","Last Interest","Next Follow-up"]),rows:activeCustomers().map(c=>{const vs=visitsFor(c.id).filter(v=>!v.cancelledAt),last=vs[0],first=vs[vs.length-1],next=nextFollowup(c.id);return[c.id,c.name,c.phone,c.area,(c.groups||[]).join(", "),vs.length,first?.date||"",last?.date||"",isFinite(daysSince(last?.date))?daysSince(last?.date):"",last?.interest||"",next?.date||""]})};
  if(type==="visits"){const date=$("reportDate").value||TODAY();return{title:`${tr("Daily Visit Register")} — ${formatDate(date)}`,headers:h(["Date","Time","Customer","Mobile","Area","Purpose","Interest","Weight","Budget","Outcome","Staff","Follow-up Date"]),rows:db.visits.filter(v=>v.date===date).map(v=>{const c=customer(v.customerId);return[v.date,v.time,c?.name,c?.phone,c?.area,v.purpose,v.interest,v.weight,v.budget,v.outcome,v.staff,v.followupDate]})}}
  if(type==="followups")return{title:tr("Follow-ups Due"),headers:h(["Date","Status","Customer","Mobile","Area","Purpose","Channel","Priority"]),rows:db.followups.filter(f=>!f.cancelledAt&&f.status!=="Completed").map(f=>{const c=customer(f.customerId);return[f.date,tr(followupState(f)),c?.name,c?.phone,c?.area,f.purpose,f.channel,f.priority]})};
  if(type==="inactive")return{title:tr("Inactive Customers"),headers:h(["Customer","Mobile","Area","Last Visit","Days Inactive","Last Interest","Assigned Staff"]),rows:activeCustomers().filter(c=>daysSince(latestVisit(c.id)?.date)>=90).map(c=>{const v=latestVisit(c.id);return[c.name,c.phone,c.area,v?.date||"",daysSince(v?.date),v?.interest||"",v?.staff||""]})};
  if(type==="groups")return{title:tr("Customer Group Membership"),headers:h(["Group","Type","Customer","Mobile","Area","Opted Out"]),rows:db.groups.flatMap(g=>groupMembers(g).map(c=>[g.name,g.type,c.name,c.phone,c.area,c.optOut?"Yes":"No"]))};
  return{title:tr("Campaign History"),headers:h(["Created","Campaign","Group","Recipients","Opened","Skipped","Status"]),rows:db.campaigns.map(c=>[c.createdAt.slice(0,10),c.name,c.groupName,c.total,c.sent,c.skipped,c.status])};
}
function exportExcel(type){
  const data=reportData(type);const cell=v=>`<Cell><Data ss:Type="${typeof v==="number"?"Number":"String"}">${escXML(v)}</Data></Cell>`;const xml=`<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Styles><Style ss:ID="Header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#172231" ss:Pattern="Solid"/></Style><Style ss:ID="Date"><NumberFormat ss:Format="dd-mmm-yyyy"/></Style></Styles><Worksheet ss:Name="Report"><Table><Row ss:StyleID="Header">${data.headers.map(cell).join("")}</Row>${data.rows.map(r=>`<Row>${r.map(cell).join("")}</Row>`).join("")}</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane><ProtectObjects>False</ProtectObjects><ProtectScenarios>False</ProtectScenarios></WorksheetOptions></Worksheet></Workbook>`;downloadBlob(xml,safeFile(data.title)+".xls","application/vnd.ms-excel");logActivity("Export","Excel report exported",`${data.title} · ${data.rows.length} rows`);saveDB();toast("Excel report downloaded.");
}
function escXML(v){return String(v??"").replace(/[<>&'"]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;","'":"&apos;",'"':"&quot;"}[c]));}
function safeFile(v){return v.replace(/[^a-z0-9]+/gi,"_").replace(/^_|_$/g,"");}
function downloadBlob(content,name,type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);}
function printReport(type){
  const data=reportData(type),w=window.open("","_blank","width=1100,height=800"),locale=db.settings.language==="ta"?"ta-IN":"en-IN";const rows=data.rows.map((r,i)=>`<tr><td>${i+1}</td>${r.map(x=>`<td>${esc(x)}</td>`).join("")}</tr>`).join("")||`<tr><td colspan="${data.headers.length+1}">${tr("No records")}</td></tr>`;const generated=db.settings.language==="ta"?"உருவாக்கிய நேரம்":"Generated",total=db.settings.language==="ta"?"மொத்த பதிவுகள்":"Total records",footer=db.settings.language==="ta"?"உள் வாடிக்கையாளர் தொடர்பு பயன்பாட்டிற்கு":"For internal customer follow-up use";w.document.write(`<!doctype html><html lang="${db.settings.language}"><head><title>${esc(data.title)}</title><style>@page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{font:11px "Noto Sans Tamil","Nirmala UI",Arial,sans-serif;color:#222;margin:0}header{display:flex;justify-content:space-between;align-items:end;border-bottom:2px solid #172231;padding-bottom:9px;margin-bottom:13px}h1{font-size:18px;margin:0}.shop{font-size:14px;font-weight:bold}.meta{text-align:right;color:#555;font-size:10px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #cfd3d6;padding:7px;text-align:left;vertical-align:top}th{background:#172231;color:#fff;font-size:9px;text-transform:uppercase}tbody tr:nth-child(even){background:#f5f5f3}footer{margin-top:11px;display:flex;justify-content:space-between;color:#666;font-size:9px}</style></head><body><header><div><div class="shop">${esc(db.settings.shopName)}</div><h1>${esc(data.title)}</h1></div><div class="meta">${generated} ${new Date().toLocaleString(locale)}<br>${total}: ${data.rows.length}</div></header><table><thead><tr><th>#</th>${data.headers.map(h=>`<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table><footer><span>ThangamOS</span><span>${footer}</span></footer><script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close();logActivity("Print","A4 report prepared",`${data.title} · ${data.rows.length} rows`);saveDB();
}

document.addEventListener("click",e=>{
  const nav=e.target.closest("[data-page]");if(nav){navigate(nav.dataset.page);return}
  const go=e.target.closest("[data-go]");if(go){navigate(go.dataset.go);return}
  const profile=e.target.closest("[data-profile]");if(profile){openProfile(profile.dataset.profile);return}
  const editCustomer=e.target.closest("[data-edit-customer]");if(editCustomer){openEditCustomer(editCustomer.dataset.editCustomer);return}
  const privacyCustomer=e.target.closest("[data-privacy-customer]");if(privacyCustomer){closeBackdrop("profileBackdrop");openPrivacyRequestModal(privacyCustomer.dataset.privacyCustomer);return}
  const completePrivacy=e.target.closest("[data-complete-privacy]");if(completePrivacy){completePrivacyRequest(completePrivacy.dataset.completePrivacy);return}
  const privacyNotice=e.target.closest("[data-open-privacy]");if(privacyNotice){openPrivacyNotice();return}
  const trash=e.target.closest("[data-trash-customer]");if(trash){trashCustomer(trash.dataset.trashCustomer);return}
  const restore=e.target.closest("[data-restore-customer]");if(restore){restoreCustomer(restore.dataset.restoreCustomer);return}
  const editVisit=e.target.closest("[data-edit-visit]");if(editVisit){openEditVisit(editVisit.dataset.editVisit);return}
  const cancelVisit=e.target.closest("[data-cancel-visit]");if(cancelVisit){const v=db.visits.find(x=>x.id===cancelVisit.dataset.cancelVisit),c=customer(v?.customerId),reason=prompt("Reason for cancelling this visit entry:");if(v&&reason?.trim()&&confirm("Cancel this entry? It will remain in the audit history.")){v.cancelledAt=new Date().toISOString();v.cancelReason=reason;logActivity("Visit","Visit entry cancelled",`${c?.name} · ${v.date} · ${reason}`);saveDB();closeBackdrop("profileBackdrop");renderAll();toast("Visit entry cancelled.")}return}
  const cin=e.target.closest("[data-check-in]");if(cin){checkIn(cin.dataset.checkIn);return}
  const cout=e.target.closest("[data-check-out]");if(cout){checkOut(cout.dataset.checkOut);return}
  const add=e.target.closest("[data-add-visit]");if(add){closeBackdrop("profileBackdrop");openVisitModal(add.dataset.addVisit);return}
  const newer=e.target.closest("[data-new-customer]");if(newer){openVisitModal(null,{phone:newer.dataset.newCustomer});return}
  const family=e.target.closest("[data-family-phone]");if(family){openVisitModal(null,{phone:family.dataset.familyPhone,shared:true});return}
  const msg=e.target.closest("[data-message]");if(msg){openMessagePreview(msg.dataset.message,"whatsapp",{type:"followup",reason:msg.dataset.reason||"Customer follow-up"});return}
  const sms=e.target.closest("[data-sms]");if(sms){openMessagePreview(sms.dataset.sms,"sms",{type:"followup",reason:sms.dataset.reason||"Customer follow-up"});return}
  const snooze=e.target.closest("[data-snooze]");if(snooze){const f=db.followups.find(x=>x.id===snooze.dataset.snooze);f.date=isoDaysAhead(1);logActivity("Follow-up","Follow-up moved to tomorrow",`${customer(f.customerId)?.name} · ${f.purpose}`);saveDB();renderAll();toast("Follow-up moved to tomorrow.");return}
  const editFollowup=e.target.closest("[data-edit-followup]");if(editFollowup){openEditFollowup(editFollowup.dataset.editFollowup);return}
  const cancelFollowup=e.target.closest("[data-cancel-followup]");if(cancelFollowup){const f=db.followups.find(x=>x.id===cancelFollowup.dataset.cancelFollowup),c=customer(f?.customerId),reason=prompt("Reason for cancelling this follow-up:");if(f&&reason?.trim()&&confirm("Cancel this follow-up? It will remain in the audit history.")){f.cancelledAt=new Date().toISOString();f.cancelReason=reason;logActivity("Follow-up","Follow-up cancelled",`${c?.name} · ${f.purpose} · ${reason}`);saveDB();renderAll();toast("Follow-up cancelled.")}return}
  const complete=e.target.closest("[data-complete]");if(complete){const f=db.followups.find(x=>x.id===complete.dataset.complete);f.status="Completed";f.result="Completed by staff";logActivity("Follow-up","Follow-up completed",`${customer(f.customerId)?.name} · ${f.purpose}`);saveDB();renderAll();toast("Follow-up completed.");return}
  const use=e.target.closest("[data-use-group]");if(use){navigate("campaigns");$("campaignGroup").value=use.dataset.useGroup;renderBatchPreview();return}
  const exp=e.target.closest("[data-export]");if(exp){exportExcel(exp.dataset.export);return}
  const pr=e.target.closest("[data-print]");if(pr){printReport(pr.dataset.print);return}
  const quickReport=e.target.closest("[data-report]");if(quickReport){printReport(quickReport.dataset.report);return}
});

document.addEventListener("click",e=>{if(canWrite())return;const write=e.target.closest('#newFollowup,#newGroup,#createBatch,#sendNext,#skipNext,#newStaff,#newPrivacyRequest,#newIncident,#importToCloud,#savePrivacySettings,[data-add-visit],[data-new-customer],[data-family-phone],[data-edit-customer],[data-privacy-customer],[data-trash-customer],[data-edit-visit],[data-cancel-visit],[data-snooze],[data-complete],[data-edit-followup],[data-cancel-followup],[data-check-in],[data-check-out],[data-complete-privacy]');if(write){e.preventDefault();e.stopImmediatePropagation();toast("This subscription is in read-only mode. Please renew to make changes.")}},true);

$("mainNav").addEventListener("click",()=>{});$("menuButton").onclick=()=>$("sidebar").classList.toggle("open");
$("findCustomer").onclick=lookupVisitPhone;$("visitPhone").addEventListener("keydown",e=>{if(e.key==="Enter")lookupVisitPhone()});
$("customerSearch").oninput=renderCustomers;$("customerGroupFilter").onchange=renderCustomers;$("customerActivityFilter").onchange=renderCustomers;
$("exportCustomers").onclick=()=>exportExcel("customers");$("exportActivity").onclick=()=>{const data={title:"CRM Activity Log",headers:["Date & Time","Type","Action","Details"],rows:db.activity.map(a=>[formatDateTime(a.at),a.type,a.title,a.detail])};const old=reportData;downloadBlob([data.headers,...data.rows].map(r=>r.map(x=>`"${String(x).replaceAll('"','""')}"`).join(",")).join("\n"),"CRM_Activity_Log.csv","text/csv;charset=utf-8");toast("Activity log downloaded.")};
$("followupTabs").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;followupFilter=b.dataset.status;$$("#followupTabs button").forEach(x=>x.classList.toggle("active",x===b));renderFollowups()});
$("newFollowup").onclick=openFollowupModal;$("newGroup").onclick=openGroupModal;$("campaignGroup").onchange=renderBatchPreview;$("campaignChannel").onchange=renderBatchPreview;$("campaignLanguage").onchange=politeCampaignTemplate;$("campaignOccasion").onchange=politeCampaignTemplate;$("createBatch").onclick=createBatchReview;$("batchConfirmed").onchange=e=>$("confirmBatch").disabled=!e.target.checked;$("cancelBatch").onclick=()=>closeBackdrop("confirmBackdrop");$("confirmBatch").onclick=confirmBatch;$("sendNext").onclick=sendQueueCurrent;$("skipNext").onclick=skipQueueCurrent;
$("newStaff").onclick=openStaffModal;$("openTrash").onclick=openTrash;$("signOutButton").onclick=()=>window.JewelCloud?.signOut();
$("newPrivacyRequest").onclick=()=>openPrivacyRequestModal();$("newIncident").onclick=openIncidentModal;
$("closePrivacyNotice").onclick=$("acknowledgePrivacyNotice").onclick=()=>closeBackdrop("privacyNoticeBackdrop");
$("savePrivacySettings").onclick=()=>{db.settings.privacyContactName=$("privacyContactName").value.trim();db.settings.privacyContactValue=$("privacyContactValue").value.trim();db.settings.retentionNote=$("retentionNote").value.trim();logActivity("Privacy","Privacy settings updated",db.settings.privacyContactName||"Responsible contact updated");saveDB();renderAll();toast("Privacy settings saved.")};
$("renewalContact").onclick=$("holdContact").onclick=()=>{const text=subscriptionContext.adminContact||"Please contact your ThangamOS administrator to renew the subscription.";alert(text)};$("holdSignOut").onclick=()=>window.JewelCloud?.signOut();
$("importToCloud").onclick=async()=>{const ctx=window.JewelCloud?.context?.()||{};if(!ctx.ready){toast("Configure Supabase and sign in first.");return}if(!['owner','manager'].includes(ctx.role)){toast("Owner or manager permission is required.");return}if(!confirm("Import this browser data into the assigned shop? Existing matching IDs will be updated."))return;try{await window.JewelCloud.importLocal(db);toast("Browser data imported to cloud.")}catch(err){toast(err.message||"Cloud import failed.")}};
$("modalForm").addEventListener("submit",e=>{e.preventDefault();if(!canWrite()){toast("This subscription is in read-only mode. Please renew to make changes.");return}const form=e.currentTarget,data=Object.fromEntries(new FormData(form));try{modalHandler?.(data,form);closeBackdrop("modalBackdrop")}catch(err){toast(err.message||"Please check the form.")}});$("closeModal").onclick=$("cancelModal").onclick=()=>closeBackdrop("modalBackdrop");$("closeProfile").onclick=()=>closeBackdrop("profileBackdrop");
$("globalSearch").addEventListener("input",e=>{if(e.target.value.trim().length>=2){navigate("customers");$("customerSearch").value=e.target.value;renderCustomers()}});
$("campaignImage").addEventListener("change",e=>{if(e.target.files[0])toast(`Image selected: ${e.target.files[0].name}. Attach it after WhatsApp opens.`)});
$("settingLanguage").addEventListener("change",e=>{db.settings.language=e.target.value;$("campaignLanguage").value=e.target.value==="ta"?"tamil":"english";politeCampaignTemplate();logActivity("Settings","Application language changed",e.target.value==="ta"?"தமிழ்":"English");saveDB();renderAll();const labels={today:"Today",visit:"Quick Visit",customers:"Customers",followups:"Follow-ups",groups:"Customer Groups",campaigns:"Campaigns",reports:"Reports",staff:"Staff & Attendance",compliance:"Privacy & Compliance",activity:"Activity Log",settings:"Settings"};$("pageTitle").textContent=tr(labels[currentPage]);toast(e.target.value==="ta"?"செயலி மொழி தமிழாக மாற்றப்பட்டது.":"Application language changed to English.")});
$("textSizeOptions").addEventListener("click",e=>{const b=e.target.closest("[data-size]");if(!b)return;db.settings.textSize=b.dataset.size;logActivity("Settings","Text size changed",b.dataset.size);saveDB();renderSettings();applyPreferences();toast(db.settings.language==="ta"?"எழுத்து அளவு மாற்றப்பட்டது.":"Text size updated for this device.")});
$("messageTemplateType").addEventListener("change",()=>{if(pendingMessage){pendingMessage.originalText="";pendingMessage.type=$("messageTemplateType").value;resetMessagePreview()}});$("messageLanguage").addEventListener("change",()=>{if(pendingMessage){pendingMessage.originalText="";resetMessagePreview()}});$("messageEditor").addEventListener("input",updateMessageCount);$("resetMessage").onclick=()=>{if(pendingMessage){pendingMessage.originalText="";resetMessagePreview()}};$("confirmOpenMessage").onclick=confirmOpenMessage;$("closeMessage").onclick=$("cancelMessage").onclick=()=>{closeBackdrop("messageBackdrop");pendingMessage=null};
$$('.modal-backdrop').forEach(el=>el.addEventListener("mousedown",e=>{if(e.target===el)closeBackdrop(el.id)}));

$$('.login-type-btn').forEach(btn=>btn.addEventListener('click',()=>{$$('.login-type-btn').forEach(x=>x.classList.toggle('active',x===btn));$('loginType').value=btn.dataset.loginType;$('loginSubmit').textContent=btn.dataset.loginType==='admin'?'Admin Login':'Client Login';$('loginError').textContent='';}));
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();$("loginError").textContent="Signing in…";try{await window.JewelCloud.signIn($("loginEmail").value.trim(),$("loginPassword").value,$("loginType").value);$("loginError").textContent=""}catch(err){$("loginError").textContent=err.message||"Sign in failed."}});
window.addEventListener("jewelcloud-status",e=>{const el=$("syncStatus");el.className=`sync-status ${e.detail.state}`;el.querySelector("b").textContent=e.detail.label});
window.addEventListener("jewelcloud-context",e=>{if(e.detail.mode==="admin")return;if($("currentSessionLabel"))$("currentSessionLabel").textContent=`${e.detail.sessionDays||3} day auto logout · ${e.detail.deviceName||"This device"}`;subscriptionContext={state:e.detail.accessState||"active",modules:e.detail.modules||{},reminderMessage:e.detail.reminderMessage||"",adminContact:e.detail.adminContact||""};if(e.detail.accessState==="suspended"){$("holdMessage").textContent=e.detail.reminderMessage||"Your records are safely retained. Please contact the administrator to restore access.";$("holdScreen").hidden=false;return}$("holdScreen").hidden=true;if(e.detail.shopName){db.settings.shopName=e.detail.shopName;$("todayGreeting").textContent=`Today at ${e.detail.shopName}`;renderAll()}});
window.addEventListener("jewelcloud-data",e=>{const cloud=e.detail;if(cloud.__cloudEmpty){toast("Cloud shop is ready. Use Settings to import the tested browser data.");return}db={...clone(seed),...cloud,settings:{...clone(seed.settings),...(cloud.settings||{})},staff:cloud.staff||[],attendance:cloud.attendance||[],privacyRequests:cloud.privacyRequests||[],consentLogs:cloud.consentLogs||[],securityIncidents:cloud.securityIncidents||[]};db.customers.forEach(c=>{if(c.dataConsent===undefined)c.dataConsent=false;if(c.marketingConsent===undefined)c.marketingConsent=false});localStorage.setItem(STORAGE_KEY,JSON.stringify(db));renderAll();toast("Latest cloud data loaded.")});

if(db.settings.language==="ta"){$("campaignLanguage").value="tamil";politeCampaignTemplate()}
renderAll();

/* bridge hook: expose navigate + toast to the billing layer */
try{ window.__crmNavigate = navigate; }catch(_){}
try{ window.toast = toast; }catch(_){}
try{ window.__openModal = openModal; }catch(_){}

/* bridge: upsert a customer into the CRM store by phone (called by billing on POS finalize) */
window.CRMData = {
  upsertCustomer(info){
    try{
      const phone = cleanPhone(info.phone||"");
      if(!phone) return;
      let c = db.customers.find(x=>cleanPhone(x.phone)===phone);
      if(c){
        if(info.name && !c.name) c.name=info.name;
        if(info.place && !c.area) c.area=info.place;
      } else {
        db.customers.push({
          id: uid("C"), name: info.name||"Customer", phone,
          area: info.place||info.area||"", language:"", birthday:"", anniversary:"",
          groups:[], optOut:false, source:"POS", createdAt:new Date().toISOString()
        });
      }
      saveDB();
      if(typeof renderCustomers==="function" && currentPage==="customers") renderCustomers();
    }catch(e){ console.warn("CRM upsert failed",e); }
  },
  exportAll(){ return JSON.parse(JSON.stringify(db)); },
  importAll(data){
    if(!data||typeof data!=="object") return 0;
    let added=0;
    for(const k of Object.keys(data)){
      if(Array.isArray(data[k])){
        if(!Array.isArray(db[k])) db[k]=[];
        const ids=new Set(db[k].map(x=>x&&x.id).filter(Boolean));
        for(const row of data[k]){ if(row&&row.id&&ids.has(row.id)) continue; db[k].push(row); added++; }
      } else if(k==="settings" && data.settings && typeof data.settings==="object"){
        db.settings={...data.settings,...Object.fromEntries(Object.entries(db.settings||{}).filter(([,v])=>v!==""&&v!=null&&!(Array.isArray(v)&&!v.length)))};
      }
    }
    saveDB(); try{ if(typeof renderAll==="function") renderAll(); }catch(_){}
    return added;
  },
  hasCustomer(phone){ try{ const p=cleanPhone(phone); return db.customers.some(x=>cleanPhone(x.phone)===p); }catch(_){ return false; } },
  getCustomer(phone){ try{ const p=cleanPhone(phone); return db.customers.find(x=>cleanPhone(x.phone)===p); }catch(_){ return null; } }
};

/* cloud: re-upload CRM changes made while offline as soon as the connection returns */
window.addEventListener("online",()=>{ try{ if(window.JewelCloud?.context?.().ready) saveDB(); }catch(_){} });
