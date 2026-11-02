# Implemented clinical rules

Standard: **NCI CTCAE v6.0, July 22, 2025 (MedDRA 28.0)**. Source checked November 2, 2026. Implementation: `1.0.0`.

Primary reference: [NCI CTCAE v6.0 Quick Reference](https://dctd.cancer.gov/research/ctep-trials/for-sites/adverse-events/ctcae-v6.pdf). Page numbers below are the document's printed page numbers, matching PDF anchors.

This is an implementation trace, not a complete or official CTCAE reproduction. The engine's `ctcae6.<event>.1` identifiers are local software rule identifiers, **not MedDRA identifiers**.

## Common behavior

- Semicolon-separated criteria in CTCAE are alternatives (OR); the highest matched grade applies.
- The engine distinguishes a matched grade, no implemented criterion met, incomplete information, an uncovered combination requiring review, and invalid inputs.
- No implemented criterion met has `grade: null`. It is not CTCAE grade 0 or evidence of no toxicity.
- Missing features have a maximum possible grade. If they could raise the known grade, the result stays incomplete with `minimumGrade` when supported. Unknown lower-grade features do not prevent an established higher grade. An established maximum grade can resolve a review descriptor that cannot raise it further.
- Laboratory results, baselines and reference limits must use compatible units and one comparable reference range. The engine does not reconcile different laboratories or changing reference limits.
- No rounded display ratio drives a classification. Decimal cross-products compare ratio thresholds, including equality such as `0.45 = 1.5 × 0.3`.

## Laboratory modules

| Event / source page | Implemented numeric logic | Additional behavior |
| --- | --- | --- |
| Neutrophil count decreased, p.170 | In ×10⁹/L: G1 `[1,1.5)`; G2 `[0.5,1)`; G3 `[0.1,0.5)`; G4 `[0,0.1)` | cells/µL are divided by 1000. No G5. v6.0 differs from v5.0. Fever and infection are not assessed. |
| Anemia, p.4 | In g/dL: G1 below LLN and ≥10; G2 `[8,10)`; G3 `<8` | Transfusion indicated → G3; life-threatening consequence or urgent intervention indicated → G4; death attributed to anemia → G5. g/L is divided by 10. Clinical flags refer specifically to anemia. |
| ALT increased, p.162 | Normal/below-normal baseline: G1 `(1,3]`, G2 `(3,5]`, G3 `(5,20]`, G4 `>20` × ULN | Elevated baseline: G1 `[1,1.5]`, G2 `(1.5,2]`, G3 `(2,4]`, G4 `>4` × baseline. The elevated-baseline G3 branch requires baseline ≤5 × ULN. |
| AST increased, p.163 | Same numeric branches as ALT | Same baseline restrictions; event retained separately. |
| Blood bilirubin increased, p.164 | Normal/below-normal baseline: G1 `(1,1.5]`, G2 `(1.5,3]`, G3 `(3,10]`, G4 `>10` × ULN | Elevated baseline: G1 `[1,1.5]`, G2 `(1.5,2.5]`, G3 `(2.5,10]`, G4 `>10` × baseline. Uses total bilirubin. |
| Creatinine increased, p.166 | ULN branch: G1 `(1,1.5]`, G2 `(1.5,3]`, G3 `(3,6]`, G4 `>6` × ULN | Only when baseline <LLN: `(1.5,3]` × baseline also supports G2; `>3` × baseline supports G3. Take the highest of both branches. Baseline equal to LLN does not activate this branch. Baseline zero is invalid. |

ALT/AST/bilirubin results at an elevated baseline may meet G1 under the literal v6.0 baseline interval. This does **not** establish treatment-emergent toxicity or causality.

Conservative review cases:

1. ALT, AST or bilirubin remains above ULN but falls below an elevated baseline. The implemented baseline intervals do not assign a grade; the app requests source/protocol review.
2. ALT or AST baseline exceeds 5 × ULN while the current result is >2–4 × baseline. The source's elevated-baseline G3 qualifier does not cover that combination; no fallback grade is invented.
3. Unknown baseline prevents selecting the normal versus elevated branch, even if a ULN ratio alone appears familiar.

Creatinine's low-baseline branch can produce a grade even when the current result is below ULN. This is the source's baseline criterion, not an acute kidney injury diagnosis.

## Clinician-assessed symptom modules

All features refer to the event being assessed. Instrumental activities include meal preparation, shopping and managing money. Self-care includes bathing, dressing, eating, toileting and taking medication. The interface covers adult activities only.

| Event / source page | Supported feature mapping |
| --- | --- |
| Diarrhea, p.51 | G1: consistency or frequency change. G2: 4–6 extra stools/day, moderate ostomy output increase, or instrumental ADL limitation. G3: ≥7 extra stools/day, severe ostomy output increase, hospitalization indicated, IV intervention required, or self-care limitation. G4: life-threatening consequence or urgent intervention indicated. G5: death attributed to diarrhea. |
| Nausea, p.69 | G1: appetite loss without changed eating habits. G2: decreased intake without significant weight loss, dehydration or malnutrition, or IV intervention indicated. G3: inadequate calorie/fluid intake, indicated tube/parenteral feeding, or indicated hospitalization. G4/G5 are unavailable for this term. |
| Peripheral sensory neuropathy, p.223 | G1: mild symptoms. G2: moderate symptoms or instrumental ADL limitation. G3: severe symptoms or self-care limitation. G4: life-threatening consequence or urgent intervention indicated. G5 is unavailable. Motor neuropathy is outside this module. |

The diarrhea form captures changes in frequency as additional stools/day, consistency separately, and moderate/severe ostomy increases explicitly. An unclassified ostomy change triggers review. The nausea intake field requires choosing the complete qualifying description; an uncertain pattern triggers review. It does not infer weight loss, hydration, nutrition, or functional impact from a generic symptom score.

## Separate diary

The diary uses custom integer intensity/interference scores from 0–10 for a single fictional study day. It does not copy validated PRO-CTCAE items, use the PRO-CTCAE scoring scale, or map scores to clinician CTCAE grades. Its CSV labels the instrument as custom and educational.

[NCI describes PRO-CTCAE as complementary to clinician CTCAE](https://healthcaredelivery.cancer.gov/pro-ctcae/overview.html). Studies requiring PRO-CTCAE should use the official item library and validated translations, with an appropriate study design. This diary is not a replacement.

## Deliberate exclusions

No pediatric grading; no v5.0 mode or automatic cross-version conversion; no drug attribution; no SAE/reportability determination; no treatment or dose recommendations; no DLT or immune-related adverse-event management; no organ-failure diagnosis; no real-patient storage.

English NCI criteria remain authoritative. Chinese interface text is an unofficial explanation. Automated tests verify implementation behavior against fixtures, not clinical effectiveness or independent clinical validation.
