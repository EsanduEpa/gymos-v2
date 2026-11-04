# GYMOS-MIG-061 evidence — 4 November 2026

**Status: In Progress.** Added owner-only authenticated export for operational revenue, expenses, payroll and the current filtered audit page. Exports use bounded repeatable-read snapshots, strict input allowlists, maximum 5,000 source rows, a stable safe filename, UTF-8 BOM, CRLF, quoted cells, spreadsheet-formula defense, `no-store`, `nosniff`, and a tenant `CSV_EXPORTED` audit event. Next.js route proxies the session cookie to the authenticated API and returns attachment bytes.

Owned finance PostgreSQL suite passed 2/2, including 106 expense rows, UTF-8 BOM, formula-leading description, filtered audit page and authorization/cap denials. CSV helper tests passed 5/5. MIME/filename browser download review, cancellation behavior and hosted checks remain open.
