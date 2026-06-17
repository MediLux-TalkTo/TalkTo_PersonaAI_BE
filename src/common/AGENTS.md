# COMMON KNOWLEDGE BASE

## OVERVIEW

`src/common/` contains shared API contracts, guards, decorators, enums, interfaces, filters, and low-level utilities used by multiple modules.

## STRUCTURE

```text
common/
+-- decorators/   # `@CurrentUser`, `@Roles`
+-- dto/          # Error envelope DTOs
+-- enums/        # Cross-module product/status enums
+-- filters/      # Global HTTP exception filter
+-- guards/       # JWT and role guards
+-- interfaces/   # JWT payload contract
+-- swagger/      # Common Swagger decorators/DTOs
+-- utils/        # Response envelope and log sanitization
```

## WHERE TO LOOK

| Task | Location | Notes |
| --- | --- | --- |
| Standard success envelope | `utils/api-response.ts` | Returns `{ data, meta? }`. |
| Standard error envelope | `filters/http-exception.filter.ts`, `dto/error-response.dto.ts` | Global filter controls runtime shape. |
| Authenticated user | `decorators/current-user.decorator.ts`, `interfaces/jwt-payload.interface.ts` | User id/role come from JWT strategy. |
| Role checks | `decorators/roles.decorator.ts`, `guards/roles.guard.ts` | Admin-only routes compose these with `JwtAuthGuard`. |
| Archive statuses | `enums/archive.enums.ts` | Shared by subjects/questions/recordings. |
| Logging categories | `enums/log.enum.ts`, `utils/sanitize.util.ts` | Use sanitized details for failures. |

## CONVENTIONS

- Add enums here only when at least two modules share the value set.
- Keep API envelope helpers tiny; module DTOs should own product-specific fields.
- Error responses should remain client-actionable but avoid leaking internal provider or DB details.
- Guards should throw framework exceptions and let the global filter shape the response.

## ANTI-PATTERNS

- Do not duplicate enum strings inside services when a common enum already exists.
- Do not log raw transcripts, voice text, tokens, passwords, or provider secrets in `SystemLog.detail`.
- Do not add feature-specific business rules to common guards or utilities; keep those in the owning service.
- Do not treat `SystemLogCategory` as a security audit taxonomy without creating explicit audit semantics.
