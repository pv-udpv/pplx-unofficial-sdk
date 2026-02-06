FROM python:3.12-slim

WORKDIR /app

# Copy package files
COPY packages/shared-python /app/packages/shared-python
COPY services/knowledge-api /app/services/knowledge-api
COPY pyproject.toml /app/

# Install dependencies
RUN pip install --no-cache-dir -e .

# Expose port
EXPOSE 8002

# Run the service
CMD ["python", "-m", "services.knowledge-api.runtime.main"]
