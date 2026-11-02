import test from 'node:test';
import assert from 'node:assert/strict';
import { assess, blankObservation, timeline } from '../app/engine.mjs';
import { EVENTS, EVENT_IDS, emptyInputs, STANDARD } from '../app/rules.mjs';
import { EXAMPLES, loadExample } from '../app/examples.mjs';
const run=(event,inputs)=>assess({event,inputs:{...emptyInputs(event),...inputs}});
const expectGrade=(r,g)=>{assert.equal(r.status,g===null?'none':'graded');assert.equal(r.grade,g);};

// Boundary fixtures are derived from the source intervals documented in CLINICAL_RULES.md.
for(const [value,grade] of [[0,4],[0.099,4],[0.1,3],[0.499,3],[0.5,2],[0.999,2],[1,1],[1.499,1],[1.5,null],[2.5,null]]) {
  test(`v6 ANC ${value} ×10^9/L → ${grade??'no criterion'}`,()=>expectGrade(run('anc',{value,unit:'10^9/L'}),grade));
  test(`ANC equivalent cells/µL ${value*1000}`,()=>expectGrade(run('anc',{value:value*1000,unit:'cells/uL'}),grade));
}
const hbase={lln:12,unit:'g/dL',transfusion:false,urgent:false,death:false};
for(const [value,grade] of [[7.99,3],[8,2],[9.99,2],[10,1],[11.99,1],[12,null],[14,null]]) {
  test(`Anemia threshold ${value} g/dL`,()=>expectGrade(run('anemia',{...hbase,value}),grade));
  test(`Anemia equivalent g/L ${value*10}`,()=>expectGrade(run('anemia',{...hbase,value:value*10,lln:120,unit:'g/L'}),grade));
}
test('Transfusion can raise anemia grade despite hemoglobin 10',()=>expectGrade(run('anemia',{...hbase,value:10,transfusion:true}),3));
test('Life-threatening anemia uses grade 4',()=>expectGrade(run('anemia',{...hbase,value:10,urgent:true}),4));
test('Death related to anemia uses grade 5 with missing lower features',()=>expectGrade(run('anemia',{death:true}),5));
test('Unknown urgent feature cannot be treated as false',()=>{const r=run('anemia',{...hbase,value:7.5,urgent:null});assert.equal(r.status,'incomplete');assert.equal(r.minimumGrade,3);assert.deepEqual(r.missing,['urgent']);});
test('Unknown transfusion cannot raise established grade 3',()=>expectGrade(run('anemia',{...hbase,value:7.5,transfusion:null}),3));
for(const event of ['alt','ast']) {
  for(const [value,grade] of [[40,null],[40.001,1],[120,1],[120.001,2],[200,2],[200.001,3],[800,3],[800.001,4]])test(`${event} normal baseline ${value}`,()=>expectGrade(run(event,{value,uln:40,baseline:30}),grade));
  for(const [value,grade] of [[40,null],[80,1],[120,1],[120.001,2],[160,2],[160.001,3],[320,3],[320.001,4]])test(`${event} elevated baseline ${value}`,()=>expectGrade(run(event,{value,uln:40,baseline:80}),grade));
  test(`${event} below elevated baseline but still abnormal requires review`,()=>assert.equal(run(event,{value:70,uln:40,baseline:80}).status,'review'));
  test(`${event} missing baseline is incomplete`,()=>{const r=run(event,{value:130,uln:40});assert.equal(r.status,'incomplete');assert.ok(r.missing.includes('baseline'));});
  test(`${event} grade 3 gap when baseline >5×ULN`,()=>assert.equal(run(event,{value:600,uln:40,baseline:240}).status,'review'));
  test(`${event} exact 5×ULN baseline permits grade 3`,()=>expectGrade(run(event,{value:600,uln:40,baseline:200}),3));
  test(`${event} high baseline still allows grade 4 above 4×baseline`,()=>expectGrade(run(event,{value:961,uln:40,baseline:240}),4));
  test(`${event} high baseline and exact 4×baseline is review`,()=>assert.equal(run(event,{value:960,uln:40,baseline:240}).status,'review'));
  test(`${event} baseline at ULN uses normal branch`,()=>{const r=run(event,{value:200,uln:40,baseline:40});expectGrade(r,2);assert.equal(r.branch,'normal-baseline');});
  test(`${event} zero normal baseline does not divide by zero`,()=>expectGrade(run(event,{value:120,uln:40,baseline:0}),1));
}
for(const [value,grade] of [[20,null],[30,1],[30.001,2],[60,2],[60.001,3],[200,3],[200.001,4]])test(`Bilirubin normal baseline ${value}`,()=>expectGrade(run('bilirubin',{value,uln:20,baseline:15}),grade));
for(const [value,grade] of [[20,null],[40,1],[60,1],[60.001,2],[100,2],[100.001,3],[400,3],[400.001,4]])test(`Bilirubin elevated baseline ${value}`,()=>expectGrade(run('bilirubin',{value,uln:20,baseline:40}),grade));
test('Bilirubin below elevated baseline remains review when abnormal',()=>assert.equal(run('bilirubin',{value:30,uln:20,baseline:40}).status,'review'));
test('Decimal equality 0.45 = 1.5 × 0.3 remains grade 1',()=>expectGrade(run('bilirubin',{value:0.45,uln:0.3,baseline:0.2}),1));
test('Scientific decimal notation preserves exact boundary',()=>expectGrade(run('bilirubin',{value:0.0000015,uln:0.000001,baseline:0}),1));
test('True above-boundary tiny increase is not rounded away',()=>expectGrade(run('bilirubin',{value:0.4500000001,uln:0.3,baseline:0.2}),2));
const crbase={uln:100,lln:50,baseline:75};
for(const [value,grade] of [[100,null],[100.1,1],[150,1],[150.1,2],[300,2],[300.1,3],[600,3],[600.1,4]])test(`Creatinine ULN branch ${value}`,()=>expectGrade(run('creatinine',{...crbase,value}),grade));
for(const [value,grade] of [[30,null],[30.001,2],[60,2],[60.001,3],[600,3],[601,4]])test(`Creatinine below-LLN baseline ${value}`,()=>expectGrade(run('creatinine',{uln:100,lln:50,baseline:20,value}),grade));
test('Baseline equal to LLN does not enable low-baseline creatinine branch',()=>expectGrade(run('creatinine',{uln:100,lln:50,baseline:50,value:80}),null));
test('Creatinine baseline 0 rejected',()=>assert.equal(run('creatinine',{...crbase,baseline:0,value:120}).status,'invalid'));
test('Creatinine LLN >= ULN rejected',()=>assert.equal(run('creatinine',{...crbase,lln:100,value:120}).status,'invalid'));
test('Creatinine elevated baseline uses ULN thresholds',()=>expectGrade(run('creatinine',{...crbase,baseline:200,value:200}),2));
const db={stools:0,consistency:false,adl:'none',ostomy:'none',hospital:false,iv:false,urgent:false,death:false};
for(const [stools,grade] of [[0,null],[1,1],[3,1],[4,2],[6,2],[7,3],[20,3]])test(`Diarrhea stool increment ${stools}`,()=>expectGrade(run('diarrhea',{...db,stools}),grade));
for(const [key,value,grade] of [['consistency',true,1],['adl','instrumental',2],['adl','selfcare',3],['ostomy','moderate',2],['ostomy','severe',3],['hospital',true,3],['iv',true,3],['urgent',true,4],['death',true,5]])test(`Diarrhea independent ${key} criterion`,()=>expectGrade(run('diarrhea',{...db,[key]:value}),grade));
test('Diarrhea highest criterion wins across numeric and clinical features',()=>expectGrade(run('diarrhea',{...db,stools:4,adl:'selfcare'}),3));
test('Unassessed urgent diarrhea remains incomplete despite numeric grade 3',()=>{const r=run('diarrhea',{...db,stools:8,urgent:null});assert.equal(r.minimumGrade,3);assert.equal(r.status,'incomplete');});
test('Unclassified ostomy change requires review',()=>assert.equal(run('diarrhea',{...db,ostomy:'other'}).status,'review'));
const nb={intake:'none',iv:false,support:false,hospital:false};
for(const [intake,grade] of [['none',null],['appetite',1],['reduced',2],['inadequate',3]])test(`Nausea intake ${intake}`,()=>expectGrade(run('nausea',{...nb,intake}),grade));
test('Nausea IV alone is grade 2, not diarrhea grade 3',()=>expectGrade(run('nausea',{...nb,iv:true}),2));
test('Nausea nutrition support alone is grade 3',()=>expectGrade(run('nausea',{...nb,support:true}),3));
test('Nausea hospitalization alone is grade 3',()=>expectGrade(run('nausea',{...nb,hospital:true}),3));
test('Maximum nausea grade does not need lower criteria',()=>expectGrade(run('nausea',{support:true}),3));
test('Nausea uncertain intake needs review',()=>assert.equal(run('nausea',{...nb,intake:'other'}).status,'review'));
test('Nausea unknown hospitalization can supersede grade 2',()=>assert.equal(run('nausea',{...nb,intake:'reduced',hospital:null}).status,'incomplete'));
const neurop={severity:'none',adl:'none',urgent:false};
for(const [severity,grade] of [['none',null],['mild',1],['moderate',2],['severe',3]])test(`Sensory neuropathy ${severity}`,()=>expectGrade(run('neuropathy',{...neurop,severity}),grade));
test('Neuropathy instrumental ADL alone grades 2',()=>expectGrade(run('neuropathy',{...neurop,adl:'instrumental'}),2));
test('Neuropathy self-care limitation raises moderate symptoms to grade 3',()=>expectGrade(run('neuropathy',{...neurop,severity:'moderate',adl:'selfcare'}),3));
test('Urgent sensory neuropathy establishes grade 4 despite other missing data',()=>expectGrade(run('neuropathy',{urgent:true}),4));
test('No unsupported grade 5 for neuropathy',()=>assert.equal(run('neuropathy',{...neurop,death:true}).status,'invalid'));
test('Unknown is not no: blank assessment is incomplete',()=>assert.equal(assess(blankObservation()).status,'incomplete'));
test('Missing lower features do not suppress a confirmed maximum grade',()=>expectGrade(run('diarrhea',{death:true}),5));
test('Source, standard, and implementation version accompany every result',()=>{const r=run('anc',{value:0.3,unit:'10^9/L'});assert.equal(r.standard,STANDARD);assert.match(r.ruleId,/^ctcae6\.anc\.1$/);assert.match(r.source,/#page=170$/);});
for(const invalid of [-1,Infinity,NaN,'0.3',true,{},[]])test(`Reject nonnumeric/range ANC ${String(invalid)}`,()=>assert.equal(run('anc',{value:invalid,unit:'10^9/L'}).status,'invalid'));
test('Wrong count unit magnitude is flagged',()=>assert.equal(run('anc',{value:500,unit:'10^9/L'}).status,'invalid'));
test('Wrong hemoglobin unit magnitude is flagged',()=>assert.equal(run('anemia',{...hbase,value:120}).status,'invalid'));
test('Unsupported event is invalid',()=>assert.equal(assess({event:'unknown',inputs:{}}).status,'invalid'));
test('Fractional stool counts rejected',()=>assert.equal(run('diarrhea',{...db,stools:4.5}).status,'invalid'));
test('Every rule can return incomplete without inventing a grade',()=>{for(const id of EVENT_IDS){const r=run(id,{});assert.equal(r.status,'incomplete',id);assert.equal(r.grade,null,id);}});
test('Assessment is pure and does not mutate source data',()=>{const o=loadExample('nadir').observations[3],before=structuredClone(o);Object.freeze(o.inputs);assess(o);assert.deepEqual(o,before);});
test('Timeline sorts without mutating case order and retains same-day observations',()=>{const d=loadExample('nadir');d.observations.reverse();d.observations[0].day=15;const ids=d.observations.map(o=>o.id);const sorted=timeline(d,'anc');assert.equal(sorted.length,6);assert.equal(sorted.filter(o=>o.day===15).length,2);assert.deepEqual(d.observations.map(o=>o.id),ids);});
test('Synthetic examples have expected teaching outcomes',()=>{assert.equal(assess(EXAMPLES.nadir.data.observations[3]).grade,3);assert.equal(assess(EXAMPLES.liver.data.observations[4]).status,'review');assert.equal(assess(EXAMPLES.symptoms.data.observations[2]).grade,3);assert.equal(assess(EXAMPLES.incomplete.data.observations[0]).status,'incomplete');});
test('Diary data never changes CTCAE assessments',()=>{const d=loadExample('symptoms'),before=d.observations.map(assess);d.diary=[{id:1,day:1,symptom:'nausea',intensity:10,interference:10}];assert.deepEqual(d.observations.map(assess),before);});
test('Rules expose valid page anchors and allowable grade maxima',()=>{for(const e of Object.values(EVENTS)){assert.ok(e.page>=1&&e.page<=312);assert.ok(e.maxGrade>=3&&e.maxGrade<=5);}});
