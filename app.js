const KEY = 'healthSaathiStateV2';
const MEDIA_DB = 'healthSaathiMediaV2';
const MEDIA_STORE = 'photos';
const $ = id => document.getElementById(id);
const uid = () => 'hs_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const today = () => new Date().toISOString().slice(0, 10);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateText = value => value ? new Date(value).toLocaleString(undefined, {dateStyle:'medium', timeStyle:'short'}) : '';
const dayText = value => value ? new Date(value + 'T12:00:00').toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'}) : '';

const types = [
  {id:'bp', label:'Blood Pressure', icon:'🩺', unit:'mmHg'},
  {id:'sugar', label:'Blood Sugar', icon:'🩸', unit:'mg/dL'},
  {id:'weight', label:'Weight', icon:'⚖️', unit:'kg'},
  {id:'pulse', label:'Pulse', icon:'💓', unit:'bpm'},
  {id:'spo2', label:'SpO₂', icon:'🫁', unit:'%'},
  {id:'temp', label:'Temperature', icon:'🌡️', unit:'°C'},
  {id:'sleep', label:'Sleep', icon:'😴', unit:'hours'}
];
const tips = [
  'Drink water regularly through the day.',
  'Keep dates with readings so trends are easier to review.',
  'Take medicines according to professional instructions.',
  'A consistent sleep routine supports everyday wellbeing.',
  'Gentle movement and a few deep breaths can refresh your day.'
];
const base = {
  profile:{name:'', age:'', blood:'', weight:'', info:'', photoId:''},
  entries:[], meds:[], notes:[], appointments:[], water:{date:today(), count:0},
  theme:'mint', lang:'en', layout:types.map(t => ({id:t.id, size:'normal'}))
};
let state = loadState();
let activeView = 'home';
let recordFilter = 'all';
let deferredInstall = null;
let searchOpen = false;
let dbPromise;

function loadState(){
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    const s = {...base, ...(saved || {})};
    s.profile = {...base.profile, ...(saved?.profile || {})};
    s.water = {...base.water, ...(saved?.water || {})};
    s.layout = Array.isArray(saved?.layout) && saved.layout.length ? saved.layout : base.layout.map(x => ({...x}));
    s.entries = Array.isArray(s.entries) ? s.entries : [];
    s.meds = Array.isArray(s.meds) ? s.meds : [];
    s.notes = Array.isArray(s.notes) ? s.notes : [];
    s.appointments = Array.isArray(s.appointments) ? s.appointments : [];
    return s;
  } catch { return structuredClone(base); }
}
function save(){ localStorage.setItem(KEY, JSON.stringify(state)); }
function ensureWaterDay(){ if(state.water.date !== today()){ state.water = {date:today(), count:0}; save(); } }
function typeOf(id){ return types.find(t => t.id === id) || types[0]; }
function lastEntry(id){ return [...state.entries].reverse().find(e => e.type === id); }
function displayEntry(e){ return e.display || (e.value ? `${e.value} ${e.unit || ''}` : ''); }
function toast(message){ const el=$('toast'); el.textContent=message; el.classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove('show'),2200); }
function t(key){ return translations[state.lang]?.[key] || translations.en[key] || key; }

