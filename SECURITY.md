# Security and data handling

Use fabricated teaching data only. This repository and its demo contain no API keys, patient records, personal contact information, or private database.

- Assessment and diary state lives only in browser memory. Reloading clears edits.
- There is no application server, analytics, authentication flow, or integration with a medical system.
- Static assets are cached for offline fallback. Imported files and downloaded reports are not sent to a server or stored in the service-worker cache.
- JSON import is size-limited and rejects extra fields, unknown versions, unexpected types and unsupported values before replacing state.
- No arbitrary free-text fields or calendar dates are supported. Validation does not prove that numbers are synthetic or de-identified.
- Downloads may contain whatever numeric data the user entered. Keep case exports outside the public repository.
- External NCI/GitHub links and static hosting involve ordinary requests to those providers. This is not a guarantee of network anonymity or regulatory compliance.

The source check scans for common credential patterns, contact email addresses, prohibited database/data file types, and unexpected browser transport/persistence APIs. It is a heuristic supplement to manual review, not a complete secret or privacy detector.

Report ordinary bugs through GitHub Issues with a minimal synthetic example. Never attach real clinical data, credentials, private datasets, or personal information. For sensitive security details, use GitHub private vulnerability reporting if it is available on the repository.

The MIT license covers the application code. Clinical terminology and source instruments have their own terms. This educational prototype has not undergone independent clinical validation or a security audit.
