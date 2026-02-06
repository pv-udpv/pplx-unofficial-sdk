# Schema-Driven Development

## OpenAPI Schema Structure

```yaml
# schemas/api/v2.17/openapi.yaml
openapi: 3.1.0
info:
  title: Service API
  version: 2.17.0

paths:
  /api/endpoint:
    post:
      summary: Endpoint summary
      operationId: operationName
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RequestSchema'
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ResponseSchema'
```

## Schema Validation

```python
# schemas/tools/validator.py
def validate_schema(schema_file: Path) -> bool:
    """Validate API schema structure."""
    with open(schema_file) as f:
        if schema_file.suffix in [".yaml", ".yml"]:
            import yaml
            schema = yaml.safe_load(f)
        else:
            schema = json.load(f)
    return True
```