const translations = {
  en:{goodDay:'GOOD DAY',privateSpace:'Small steps, clear records, a healthier you.',today:'TODAY',overview:'Your health overview',viewAll:'View all →',quickAdd:'Quick add',takesMoment:'Takes a moment',todaysTip:"TODAY'S TIP",recentActivity:'Recent activity',seeAll:'See all →',healthTracking:'Health tracking',trackDescription:'Keep useful measurements together, without the clutter.',dailyGoal:'DAILY GOAL',waterTracker:'Water tracker',glasses:'glasses',waterEncouragement:'Stay hydrated, one glass at a time.',careTitle:'Your care plan',careDescription:'Medicines, reminders and appointments in one calm place.',careBannerTitle:'A little organization goes a long way.',careBannerText:'Set reminders and keep the important details close.',medicines:'Medicines',add:'Add',notesReminders:'Notes & reminders',appointments:'Appointments',records:'Your records',recordsDescription:'A simple history you can review or share with a doctor.',export:'Export backup',import:'Import',print:'Print report',settings:'Make it yours.',settingsDescription:'Personalize Health Saathi while keeping your data on this device.',installTitle:'Install Health Saathi',installText:'Add it to your home screen for a focused app experience.',install:'Install',notifications:'Reminder notifications',notificationsText:'Allow reminders while the app is active.',allow:'Allow',profile:'Your profile',profileText:'Basic information stays on this device.',gallery:'Gallery',camera:'Camera',remove:'Remove',name:'Name',age:'Age',bloodGroup:'Blood group',weight:'Weight',healthNote:'Short health note',saveProfile:'Save profile',appearance:'Appearance',featureLayout:'Feature layout',layoutText:'Reorder cards or change their size. Your choice is saved.',resetLayout:'Reset layout',about:'About Health Saathi',aboutText:'A personal health organization and tracking app designed to keep your health information, measurements, medicines, reminders and daily wellness information organized in one place.',disclaimer:'For personal health tracking and organization; not a replacement for professional medical advice, diagnosis or treatment.',data:'Data',clearData:'Clear local data',clearText:'This removes records, medicines, notes and profile data from this device.',clear:'Clear',home:'Home',track:'Track',care:'Care'},
  ur:{goodDay:'اچھا دن',privateSpace:'چھوٹے قدم، واضح ریکارڈ، بہتر صحت۔',today:'آج',overview:'آپ کی صحت کا جائزہ',viewAll:'سب دیکھیں ←',quickAdd:'فوری اندراج',takesMoment:'صرف ایک لمحہ',todaysTip:'آج کا مشورہ',recentActivity:'حالیہ سرگرمی',seeAll:'سب دیکھیں ←',healthTracking:'صحت کی نگرانی',trackDescription:'ضروری پیمائشیں آسانی سے ایک جگہ محفوظ کریں۔',dailyGoal:'روزانہ کا ہدف',waterTracker:'پانی کا ٹریکر',glasses:'گلاس',waterEncouragement:'ایک ایک گلاس کر کے پانی پیتے رہیں۔',careTitle:'آپ کی نگہداشت',careDescription:'ادویات، یاددہانیاں اور ملاقاتیں ایک جگہ۔',careBannerTitle:'تھوڑی سی ترتیب بہت مددگار ہوتی ہے۔',careBannerText:'یاددہانیاں مقرر کریں اور ضروری معلومات قریب رکھیں۔',medicines:'ادویات',add:'شامل کریں',notesReminders:'نوٹس اور یاددہانیاں',appointments:'ملاقاتیں',records:'آپ کے ریکارڈ',recordsDescription:'سادہ تاریخ جسے آپ ڈاکٹر کے ساتھ دیکھ یا شیئر کر سکتے ہیں۔',export:'بیک اپ محفوظ کریں',import:'درآمد',print:'رپورٹ پرنٹ کریں',settings:'اپنی مرضی بنائیں',settingsDescription:'اپنے ڈیٹا کو اسی ڈیوائس پر رکھتے ہوئے Health Saathi کو ذاتی بنائیں۔',installTitle:'Health Saathi انسٹال کریں',installText:'توجہ مرکوز تجربے کے لیے ہوم اسکرین پر شامل کریں۔',install:'انسٹال',notifications:'یاددہانی کی اطلاعات',notificationsText:'ایپ فعال ہونے پر یاددہانیاں کی اجازت دیں۔',allow:'اجازت دیں',profile:'آپ کا پروفائل',profileText:'بنیادی معلومات اسی ڈیوائس پر رہتی ہیں۔',gallery:'گیلری',camera:'کیمرہ',remove:'حذف',name:'نام',age:'عمر',bloodGroup:'بلڈ گروپ',weight:'وزن',healthNote:'مختصر صحت کا نوٹ',saveProfile:'پروفائل محفوظ کریں',appearance:'ظاہری انداز',featureLayout:'فیچر کی ترتیب',layoutText:'کارڈز کی ترتیب یا جسامت بدلیں۔ آپ کا انتخاب محفوظ رہے گا۔',resetLayout:'ترتیب بحال کریں',about:'Health Saathi کے بارے میں',aboutText:'ذاتی صحت کی تنظیم اور نگرانی کی ایپ جو صحت کی معلومات، پیمائشیں، ادویات، یاددہانیاں اور روزمرہ فلاح کو ایک جگہ منظم رکھتی ہے۔',disclaimer:'ذاتی صحت کی تنظیم کے لیے؛ پیشہ ورانہ طبی مشورے، تشخیص یا علاج کا متبادل نہیں۔',data:'ڈیٹا',clearData:'مقامی ڈیٹا صاف کریں',clearText:'یہ ڈیوائس سے ریکارڈ، ادویات، نوٹس اور پروفائل ڈیٹا ہٹا دے گا۔',clear:'صاف کریں',home:'ہوم',track:'نگرانی',care:'نگہداشت'}
};

