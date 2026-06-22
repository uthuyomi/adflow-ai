FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl git nodejs npm util-linux \
    && npm install --global @openai/codex@0.141.0 \
    && useradd --create-home --shell /usr/sbin/nologin codexrunner \
    && mkdir -p /tmp/adflow-codex \
    && chown codexrunner:codexrunner /tmp/adflow-codex \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY . ./backend
RUN chmod -R o-rwx /app/backend

EXPOSE 8080

CMD ["sh", "-c", "uvicorn backend.api.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
