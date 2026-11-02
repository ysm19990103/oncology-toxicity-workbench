import { EVENTS, EVENT_IDS, DIARY_SYMPTOMS, STANDARD, ENGINE_VERSION, pair, emptyInputs, sourceLink } from './rules.mjs';
export const SCHEMA = 'otw.case.v1';
export const MAX_OBSERVATIONS = 200;
export const MAX_DIARY = 200;
export const MAX_IMPORT_BYTES = 262144;
export const SCENARIOS = ['nadir','liver','symptoms','incomplete','custom'];
const own = (obj,key) => Object.prototype.hasOwnProperty.call(obj,key);
const record = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const finite = x => typeof x === 'number' && Number.isFinite(x);
const integer = (x,min,max) => Number.isInteger(x) && x >= min && x <= max;
const exact = (obj,keys) => record(obj) && Object.keys(obj).length === keys.length && keys.every(k=>own(obj,k));
// Comparisons use unrounded inputs. Display formatting never drives a grade.
const format = n => Number(n.toPrecision(7)).toString();
// Decimal cross-products keep exact user-entered boundary values such as
// 0.45 == 1.5 × 0.3 from crossing a grade because of binary multiplication.
function decimal(n) {
  const [mantissa,exponent='0']=String(n).toLowerCase().split('e');
  const fraction=(mantissa.split('.')[1]??'').length;
  const shift=Number(exponent)-fraction;
  const numerator=BigInt(mantissa.replace('.',''));
  return shift>=0?[numerator*10n**BigInt(shift),1n]:[numerator,10n**BigInt(-shift)];
}
function above(value,reference,multiple) {
  const [v,vd]=decimal(value),[r,rd]=decimal(reference),[m,md]=decimal(multiple);
  return v*rd*md > r*m*vd;
}
const message = (en,zh) => pair(en,zh);
export function validateInputs(event,inputs) {
  const rule = EVENTS[event];
  if (!rule || !exact(inputs,rule.fields.map(f=>f.key))) return ['Unexpected or missing assessment fields.'];
  const errors = [];
  for (const f of rule.fields) {
    const v = inputs[f.key];
    if (v === null) continue;
    if (f.type==='number' && (!finite(v) || v < f.min || v > f.max || (f.integer && !Number.isInteger(v)))) errors.push(`Invalid ${f.key}.`);
    if (f.type==='select' && !f.options.some(o=>o.value===v)) errors.push(`Invalid ${f.key}.`);
    if (f.type==='flag' && typeof v !== 'boolean') errors.push(`Invalid ${f.key}.`);
  }
  if (event === 'creatinine' && inputs.baseline === 0) errors.push('Creatinine baseline must be greater than zero.');
  if (event === 'creatinine' && finite(inputs.lln) && finite(inputs.uln) && inputs.lln >= inputs.uln) errors.push('LLN must be less than ULN.');
  if (event === 'anc' && inputs.unit === '10^9/L' && inputs.value > 100) errors.push('Check neutrophil unit: value exceeds the supported range.');
  if (event === 'anemia' && inputs.unit === 'g/dL' && (inputs.value > 50 || inputs.lln > 50)) errors.push('Check hemoglobin unit: value exceeds the supported range.');
  return errors;
}
function result(event,status,grade,reasons,missing=[],extra={}) {
  return {status,grade,minimumGrade:null,reasons,missing,standard:STANDARD,engineVersion:ENGINE_VERSION,ruleId:`ctcae6.${event}.1`,source:sourceLink(event),...extra};
}
export function assess(observation) {
  const {event,inputs:i} = observation ?? {};
  if (!EVENT_IDS.includes(event)) return {status:'invalid',grade:null,minimumGrade:null,reasons:[message('Unsupported event.','不支持的事件。')],missing:[]};
  const errors = validateInputs(event,i);
  if (errors.length) return result(event,'invalid',null,[message(errors.join(' '),'输入无效，请检查数值、单位和字段。')]);
  const candidates = [];
  const unknown = [];
  const reviews = [];
  let ratio = null;
  let branch = null;
  const add = (grade,en,zh) => candidates.push({grade,reason:message(en,zh)});
  const need = (keys,ceiling) => {
    const absent = keys.filter(k=>i[k]===null);
    unknown.push(...absent.map(key=>({key,ceiling})));
    return absent.length===0;
  };
  const flag = (key,grade,en,zh) => { if(i[key]===null) unknown.push({key,ceiling:grade});else if(i[key]) add(grade,en,zh); };
  const clinical = () => {
    if(own(i,'urgent')) flag('urgent',4,'Life-threatening consequences or urgent intervention indicated.','危及生命或需要紧急干预。');
    if(own(i,'death')) flag('death',5,'Death attributed to this adverse event.','死亡归因于该不良事件。');
  };
  if(event==='anc' && need(['value','unit'],4)) {
    const x=i.unit==='cells/uL' ? i.value/1000 : i.value;
    const grade=x<0.1?4:x<0.5?3:x<1?2:x<1.5?1:0;
    if(grade) add(grade,`ANC ${format(x)} ×10⁹/L matches the v6.0 grade ${grade} interval.`,`ANC ${format(x)} ×10⁹/L 符合 v6.0 的${grade}级区间。`);
    branch='absolute-count';
  }
  if(event==='anemia') {
    if(need(['value','lln','unit'],3)) {
      const div=i.unit==='g/L'?10:1;
      const h=i.value/div, l=i.lln/div;
      const grade=h<8?3:h<10?2:h<l?1:0;
      if(grade) add(grade,`Hemoglobin ${format(h)} g/dL matches the grade ${grade} concentration criterion.`,`血红蛋白 ${format(h)} g/dL 符合${grade}级浓度标准。`);
    }
    flag('transfusion',3,'Transfusion is indicated for anemia.','因贫血需要输血。');
    clinical();
    branch='concentration-and-clinical';
  }
  if(['alt','ast','bilirubin'].includes(event) && need(['value','uln','baseline'],4)) {
    const elevated=i.baseline>i.uln;
    branch=elevated?'elevated-baseline':'normal-baseline';
    ratio=i.value/(elevated?i.baseline:i.uln);
    if(elevated && i.value<i.baseline && i.value>i.uln) reviews.push(message('Result remains above ULN but is below the elevated baseline. No matching baseline interval is implemented; review the source and protocol.','结果仍高于 ULN，但低于异常基线。未覆盖此基线区间；请复核原文与方案。'));
    else if(elevated && ['alt','ast'].includes(event) && above(i.baseline,i.uln,5) && above(i.value,i.baseline,2) && !above(i.value,i.baseline,4)) reviews.push(message('Baseline exceeds 5 × ULN and the result is >2–4 × baseline. The v6.0 grade 3 baseline condition does not cover this combination.','基线超过5倍 ULN，当前值为 >2–4 倍基线。此组合不满足 v6.0 的3级基线条件。'));
    else {
      // Compare scaled values rather than rounded ratios at boundaries.
      const cuts=event==='bilirubin'?(elevated?[1.5,2.5,10]:[1.5,3,10]):(elevated?[1.5,2,4]:[3,5,20]);
      const ref=elevated?i.baseline:i.uln;
      const qualifies=elevated ? i.value>=ref : i.value>ref;
      const grade=!qualifies?0:above(i.value,ref,cuts[2])?4:above(i.value,ref,cuts[1])?3:above(i.value,ref,cuts[0])?2:1;
      if(grade) add(grade,`${format(ratio)} × ${elevated?'baseline':'ULN'}; ${elevated?'elevated':'normal or below-normal'} baseline branch → grade ${grade}.`,`${format(ratio)} 倍${elevated?'基线':'ULN'}；采用${elevated?'异常':'正常或偏低'}基线分支 → ${grade}级。`);
    }
  }
  if(event==='creatinine' && need(['value','uln','baseline','lln'],4)) {
    branch=i.baseline<i.lln?'below-lln-baseline':'uln';
    ratio=i.value/i.uln;
    const grade=above(i.value,i.uln,6)?4:above(i.value,i.uln,3)?3:above(i.value,i.uln,1.5)?2:i.value>i.uln?1:0;
    if(grade) add(grade,`${format(ratio)} × ULN matches grade ${grade}.`,`${format(ratio)} 倍 ULN 符合${grade}级。`);
    if(i.baseline<i.lln && above(i.value,i.baseline,1.5)) {
      const bg=above(i.value,i.baseline,3)?3:2;
      add(bg,`Baseline is below LLN; ${format(i.value/i.baseline)} × baseline matches grade ${bg}.`,`基线低于 LLN；${format(i.value/i.baseline)} 倍基线符合${bg}级。`);
    }
  }
  if(event==='diarrhea') {
    if(need(['stools'],3)) {
      const g=i.stools>=7?3:i.stools>=4?2:i.stools>0?1:0;
      if(g) add(g,`${i.stools} additional stools/day above baseline.`,`每日较基线增加${i.stools}次排便。`);
    }
    flag('consistency',1,'Stool consistency has changed.','大便性状改变。');
    if(need(['ostomy'],3)) {
      if(['moderate','severe'].includes(i.ostomy)) add(i.ostomy==='severe'?3:2,`${i.ostomy==='severe'?'Severe':'Moderate'} increase in ostomy output.`,`${i.ostomy==='severe'?'重度':'中度'}造口排出量增加。`);
      if(i.ostomy==='other') reviews.push(message('Ostomy output change needs clinical interpretation.','造口排出量变化需临床解释。'));
    }
    flag('hospital',3,'Hospitalization is indicated for diarrhea.','因腹泻需要住院。');
    flag('iv',3,'IV intervention is required for diarrhea (v6.0 grade 3).','腹泻需要静脉干预（v6.0 3级）。');
    clinical();
    branch='highest-clinical-criterion';
  }
  if(event==='nausea') {
    if(need(['intake'],3)) {
      const g={none:0,appetite:1,reduced:2,inadequate:3}[i.intake];
      if(g) add(g,`The selected appetite/intake description matches grade ${g}.`,`所选食欲/摄入描述符合${g}级。`);
      if(i.intake==='other') reviews.push(message('The intake pattern is outside the listed descriptions; review is required.','该摄入模式不在所列描述中，需要复核。'));
    }
    flag('iv',2,'IV intervention is indicated for nausea (v6.0 grade 2).','恶心需要静脉干预（v6.0 2级）。');
    flag('support',3,'Tube feeding or parenteral nutrition is indicated.','需要管饲或肠外营养。');
    flag('hospital',3,'Hospitalization is indicated for nausea.','因恶心需要住院。');
    branch='highest-clinical-criterion';
  }
  if(event==='neuropathy') {
    if(need(['severity'],3)) {
      const g={none:0,mild:1,moderate:2,severe:3}[i.severity];
      if(g) add(g,`Clinician-assessed ${i.severity} sensory symptoms.`,`临床评估感觉症状为${{mild:'轻度',moderate:'中度',severe:'重度'}[i.severity]}。`);
    }
    clinical();
    branch='highest-clinical-criterion';
  }
  if(own(i,'adl') && need(['adl'],3)) {
    if(i.adl==='instrumental') add(2,'Instrumental daily activities are limited.','工具性日常活动受限。');
    if(i.adl==='selfcare') add(3,'Self-care daily activities are limited.','自理活动受限。');
  }
  const highest=Math.max(0,...candidates.map(c=>c.grade));
  const missing=[...new Set(unknown.filter(u=>u.ceiling>highest).map(u=>u.key))];
  const reasons=candidates.filter(c=>c.grade===highest).map(c=>c.reason);
  const extra={ratio,branch};
  // A supplied criterion at the event's maximum grade cannot be superseded by unknown lower criteria.
  if(reviews.length && highest<EVENTS[event].maxGrade) return result(event,'review',null,[...reviews,...reasons],missing,{...extra,minimumGrade:highest||null});
  if(missing.length) return result(event,'incomplete',null,[message('A higher grade cannot be excluded until the missing information is completed.','补齐缺失信息前，无法排除更高级别。'),...reasons],missing,{...extra,minimumGrade:highest||null});
  if(highest) return result(event,'graded',highest,reasons,[],extra);
  return result(event,'none',null,[message('No implemented criterion is met. This is not a CTCAE grade 0 and does not establish absence of toxicity.','未符合已实现标准。这不是 CTCAE 0级，也不代表不存在毒性。')],[],extra);
}
export function blankObservation(id=1, event='anc',day=1,cycle=1) { return {id,day,cycle,event,inputs:emptyInputs(event)}; }
export function blankCase() { return {schema:SCHEMA,standard:STANDARD,scope:'adult-education',scenario:'custom',observations:[blankObservation()],diary:[]}; }
export function validateCase(data) {
  if(!exact(data,['schema','standard','scope','scenario','observations','diary'])) throw new Error('Unexpected case structure. Personal details and free-text fields are not supported.');
  if(data.schema!==SCHEMA || data.standard!==STANDARD || data.scope!=='adult-education' || !SCENARIOS.includes(data.scenario)) throw new Error('Unsupported schema, CTCAE version, scenario, or scope.');
  if(!Array.isArray(data.observations) || !data.observations.length || data.observations.length>MAX_OBSERVATIONS) throw new Error('A case must contain 1–200 observations.');
  if(!Array.isArray(data.diary) || data.diary.length>MAX_DIARY) throw new Error('A case may contain at most 200 diary entries.');
  const ids=new Set();
  for(const o of data.observations) {
    if(!exact(o,['id','day','cycle','event','inputs']) || !integer(o.id,1,1e6) || ids.has(o.id) || !integer(o.day,-3650,36500) || !integer(o.cycle,1,200) || !EVENT_IDS.includes(o.event)) throw new Error('Invalid observation structure, identity, study day, cycle, or event.');
    ids.add(o.id);
    if(validateInputs(o.event,o.inputs).length) throw new Error('Invalid measurement, unit, or clinical field.');
  }
  ids.clear();
  for(const d of data.diary) {
    if(!exact(d,['id','day','symptom','intensity','interference']) || !integer(d.id,1,1e6) || ids.has(d.id) || !integer(d.day,-3650,36500) || !own(DIARY_SYMPTOMS,d.symptom) || !integer(d.intensity,0,10) || !integer(d.interference,0,10)) throw new Error('Invalid diary structure or score.');
    ids.add(d.id);
  }
  return structuredClone(data);
}
export function importCase(text) {
  if(typeof text!=='string' || new TextEncoder().encode(text).length>MAX_IMPORT_BYTES) throw new Error('Case file exceeds 256 KiB.');
  let parsed;
  try { parsed=JSON.parse(text); } catch { throw new Error('Invalid JSON file.'); }
  return validateCase(parsed);
}
export function exportJSON(data) { return JSON.stringify(validateCase(data),null,2)+'\n'; }
const cell = value => {
  let text=String(value??'');
  if(/^[\s]*[=+\-@]/.test(text)) text="'"+text;
  return '"'+text.replaceAll('"','""')+'"';
};
const csv = rows => '\ufeff'+rows.map(row=>row.map(cell).join(',')).join('\r\n')+'\r\n';
export function exportCSV(data) {
  const safe=validateCase(data);
  return csv([['observation','study_day','cycle','event','standard','engine_version','status','grade','minimum_supported_grade','branch','rule_id','inputs_json','explanation','source'],...safe.observations.map(o=>{
    const r=assess(o);
    return [o.id,o.day,o.cycle,EVENTS[o.event].label.en,STANDARD,ENGINE_VERSION,r.status,r.grade,r.minimumGrade,r.branch,r.ruleId,JSON.stringify(o.inputs),r.reasons.map(x=>x.en).join(' | '),r.source];
  })]);
}
export function exportDiaryCSV(data) {
  const safe=validateCase(data);
  return csv([['entry','study_day','symptom','custom_intensity_0_to_10','custom_interference_0_to_10','instrument'],...safe.diary.map(d=>[d.id,d.day,DIARY_SYMPTOMS[d.symptom].en,d.intensity,d.interference,'Custom educational diary; not PRO-CTCAE; not a CTCAE grade'])]);
}
export function timeline(data,event=null) { return data.observations.filter(o=>!event||o.event===event).map(o=>({...o,result:assess(o)})).sort((a,b)=>a.day-b.day||a.id-b.id); }
