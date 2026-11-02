// Selected adult criteria, independently implemented from NCI CTCAE v6.0.
// These are explanatory paraphrases, not a redistribution of the CTCAE dictionary.
export const STANDARD = 'CTCAE v6.0 (2025-07-22)';
export const ENGINE_VERSION = '1.0.0';
export const SOURCE = 'https://dctd.cancer.gov/research/ctep-trials/for-sites/adverse-events/ctcae-v6.pdf';
export const SOURCE_INDEX = 'https://dctd.cancer.gov/research/ctep-trials/for-sites/adverse-events';
export const PRO_SOURCE = 'https://healthcaredelivery.cancer.gov/pro-ctcae/overview.html';
export const pair = (en, zh) => ({ en, zh });
export const choose = (text, lang = 'en') => text?.[lang] ?? text?.en ?? String(text ?? '');
const num = (key, en, zh, min = 0, max = 1e7, integer = false) => ({key, type:'number', label:pair(en,zh), min, max, integer});
const option = (value, en, zh) => ({value, label:pair(en, zh)});
const select = (key,en,zh,options) => ({key,type:'select',label:pair(en,zh),options});
const flag = (key,en,zh) => ({key,type:'flag',label:pair(en,zh)});
const urgent = () => flag('urgent','Life-threatening consequences OR urgent intervention indicated','危及生命，或需紧急干预');
const death = () => flag('death','Death attributed to this event','死亡归因于该事件');
const adl = () => select('adl','Effect on daily activities','日常活动受限程度',[
  option('none','No limitation','无受限'),
  option('instrumental','Instrumental activities limited','工具性日常活动受限'),
  option('selfcare','Self-care activities limited','自理活动受限')
]);
const labFields = () => [num('value','Current result','当前结果'), num('uln','Upper limit of normal (ULN)','正常值上限（ULN）',0.000001), num('baseline','Baseline result','基线结果')];
const liverSummary = pair('Normal baseline: >1 / >3 / >5 / >20 × ULN. Elevated baseline: 1–1.5 / >1.5–2 / >2–4 / >4 × baseline. Grade 3 uses baseline ≤5 × ULN; uncovered cases require review.','基线正常：>1 / >3 / >5 / >20 倍 ULN。基线升高：1–1.5 / >1.5–2 / >2–4 / >4 倍基线。3级分支要求基线 ≤5 倍 ULN；未覆盖情况需复核。');
export const EVENTS = {
  anc: {
    label:pair('Neutrophil count decreased','中性粒细胞计数降低'), short:pair('Neutrophils','中性粒细胞'),kind:'lab',page:170,maxGrade:4,
    unit:pair('×10⁹/L or cells/µL','×10⁹/L 或 个/µL'),
    fields:[num('value','Absolute neutrophil count','中性粒细胞绝对计数',0,1e7),select('unit','Count unit','计数单位',[option('10^9/L','×10⁹/L','×10⁹/L'),option('cells/uL','cells/µL (= cells/mm³)','个/µL（= 个/mm³）')])],
    summary:pair('v6.0: G1 ≥1.0–<1.5; G2 ≥0.5–<1.0; G3 ≥0.1–<0.5; G4 <0.1 ×10⁹/L. These differ from v5.0.','v6.0：1级 ≥1.0–<1.5；2级 ≥0.5–<1.0；3级 ≥0.1–<0.5；4级 <0.1 ×10⁹/L。与 v5.0 不同。'),
    note:pair('This event alone does not assess fever, infection, or febrile neutropenia. A low grade is not a safety clearance.','本事件不能单独判断发热、感染或发热性中性粒细胞减少。低级别不代表安全。')
  },
  anemia: {
    label:pair('Anemia','贫血'),short:pair('Hemoglobin','血红蛋白'),kind:'lab',page:4,maxGrade:5,
    unit:pair('g/dL or g/L','g/dL 或 g/L'),
    fields:[num('value','Hemoglobin','血红蛋白',0,500),num('lln','Lower limit of normal (LLN)','正常值下限（LLN）',0.000001,500),select('unit','Hemoglobin unit','血红蛋白单位',[option('g/dL','g/dL','g/dL'),option('g/L','g/L','g/L')]),flag('transfusion','Transfusion indicated for anemia','因贫血需要输血'),urgent(),death()],
    summary:pair('G1: below LLN and ≥10; G2: ≥8–<10; G3: <8 g/dL or transfusion indicated. G4: life-threatening/urgent intervention. G5: death related to anemia.','1级：低于 LLN 且 ≥10；2级：≥8–<10；3级：<8 g/dL 或需输血；4级：危及生命/需紧急干预；5级：贫血相关死亡。'),
    note:pair('Clinical criteria can determine a higher grade than hemoglobin alone. All judgments refer to anemia.','临床标准可产生高于血红蛋白数值的级别。所有临床判断均须针对贫血。')
  },
  alt: {
    label:pair('Alanine aminotransferase increased','丙氨酸氨基转移酶升高'),short:pair('ALT','ALT'),kind:'lab',page:162,maxGrade:4,unit:pair('U/L for all three values','三个数值均为 U/L'),fields:labFields(),summary:liverSummary,
    note:pair('Use one consistent ULN for baseline and current results. A result below an elevated baseline but still above ULN is sent for review, not assigned a grade of zero.','基线与当前结果使用同一 ULN。若结果低于异常基线但仍高于 ULN，则需复核，不自动视为正常。')
  },
  ast: {
    label:pair('Aspartate aminotransferase increased','天门冬氨酸氨基转移酶升高'),short:pair('AST','AST'),kind:'lab',page:163,maxGrade:4,unit:pair('U/L for all three values','三个数值均为 U/L'),fields:labFields(),summary:liverSummary,
    note:pair('This grades a laboratory event; it does not diagnose hepatic failure or immune-mediated hepatitis.','本模块分级仅针对实验室事件，不能诊断肝衰竭或免疫介导性肝炎。')
  },
  bilirubin: {
    label:pair('Blood bilirubin increased','血胆红素升高'),short:pair('Total bilirubin','总胆红素'),kind:'lab',page:164,maxGrade:4,unit:pair('Same laboratory unit for every value','全部数值使用同一实验室单位'),fields:labFields(),
    summary:pair('Normal baseline: >1–1.5 / >1.5–3 / >3–10 / >10 × ULN. Elevated baseline: 1–1.5 / >1.5–2.5 / >2.5–10 / >10 × baseline.','基线正常：>1–1.5 / >1.5–3 / >3–10 / >10 倍 ULN。基线升高：1–1.5 / >1.5–2.5 / >2.5–10 / >10 倍基线。'),
    note:pair('Use total bilirubin, a consistent unit, and one consistent ULN. Below-baseline values that remain abnormal require review.','使用总胆红素、同一单位及同一 ULN。低于异常基线但仍异常的结果需复核。')
  },
  creatinine: {
    label:pair('Creatinine increased','肌酐升高'),short:pair('Creatinine','肌酐'),kind:'lab',page:166,maxGrade:4,unit:pair('Same laboratory unit for every value','全部数值使用同一实验室单位'),fields:[...labFields(),num('lln','Lower limit of normal (LLN)','正常值下限（LLN）',0.000001)],
    summary:pair('ULN branch: >1–1.5 / >1.5–3 / >3–6 / >6 × ULN. If baseline <LLN, >1.5–3 × baseline can give G2 and >3 × baseline G3. Use the highest matched grade.','ULN 分支：>1–1.5 / >1.5–3 / >3–6 / >6 倍 ULN。若基线 <LLN，>1.5–3 倍基线可为2级，>3 倍基线可为3级。取符合标准的最高级别。'),
    note:pair('This is a creatinine event, not a diagnosis or staging of acute kidney injury. A baseline of zero is not accepted.','本模块针对肌酐事件，并非急性肾损伤诊断或分期。不接受零基线。')
  },
  diarrhea: {
    label:pair('Diarrhea','腹泻'),short:pair('Diarrhea','腹泻'),kind:'symptom',page:51,maxGrade:5,unit:pair('Clinician-assessed adult features','临床评估的成人特征'),
    fields:[num('stools','Additional stools per day over baseline','每日较基线增加的排便次数',0,100,true),flag('consistency','Change in stool consistency','大便性状改变'),adl(),select('ostomy','Ostomy output relative to baseline','造口排出量较基线变化',[option('none','No increase / no ostomy','无增加 / 无造口'),option('moderate','Moderate increase','中度增加'),option('severe','Severe increase','重度增加'),option('other','Other increase — review','其他增加 — 需复核')]),flag('hospital','Hospitalization indicated for diarrhea','因腹泻需住院'),flag('iv','IV intervention required for diarrhea','腹泻需静脉干预'),urgent(),death()],
    summary:pair('G1: altered consistency/frequency. G2: 4–6 additional stools, moderate ostomy increase, or instrumental ADL limitation. G3: ≥7, severe ostomy increase, hospitalization, IV intervention, or self-care limitation. G4/5 use clinical criteria.','1级：性状/频次改变。2级：每日增加4–6次、中度造口增加或工具性活动受限。3级：增加≥7次、重度造口增加、需住院/静脉干预或自理受限。4/5级依据临床标准。'),
    note:pair('The assessment is not a diagnosis of colitis or enterocolitis. IV intervention is a grade 3 criterion for diarrhea in v6.0.','该评估不能诊断结肠炎或小肠结肠炎。v6.0 中腹泻需要静脉干预属于3级标准。')
  },
  nausea: {
    label:pair('Nausea','恶心'),short:pair('Nausea','恶心'),kind:'symptom',page:69,maxGrade:3,unit:pair('Clinician-assessed adult features','临床评估的成人特征'),
    fields:[select('intake','Appetite / intake criterion','食欲 / 摄入标准',[
      option('none','No listed appetite/intake criterion','不符合所列食欲/摄入标准'),option('appetite','Appetite loss; eating habits unchanged','食欲下降；饮食习惯未改变'),option('reduced','Intake reduced; no significant weight loss, dehydration or malnutrition','摄入减少；无明显体重下降、脱水或营养不良'),option('inadequate','Inadequate caloric or fluid intake','热量或液体摄入不足'),option('other','Other / uncertain pattern — review','其他 / 不确定 — 需复核')
    ]),flag('iv','IV intervention indicated for nausea','因恶心需静脉干预'),flag('support','Tube feeding or parenteral nutrition indicated','需管饲或肠外营养'),flag('hospital','Hospitalization indicated for nausea','因恶心需住院')],
    summary:pair('G1: appetite loss with unchanged eating habits. G2: reduced intake without significant weight loss/dehydration/malnutrition, or IV intervention. G3: inadequate intake, tube/parenteral feeding, or hospitalization. No G4 or G5 is defined for this term.','1级：食欲下降但饮食习惯未变。2级：摄入减少但无明显体重下降/脱水/营养不良，或需静脉干预。3级：摄入不足、需管饲/肠外营养或住院。本术语无4/5级。'),
    note:pair('Select the complete intake description; do not infer this grade from a 0–10 symptom score.','请选择完整的摄入描述；不可由0–10分症状评分推算该级别。')
  },
  neuropathy: {
    label:pair('Peripheral sensory neuropathy','周围感觉神经病变'),short:pair('Sensory neuropathy','感觉神经病变'),kind:'symptom',page:223,maxGrade:4,unit:pair('Clinician-assessed adult features','临床评估的成人特征'),
    fields:[select('severity','Clinician-assessed symptom severity','临床评估的症状程度',[option('none','No symptoms','无症状'),option('mild','Mild','轻度'),option('moderate','Moderate','中度'),option('severe','Severe','重度')]),adl(),urgent()],
    summary:pair('G1: mild symptoms. G2: moderate symptoms or instrumental ADL limitation. G3: severe symptoms or self-care limitation. G4: life-threatening consequences or urgent intervention. No G5 is defined.','1级：轻度症状；2级：中度症状或工具性活动受限；3级：重度症状或自理受限；4级：危及生命或需紧急干预。无5级。'),
    note:pair('This module covers sensory, not motor, neuropathy. Severity and function are assessed separately.','本模块仅覆盖感觉神经病变。症状程度和功能影响分别评估。')
  }
};
export const EVENT_IDS = Object.keys(EVENTS);
export const DIARY_SYMPTOMS = {
  fatigue:pair('Fatigue','疲乏'), nausea:pair('Nausea','恶心'), diarrhea:pair('Loose stools','稀便'), tingling:pair('Tingling / numbness','刺痛 / 麻木')
};
export function emptyInputs(event) {
  return Object.fromEntries(EVENTS[event].fields.map(f => [f.key,f.key==='unit' ? f.options[0].value : null]));
}
export function sourceLink(event) { return `${SOURCE}#page=${EVENTS[event].page}`; }
