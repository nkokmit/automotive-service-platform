FROM python:3.11-slim

WORKDIR /app

RUN pip install uv

# Embedding chạy CPU-only → dùng index PyPI của PyTorch để không kéo theo
# các wheel CUDA (nvidia-*-cu13) — chúng rất nặng và làm build image chậm.
ENV UV_INDEX_STRATEGY=unsafe-best-match \
    UV_EXTRA_INDEX_URL=https://download.pytorch.org/whl/cpu \
    UV_TORCH_BACKEND=cpu

# Copy the whole package BEFORE installing: hatchling needs `app/` to resolve
# the project name (`agent_service`) when building the wheel.
COPY pyproject.toml README.md ./
COPY app/ ./app/

RUN uv pip install --system --no-cache . \
    --extra-index-url https://download.pytorch.org/whl/cpu \
    --index-strategy unsafe-best-match

EXPOSE 8002

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8002"]
