FROM python:3.12-slim

WORKDIR /app

# Copy package files
COPY packages/shared-python /app/packages/shared-python
COPY services/auth-service /app/services/auth-service
COPY pyproject.toml /app/

# Install dependencies
RUN pip install --no-cache-dir -e .

# Expose port
EXPOSE 8001

# Run the service
CMD ["python", "-m", "services.auth-service.runtime.main"]