function applyLanguage(){
  document.documentElement.lang = state.lang === 'ur' ? 'ur' : 'en';
  document.documentElement.dir = state.lang === 'ur' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach(el => el.textContent = t(el.dataset.i18n));
  $('search').placeholder = state.lang === 'ur' ? 'ریکارڈ، ادویات، نوٹس تلاش کریں…' : 'Search records, medicines, notes…';
}
function applyTheme(){ document.documentElement.dataset.theme = state.theme === 'mint' ? '' : state.theme; }

function render(){
  ensureWaterDay(); applyTheme(); applyLanguage();
  $('greeting').textContent = state.profile.name ? `Good to see you, ${state.profile.name.split(' ')[0]}` : 'Your private wellness space';
  $('home-title').textContent = state.profile.name ? `Take care of yourself, ${state.profile.name.split(' ')[0]}.` : 'Take care of yourself today.';
  renderMetrics(); renderTracking(); renderCare(); renderRecords(); renderProfile(); renderThemes(); renderLayout(); renderWater();
  $('tip-text').textContent = tips[new Date().getDate() % tips.length];
}
function renderMetrics(){
  $('metric-grid').innerHTML = types.slice(0,6).map(type => { const e=lastEntry(type.id); return `<div class="metric-card"><div class="metric-icon">${type.icon}</div><div><div class="metric-name">${type.label}</div><div class="metric-value">${e ? esc(displayEntry(e)) : '—'}</div></div></div>`; }).join('');
  const quick = [{id:'bp',label:'BP',icon:'🩺'},{id:'sugar',label:'Sugar',icon:'🩸'},{id:'weight',label:'Weight',icon:'⚖️'},{id:'water',label:'Water',icon:'💧'},{id:'note',label:'Note',icon:'✎'}];
  $('quick-actions').innerHTML = quick.map(q => `<button class="quick-btn" data-action="quick" data-type="${q.id}"><span>${q.icon}</span><small>${q.label}</small></button>`).join('');
  const recent = [...state.entries].sort((a,b)=>new Date(b.time)-new Date(a.time)).slice(0,3);
  $('home-recent').innerHTML = recent.length ? recent.map(entryCard).join('') : `<div class="empty">No activity yet. Add your first measurement above.</div>`;
}
function renderTracking(){
  const order = state.layout.map(x=>x.id).filter(id=>types.some(t=>t.id===id));
  $('tracking-grid').innerHTML = order.map(id => { const type=typeOf(id), e=lastEntry(id); const size=state.layout.find(x=>x.id===id)?.size || 'normal'; return `<article class="track-card ${size}"><div class="top"><div class="track-icon">${type.icon}</div><button class="mini-btn" data-action="add-entry" data-type="${type.id}">＋ Add</button></div><div class="last"><strong>${e ? esc(displayEntry(e)) : 'No entry yet'}</strong><span>${type.label}${e ? ` · ${dateText(e.time)}` : ''}</span></div></article>`; }).join('');
}
function renderWater(){ const count=state.water.count; $('water-count').textContent=count; $('water-label').textContent=`${count} ${count===1?'glass':'glasses'}`; $('water-fill').style.height=Math.min(100,count*12.5)+'%'; }
function entryCard(e, actions=true){ const type=typeOf(e.type); return `<div class="list-card"><div class="list-icon">${type.icon}</div><div class="list-body"><strong>${type.label}</strong><p>${esc(displayEntry(e))}${e.note ? ` · ${esc(e.note)}`:''}</p><time>${dateText(e.time)}</time></div>${actions?`<div class="list-actions"><button class="mini-btn" data-action="edit-entry" data-id="${e.id}">Edit</button><button class="mini-btn danger" data-action="delete-entry" data-id="${e.id}">Delete</button></div>`:''}</div>`; }
function renderCare(){
  $('med-list').innerHTML = state.meds.length ? state.meds.map(m=>`<div class="list-card"><div class="list-icon">💊</div><div class="list-body"><strong>${esc(m.name)}</strong><p>${esc(m.dose || 'Dose not added')}${m.instructions ? ` · ${esc(m.instructions)}`:''}</p><time>${m.time ? `Reminder ${esc(m.time)}` : 'No reminder time'}${m.notes ? ` · ${esc(m.notes)}`:''}</time></div><div class="list-actions"><button class="mini-btn" data-action="edit-medicine" data-id="${m.id}">Edit</button><button class="mini-btn danger" data-action="delete-medicine" data-id="${m.id}">Delete</button></div></div>`).join('') : `<div class="empty">No medicines yet. Add one to keep your plan close.</div>`;
  $('note-list').innerHTML = state.notes.length ? state.notes.map(n=>`<div class="list-card"><div class="list-icon">✎</div><div class="list-body"><strong>${esc(n.title)}</strong><p>${esc(n.text)}</p><time>${n.time ? `Reminder ${esc(n.time)}` : 'Saved'} · ${dateText(n.created)}</time></div><div class="list-actions"><button class="mini-btn" data-action="edit-note" data-id="${n.id}">Edit</button><button class="mini-btn danger" data-action="delete-note" data-id="${n.id}">Delete</button></div></div>`).join('') : `<div class="empty">No notes or reminders yet.</div>`;
  $('appointment-list').innerHTML = state.appointments.length ? state.appointments.map(a=>`<div class="list-card"><div class="list-icon">▣</div><div class="list-body"><strong>${esc(a.title)}</strong><p>${dayText(a.date)}${a.time ? ` · ${esc(a.time)}`:''}</p><time>${esc(a.details || 'No details added')}</time></div><div class="list-actions"><button class="mini-btn" data-action="edit-appointment" data-id="${a.id}">Edit</button><button class="mini-btn danger" data-action="delete-appointment" data-id="${a.id}">Delete</button></div></div>`).join('') : `<div class="empty">No appointments added.</div>`;
}
function allSearch(){ const q=($('search').value||'').trim().toLowerCase(); return q ? {entries:state.entries.filter(e=>`${e.label} ${e.display} ${e.note}`.toLowerCase().includes(q)),meds:state.meds.filter(m=>`${m.name} ${m.dose} ${m.notes}`.toLowerCase().includes(q)),notes:state.notes.filter(n=>`${n.title} ${n.text}`.toLowerCase().includes(q)),apps:state.appointments.filter(a=>`${a.title} ${a.details}`.toLowerCase().includes(q))} : null; }
function renderRecords(){
  const search=allSearch(); const filters=[['all','All'],...types.map(t=>[t.id,t.label])]; $('record-filters').innerHTML=filters.map(([id,label])=>`<button class="${recordFilter===id?'active':''}" data-action="filter" data-filter="${id}">${label}</button>`).join('');
  let list = search ? search.entries : state.entries.filter(e=>recordFilter==='all'||e.type===recordFilter).sort((a,b)=>new Date(b.time)-new Date(a.time));
  let html=list.map(e=>entryCard(e)).join('');
  if(search) html += [...search.meds.map(m=>`<div class="list-card"><div class="list-icon">💊</div><div class="list-body"><strong>Medicine · ${esc(m.name)}</strong><p>${esc(m.dose||'')}</p></div></div>`),...search.notes.map(n=>`<div class="list-card"><div class="list-icon">✎</div><div class="list-body"><strong>Note · ${esc(n.title)}</strong><p>${esc(n.text)}</p></div></div>`),...search.apps.map(a=>`<div class="list-card"><div class="list-icon">▣</div><div class="list-body"><strong>Appointment · ${esc(a.title)}</strong><p>${dayText(a.date)} ${esc(a.time||'')}</p></div></div>`)].join('');
  $('record-list').innerHTML=html || `<div class="empty">${search?'No matching items found.':'No health records yet. Your saved entries will appear here.'}</div>`;
}
function renderProfile(){ const p=state.profile; $('profile-name').textContent=p.name||'Your profile'; const form=$('profile-form'); Object.entries(p).forEach(([key,val])=>{const el=form.elements[key]; if(el) el.value=val||'';}); const avatar=$('avatar'); avatar.textContent=p.photoId?'':'♥'; avatar.style.backgroundImage=''; if(p.photoId) getMedia(p.photoId).then(src=>{if(src){avatar.style.backgroundImage=`url(${src})`;avatar.textContent='';}}); }
function renderThemes(){ const themes=[['mint','Soft Mint','#bff4df','#159a7d'],['sky','Soft Sky','#c9e9fa','#2b8abd'],['lav','Soft Lavender','#e5d9ff','#8c6fc2'],['cream','Warm Cream','#ffecc3','#bd8651']]; $('theme-grid').innerHTML=themes.map(([id,label,a,b])=>`<button class="theme-option ${state.theme===id?'active':''}" data-action="theme" data-theme-name="${id}"><div class="swatch" style="--sw1:${a};--sw2:${b}"></div>${label}</button>`).join(''); }
function renderLayout(){ $('layout-list').innerHTML=state.layout.map((item,i)=>{const type=typeOf(item.id);return `<div class="layout-item"><span>${type.icon}</span><strong>${type.label}</strong><span class="muted">${item.size}</span><button class="mini-btn" data-action="move-layout" data-index="${i}" data-dir="-1">↑</button><button class="mini-btn" data-action="move-layout" data-index="${i}" data-dir="1">↓</button><button class="mini-btn" data-action="size-layout" data-index="${i}" data-dir="-1">−</button><button class="mini-btn" data-action="size-layout" data-index="${i}" data-dir="1">＋</button></div>`;}).join(''); }

