import { EVENTS, EVENT_IDS, DIARY_SYMPTOMS, STANDARD, ENGINE_VERSION, SOURCE_INDEX, PRO_SOURCE, choose, pair, emptyInputs, sourceLink } from './rules.mjs';
import { assess, blankObservation, blankCase, importCase, exportJSON, exportCSV, exportDiaryCSV, timeline, MAX_OBSERVATIONS, MAX_DIARY, MAX_IMPORT_BYTES } from './engine.mjs';
import { EXAMPLES, loadExample } from './examples.mjs';

let data=loadExample('nadir');
let selected=EXAMPLES.nadir.selected;
let lang='en';
let view='assessment';
let dirty=false;
let diaryDraft={day:15,symptom:'fatigue',intensity:5,interference:3};
let toastTimer;
const $=selector=>document.querySelector(selector);
const t=(en,zh)=>lang==='zh'?zh:en;
const tr=obj=>choose(obj,lang);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const value=v=>v===null?'':esc(v);
const current=()=>data.observations.find(o=>o.id===selected)??data.observations[0];
const nextId=arr=>Math.max(0,...arr.map(x=>x.id))+1;
const gradeClass=r=>r.status==='graded'?`grade-${r.grade}`:r.status==='none'?'grade-none':'grade-review';
const statusText=r=>r.status==='graded'?`${t('Grade','级别')} ${r.grade}`:r.status==='none'?t('No criterion met','未符合标准'):r.status==='incomplete'?t('Incomplete','信息不完整'):r.status==='invalid'?t('Check inputs','检查输入'):t('Review needed','需要复核');
function evaluated(o) {
  if(!Number.isInteger(o.day)||o.day< -3650||o.day>36500||!Number.isInteger(o.cycle)||o.cycle<1||o.cycle>200)return {status:'invalid',grade:null,minimumGrade:null,reasons:[pair('Enter a valid integer study day and cycle.','请输入有效的整数研究日和周期。')],missing:[]};
  return assess(o);
}
const badge=r=>`<span class="grade-badge ${gradeClass(r)}">${esc(statusText(r))}${r.minimumGrade?` <small>≥G${r.minimumGrade}</small>`:''}</span>`;
function notify(en,zh) { clearTimeout(toastTimer);$('#notice').textContent=t(en,zh??en);toastTimer=setTimeout(()=>$('#notice').textContent='',6500); }
function option(val,label,selectedValue) {return `<option value="${esc(val)}" ${val===selectedValue?'selected':''}>${esc(label)}</option>`;}
function eventOptions(id) {return EVENT_IDS.map(x=>option(x,tr(EVENTS[x].label),id)).join('');}
function frame() {
  document.documentElement.lang=lang==='zh'?'zh-CN':'en';
  document.title=t('Oncology Toxicity Workbench','肿瘤毒性评估工作台');
  $('#app').innerHTML=`
    <aside class="sidebar">
      <a class="brand" href="./" aria-label="${t('Oncology Toxicity Workbench home','肿瘤毒性评估工作台主页')}"><img src="./icon.svg" width="41" height="41" alt=""><span>ONCOLOGY<small>RESEARCH WORKBENCH</small></span></a>
      <div class="sidebar-section">${t('TOXICITY TOOLKIT','毒性评估工具')}</div>
      <nav aria-label="${t('Main navigation','主导航')}">
        ${[['assessment','◫',t('Assessments','评估工作台')],['timeline','⌁',t('Timeline','时间线')],['diary','▤',t('Symptom diary','症状日记')],['methods','⊙',t('Methods & sources','方法与来源')]].map(([id,icon,label])=>`<button class="nav-button ${view===id?'active':''}" data-view="${id}" aria-current="${view===id?'page':'false'}" title="${label}"><span aria-hidden="true">${icon}</span>${label}</button>`).join('')}
      </nav>
      <div class="sidebar-bottom"><span class="local-dot"></span>${t('Stays in your browser','数据仅在浏览器内处理')}<p>${t('Synthetic cases. No account, API key, or database.','仅使用模拟案例。无账号、API 密钥或数据库。')}</p><div class="sidebar-version">CTCAE v6.0 · ENGINE ${ENGINE_VERSION}</div></div>
    </aside>
    <div class="shell">
      <header class="topbar"><div class="breadcrumb">${t('Oncology tools','肿瘤研究工具')}<span>/ ${t('Toxicity workbench','毒性评估工作台')}</span></div><div><span class="session-pill">${t('SYNTHETIC CASE','模拟案例')}</span><button id="language" class="language-button" aria-label="${t('Switch to Chinese','Switch to English')}">${t('中文 / EN','EN / 中文')}</button></div></header>
      <main id="main" tabindex="-1">
        <div class="hero"><div><p class="overline">${t('SEVERITY, WITH CONTEXT','让严重程度有据可查')} · CTCAE v6.0</p><h1>${t('Toxicity workbench','肿瘤毒性评估工作台')}</h1><p class="subtitle">${t('Follow the trajectory. Understand the grade. Keep the evidence visible.','跟踪变化轨迹，理解分级依据，让证据始终可见。')}</p></div><button class="primary" data-action="add">＋ ${t('Add assessment','添加评估')}</button></div>
        <p class="scope-note"><span aria-hidden="true">i</span>${t('Educational prototype · selected adult criteria · synthetic data only · clinician confirmation required.','教学原型 · 部分成人标准 · 仅限模拟数据 · 需临床人员确认。')}</p>
        <div class="toolbar"><div class="example-control"><label class="sr-only" for="scenario">${t('Teaching case','教学案例')}</label><select id="scenario">${Object.entries(EXAMPLES).map(([id,e])=>option(id,tr(e.label),data.scenario)).join('')}${option('custom',t('Custom synthetic case','自定义模拟案例'),data.scenario)}</select><button class="secondary" data-action="load">${t('Load case','载入案例')}</button></div><div class="export-controls"><button class="text-button" data-action="import">↑ ${t('Import JSON','导入 JSON')}</button><button class="text-button" data-action="json">↓ JSON</button><button class="text-button" data-action="csv">↓ CSV</button><button class="text-button" data-action="print">${t('Print report','打印报告')} ↗</button></div></div>
        <div id="content"></div>
        <footer><div>${t('Study days, not dates. No identifying fields. Session clears on reload; export JSON to keep your work.','使用研究日而非日期，无身份信息字段。刷新即清空本次修改；请导出 JSON 保存。')}</div><a href="https://github.com/ysm19990103/oncology-toxicity-workbench" target="_blank" rel="noreferrer">${t('Source code','源代码')} ↗</a></footer>
      </main>
    </div>`;
  renderContent();
}
function renderContent() {
  if(view==='assessment') renderAssessment();
  if(view==='timeline') renderTimeline();
  if(view==='diary') renderDiary();
  if(view==='methods') renderMethods();
}
function chartMarkup() {
  const o=current();
  const points=timeline(data,o.event).filter(p=>Number.isInteger(p.day));
  const W=690,H=245,L=45,R=25,T=22,B=37;
  const ceiling=EVENTS[o.event].maxGrade;
  const min=Math.min(...points.map(p=>p.day),0),max=Math.max(...points.map(p=>p.day),1);
  const x=day=>L+(day-min)/(max-min)*(W-L-R);
  const y=g=>T+(ceiling-g)/ceiling*(H-T-B);
  let previous=null;
  let paths='';
  let marks='';
  for(const p of points) {
    const r=evaluated(p),valid=['graded','none'].includes(r.status),rank=r.grade??0;
    if(valid&&previous) paths+=`<line class="trajectory-line" x1="${x(previous.day)}" y1="${y(previous.rank)}" x2="${x(p.day)}" y2="${y(rank)}"/>`;
    previous=valid?{day:p.day,rank}:null;
    const title=esc(`${t('Day','研究日')} ${p.day}: ${statusText(r)}`);
    marks+=valid?`<circle class="plot-point ${gradeClass(r)} ${p.id===o.id?'selected-point':''}" cx="${x(p.day)}" cy="${y(rank)}" r="${p.id===o.id?7:5}"><title>${title}</title></circle>`:`<text class="review-point" x="${x(p.day)}" y="${y(0)+5}" text-anchor="middle"><title>${title}</title>?</text>`;
  }
  const ticks=[...new Set([min,...points.map(p=>p.day),max])];
  const sparse=ticks.length<=8?ticks:ticks.filter((_,i)=>i%Math.ceil(ticks.length/7)===0||i===ticks.length-1);
  return `<div class="section-heading"><div><p class="overline">${t('EVENT TRAJECTORY','事件轨迹')}</p><h2>${esc(tr(EVENTS[o.event].short))}</h2></div><span class="mini-tag">${points.length} ${t('observations','次观察')} · ${t('study day','研究日')}</span></div>
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="plot-title plot-desc"><title id="plot-title">${esc(tr(EVENTS[o.event].label))}: ${t('grade trajectory','分级轨迹')}</title><desc id="plot-desc">${t('Grades across study days. A dash means no supported criterion, not grade zero. Question marks show incomplete or review states. The table provides every value.','研究日的分级变化。横杠表示未符合标准，而非0级。问号表示信息不完整或需复核。下表提供全部数值。')}</desc>
      ${Array.from({length:ceiling+1},(_,g)=>g).map(g=>`<line class="gridline" x1="${L}" x2="${W-R}" y1="${y(g)}" y2="${y(g)}"/><text class="axis-text" x="${L-15}" y="${y(g)+4}" text-anchor="end">${g?'G'+g:'—'}</text>`).join('')}
      ${paths}${marks}${sparse.map(d=>`<text class="axis-text" x="${x(d)}" y="${H-10}" text-anchor="middle">${d}</text>`).join('')}
    </svg><div class="chart-legend"><span><i class="dot"></i>${t('Matched grade','符合的级别')}</span><span>— ${t('No criterion met','未符合标准')}</span><span>? ${t('Review / incomplete','复核 / 缺失')}</span></div><p class="caption">${t('Connecting lines guide the eye; grades are ordinal, not continuous measurements.','连线仅帮助观察变化；分级为有序类别，并非连续测量。')}</p>`;
}
function resultMarkup() {
  const o=current(),r=evaluated(o),e=EVENTS[o.event];
  const display=r.status==='graded'?`G${r.grade}`:r.status==='none'?'—':t('Review','待复核');
  const all=data.observations.map(evaluated);
  const known=all.filter(x=>x.status==='graded');
  const peak=known.length?Math.max(...known.map(x=>x.grade)):null;
  return `<p class="overline">${t('SELECTED ASSESSMENT','当前选中评估')}</p><div class="large-status">${display}</div><h2>${esc(statusText(r))}</h2><p class="assessment-event">${esc(tr(e.label))}</p><div class="assessment-stats"><div><span>${t('Study day','研究日')}</span><strong>${value(o.day)||'—'}</strong></div><div><span>${t('Cycle','周期')}</span><strong>${value(o.cycle)||'—'}</strong></div></div>${r.minimumGrade?`<p class="minimum-grade">${t('Known criteria support at least','已知标准至少支持')} <strong>G${r.minimumGrade}</strong></p>`:''}<div class="assessment-footnote">${t('Highest known grade in this case','本案例已知最高级别')}: ${peak?'G'+peak:'—'}<br>${t('Severity is not causality or treatment advice.','严重程度不等于因果关系或治疗建议。')}</div>`;
}
function reasonMarkup() {
  const o=current(),r=evaluated(o),e=EVENTS[o.event];
  return `<h3>${t('Why this result?','分级依据')}</h3><ul>${r.reasons.map(text=>`<li>${esc(tr(text))}</li>`).join('')}${r.missing.length?`<li><strong>${t('Complete','请补充')}:</strong> ${r.missing.map(k=>esc(tr(e.fields.find(f=>f.key===k).label))).join(' · ')}</li>`:''}</ul><p class="caption">${esc(tr(e.note))} <a href="${sourceLink(o.event)}" target="_blank" rel="noreferrer">NCI CTCAE v6.0 · ${t('p.','第')}${e.page}${t('','页')} ↗</a></p>`;
}
function metricsMarkup() {
  const all=data.observations.map(evaluated);
  return [[data.observations.length,t('Assessments','评估次数')],[new Set(data.observations.map(o=>o.event)).size,t('Event types','事件类型')],[all.filter(r=>r.grade>=3).length,t('Known grade ≥3','已知级别 ≥3')],[all.filter(r=>!['graded','none'].includes(r.status)).length,t('Need completion / review','需补充 / 复核')]].map(([v,label])=>`<div class="metric"><span>${label}</span><strong>${v}</strong></div>`).join('');
}
function fieldMarkup(f,i) {
  const id='input-'+f.key;
  let control;
  if(f.type==='number')control=`<input id="${id}" data-input="${f.key}" type="number" min="${f.min}" max="${f.max}" step="${f.integer?'1':'any'}" value="${value(i[f.key])}" placeholder="${t('Not entered','未输入')}" inputmode="decimal">`;
  else if(f.type==='flag')control=`<select id="${id}" data-input="${f.key}">${option('',t('Unknown / not assessed','未知 / 未评估'),i[f.key]===null?'':String(i[f.key]))}${option('false',t('No','否'),String(i[f.key]))}${option('true',t('Yes','是'),String(i[f.key]))}</select>`;
  else control=`<select id="${id}" data-input="${f.key}">${option('',t('Unknown / not assessed','未知 / 未评估'),i[f.key]??'')}${f.options.map(v=>option(v.value,tr(v.label),i[f.key])).join('')}</select>`;
  return `<label class="input-field ${f.type==='number'?'numeric':'wide'}" for="${id}"><span>${esc(tr(f.label))}</span>${control}</label>`;
}
function editorMarkup() {
  const o=current(),e=EVENTS[o.event];
  return `<div class="section-heading"><div><p class="overline">${t('INPUT & CLINICAL CONTEXT','输入与临床背景')}</p><h2>${t('Assessment','评估')} ${o.id.toString().padStart(2,'0')}</h2></div><button class="text-button danger" data-action="delete" ${data.observations.length<=1?'disabled':''}>${t('Remove','移除')}</button></div>
    <div class="context-grid"><label class="input-field event-field" for="event"><span>${t('CTCAE event','CTCAE 事件')}</span><select id="event">${eventOptions(o.event)}</select></label><label class="input-field" for="day"><span>${t('Study day','研究日')}</span><input id="day" data-meta="day" type="number" step="1" min="-3650" max="36500" value="${value(o.day)}"></label><label class="input-field" for="cycle"><span>${t('Cycle','周期')}</span><input id="cycle" data-meta="cycle" type="number" step="1" min="1" max="200" value="${value(o.cycle)}"></label></div>
    <p class="unit-note">${esc(tr(e.unit))} <span>· ${t('Blank is unknown, never zero or no.','空白表示未知，不等于零或否。')}</span></p>
    <div class="input-grid">${e.fields.map(f=>fieldMarkup(f,o.inputs)).join('')}</div>
    ${e.kind==='symptom'?`<p class="caption">${t('Instrumental activities: cooking, shopping, managing money. Self-care: bathing, dressing, eating, toileting, taking medication. Use clinician assessment; all interventions must relate to this event.','工具性活动：做饭、购物、理财。自理活动：洗浴、穿衣、进食、如厕、服药。依据临床评估，所有干预必须与本事件有关。')}</p>`:''}
    <details class="rule-details"><summary>${t('Show the implemented rule','查看实现的规则')}</summary><p>${esc(tr(e.summary))}</p><a href="${sourceLink(o.event)}" target="_blank" rel="noreferrer">${t('Read the original NCI criteria','阅读 NCI 原始标准')} ↗</a></details>`;
}
function historyMarkup(showAll=false) {
  const rows=timeline(data,showAll?null:current().event);
  return `<div class="section-heading"><h2>${showAll?t('All assessments','全部评估'):t('Event history','当前事件记录')}</h2><span class="mini-tag">${t('Select a row to edit','选择一行即可编辑')}</span></div><div class="table-wrap"><table><thead><tr><th>${t('Day / cycle','研究日 / 周期')}</th><th>${t('Event','事件')}</th><th>${t('Result / criterion','结果 / 标准')}</th><th>${t('Assessment','评估')}</th><th></th></tr></thead><tbody>${rows.map(o=>`<tr class="${selected===o.id?'selected-row':''}"><td><strong>${value(o.day)||'—'}</strong><small class="sub-cell">${t('Cycle','周期')} ${value(o.cycle)||'—'}</small></td><td>${esc(tr(EVENTS[o.event].short))}</td><td>${summaryInput(o)}</td><td>${badge(evaluated(o))}</td><td><button class="text-button" data-select="${o.id}" aria-label="${t('Edit assessment','编辑评估')} ${o.id}">${t('Edit','编辑')} ↗</button></td></tr>`).join('')}</tbody></table></div>`;
}
function summaryInput(o) {
  const i=o.inputs;
  if(EVENTS[o.event].kind==='lab')return i.value===null?'—':`${esc(i.value)} <small>${o.event==='anc'?(i.unit==='10^9/L'?'×10⁹/L':i.unit==='cells/uL'?'cells/µL':'?'):o.event==='anemia'?esc(i.unit??'?'):['alt','ast'].includes(o.event)?'U/L':t('lab units','实验室单位')}</small>`;
  if(o.event==='diarrhea')return i.stools===null?'—':`+${i.stools} ${t('stools/day','次/日')}`;
  const key=o.event==='nausea'?'intake':'severity';
  return esc(tr(EVENTS[o.event].fields.find(f=>f.key===key).options.find(x=>x.value===i[key])?.label??pair('Unknown','未知')));
}
function renderAssessment() {
  const r=evaluated(current());
  $('#content').innerHTML=`<section class="overview"><div id="trajectory" class="panel chart-panel">${chartMarkup()}</div><aside id="result" class="assessment-panel ${gradeClass(r)}" aria-live="polite" aria-atomic="true">${resultMarkup()}</aside></section><section id="metrics" class="metric-row" aria-label="${t('Case summary','案例概览')}">${metricsMarkup()}</section><section id="reasons" class="reason-panel">${reasonMarkup()}</section><section id="editor" class="panel editor">${editorMarkup()}</section><section id="history" class="panel history-panel">${historyMarkup()}</section><div class="lesson"><span>${t('TEACHING NOTE','教学提示')}</span><p>${esc(tr(EXAMPLES[data.scenario]?.lesson??pair('Use only synthetic inputs. Export JSON before refreshing to keep this case.','仅使用模拟输入。刷新前导出 JSON 以保存案例。')))}</p></div>`;
}
function updateResults() {
  if(view!=='assessment')return;
  const r=evaluated(current());
  $('#trajectory').innerHTML=chartMarkup();
  $('#result').className=`assessment-panel ${gradeClass(r)}`;
  $('#result').innerHTML=resultMarkup();
  $('#metrics').innerHTML=metricsMarkup();
  $('#reasons').innerHTML=reasonMarkup();
  $('#history').innerHTML=historyMarkup();
}
function renderTimeline() {
  const days=[...new Set(data.observations.map(o=>o.day).filter(Number.isInteger))].sort((a,b)=>a-b);
  const events=[...new Set(data.observations.map(o=>o.event))];
  $('#content').innerHTML=`<section class="panel"><div class="section-heading"><div><p class="overline">${t('A VIEW ACROSS EVENTS','跨事件观察')}</p><h2>${t('Severity over study days','各研究日的严重程度')}</h2></div><span class="mini-tag">${t('Independent event grades','各事件独立分级')}</span></div><p class="caption">${t('Each cell is an observation, not an overall toxicity score. Multiple observations on the same day remain separate. Unobserved days are blank.','每个单元表示一次观察，而非总体毒性评分。同日多次观察分别显示。未观察的日期留空。')}</p><div class="table-wrap heatmap"><table><thead><tr><th>${t('Event / study day','事件 / 研究日')}</th>${days.map(d=>`<th>${d}</th>`).join('')}</tr></thead><tbody>${events.map(e=>`<tr><th>${esc(tr(EVENTS[e].short))}</th>${days.map(day=>`<td>${data.observations.filter(o=>o.event===e&&o.day===day).map(o=>{const r=evaluated(o);return `<button data-select="${o.id}" class="heat-cell ${gradeClass(r)}" title="${esc(tr(EVENTS[e].label))} · ${statusText(r)}" aria-label="${t('Edit assessment','编辑评估')} ${o.id}: ${esc(statusText(r))}">${r.grade?'G'+r.grade:r.status==='none'?'—':'?'}</button>`;}).join('')}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="caption">${t('— No implemented criterion met · ? Incomplete / review · blank Not observed. Grades are never added together.','— 未符合已实现标准 · ? 缺失/需复核 · 空白 未观察。不同事件的级别不相加。')}</p></section><section class="panel history-panel">${historyMarkup(true)}</section>`;
}
function diaryRows() {
  return data.diary.toSorted((a,b)=>a.day-b.day||a.id-b.id).map(d=>`<tr><td>${d.day}</td><td>${esc(tr(DIARY_SYMPTOMS[d.symptom]))}</td><td>${d.intensity} / 10</td><td>${d.interference} / 10</td><td><button class="text-button danger" data-delete-diary="${d.id}" aria-label="${t('Remove diary entry','移除日记条目')} ${d.id}">${t('Remove','移除')}</button></td></tr>`).join('');
}
function renderDiary() {
  $('#content').innerHTML=`<section class="panel diary-intro"><p class="overline">${t('A SEPARATE PERSPECTIVE','独立的体验记录')}</p><h2>${t('Symptom diary','症状日记')}</h2><p>${t('Explore a fictional person’s symptom intensity and interference during one study day. These custom 0–10 scores never enter the CTCAE engine.','记录虚构对象某研究日的症状强度与生活影响。这些自定义0–10分评分不会用于 CTCAE 引擎。')}</p><div class="diary-label">${t('Custom educational diary · not the validated PRO-CTCAE instrument','自定义教学日记 · 非经验证的 PRO-CTCAE 量表')}</div><p class="caption">${t('NCI PRO-CTCAE complements clinician CTCAE assessments. Use the official instrument and validated translations when a study requires PRO-CTCAE.','NCI PRO-CTCAE 是临床 CTCAE 评估的补充。研究需要 PRO-CTCAE 时，请使用官方量表及经过验证的译本。')} <a href="${PRO_SOURCE}" target="_blank" rel="noreferrer">${t('NCI overview','NCI 概述')} ↗</a></p></section>
    <section class="panel editor"><h2>${t('Add a synthetic entry','添加模拟条目')}</h2><div class="diary-form"><label class="input-field"><span>${t('Study day','研究日')}</span><input id="diary-day" data-diary="day" type="number" min="-3650" max="36500" step="1" value="${value(diaryDraft.day)}"></label><label class="input-field"><span>${t('Symptom','症状')}</span><select id="diary-symptom" data-diary="symptom">${Object.entries(DIARY_SYMPTOMS).map(([id,l])=>option(id,tr(l),diaryDraft.symptom)).join('')}</select></label><label class="input-field"><span>${t('Intensity: 0 none → 10 worst imaginable','强度：0无 → 10可想象的最强')}</span><input id="diary-intensity" data-diary="intensity" type="number" min="0" max="10" step="1" value="${value(diaryDraft.intensity)}"></label><label class="input-field"><span>${t('Interference: 0 none → 10 complete','影响：0无 → 10完全受限')}</span><input id="diary-interference" data-diary="interference" type="number" min="0" max="10" step="1" value="${value(diaryDraft.interference)}"></label></div><button class="primary" data-action="diary-add">＋ ${t('Add diary entry','添加日记条目')}</button></section>
    <section class="panel history-panel"><div class="section-heading"><h2>${t('Diary entries','日记记录')}</h2><button class="secondary" data-action="diary-csv">↓ ${t('Diary CSV','日记 CSV')}</button></div>${data.diary.length?`<div class="table-wrap"><table><thead><tr><th>${t('Day','研究日')}</th><th>${t('Symptom','症状')}</th><th>${t('Intensity','强度')}</th><th>${t('Interference','影响')}</th><th></th></tr></thead><tbody>${diaryRows()}</tbody></table></div>`:`<p class="empty-state">${t('No diary entries yet. Add a synthetic entry above.','尚无日记记录。请在上方添加模拟条目。')}</p>`}</section>`;
}
function renderMethods() {
  $('#content').innerHTML=`<section class="panel prose"><p class="overline">${t('TRANSPARENT BY DESIGN','透明的设计')}</p><h2>${t('One pinned standard. An inspectable decision.','固定标准，可追溯的判断。')}</h2><p>${t('This portfolio prototype implements selected adult criteria from NCI CTCAE v6.0, published July 22, 2025. It is an independent educational implementation, not an NCI product, a complete dictionary, or a clinically validated device.','本作品集原型实现了 NCI 于2025年7月22日发布的 CTCAE v6.0 中部分成人标准。它是独立教学实现，并非 NCI 产品、完整字典或经临床验证的设备。')}</p><div class="method-grid"><article><h3>${t('The result follows the evidence','分级依据证据')}</h3><p>${t('The highest matched criterion wins. A semicolon in CTCAE means OR. Unknown higher-grade features keep a result incomplete. An established maximum grade may be returned despite missing lower-grade features.','取符合标准的最高级别。CTCAE 的分号表示“或”。更高级别特征未知时，结果保持不完整；已满足本事件最高级别时，可不要求较低级别信息。')}</p></article><article><h3>${t('No criterion is not grade zero','未符合标准并非0级')}</h3><p>${t('A dash means that no implemented criterion was met. It does not establish normality, rule out toxicity, or authorize treatment. Review states never become normal results.','横杠表示未符合已实现标准；不代表正常、不排除毒性，也不授权治疗。需复核状态不会被转换为正常结果。')}</p></article><article><h3>${t('Clinical scope stays explicit','明确临床范围')}</h3><p>${t('No pediatric grading, causality assessment, SAE determination, dose recommendation, regulatory reporting, or protocol-specific DLT decision. Verify which CTCAE version your protocol requires. Never silently reinterpret v5.0 data as v6.0.','不提供儿科分级、因果归因、SAE 判定、剂量建议、监管报告或方案特定 DLT 判断。请确认方案要求的 CTCAE 版本，不可将 v5.0 数据静默重解释为 v6.0。')}</p></article><article><h3>${t('Data stays temporary','临时数据')}</h3><p>${t('There is no patient record, free-text note, login, analytics, cloud database, or API integration. Cases live in memory. JSON import accepts only the documented synthetic schema; downloaded files remain your responsibility. Static assets may be cached for offline use.','无患者档案、自由文本备注、登录、分析追踪、云数据库或 API 接口。案例仅在内存中，JSON 导入仅接受已定义的模拟数据结构。下载文件由使用者保管。静态资源可缓存以供离线使用。')}</p></article></div><h3>${t('Implemented rules and source pages','已实现规则与来源页码')}</h3><div class="rule-catalog">${EVENT_IDS.map(id=>`<details><summary>${esc(tr(EVENTS[id].label))} <span>p. ${EVENTS[id].page}</span></summary><p>${esc(tr(EVENTS[id].summary))}</p><p>${esc(tr(EVENTS[id].note))}</p><a href="${sourceLink(id)}" target="_blank" rel="noreferrer">NCI CTCAE v6.0 ↗</a></details>`).join('')}</div><p class="caption">${t('Chinese text is an unofficial explanatory interface, not a validated translation of CTCAE or PRO-CTCAE. The original English source governs. Laboratory values and reference limits must use consistent units and a comparable reference range.','中文为非官方解释性界面，并非经验证的 CTCAE 或 PRO-CTCAE 译本。以英文原始标准为准。检验值及参考限必须使用一致单位与可比参考范围。')}</p><ul class="source-list"><li><a href="${SOURCE_INDEX}" target="_blank" rel="noreferrer">National Cancer Institute — CTCAE and Adverse Event Reporting</a></li><li><a href="${PRO_SOURCE}" target="_blank" rel="noreferrer">National Cancer Institute — PRO-CTCAE overview</a></li></ul><p class="caption">${STANDARD} · ${t('Engine','引擎')} ${ENGINE_VERSION} · ${t('Rules checked against NCI sources: 2026-11-02','规则核对日期：2026-11-02')}</p></section>`;
}
function changed() {dirty=true;}
function resetCase() {
  if(dirty&&!confirm(t('Replace your current synthetic case? Export JSON first if you want to keep it.','替换当前模拟案例？如需保留，请先导出 JSON。')))return;
  const id=$('#scenario').value;
  data=id==='custom'?blankCase():loadExample(id);
  selected=id==='custom'?1:EXAMPLES[id].selected;dirty=false;view='assessment';frame();notify('Case loaded. All examples are synthetic.','案例已载入。所有示例均为模拟数据。');
}
function download(text,name,type) {
  const url=URL.createObjectURL(new Blob([text],{type}));
  const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function preparePrint() {
  const textRows=data.observations.toSorted((a,b)=>a.day-b.day||a.id-b.id).map(o=>{
    const r=evaluated(o);
    return `<tr><td>${value(o.day)} / ${value(o.cycle)}</td><td>${esc(tr(EVENTS[o.event].label))}<br><small>${r.ruleId??''}</small></td><td>${esc(JSON.stringify(o.inputs))}</td><td>${esc(statusText(r))}${r.minimumGrade?` (≥G${r.minimumGrade})`:''}</td><td>${r.reasons.map(x=>esc(tr(x))).join('<br>')}</td></tr>`;
  }).join('');
  $('#print-report').innerHTML=`<h1>${t('Oncology Toxicity Workbench','肿瘤毒性评估工作台')}</h1><p>${STANDARD} · Engine ${ENGINE_VERSION} · ${t('Synthetic educational report — clinician review required','模拟教学报告 — 需临床复核')}</p><table><thead><tr><th>${t('Day / cycle','研究日 / 周期')}</th><th>${t('Event','事件')}</th><th>${t('Inputs','输入')}</th><th>${t('Result','结果')}</th><th>${t('Explanation','依据')}</th></tr></thead><tbody>${textRows}</tbody></table>${data.diary.length?`<h2>${t('Custom diary (not PRO-CTCAE or CTCAE grades)','自定义日记（非 PRO-CTCAE 或 CTCAE 分级）')}</h2><table><thead><tr><th>${t('Day','研究日')}</th><th>${t('Symptom','症状')}</th><th>${t('Intensity / 10','强度 / 10')}</th><th>${t('Interference / 10','影响 / 10')}</th></tr></thead><tbody>${data.diary.toSorted((a,b)=>a.day-b.day).map(d=>`<tr><td>${d.day}</td><td>${esc(tr(DIARY_SYMPTOMS[d.symptom]))}</td><td>${d.intensity}</td><td>${d.interference}</td></tr>`).join('')}</tbody></table>`:''}<p>${t('No criterion met is not grade 0 or evidence that toxicity is absent. No causality, SAE, treatment or dose decision is provided.','未符合标准并非0级，也不代表不存在毒性。本工具不提供归因、SAE、治疗或剂量决定。')}</p><p>NCI source: ${SOURCE_INDEX}<br>${[...new Set(data.observations.map(o=>o.event))].map(id=>`${esc(EVENTS[id].label.en)}: CTCAE v6.0 p. ${EVENTS[id].page}`).join(' · ')}</p>`;
}
async function action(name) {
  try {
    if(name==='load')resetCase();
    if(name==='add') {
      if(data.observations.length>=MAX_OBSERVATIONS)return notify('Maximum 200 assessments.','最多200次评估。');
      const o=current(),days=data.observations.map(x=>x.day).filter(Number.isInteger);
      const next=blankObservation(nextId(data.observations),o.event,Math.min(36500,Math.max(...days,0)+7),o.cycle??1);
      data.observations.push(next);selected=next.id;view='assessment';changed();frame();$('#event').focus();
    }
    if(name==='delete'&&data.observations.length>1&&confirm(t('Remove this assessment?','移除此评估？'))) {data.observations=data.observations.filter(o=>o.id!==selected);selected=data.observations[0].id;changed();renderContent();}
    if(name==='json'){download(exportJSON(data),'oncology-toxicity-case.json','application/json');notify('JSON exported. Keep it outside the public repository.','JSON 已导出，请勿将个案文件放入公开仓库。');}
    if(name==='csv')download(exportCSV(data),'oncology-toxicity-assessments.csv','text/csv;charset=utf-8');
    if(name==='diary-csv')download(exportDiaryCSV(data),'oncology-toxicity-diary.csv','text/csv;charset=utf-8');
    if(name==='import')$('#import-file').click();
    if(name==='print'){preparePrint();window.print();}
    if(name==='diary-add') {
      if(data.diary.length>=MAX_DIARY)return notify('Maximum 200 diary entries.','最多200条日记。');
      if(!Number.isInteger(diaryDraft.day)||diaryDraft.day< -3650||diaryDraft.day>36500||!['intensity','interference'].every(k=>Number.isInteger(diaryDraft[k])&&diaryDraft[k]>=0&&diaryDraft[k]<=10))return notify('Enter a whole study day and whole scores from 0 to 10.','请输入整数研究日及0至10的整数评分。');
      data.diary.push({id:nextId(data.diary),...diaryDraft});changed();renderDiary();notify('Diary entry added. CTCAE grades are unchanged.','日记已添加，不改变 CTCAE 分级。');
    }
  }catch(error){notify(error.message,t('','操作失败，请检查输入。'));}
}
document.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  if(button.dataset.view){view=button.dataset.view;frame();}
  if(button.id==='language'){lang=lang==='en'?'zh':'en';frame();}
  if(button.dataset.action)action(button.dataset.action);
  if(button.dataset.select){selected=Number(button.dataset.select);view='assessment';frame();}
  if(button.dataset.deleteDiary&&confirm(t('Remove this diary entry?','移除此日记条目？'))) {data.diary=data.diary.filter(d=>d.id!==Number(button.dataset.deleteDiary));changed();renderDiary();}
});
function updateInput(target) {
  const o=current();
  if(target.dataset.meta){o[target.dataset.meta]=target.value===''?null:Number(target.value);changed();updateResults();}
  if(target.dataset.input) {
    const key=target.dataset.input,f=EVENTS[o.event].fields.find(x=>x.key===key);
    const old=o.inputs[key];
    o.inputs[key]=target.value===''?null:f.type==='number'?Number(target.value):f.type==='flag'?target.value==='true':target.value;
    if(key==='unit'&&old&&o.inputs.unit&&old!==o.inputs.unit) {
      const factor=o.event==='anc'?(o.inputs.unit==='cells/uL'?1000:0.001):(o.inputs.unit==='g/L'?10:0.1);
      for(const k of ['value','lln'])if(typeof o.inputs[k]==='number')o.inputs[k]=Number((o.inputs[k]*factor).toPrecision(12));
      $('#editor').innerHTML=editorMarkup();
    }
    changed();updateResults();
  }
  if(target.dataset.diary) {diaryDraft[target.dataset.diary]=target.dataset.diary==='symptom'?target.value:target.value===''?null:Number(target.value);}
}
document.addEventListener('input',event=>{
  // Synchronize on every input while preserving the active control and its caret.
  if(event.target.matches('input[data-input],input[data-meta],input[data-diary]'))updateInput(event.target);
});
document.addEventListener('change',event=>{
  const target=event.target;
  if(target.matches('select[data-input],select[data-diary]'))updateInput(target);
  if(target.id==='event'){current().event=target.value;current().inputs=emptyInputs(target.value);changed();renderAssessment();notify('Event changed; enter a new assessment.','事件已更改，请重新输入评估信息。');}
});
$('#import-file').addEventListener('change',async event=>{
  const file=event.target.files?.[0];if(!file)return;
  try {
    if(file.size>MAX_IMPORT_BYTES)throw new Error('Case file exceeds 256 KiB.');
    const candidate=importCase(await file.text());
    if(dirty&&!confirm(t('Replace your current synthetic case with this file?','使用该文件替换当前模拟案例？')))return;
    data=candidate;selected=data.observations[0].id;dirty=false;view='assessment';frame();notify('Validated case imported locally.','数据验证通过，已在本地导入。');
  } catch(error) {notify('Import rejected: '+error.message,'导入失败：文件不符合模拟案例结构或数值范围。');}
  finally {event.target.value='';}
});
window.addEventListener('beforeprint',preparePrint);
frame();
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
