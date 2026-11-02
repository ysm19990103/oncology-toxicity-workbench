// Shift the decimal exponent instead of rounding or multiplying binary floats.
// All significant digits of the parsed numeric input are retained.
export function convertUnitValue(value, from, to) {
  const groups=[{'10^9/L':0,'cells/uL':3},{'g/dL':0,'g/L':1}];
  const group=groups.find(g=>Object.hasOwn(g,from)&&Object.hasOwn(g,to));
  if(!group)throw new Error('Unsupported unit conversion.');
  if(value===null)return null;
  if(typeof value!=='number'||!Number.isFinite(value)||value<0)throw new Error('Invalid conversion value.');
  const [mantissa,exponent='0']=String(value).toLowerCase().split('e');
  return Number(`${mantissa}e${Number(exponent)+group[to]-group[from]}`);
}
