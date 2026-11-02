# Architecture and data contract

The application is a dependency-free static site. It has no server-side application, secret, database, analytics SDK, or medical-record integration.

## Modules

| File | Responsibility |
| --- | --- |
| `app/rules.mjs` | Event metadata, typed field descriptions, source pages, bilingual explanatory text, version constants |
| `app/engine.mjs` | Pure assessment, strict validation, case serialization, CSV exports, sorted timelines |
| `app/examples.mjs` | Four fully fabricated teaching cases |
| `app/units.mjs` | Decimal-exponent unit conversions preserving significant input digits |
| `app/ui.mjs` | In-memory state, forms, chart, timeline, diary, downloads and printable report |
| `app/sw.js` | Cache only a fixed list of static application assets; network-first loading with offline fallback |
| `scripts/serve.mjs` | Local static development server with path traversal protection |
| `scripts/check.mjs` | JavaScript syntax checks and heuristic detection of credentials, personal contact addresses, prohibited data files and unexpected browser transport/persistence APIs |

`assess(observation)` returns a new result without changing inputs. It records `status`, `grade`, `minimumGrade`, `reasons`, `missing`, `ruleId`, `source`, `standard`, `engineVersion`, and relevant branch/ratio information. Five statuses are possible: `graded`, `none`, `incomplete`, `review`, `invalid`.

Numeric form state updates on the **input** event so the displayed value and result stay synchronized. Result areas rerender without replacing the active numeric editor. Unit changes for neutrophils and hemoglobin convert all affected numeric inputs; other lab events require consistent units directly.

## JSON contract

The exact top-level structure is:

```json
{
  "schema": "otw.case.v1",
  "standard": "CTCAE v6.0 (2025-07-22)",
  "scope": "adult-education",
  "scenario": "custom",
  "observations": [
    {
      "id": 1,
      "day": 1,
      "cycle": 1,
      "event": "anc",
      "inputs": {"value": 0.3, "unit": "10^9/L"}
    }
  ],
  "diary": []
}
```

This illustration is fabricated. There are no person identifiers or free-text fields. `id` is a local row number, not a patient identifier.

- Imports: at most 256 KiB UTF-8, 1–200 observations, 0–200 diary entries.
- Local row IDs: unique positive integers up to 1,000,000 within each collection.
- Study day: integer −3650 through 36500; no calendar date. Cycle: integer 1–200.
- Event keys: `anc`, `anemia`, `alt`, `ast`, `bilirubin`, `creatinine`, `diarrhea`, `nausea`, `neuropathy`.
- All fields declared for an event must exist; unassessed fields are `null`. Values must match their numeric, enumerated or boolean type. No numeric-string coercion.
- Scenario: `nadir`, `liver`, `symptoms`, `incomplete`, or `custom`; this labels the teaching context and never influences grading.
- Diary fields: exactly `id`, `day`, `symptom`, `intensity`, `interference`. Symptom is `fatigue`, `nausea`, `diarrhea`, or `tingling`; scores are integers 0–10.
- Unknown fields, incompatible versions, unexpected objects, out-of-range values, duplicate IDs and unsupported units are rejected.
- Import is transactional: parse and validate a candidate before replacing the active case. A failed import leaves the current case intact.

JSON preserves inputs, not computed grades. On import, grades are recomputed by the current engine. CSV includes the engine version and local rule ID to identify how a saved calculation was produced. A future engine change may change results; retain the software version when reproducibility is required.

## Export safety

Assessment CSV includes raw structured inputs and the explanation. Fields use quoted RFC-style CSV with embedded quotes doubled. Spreadsheet formula prefixes are made inert; negative study days are exported as apostrophe-prefixed text. JSON remains the lossless round-trip format. Diary CSV is separate and clearly names the custom score scale.

Rendered strings are escaped. The content security policy permits local scripts/styles and rejects inline scripts, plugins and form submissions. Source links use `noreferrer`. All application assets are bundled; there are no remote fonts or scripts.

The code-level scan is a heuristic, not a general privacy classifier. Numeric clinical data may still be sensitive, and a valid schema does not imply de-identification. The intended use is synthetic education.

## Deployment

`npm run build` copies `app/` to `dist/`. `.github/workflows/ci.yml` checks syntax/privacy heuristics and runs tests. `.github/workflows/pages.yml` checks, tests and builds before uploading a Pages artifact. Only the deployment job gets Pages-write and OIDC permissions; checkout does not persist credentials.

No secrets are embedded in application files or required to run the site. GitHub infrastructure handles publishing authentication outside the application.
