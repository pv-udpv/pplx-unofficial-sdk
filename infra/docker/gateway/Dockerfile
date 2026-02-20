FROM python:3.12-slim

WORKDIR /app

# Copy package files
COPY packages/shared-python /app/packages/shared-python
COPY services/gateway /app/services/gateway
COPY pyproject.toml /app/

# Install dependencies
RUN pip install --no-cache-dir -e .

# Expose port
EXPOSE 8000

# Run the service
CMD ["python", "-m", "services.gateway.runtime.main"]
