FROM otel/opentelemetry-collector-contrib:0.87.0

COPY collector-config.yaml /etc/otelcol-contrib/config.yaml

# TODO: 確認。とりあえずLinter通すために追加。試せていない。
RUN useradd -m appuser
USER appuser

# TODO: 確認。とりあえずLinter通すために追加。試せていない。
HEALTHCHECK CMD curl --fail http://localhost:4318 || exit 1",