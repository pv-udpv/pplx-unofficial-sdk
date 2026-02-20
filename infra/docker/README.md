# Docker

This directory contains Docker configurations for services.

## Structure

```
docker/
├── gateway/
│   └── Dockerfile
├── auth-service/
│   └── Dockerfile
├── knowledge-api/
│   └── Dockerfile
└── docker-compose.yml
```

## Usage

```bash
# Build all services
docker-compose build

# Start services
docker-compose up -d

# Stop services
docker-compose down
```