function modal(title, body){ $('modal-root').innerHTML=`<div class="modal-backdrop" data-action="close-modal"><div class="modal-card" role="dialog" aria-modal="true" onclick="event.stopPropagation()"><div class="modal-head"><h2>${title}</h2><button class="icon-btn" data-action="close-modal">×</button></div>${body}</div></div>`; }
function entryModal(typeId, id=''){ const type=typeOf(typeId), e=state.entries.find(x=>x.id===id); const bp=typeId==='bp'; const sugar=typeId==='sugar'; modal(`${id?'Edit':'Add'} ${type.label}`, `<form class="modal-form" data-form="entry" data-type="${typeId}" data-id="${id}">${bp?`<label>Systolic (mmHg)<input name="value" type="number" inputmode="numeric" required value="${esc(e?.value||'')}"></label><label>Diastolic (mmHg)<input name="secondary" type="number" inputmode="numeric" required value="${esc(e?.secondary||'')}"></label><label>Pulse (optional)<input name="pulse" type="number" inputmode="numeric" value="${esc(e?.pulse||'')}"></label>`:`<label>${type.label} (${type.unit})<input name="value" type="number" step="any" inputmode="decimal" required value="${esc(e?.value||'')}"></label>`}${sugar?`<label>Context<select name="context"><option value="">Choose context</option><option ${e?.context==='Fasting'?'selected':''}>Fasting</option><option ${e?.context==='After meal'?'selected':''}>After meal</option><option ${e?.context==='Random'?'selected':''}>Random</option></select></label>`:''}<label>Note (optional)<textarea name="note" rows="2">${esc(e?.note||'')}</textarea></label><div class="form-actions"><button class="btn btn-primary" type="submit">Save record</button><button class="btn btn-soft" type="button" data-action="close-modal">Cancel</button></div></form>`); }
function medicineModal(id=''){ const m=state.meds.find(x=>x.id===id); $('modal-root').dataset.photoId=m?.photoId||''; modal(`${id?'Edit':'Add'} Medicine`, `<form class="modal-form" data-form="medicine" data-id="${id}"><label>Medicine name *<input name="name" required value="${esc(m?.name||'')}"></label><label>Dose<input name="dose" value="${esc(m?.dose||'')}"></label><label>Instructions<input name="instructions" value="${esc(m?.instructions||'')}"></label><label>Reminder time<input name="time" type="time" value="${esc(m?.time||'')}"></label><label>Notes<textarea name="notes" rows="2">${esc(m?.notes||'')}</textarea></label><label>Photo<input name="photo" type="file" accept="image/*" capture="environment"><span class="muted">Gallery or camera supported on compatible Android browsers.</span></label><div class="form-actions"><button class="btn btn-primary" type="submit">Save medicine</button><button class="btn btn-soft" type="button" data-action="close-modal">Cancel</button></div></form>`); }
function noteModal(id=''){const n=state.notes.find(x=>x.id===id);modal(`${id?'Edit':'Add'} Note`, `<form class="modal-form" data-form="note" data-id="${id}"><label>Title<input name="title" required value="${esc(n?.title||'')}"></label><label>Details<textarea name="text" rows="4" required>${esc(n?.text||'')}</textarea></label><label>Reminder time<input name="time" type="time" value="${esc(n?.time||'')}"></label><div class="form-actions"><button class="btn btn-primary" type="submit">Save note</button><button class="btn btn-soft" type="button" data-action="close-modal">Cancel</button></div></form>`);}
function appointmentModal(id=''){const a=state.appointments.find(x=>x.id===id);modal(`${id?'Edit':'Add'} Appointment`, `<form class="modal-form" data-form="appointment" data-id="${id}"><label>Title<input name="title" required value="${esc(a?.title||'')}"></label><label>Date<input name="date" type="date" required value="${esc(a?.date||today())}"></label><label>Time<input name="time" type="time" value="${esc(a?.time||'')}"></label><label>Details<textarea name="details" rows="3">${esc(a?.details||'')}</textarea></label><div class="form-actions"><button class="btn btn-primary" type="submit">Save appointment</button><button class="btn btn-soft" type="button" data-action="close-modal">Cancel</button></div></form>`);}

