import test from 'node:test';
import assert from 'node:assert/strict';
import { convertUnitValue } from '../app/units.mjs';
import { assess } from '../app/engine.mjs';
test('Changing count units preserves grades immediately on either side of every boundary',()=>{
  for(const value of [0,0.09999999999999,0.1,0.49999999999999,0.5,0.99999999999999,1,1.49999999999999,1.5]) {
    const converted=convertUnitValue(value,'10^9/L','cells/uL');
    const a=assess({event:'anc',inputs:{value,unit:'10^9/L'}});
    const b=assess({event:'anc',inputs:{value:converted,unit:'cells/uL'}});
    assert.equal(b.grade,a.grade,String(value));
    assert.equal(b.status,a.status,String(value));
    assert.equal(convertUnitValue(converted,'cells/uL','10^9/L'),value);
  }
});
test('Hemoglobin conversion preserves precision, unknowns and valid unit groups',()=>{
  for(const value of [0,7.99999999999999,8,9.99999999999999,10,12]) {
    const n=convertUnitValue(value,'g/dL','g/L');
    assert.equal(convertUnitValue(n,'g/L','g/dL'),value);
  }
  assert.equal(convertUnitValue(0.3,'10^9/L','cells/uL'),300);
  assert.equal(convertUnitValue(null,'g/dL','g/L'),null);
  assert.equal(convertUnitValue(10,'g/dL','g/dL'),10);
  assert.throws(()=>convertUnitValue(1,'g/dL','cells/uL'));
  for(const v of [NaN,Infinity,-1,'8'])assert.throws(()=>convertUnitValue(v,'g/dL','g/L'));
});
