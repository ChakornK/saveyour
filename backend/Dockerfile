FROM oven/bun:1-debian

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg ca-certificates curl python3 python3-pip \
  && pip3 install --no-cache-dir --break-system-packages yt-dlp \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json bun.lock tsconfig.json ./
RUN bun install --frozen-lockfile
COPY src ./src
RUN mkdir -p /app/models \
  && curl -L --fail --retry 3 -o /app/models/image-tagger.onnx https://huggingface.co/Xenova/clip-vit-base-patch32/resolve/main/onnx/vision_model.onnx \
  && curl -L --fail --retry 3 -o /app/models/text-model.onnx https://huggingface.co/Xenova/clip-vit-base-patch32/resolve/main/onnx/text_model.onnx \
  && curl -L --fail --retry 3 -o /app/models/tokenizer.json https://huggingface.co/Xenova/clip-vit-base-patch32/resolve/main/tokenizer.json \
  && curl -L --fail --retry 3 -o /app/models/tokenizer-config.json https://huggingface.co/Xenova/clip-vit-base-patch32/resolve/main/tokenizer_config.json \
  && test -s /app/models/image-tagger.onnx -a -s /app/models/text-model.onnx -a -s /app/models/tokenizer.json -a -s /app/models/tokenizer-config.json
COPY test ./test
RUN bun run typecheck

RUN useradd --create-home --shell /usr/sbin/nologin appuser \
  && chown -R appuser:appuser /app
USER appuser

EXPOSE 3000
CMD ["bun", "src/index.ts"]
