import test from 'node:test';
import assert from 'node:assert/strict';
import { importCase, exportJSON, exportCSV, exportDiaryCSV, validateCase, MAX_IMPORT_BYTES, blankCase } from '../app/engine.mjs';
import { EXAMPLES, loadExample } from '../app/examples.mjs';
for(const id of Object.keys(EXAMPLES))test(`${id}: JSON round trip preserves every input and unknown`,()=>{const d=loadExample(id);assert.deepEqual(importCase(exportJSON(d)),d);});
test('Blank case can be exported with unknown values intact',()=>assert.deepEqual(importCase(exportJSON(blankCase())),blankCase()));
test('Export does not mutate case or add computed grades',()=>{const d=loadExample('nadir'),before=structuredClone(d);exportCSV(d);exportJSON(d);assert.deepEqual(d,before);assert.ok(!('grade' in d.observations[0]));});
for(const [label,edit] of [
  ['personal name',d=>d.name='Synthetic placeholder'],
  ['private note',d=>d.observations[0].note='Not supported'],
  ['database metadata',d=>d.database={}],
  ['extra lab field',d=>d.observations[0].inputs.identifier='SIM'],
  ['missing field',d=>delete d.observations[0].inputs.value],
  ['v5 mismatch',d=>d.standard='CTCAE v5.0'],
  ['unsupported schema',d=>d.schema='anything'],
  ['pediatric scope',d=>d.scope='pediatric'],
  ['arbitrary scenario',d=>d.scenario='external'],
  ['empty assessments',d=>d.observations=[]],
  ['too many assessments',d=>d.observations=Array.from({length:201},(_,i)=>({...d.observations[0],id:i+1}))],
  ['duplicate observation IDs',d=>d.observations[1].id=d.observations[0].id],
  ['fractional study day',d=>d.observations[0].day=1.5],
  ['missing study day',d=>d.observations[0].day=null],
  ['negative cycle',d=>d.observations[0].cycle=-1],
  ['unsupported event',d=>d.observations[0].event='toString'],
  ['numeric string',d=>d.observations[0].inputs.value='0.3'],
  ['wrong units',d=>d.observations[0].inputs.unit='g/L'],
  ['diary unbounded score',d=>d.diary[0].intensity=11],
  ['diary score missing',d=>d.diary[0].intensity=null],
  ['diary fractional score',d=>d.diary[0].interference=2.5],
  ['diary extra field',d=>d.diary[0].note='No free text'],
  ['diary duplicate IDs',d=>d.diary[1].id=d.diary[0].id],
  ['diary unsupported symptom',d=>d.diary[0].symptom='constructor'],
  ['too many diary entries',d=>d.diary=Array.from({length:201},(_,i)=>({...d.diary[0],id:i+1}))]
])test(`Import rejects ${label}`,()=>{const d=loadExample('nadir');edit(d);assert.throws(()=>importCase(JSON.stringify(d)));});
test('Malformed JSON rejected',()=>assert.throws(()=>importCase('{no}'),/Invalid JSON/));
test('Null or primitive root rejected',()=>{for(const json of ['null','[]','42','"abc"'])assert.throws(()=>importCase(json));});
test('Oversized files rejected before parsing',()=>assert.throws(()=>importCase(' '.repeat(MAX_IMPORT_BYTES+1)),/256 KiB/));
test('Prototype-looking unknown keys rejected',()=>{const text=exportJSON(blankCase()).replace('"schema":','"__proto__":{},"schema":');assert.throws(()=>importCase(text));assert.equal({}.polluted,undefined);});
test('Validate returns an independent clone',()=>{const d=loadExample('nadir'),copy=validateCase(d);copy.observations[0].inputs.value=0;assert.equal(d.observations[0].inputs.value,2.2);});
test('CSV includes standard, engine, rule and raw inputs for reproducibility',()=>{const s=exportCSV(loadExample('nadir'));assert.ok(s.startsWith('\ufeff'));for(const key of ['engine_version','minimum_supported_grade','ctcae6.anc.1','CTCAE v6.0','inputs_json','ctcae-v6.pdf#page=170'])assert.ok(s.includes(key),key);assert.ok(s.includes('""value"":0.3'));});
test('Incomplete CSV preserves missing state instead of grade zero',()=>{const s=exportCSV(loadExample('incomplete'));assert.ok(s.includes('"incomplete","",""'));assert.ok(s.includes('"incomplete","","3"'));});
test('Negative study day is spreadsheet-inert text',()=>{const d=loadExample('nadir');d.observations[0].day=-7;assert.ok(exportCSV(d).includes('"\'-7"'));});
test('Diary export explicitly labels custom scores and does not claim CTCAE grading',()=>{const s=exportDiaryCSV(loadExample('nadir'));assert.ok(s.includes('custom_intensity_0_to_10'));assert.ok(s.includes('not PRO-CTCAE'));assert.ok(!s.includes('rule_id'));});
test('Invalid data cannot be exported',()=>{const d=loadExample('nadir');d.observations[0].inputs.value=-1;assert.throws(()=>exportCSV(d));assert.throws(()=>exportJSON(d));assert.throws(()=>exportDiaryCSV(d));});
test('Failed imports do not mutate an existing case',()=>{const d=loadExample('nadir'),before=structuredClone(d);assert.throws(()=>importCase('{"name":"unsupported"}'));assert.deepEqual(d,before);});
