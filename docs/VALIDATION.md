# Verification record

Software version: **1.0.0**. Clinical source: **CTCAE v6.0, 2025-07-22**. Verification date: **2026-11-02**.

## Automated verification

`npm test`: **223 tests passed, 0 failed**.

Coverage from `npm run coverage`:

| Module | Line coverage | Branch coverage |
| --- | --- | --- |
| `app/engine.mjs` | 100.00% | 99.23% |
| `app/examples.mjs` | 100.00% | 100.00% |
| `app/rules.mjs` | 100.00% | 100.00% |

This instrumentation covers modules loaded by the Node tests. It does **not** measure browser UI or service-worker test coverage.

Fixtures cover:

- Both sides and exact equality at ANC, hemoglobin, normal/elevated-baseline liver, bilirubin, and creatinine thresholds.
- ANC cells/µL and ×10⁹/L equivalence; hemoglobin g/L and g/dL equivalence.
- Decimal product boundaries, including 0.45 versus 1.5 × 0.3, without display rounding changing a grade.
- ALT/AST baseline >5 × ULN with an uncovered G3 combination; abnormal results below elevated baseline; unknown baseline.
- Creatinine's below-LLN baseline alternatives, including baseline equal to LLN and invalid zero baseline.
- Independent clinical criteria, highest-grade selection, missing higher-grade features, and maximum-grade behavior.
- No unsupported G4/G5 for nausea or G5 for sensory neuropathy.
- Input type/range checks, forbidden extra fields, incompatible versions, malformed and oversized JSON, duplicate IDs, and bounded collection sizes.
- JSON round trips, transactional rejection, spreadsheet-safe CSV fields, explicit unknown results and separate diary labeling.
- Engine immutability, timeline sorting, and separation of diary scores from CTCAE results.

`npm run check` passes JavaScript syntax checks and heuristic source scanning. `npm run build` produces the static site successfully without dependencies or application secrets.

## Interactive browser checks

Verified in the browser preview:

| Workflow | Observed behavior |
| --- | --- |
| Initial synthetic case | Day-15 ANC 0.3 ×10⁹/L displays G3 with a source-linked explanation |
| Live numeric editing | 0.5 displays G2 immediately; blank displays incomplete |
| Unit change | 0.3 ×10⁹/L converts to 300 cells/µL and retains G3 |
| Clinical override example | Diarrhea with three additional stools/day and required IV intervention displays G3 |
| Timeline | Distinct event rows, same-day observations and individual grades remain separate |
| Diary | Custom intensity/interference entry is added without becoming a CTCAE assessment |
| Language | Chinese headings and controls render after switching languages |
| JSON download | Downloaded browser file parses with the same six observations and three diary entries |
| Valid local JSON import | Missing-data example loads with an incomplete ALT result |
| Invalid local JSON import | Rejected with an explanation; prior case remains intact |
| Print report | Contains all case inputs, standard, software version, rules, reasons and incomplete/review states |
| Layout | Desktop screenshot inspected; forms, chart, result panel and navigation render clearly |

Responsive styles are included, but this record does not claim exhaustive mobile, screen-reader, offline, or cross-browser validation. The printable report content was checked; physical printer output was not tested.

## Limits

No independent clinician validation, prospective clinical evaluation, regulatory clearance, institutional deployment, EHR integration, or performance claim is made. Test fixtures and implementation share the same source interpretation; coverage does not prove clinical correctness. Review the pinned source and the protocol before any clinical use, which is outside this prototype's intended scope.

GitHub Actions provides the public build/test history under the repository's **Actions** tab.
