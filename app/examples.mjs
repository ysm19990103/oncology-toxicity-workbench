import { SCHEMA } from './engine.mjs';
import { STANDARD, emptyInputs, pair } from './rules.mjs';
const observation=(id,day,event,inputs,cycle=1)=>({id,day,cycle,event,inputs:{...emptyInputs(event),...inputs}});
const base=(scenario,observations,diary=[])=>({schema:SCHEMA,standard:STANDARD,scope:'adult-education',scenario,observations,diary});
// Every value below is fabricated for teaching. There are no patient identifiers.
const nadir=base('nadir',[
  observation(1,1,'anc',{value:2.2,unit:'10^9/L'}),
  observation(2,5,'anc',{value:1.2,unit:'10^9/L'}),
  observation(3,9,'anc',{value:0.7,unit:'10^9/L'}),
  observation(4,15,'anc',{value:0.3,unit:'10^9/L'}),
  observation(5,19,'anc',{value:0.9,unit:'10^9/L'}),
  observation(6,22,'anc',{value:1.8,unit:'10^9/L'},2)
],[{id:1,day:9,symptom:'fatigue',intensity:4,interference:3},{id:2,day:15,symptom:'fatigue',intensity:6,interference:5},{id:3,day:22,symptom:'fatigue',intensity:2,interference:1}]);
const liver=base('liver',[
  observation(1,1,'alt',{value:80,uln:40,baseline:80}),
  observation(2,8,'alt',{value:120,uln:40,baseline:80}),
  observation(3,15,'alt',{value:160,uln:40,baseline:80}),
  observation(4,22,'alt',{value:240,uln:40,baseline:80},2),
  observation(5,29,'alt',{value:70,uln:40,baseline:80},2),
  observation(6,22,'bilirubin',{value:42,uln:21,baseline:18},2)
]);
const symptoms=base('symptoms',[
  observation(1,3,'nausea',{intake:'appetite',iv:false,support:false,hospital:false}),
  observation(2,7,'nausea',{intake:'reduced',iv:true,support:false,hospital:false}),
  observation(3,8,'diarrhea',{stools:3,consistency:true,adl:'none',ostomy:'none',hospital:false,iv:true,urgent:false,death:false}),
  observation(4,15,'neuropathy',{severity:'moderate',adl:'selfcare',urgent:false}),
  observation(5,22,'anemia',{value:8.6,lln:12,unit:'g/dL',transfusion:true,urgent:false,death:false},2)
],[{id:1,day:3,symptom:'nausea',intensity:6,interference:3},{id:2,day:7,symptom:'nausea',intensity:4,interference:4}]);
const incomplete=base('incomplete',[
  observation(1,8,'alt',{value:160,uln:40,baseline:null}),
  observation(2,8,'anemia',{value:7.5,lln:12,unit:'g/dL',transfusion:null,urgent:null,death:false}),
  observation(3,8,'alt',{value:600,uln:40,baseline:240})
]);
export const EXAMPLES = {
  nadir:{label:pair('Neutrophil nadir & recovery','中性粒细胞低谷与恢复'),selected:4,data:nadir,lesson:pair('The same ANC can map to different grades across CTCAE versions. This example uses v6.0 only.','同一 ANC 在不同 CTCAE 版本中可能对应不同级别。本示例仅采用 v6.0。')},
  liver:{label:pair('Elevated baseline liver tests','肝功能基线异常'),selected:4,data:liver,lesson:pair('Baseline status changes the reference. The final ALT result needs review because it remains abnormal below the elevated baseline.','基线状态会改变参考值。末次 ALT 低于异常基线但仍异常，因此需复核。')},
  symptoms:{label:pair('Symptoms & clinical overrides','症状与临床标准'),selected:3,data:symptoms,lesson:pair('Clinical context can outrank the numeric criterion. IV intervention makes this diarrhea example grade 3 in v6.0.','临床背景可产生高于数值标准的级别。此腹泻示例因需静脉干预，在 v6.0 中为3级。')},
  incomplete:{label:pair('Missing data & rule limits','缺失数据与规则边界'),selected:1,data:incomplete,lesson:pair('Unknown information stays unknown. A review state is not a reassuring result.','未知信息保留为未知。需复核状态不意味着低风险。')}
};
export const loadExample=id=>structuredClone(EXAMPLES[id].data);
