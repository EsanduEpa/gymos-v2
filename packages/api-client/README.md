# Shared typed API transport

GYMOS-MIG-002 adds an injectable fetch transport shared by web server adapters and future native clients. It validates the caller-supplied response schema, uses existing origin-relative routes, disables caching/redirect following and never logs tokens or response bodies. The web application must keep its bearer token server-side; native storage policy belongs to its approved mobile task.

Callers supply strict feature or `@gymos/contracts/legacy` response schemas. This package does not add endpoints, global client token storage, cookies, business rules, retries or new page integration. A schema parse is not authorization and cannot replace backend guards.

Mutations are never automatically retried. Network/invalid-success/5xx/unknown legacy command outcomes return `unknown-outcome`; reconcile the operation/resource before submitting another intent. An idempotency key is sent only when supplied; the owning feature makes it mandatory where required and the server enforces it. A validated HTTP failure can expose only its approved safe envelope. Raw legacy Nest error details, malformed responses and failed schema data are not retained.