function formObject(form){return Object.fromEntries(new FormData(form).entries());}
async function saveEntry(form){ const o=formObject(form), type=typeOf(form.dataset.type), id=form.dataset.id; if(!o.value) return; const value=Number(o.value); const display=form.dataset.type==='bp' ? `${value}/${Number(o.secondary)} ${type.unit}${o.pulse?` · ${o.pulse} bpm`:''}` : `${value} ${type.unit}${o.context?` · ${o.context}`:''}`; const record={id:id||uid(),type:type.id,label:type.label,unit:type.unit,value,secondary:o.secondary||'',pulse:o.pulse||'',context:o.context||'',note:o.note||'',display,time:new Date().toISOString()}; if(id){const i=state.entries.findIndex(x=>x.id===id);state.entries[i]=record;}else state.entries.push(record); save(); closeModal(); render(); toast(`${type.label} saved`);}
async function saveMedicine(form){ const o=formObject(form), id=form.dataset.id, file=form.elements.photo.files?.[0]; if(!o.name.trim()) return; let photoId=$('modal-root').dataset.photoId||''; if(file){photoId=uid(); await putMedia(photoId, await imageData(file));} const m={id:id||uid(),name:o.name.trim(),dose:o.dose||'',instructions:o.instructions||'',time:o.time||'',notes:o.notes||'',photoId}; if(id) state.meds[state.meds.findIndex(x=>x.id===id)]=m; else state.meds.unshift(m); save(); closeModal(); render(); toast('Medicine saved successfully');}
function closeModal(){ $('modal-root').innerHTML=''; }
function confirmDelete(message, callback){ modal('Are you sure?', `<p class="muted" style="margin-bottom:16px">${message}</p><div class="form-actions"><button class="btn btn-danger" data-action="confirm-delete">Delete</button><button class="btn btn-soft" data-action="close-modal">Cancel</button></div>`); $('modal-root').dataset.confirm='yes'; $('modal-root')._callback=callback; }

