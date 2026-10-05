# VISIUM Spatial Pipeline — imagen headless para cloud
FROM python:3.11-slim

# Dependencias nativas: pymeshlab necesita GL/X runtime aun en modo headless;
# open3d solo las usa para visualización (no requerida acá).
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglu1-mesa libxrender1 libxext6 libsm6 \
    curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Node 20 para la compresión Draco/WebP final (npx @gltf-transform/cli)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g @gltf-transform/cli

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY pipeline/ pipeline/
COPY service/ service/

EXPOSE 8000
CMD ["uvicorn", "service.api:app", "--host", "0.0.0.0", "--port", "8000"]
