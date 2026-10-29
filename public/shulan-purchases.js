/* Shulan purchases: a simple historic supplier-invoice register. No inventory. */
const invUnits=['حبة','متر','متر مربع','لوح','كرتون','رول','علبة','كيس','طقم','كيلو','لتر','متر طولي','ورقة','أخرى'];
let invEditId=null,invExpandedId=null,invBusy=false;
function invRecords(){return Array.isArray(db.supplierInvoices)?db.supplierInvoices:(db.supplierInvoices=[]);}
function invTotal(x){return moneyRound((x.items||[]).reduce((sum,i)=>sum+Number(i.quantity||0)*Number(i.unitPrice||0),0));}
function invMoney(x,c){return currencyFmt(moneyRound(x))+' '+(c||'ر.ي');}
function invRow(item={}){
 const unit=item.unit||'حبة',other=!invUnits.includes(unit),chosen=other?'أخرى':unit;
 return '<div class="inv-item" data-inv-row>'+
 '<div><label>المادة *</label><input class="inv-name" maxlength="160" placeholder="مثلاً: لوح أكريلك" required value="'+safe(item.name||'')+'"></div>'+
 '<div><label>الوحدة</label><select class="inv-unit">'+invUnits.map(x=>'<option value="'+safe(x)+'"'+(x===chosen?' selected':'')+'>'+safe(x)+'</option>').join('')+'</select>'+
 '<input class="inv-unit-extra" maxlength="35" placeholder="الوحدة" value="'+(other?safe(unit):'')+'"'+(other?'':' hidden')+'></div>'+
 '<div><label>الكمية</label><input class="inv-qty" type="number" min="0.001" step="any" inputmode="decimal" required value="'+safe(item.quantity??1)+'"></div>'+
 '<div><label>سعر الوحدة</label><input class="inv-price" type="number" min="0" step="any" inputmode="decimal" required placeholder="0" value="'+safe(item.unitPrice??'')+'"></div>'+
 '<div><label>الإجمالي</label><output class="inv-line-total" dir="ltr">0</output></div>'+
 '<button class="inv-remove-item" type="button" data-inv-remove title="حذف المادة" aria-label="حذف المادة">×</button></div>';
}
function invRecalculate(){
 let sum=0;
 $$('#invItems [data-inv-row]').forEach(row=>{
  const qty=Number(row.querySelector('.inv-qty').value)||0,price=Number(row.querySelector('.inv-price').value)||0;
  const val=Number.isFinite(qty*price)?moneyRound(qty*price):0;
  row.querySelector('.inv-line-total').textContent=currencyFmt(val);
  sum+=val;
 });
 $('#invFormTotal').textContent=invMoney(sum,$('#invCurrency').value);
}
function invAddRow(item){
 $('#invItems').insertAdjacentHTML('beforeend',invRow(item));
 invRecalculate();
}
function invClose(){
 invEditId=null;invBusy=false;
 $('#invForm').reset();$('#invForm').hidden=true;
 $('#invDate').value=localToday();$('#invFormTitle').textContent='إضافة فاتورة شراء';
 $('#invSave').disabled=false;$('#invSave').textContent='حفظ الفاتورة';
 $('#invSaveState').textContent='';$('#invExistingAttachment').textContent='';
 $('#invItems').innerHTML='';invAddRow();
}
function invOpen(x){
 invClose();$('#invForm').hidden=false;
 if(x){
  invEditId=x.id;$('#invFormTitle').textContent='تعديل فاتورة شراء';
  $('#invSave').textContent='حفظ التعديل';$('#invSupplier').value=x.supplier;
  $('#invDate').value=x.date;$('#invNumber').value=x.number||'';
  $('#invCurrency').value=x.currency||'ر.ي';$('#invNote').value=x.note||'';
  $('#invItems').innerHTML='';(x.items||[]).forEach(invAddRow);
  if(!x.items?.length)invAddRow();
  if(x.attachment?.name)$('#invExistingAttachment').textContent='المرفق المحفوظ: '+x.attachment.name+' · اختيار ملف آخر يستبدله هنا.';
 }
 invRecalculate();
 $('#invForm').scrollIntoView({behavior:'smooth',block:'start'});
}
function invCollectItems(){
 const items=[];
 for(const row of $$('#invItems [data-inv-row]')){
  const name=row.querySelector('.inv-name').value.trim();
  const selected=row.querySelector('.inv-unit').value;
  const unit=selected==='أخرى'?row.querySelector('.inv-unit-extra').value.trim():selected;
  const quantity=Number(row.querySelector('.inv-qty').value);
  const unitPrice=Number(row.querySelector('.inv-price').value);
  if(!name||!unit||!Number.isFinite(quantity)||quantity<=0||quantity>10000000||
    !Number.isFinite(unitPrice)||unitPrice<0||unitPrice>1000000000000||
    !Number.isFinite(quantity*unitPrice)||quantity*unitPrice>1000000000000)
    throw Error('راجع اسم المادة والوحدة والكمية والسعر في جميع المواد.');
  items.push({name,unit,quantity,unitPrice:moneyRound(unitPrice)});
 }
 if(!items.length)throw Error('أضف مادة واحدة على الأقل.');
 return items;
}
function invCheckFile(file){
 const ext=(file.name.split('.').pop()||'').toLowerCase();
 const allowed={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','application/pdf':'pdf'};
 const extTypes={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',pdf:'application/pdf'};
 const type=allowed[file.type]&&extTypes[ext]===file.type?file.type:(!file.type?extTypes[ext]:null);
 if(!allowed[type]||file.size<1||file.size>10485760)throw Error('المرفق يجب أن يكون JPG أو PNG أو WebP أو PDF بحجم 10 ميجابايت كحد أقصى.');
 return {type,ext:allowed[type]};
}
async function invSaveForm(event){
 event.preventDefault();
 if(invBusy)return;
 if(!cloudReady||!cloudCurrentUserId||!cloudApi){alertToast('سجّل الدخول وانتظر الاتصال بالسحابة أولًا.');return;}
 try{
  const supplier=$('#invSupplier').value.trim(),date=$('#invDate').value;
  if(!supplier||!tpValidateDate(date))throw Error('أدخل اسم المورد وتاريخ الشراء الصحيح.');
  const items=invCollectItems(),currency=$('#invCurrency').value;
  if(!['ر.ي','ر.س','$'].includes(currency))throw Error('اختر العملة الصحيحة.');
  const previous=invRecords().find(x=>x.id===invEditId),id=previous?.id||uid();
  const file=$('#invFile').files?.[0]||null,validFile=file?invCheckFile(file):null;
  invBusy=true;$('#invSave').disabled=true;
  $('#invSaveState').textContent=file?'جارٍ رفع نسخة الفاتورة…':'جارٍ حفظ الفاتورة…';
  let attachment=previous?.attachment||null;
  if(file){
   const path=cloudCurrentUserId+'/'+id+'/'+uid()+'.'+validFile.ext;
   const {data,error}=await cloudApi.storage.from('shulan-supplier-invoices').upload(path,file,{upsert:false,contentType:validFile.type,cacheControl:'3600'});
   if(error)throw Error('تعذر رفع ملف الفاتورة: '+error.message);
   attachment={path:data?.path||path,name:file.name.slice(0,140),type:validFile.type,size:file.size};
  }
  const now=new Date().toISOString();
  const record={id,supplier,date,number:$('#invNumber').value.trim(),currency,
    items,note:$('#invNote').value.trim(),attachment,createdAt:previous?.createdAt||now,updatedAt:now};
  if(previous)Object.assign(previous,record);else invRecords().push(record);
  save();invClose();renderPurchases();alertToast('سُجلت فاتورة المشتريات، جارٍ مزامنتها مع Supabase.');
 }catch(err){
  $('#invSaveState').textContent=err.message||'تعذّر الحفظ';
  alertToast(err.message||'تعذّر الحفظ.');
 }finally{invBusy=false;$('#invSave').disabled=false;}
}
function invFiltered(){
 const query=$('#invSearch').value.trim().toLocaleLowerCase('ar'),from=$('#invFrom').value,to=$('#invTo').value;
 return invRecords().filter(x=>(!from||x.date>=from)&&(!to||x.date<=to)&&(!query||
   [x.supplier,x.number,x.note,...(x.items||[]).map(i=>i.name)].some(v=>String(v||'').toLocaleLowerCase('ar').includes(query))))
 .slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.id).localeCompare(String(a.id)));
}
function invDetails(x){
 return '<div class="inv-card-details"'+(invExpandedId===x.id?'':' hidden')+'><table><thead><tr>'+
 '<th>المادة</th><th>الكمية</th><th>الوحدة</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>'+
 (x.items||[]).map(i=>'<tr><td>'+safe(i.name)+'</td><td>'+safe(currencyFmt(i.quantity))+'</td><td>'+safe(i.unit)+'</td><td>'+safe(currencyFmt(i.unitPrice))+'</td><td>'+safe(invMoney(i.quantity*i.unitPrice,x.currency))+'</td></tr>').join('')+
 '</tbody></table>'+(x.note?'<p>'+safe(x.note)+'</p>':'')+
 (x.attachment?.path?'<button type="button" class="inv-file-link" data-inv-action="file" data-id="'+safe(x.id)+'">▧ فتح صورة أو PDF الفاتورة</button>':'<p>لا توجد صورة مرفقة.</p>')+
 '<p>الإجمالي: <strong>'+safe(invMoney(invTotal(x),x.currency))+'</strong></p></div>';
}
function renderPurchases(){
 const suppliers=[...new Set(invRecords().map(x=>x.supplier).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar'));
 $('#invSupplierChoices').innerHTML=suppliers.map(x=>'<option value="'+safe(x)+'"></option>').join('');
 const list=invFiltered(),totals={};
 list.forEach(x=>{totals[x.currency]=(totals[x.currency]||0)+invTotal(x);});
 $('#invSummary').innerHTML='<div class="inv-summary-pill">الفواتير <strong>'+fmtNum(list.length)+'</strong></div>'+
 Object.entries(totals).map(([k,v])=>'<div class="inv-summary-pill">'+safe(k)+' <strong>'+safe(currencyFmt(v))+'</strong></div>').join('');
 $('#invList').innerHTML=list.length?list.map(x=>
 '<article class="inv-card"><div class="inv-card-top"><div class="inv-card-title"><strong>'+safe(x.supplier)+'</strong><small>'+
 safe(x.date)+(x.number?' · رقم '+safe(x.number):'')+' · '+fmtNum(x.items?.length||0)+' مواد'+(x.attachment?.path?' · ▧ مرفق':'')+'</small></div>'+
 '<div class="inv-card-money"><strong>'+safe(invMoney(invTotal(x),x.currency))+'</strong><small>قيمة الشراء</small></div>'+
 '<div class="inv-card-actions"><button type="button" data-inv-action="details" data-id="'+safe(x.id)+'" aria-expanded="'+(invExpandedId===x.id)+'">'+(invExpandedId===x.id?'إغلاق':'التفاصيل')+'</button>'+
 '<button type="button" data-inv-action="edit" data-id="'+safe(x.id)+'">تعديل</button>'+
 '<button type="button" class="danger" data-inv-action="delete" data-id="'+safe(x.id)+'">حذف</button></div></div>'+invDetails(x)+'</article>').join(''):
 '<div class="inv-empty">لا توجد فواتير مطابقة للبحث. أضف أول فاتورة من الأعلى.</div>';
}
async function invViewFile(x){
 if(!x?.attachment?.path||!cloudReady||!cloudCurrentUserId)return;
 if(!x.attachment.path.startsWith(cloudCurrentUserId+'/')){alertToast('هذا المرفق يعود إلى حساب آخر.');return;}
 const tab=window.open('about:blank','_blank');
 if(tab)tab.opener=null;
 const {data,error}=await cloudApi.storage.from('shulan-supplier-invoices').createSignedUrl(x.attachment.path,120);
 if(error||!data?.signedUrl){if(tab)tab.close();alertToast('تعذر فتح المرفق: '+(error?.message||'الرابط غير متوفر'));return;}
 if(tab)tab.location.href=data.signedUrl;
 else alertToast('اسمح بفتح النوافذ المنبثقة ثم أعد المحاولة.');
}
function invInitialize(){
 $('#invDate').value=localToday();
 $('#invNew').onclick=()=>invOpen(null);
 $('#invCancel').onclick=invClose;$('#invFormClose').onclick=invClose;
 $('#invAddItem').onclick=()=>invAddRow();
 $('#invForm').addEventListener('submit',invSaveForm);
 $('#invCurrency').addEventListener('change',invRecalculate);
 $('#invItems').addEventListener('input',invRecalculate);
 $('#invItems').addEventListener('change',e=>{
  const el=e.target.closest('.inv-unit');
  if(!el)return;
  const custom=el.closest('[data-inv-row]').querySelector('.inv-unit-extra');
  custom.hidden=el.value!=='أخرى';custom.required=!custom.hidden;
  if(!custom.hidden)custom.focus();
 });
 $('#invItems').addEventListener('click',e=>{
  const btn=e.target.closest('[data-inv-remove]');if(!btn)return;
  btn.closest('[data-inv-row]').remove();
  if(!$('#invItems [data-inv-row]'))invAddRow();
  invRecalculate();
 });
 for(const id of ['invSearch','invFrom','invTo'])$('#'+id).addEventListener('input',renderPurchases);
 $('#invList').addEventListener('click',async e=>{
  const btn=e.target.closest('[data-inv-action]');if(!btn)return;
  const x=invRecords().find(p=>p.id===btn.dataset.id);if(!x)return;
  if(btn.dataset.invAction==='details'){invExpandedId=invExpandedId===x.id?null:x.id;renderPurchases();}
  else if(btn.dataset.invAction==='edit')invOpen(x);
  else if(btn.dataset.invAction==='file')await invViewFile(x);
  else if(btn.dataset.invAction==='delete'){
   if(!cloudReady){alertToast('انتظر الاتصال بالسحابة.');return;}
   if(!confirm('حذف فاتورة المورد «'+x.supplier+'» من السجل؟'))return;
   db.supplierInvoices=invRecords().filter(p=>p.id!==x.id);
   if(invEditId===x.id)invClose();
   if(invExpandedId===x.id)invExpandedId=null;
   save();renderPurchases();alertToast('حُذفت الفاتورة من سجل المشتريات.');
  }
 });
 invClose();renderPurchases();
 if(new URLSearchParams(location.search).get('view')==='purchases')page('purchases');
}
invInitialize();
