# API contracts

`openapi.json` is generated from the backend and committed so the separately
owned frontend can generate its TypeScript client without duplicating schemas.

Regenerate it with:

```bash
cd backend
uv run python scripts/export_openapi.py ../contracts/openapi.json
```