function openApp(){ $('splash').classList.add('hidden'); $('app').classList.remove('hidden'); render(); }
function showView(view){ activeView=view; document.querySelectorAll('.view').forEach(x=>x.classList.toggle('active',x.id===`${view}-view`)); document.querySelectorAll('.bottom-nav button').forEach(x=>x.classList.toggle('active',x.dataset.view===view)); window.scrollTo({top:0,behavior:'smooth'}); render(); }
function changeWater(delta){ ensureWaterDay(); state.water.count=Math.max(0,state.water.count+delta); save(); renderWater(); toast(delta>0?'Water added':'Water updated'); }
function updateLayout(kind,index,dir){if(kind==='move'){const next=index+dir;if(next<0||next>=state.layout.length)return;[state.layout[index],state.layout[next]]=[state.layout[next],state.layout[index]];}else{const sizes=['small','normal','large'];const current=sizes.indexOf(state.layout[index].size);state.layout[index].size=sizes[Math.max(0,Math.min(2,current+dir))];}save();render();}

async function saveProfilePhoto(file){if(!file)return;const id=uid();await putMedia(id,await imageData(file));if(state.profile.photoId) deleteMedia(state.profile.photoId);state.profile.photoId=id;save();render();toast('Profile photo saved');}
function imageData(file){return new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{const max=720,scale=Math.min(1,max/Math.max(img.width,img.height)),canvas=document.createElement('canvas');canvas.width=img.width*scale;canvas.height=img.height*scale;canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL('image/jpeg',.78));};img.src=reader.result;};reader.readAsDataURL(file);});}
function openDb(){return dbPromise ||= new Promise((resolve,reject)=>{const req=indexedDB.open(MEDIA_DB,1);req.onupgradeneeded=()=>req.result.createObjectStore(MEDIA_STORE);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function putMedia(id,data){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(MEDIA_STORE,'readwrite');tx.objectStore(MEDIA_STORE).put(data,id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
async function getMedia(id){try{const db=await openDb();return await new Promise((resolve,reject)=>{const req=db.transaction(MEDIA_STORE).objectStore(MEDIA_STORE).get(id);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}catch{return ''}}
async function deleteMedia(id){if(!id)return;try{const db=await openDb();db.transaction(MEDIA_STORE,'readwrite').objectStore(MEDIA_STORE).delete(id);}catch{}}
async function getAllMedia(){const db=await openDb();return new Promise((resolve,reject)=>{const out=[];const req=db.transaction(MEDIA_STORE).objectStore(MEDIA_STORE).openCursor();req.onsuccess=()=>{const cursor=req.result;if(!cursor){resolve(out);return;}out.push({id:cursor.key,data:cursor.value});cursor.continue();};req.onerror=()=>reject(req.error);});}

async function exportBackup(){const media=await getAllMedia();const backup={format:'health-saathi-backup-v2',exportedAt:new Date().toISOString(),state,media};const blob=new Blob([JSON.stringify(backup)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`health-saathi-backup-${today()}.json`;a.click();URL.revokeObjectURL(a.href);toast('Backup exported');}
async function importBackup(file){try{const data=JSON.parse(await file.text());if(!data.state)throw Error('Invalid backup');state={...base,...data.state,profile:{...base.profile,...(data.state.profile||{})},water:{...base.water,...(data.state.water||{})}};save();if(Array.isArray(data.media)){for(const item of data.media){if(item?.id&&item?.data)await putMedia(item.id,item.data);}}render();toast('Backup restored');}catch{toast('Could not restore that backup');}}
function printReport(){showView('records');setTimeout(()=>window.print(),100);}
async function shareApp(){const data={title:'Health Saathi',text:'Health Saathi — private personal health organization.',url:location.href};if(navigator.share){try{await navigator.share(data);}catch{}}else{await navigator.clipboard?.writeText(location.href);toast('App link copied');}}
async function askNotifications(){if(!('Notification'in window)){toast('Notifications are not supported in this browser');return;}const result=await Notification.requestPermission();$('notification-status').textContent=result==='granted'?'Notifications are allowed on this device.':'Notifications are not enabled.';toast(result==='granted'?'Notifications enabled':'Permission not granted');}

window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;});
async function install(){if(deferredInstall){deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;}else toast('In Chrome, use ⋮ → Add to Home screen.');}

document.addEventListener('click',e=>{
  const target=e.target.closest('[data-action],[data-view]'); if(!target)return;
  if(target.dataset.view){showView(target.dataset.view);return;}
  const action=target.dataset.action;
  if(action==='open-app')openApp();
  if(action==='toggle-search'){searchOpen=!searchOpen;$('searchbar').classList.toggle('hidden',!searchOpen);if(searchOpen)$('search').focus();}
  if(action==='toggle-language'){state.lang=state.lang==='en'?'ur':'en';save();render();}
  if(action==='quick'){if(target.dataset.type==='water')changeWater(1);else if(target.dataset.type==='note')noteModal();else entryModal(target.dataset.type);}
  if(action==='add-entry')entryModal(target.dataset.type);
  if(action==='edit-entry')entryModal(state.entries.find(x=>x.id===target.dataset.id)?.type,target.dataset.id);
  if(action==='delete-entry')confirmDelete('This health record will be removed from this device.',()=>{state.entries=state.entries.filter(x=>x.id!==target.dataset.id);save();closeModal();render();toast('Record deleted');});
  if(action==='water-plus')changeWater(1); if(action==='water-minus')changeWater(-1);
  if(action==='add-medicine')medicineModal();if(action==='edit-medicine')medicineModal(target.dataset.id);if(action==='delete-medicine')confirmDelete('This medicine and its saved details will be removed.',()=>{const m=state.meds.find(x=>x.id===target.dataset.id);if(m?.photoId)deleteMedia(m.photoId);state.meds=state.meds.filter(x=>x.id!==target.dataset.id);save();closeModal();render();toast('Medicine deleted');});
  if(action==='add-note')noteModal();if(action==='edit-note')noteModal(target.dataset.id);if(action==='delete-note')confirmDelete('This note will be removed.',()=>{state.notes=state.notes.filter(x=>x.id!==target.dataset.id);save();closeModal();render();toast('Note deleted');});
  if(action==='add-appointment')appointmentModal();if(action==='edit-appointment')appointmentModal(target.dataset.id);if(action==='delete-appointment')confirmDelete('This appointment will be removed.',()=>{state.appointments=state.appointments.filter(x=>x.id!==target.dataset.id);save();closeModal();render();toast('Appointment deleted');});
  if(action==='close-modal')closeModal(); if(action==='confirm-delete')$('modal-root')._callback?.();
  if(action==='filter'){recordFilter=target.dataset.filter;renderRecords();}
  if(action==='export')exportBackup();if(action==='print')printReport();if(action==='install')install();if(action==='notifications')askNotifications();if(action==='share')shareApp();
  if(action==='remove-profile-photo'){if(state.profile.photoId)deleteMedia(state.profile.photoId);state.profile.photoId='';save();render();toast('Profile photo removed');}
  if(action==='theme'){state.theme=target.dataset.themeName;save();render();}
  if(action==='reset-layout'){state.layout=base.layout.map(x=>({...x}));save();render();toast('Layout reset');}
  if(action==='move-layout')updateLayout('move',Number(target.dataset.index),Number(target.dataset.dir));if(action==='size-layout')updateLayout('size',Number(target.dataset.index),Number(target.dataset.dir));
});
document.addEventListener('submit',e=>{if(e.target.id==='profile-form'){e.preventDefault();const o=formObject(e.target);state.profile={...state.profile,...o};save();render();toast('Profile saved');}if(e.target.dataset.form==='entry'){e.preventDefault();saveEntry(e.target);}if(e.target.dataset.form==='medicine'){e.preventDefault();saveMedicine(e.target);}if(e.target.dataset.form==='note'){e.preventDefault();const o=formObject(e.target),id=e.target.dataset.id,n={id:id||uid(),title:o.title,text:o.text,time:o.time||'',created:id?(state.notes.find(x=>x.id===id)?.created||new Date().toISOString()):new Date().toISOString()};if(id)state.notes[state.notes.findIndex(x=>x.id===id)]=n;else state.notes.unshift(n);save();closeModal();render();toast('Note saved');}if(e.target.dataset.form==='appointment'){e.preventDefault();const o=formObject(e.target),id=e.target.dataset.id,a={id:id||uid(),title:o.title,date:o.date,time:o.time||'',details:o.details||''};if(id)state.appointments[state.appointments.findIndex(x=>x.id===id)]=a;else state.appointments.unshift(a);save();closeModal();render();toast('Appointment saved');}});
$('search').addEventListener('input',()=>{if(activeView!=='records')showView('records');else renderRecords();});
$('import-file').addEventListener('change',e=>{if(e.target.files[0])importBackup(e.target.files[0]);e.target.value='';});
$('profile-gallery').addEventListener('change',e=>saveProfilePhoto(e.target.files[0]));$('profile-camera').addEventListener('change',e=>saveProfilePhoto(e.target.files[0]));
window.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});

if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
setTimeout(()=>{if(!$('app').classList.contains('hidden'))return;openApp();},1800);
render();
