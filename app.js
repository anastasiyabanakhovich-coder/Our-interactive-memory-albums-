'use strict';
const $=id=>document.getElementById(id), asset=n=>`assets/${String(n).padStart(2,'0')}.webp`;
const DEFAULT=[{id:'first',title:'Наш первый альбом',subtitle:'С самого начала — и навсегда ♡',pages:Array.from({length:11},(_,i)=>({id:'original-'+i,src:asset(i),hotspots:[]}))}];
const KEY='nasha-istoriya-v3-data';
let albums,activeId='first',position=-1,animating=false,sound=false,editorId='first',editPageIndex=null,drawRect=null,hotspotImageData='',editingHotspotId=null;
try{const stored=JSON.parse(localStorage.getItem(KEY));albums=Array.isArray(stored)&&stored.length?stored:structuredClone(DEFAULT)}catch{albums=structuredClone(DEFAULT)}
const current=()=>albums.find(a=>a.id===activeId)||albums[0];
const uid=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(albums));return true}catch(e){toast('Не удалось сохранить: память браузера заполнена. Экспортируй данные.');return false}};
const toast=t=>{const e=$('toast');e.textContent=t;e.classList.remove('hidden');setTimeout(()=>e.classList.add('hidden'),3600)};
function view(which){for(const id of ['readerView','libraryView','adminView'])$(id).classList.toggle('hidden',id!==which);window.scrollTo(0,0)}
function openAlbum(id){activeId=id;position=-1;view('readerView');$('albumTitle').textContent=current().title;$('subtitle').textContent=current().subtitle||'Наши любимые воспоминания';renderBook()}
function pageHTML(page,side){if(!page)return `<div class="page blank"></div>`;const hs=(page.hotspots||[]).map(h=>`<button class="hotspot" style="left:${h.x}%;top:${h.y}%;width:${h.w}%;height:${h.h}%" data-hotspot="${h.id}" title="${escapeHTML(h.label||'Сюрприз')}"></button>`).join('');return `<div class="page ${side}"><img src="${page.src}" alt="Страница альбома" draggable="false">${hs}</div>`}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function spreadHTML(pos){const p=current().pages;return `<div class="spread">${pageHTML(p[1+pos*2],'left')}${pageHTML(p[2+pos*2],'right')}<div class="spine"></div></div>`}
function renderBook(){const a=current(),b=$('book'),inner=$('bookInner');b.classList.toggle('closed',position<0);b.classList.toggle('open',position>=0);if(position<0){inner.innerHTML=`<img class="cover" src="${a.pages[0]?.src||''}" alt="Обложка альбома" title="Нажми, чтобы открыть">`;$('counter').textContent='Закрытая книга';$('nextBtn').textContent='Открыть альбом →';$('prevBtn').disabled=true}else{inner.innerHTML=spreadHTML(position);$('counter').textContent=`${Math.min(1+position*2,a.pages.length-1)}–${Math.min(2+position*2,a.pages.length-1)} / ${Math.max(0,a.pages.length-1)}`;$('nextBtn').textContent=(position+1)*2+1>=a.pages.length?'Закрыть книгу →':'Вперёд →';$('prevBtn').disabled=false} }
function rustle(){if(!sound)return;try{const ctx=new (window.AudioContext||window.webkitAudioContext)(),len=Math.round(ctx.sampleRate*.23),buf=ctx.createBuffer(1,len,ctx.sampleRate),data=buf.getChannelData(0);for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*Math.sin(Math.PI*i/len);const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();filter.type='bandpass';filter.frequency.value=1300;filter.Q.value=.7;gain.gain.value=.11;src.buffer=buf;src.connect(filter);filter.connect(gain);gain.connect(ctx.destination);src.start();src.onended=()=>ctx.close()}catch{}}
function flip(dir){
  if(animating)return;
  const p=current().pages;
  if(dir===1&&position<0){position=0;rustle();renderBook();return}
  if(dir===-1&&position===0){position=-1;rustle();renderBook();return}
  if(position<0)return;
  if(dir===1&&1+(position+1)*2>=p.length){position=-1;rustle();renderBook();return}
  if(dir===-1&&position<1)return;
  const from=position,to=position+dir,inner=$('bookInner');
  if(dir===1&&1+to*2>=p.length)return;
  animating=true;
  const oldLeft=p[1+from*2],oldRight=p[2+from*2];
  const newLeft=p[1+to*2],newRight=p[2+to*2];
  // Keep the page that is not moving intact until the sheet has crossed the spine.
  // The moving sheet hides the page underneath until the correct moment.
  inner.innerHTML=`<div class="spread">${pageHTML(dir===1?oldLeft:newLeft,'left')}${pageHTML(dir===1?newRight:oldRight,'right')}<div class="spine"></div></div>`;
  const sheet=document.createElement('div');
  sheet.className='turnsheet '+(dir===1?'forward':'backward');
  const front=dir===1?oldRight:oldLeft;
  const back=dir===1?newLeft:newRight;
  sheet.innerHTML=`<div class="face front">${front?`<img src="${front.src}" alt="">`:''}</div><div class="face back">${back?`<img src="${back.src}" alt="">`:''}</div>`;
  inner.append(sheet);
  rustle();
  let finished=false;
  const finish=()=>{if(finished)return;finished=true;position=to;animating=false;renderBook()};
  // After the sheet passes 90 degrees, its back covers the opposite page.
  // Only then replace that page, avoiding an early visible image jump.
  const midpoint=setTimeout(()=>{
    if(finished)return;
    const spread=inner.querySelector('.spread');
    if(!spread)return;
    const target=spread.querySelector(dir===1?'.page.left':'.page.right');
    if(target){const wrapper=document.createElement('div');wrapper.innerHTML=pageHTML(dir===1?newLeft:newRight,dir===1?'left':'right');target.replaceWith(wrapper.firstElementChild)}
  },440);
  sheet.addEventListener('animationend',()=>{clearTimeout(midpoint);finish()},{once:true});
  setTimeout(()=>{clearTimeout(midpoint);finish()},1100);
}
function showHotspot(id){const h=current().pages.flatMap(p=>p.hotspots||[]).find(h=>h.id===id);if(!h)return;$('modalTitle').textContent=h.label||'Для тебя ♡';$('modalBody').innerHTML=h.type==='image'&&h.image?`<img src="${h.image}" alt="Скрытое воспоминание">`:`<div class="letter">${escapeHTML(h.text||'♡')}</div>`;$('modal').classList.remove('hidden')}
$('bookInner').addEventListener('click',e=>{const hotspot=e.target.closest('[data-hotspot]');if(hotspot){showHotspot(hotspot.dataset.hotspot);return}if(position<0){flip(1);return}const rect=$('bookInner').getBoundingClientRect();flip(e.clientX-rect.left<rect.width*.5?-1:1)});
$('nextBtn').onclick=()=>flip(1);$('prevBtn').onclick=()=>flip(-1);
$('soundBtn').onclick=()=>{sound=!sound;$('soundBtn').textContent=`♪ Звук: ${sound?'вкл.':'выкл.'}`;if(sound)rustle()};
$('libraryBtn').onclick=()=>{renderLibrary();view('libraryView')};$('homeLink').onclick=e=>{e.preventDefault();openAlbum(activeId)};
$('adminBtn').onclick=()=>{renderAdmin();view('adminView')};$('exitAdmin').onclick=()=>openAlbum(activeId);
$('closeModal').onclick=()=>$('modal').classList.add('hidden');$('modal').onclick=e=>{if(e.target===$('modal'))$('modal').classList.add('hidden')};
document.addEventListener('keydown',e=>{if(!$('modal').classList.contains('hidden')){if(e.key==='Escape')$('modal').classList.add('hidden');return}if($('readerView').classList.contains('hidden')||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName))return;if(e.key==='ArrowRight')flip(1);if(e.key==='ArrowLeft')flip(-1)});
let touchX=0;$('stage').addEventListener('touchstart',e=>{touchX=e.changedTouches[0].screenX},{passive:true});$('stage').addEventListener('touchend',e=>{let dx=e.changedTouches[0].screenX-touchX;if(Math.abs(dx)>55)flip(dx<0?1:-1)},{passive:true});
function renderLibrary(){$('albumGrid').innerHTML=albums.map(a=>`<article class="album-card" data-album="${a.id}"><img src="${a.pages[0]?.src||''}" alt="Обложка"><h2>${escapeHTML(a.title)}</h2><p>${escapeHTML(a.subtitle||'Открыть воспоминания')}</p></article>`).join('');$('albumGrid').querySelectorAll('[data-album]').forEach(e=>e.onclick=()=>openAlbum(e.dataset.album))}
function renderAdmin(){if(!albums.find(a=>a.id===editorId))editorId=albums[0]?.id;$('adminAlbums').innerHTML=albums.map(a=>`<button class="album-choice ${a.id===editorId?'active':''}" data-id="${a.id}">${escapeHTML(a.title)} <small>(${a.pages.length})</small></button>`).join('');$('adminAlbums').querySelectorAll('button').forEach(b=>b.onclick=()=>{editorId=b.dataset.id;editPageIndex=null;renderAdmin()});const a=albums.find(a=>a.id===editorId);$('editorEmpty').classList.toggle('hidden',!!a);$('editorContent').classList.toggle('hidden',!a);if(!a)return;$('editTitle').value=a.title;$('editSubtitle').value=a.subtitle||'';renderPageList();$('hotspotEditor').classList.toggle('hidden',editPageIndex===null)}
function renderPageList(){const a=albums.find(a=>a.id===editorId);$('pageList').innerHTML=a.pages.map((p,i)=>`<div class="page-row"><img src="${p.src}" alt=""><div class="page-name">${i===0?'Обложка':`Страница ${i}`} <small>· ${(p.hotspots||[]).length} элементов</small></div><button class="mini" data-action="edit" data-index="${i}">✦</button><button class="mini" data-action="up" data-index="${i}" title="Вверх">↑</button><button class="mini" data-action="down" data-index="${i}" title="Вниз">↓</button><button class="mini" data-action="delete" data-index="${i}" title="Удалить">×</button></div>`).join('');$('pageList').querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.index),act=b.dataset.action;if(act==='edit'){editPageIndex=i;editingHotspotId=null;drawRect=null;hotspotImageData='';showHotspotEditor();return}if(act==='delete'){if(!confirm('Удалить эту страницу?'))return;a.pages.splice(i,1)}if(act==='up'&&i>0)[a.pages[i-1],a.pages[i]]=[a.pages[i],a.pages[i-1]];if(act==='down'&&i<a.pages.length-1)[a.pages[i+1],a.pages[i]]=[a.pages[i],a.pages[i+1]];save();renderAdmin()})}
$('newAlbum').onclick=()=>{const a={id:uid(),title:'Новый альбом',subtitle:'Наши воспоминания ♡',pages:[]};albums.push(a);editorId=a.id;editPageIndex=null;save();renderAdmin()};
$('saveAlbum').onclick=()=>{const a=albums.find(a=>a.id===editorId);a.title=$('editTitle').value.trim()||'Без названия';a.subtitle=$('editSubtitle').value.trim();save();renderAdmin();toast('Название сохранено')};
$('deleteAlbum').onclick=()=>{if(albums.length===1)return toast('Нельзя удалить последний альбом');if(!confirm('Удалить весь альбом со страницами?'))return;albums=albums.filter(a=>a.id!==editorId);editorId=albums[0].id;activeId=albums[0].id;editPageIndex=null;save();renderAdmin()};
const toDataURL=file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)});
async function compressed(file){const url=await toDataURL(file);return await new Promise(resolve=>{const im=new Image();im.onload=()=>{const scale=Math.min(1,1300/im.width,1800/im.height),c=document.createElement('canvas');c.width=Math.round(im.width*scale);c.height=Math.round(im.height*scale);c.getContext('2d').drawImage(im,0,0,c.width,c.height);resolve(c.toDataURL('image/webp',.84))};im.onerror=()=>resolve(url);im.src=url})}
$('uploadPages').onchange=async e=>{const files=[...e.target.files];if(!files.length)return;const a=albums.find(a=>a.id===editorId);for(const file of files){if(!file.type.startsWith('image/'))continue;const src=await compressed(file);a.pages.push({id:uid(),src,hotspots:[]})}save();renderAdmin();e.target.value='';toast('Страницы добавлены. Проверь их порядок.')};
function showHotspotEditor(){const a=albums.find(a=>a.id===editorId),p=a.pages[editPageIndex];if(!p)return;$('hotspotEditor').classList.remove('hidden');$('hotspotImage').src=p.src;$('hotspotRect').style.display='none';$('hotspotLabel').value='Открой письмо ♡';$('hotspotText').value='';$('hotspotType').value='text';$('hotspotFileName').textContent='';renderExisting();$('hotspotEditor').scrollIntoView({behavior:'smooth',block:'start'})}
function renderExisting(){const p=albums.find(a=>a.id===editorId).pages[editPageIndex];$('hotspotExisting').innerHTML=(p.hotspots||[]).map(h=>`<div class="existing-item"><span>${escapeHTML(h.label||'Сюрприз')}</span><div><button class="mini" data-h-edit="${h.id}">Изменить</button> <button class="mini" data-h-del="${h.id}">Удалить</button></div></div>`).join('');$('hotspotExisting').querySelectorAll('[data-h-edit]').forEach(b=>b.onclick=()=>{const h=p.hotspots.find(x=>x.id===b.dataset.hEdit);editingHotspotId=h.id;drawRect={x:h.x,y:h.y,w:h.w,h:h.h};hotspotImageData=h.image||'';$('hotspotLabel').value=h.label;$('hotspotType').value=h.type;$('hotspotText').value=h.text||'';showRect();toast('Измени поля и нажми «Сохранить элемент»')});$('hotspotExisting').querySelectorAll('[data-h-del]').forEach(b=>b.onclick=()=>{p.hotspots=p.hotspots.filter(h=>h.id!==b.dataset.hDel);save();renderExisting()})}
function showRect(){const r=$('hotspotRect');if(!drawRect){r.style.display='none';return}r.style.display='block';for(const k of ['x','y','w','h'])r.style[({x:'left',y:'top',w:'width',h:'height'})[k]]=drawRect[k]+'%'}
let start=null;const canvas=$('hotspotCanvas');function pt(e){const r=canvas.getBoundingClientRect();return{x:Math.max(0,Math.min(100,(e.clientX-r.left)/r.width*100)),y:Math.max(0,Math.min(100,(e.clientY-r.top)/r.height*100))}}canvas.addEventListener('pointerdown',e=>{start=pt(e);canvas.setPointerCapture(e.pointerId)});canvas.addEventListener('pointermove',e=>{if(!start)return;const end=pt(e);drawRect={x:Math.min(start.x,end.x),y:Math.min(start.y,end.y),w:Math.abs(start.x-end.x),h:Math.abs(start.y-end.y)};showRect()});canvas.addEventListener('pointerup',()=>{start=null});
$('hotspotFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;hotspotImageData=await compressed(file);$('hotspotFileName').textContent='Загружено: '+file.name};
$('saveHotspot').onclick=()=>{if(!drawRect||drawRect.w<2||drawRect.h<2)return toast('Сначала выдели область на странице');const p=albums.find(a=>a.id===editorId).pages[editPageIndex];p.hotspots=p.hotspots||[];const h={id:editingHotspotId||uid(),...drawRect,label:$('hotspotLabel').value.trim()||'Сюрприз ♡',type:$('hotspotType').value,text:$('hotspotText').value,image:hotspotImageData};if(h.type==='image'&&!h.image)return toast('Загрузи изображение для сюрприза');const i=p.hotspots.findIndex(x=>x.id===h.id);if(i>=0)p.hotspots[i]=h;else p.hotspots.push(h);save();editingHotspotId=null;drawRect=null;hotspotImageData='';showHotspotEditor();toast('Интерактивный элемент сохранён')};
$('cancelHotspot').onclick=()=>{editPageIndex=null;editingHotspotId=null;$('hotspotEditor').classList.add('hidden')};
$('exportBtn').onclick=()=>{const blob=new Blob([JSON.stringify({format:'nasha-istoriya-v3',albums},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='nasha-istoriya-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);toast('Резервная копия скачана')};
$('importInput').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const obj=JSON.parse(await file.text());if(!Array.isArray(obj.albums)||!obj.albums.every(a=>typeof a.title==='string'&&Array.isArray(a.pages)))throw Error('Неверный формат');if(!confirm('Заменить текущие альбомы данными из файла?'))return;albums=obj.albums;editorId=albums[0]?.id;activeId=editorId;editPageIndex=null;save();renderAdmin();toast('Данные импортированы')}catch(err){toast('Ошибка импорта: '+err.message)}e.target.value=''};
openAlbum(activeId);
