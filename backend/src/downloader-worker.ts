import { loadConfig } from "./config/env";
import { MongoDatabase } from "./infrastructure/mongo/client";
import { MongoMediaAssetRepository } from "./modules/media/repository";
import { SeaweedFsMediaStore } from "./infrastructure/media/seaweedfs-store";
import { RedisClientAdapter } from "./infrastructure/queue/redis-client";
import {
  RedisMediaDownloadQueue,
  YtDlpMediaWorker,
  createYtDlpConfig,
} from "./modules/media/download-queue";
import { ProcessYtDlp } from "./modules/media/yt-dlp";

const config = loadConfig();
const mongo = new MongoDatabase({
  uri: config.mongoUri,
  database: config.mongoDatabase,
});
await mongo.connect();
const repository = new MongoMediaAssetRepository(mongo);
await repository.ensureIndexes();
if (!config.seaweedfsEndpoint || !config.redisUrl)
  throw new Error(
    "SEAWEEDFS_ENDPOINT and REDIS_URL are required for downloader",
  );
const redis = new RedisClientAdapter(config.redisUrl);
await redis.connect();
const store = new SeaweedFsMediaStore(
  {
    endpoint: config.seaweedfsEndpoint,
    bucket: config.seaweedfsBucket ?? "saveyour-tech",
    accessKey: config.seaweedfsAccessKey,
    secretKey: config.seaweedfsSecretKey,
    maxBytes: config.mediaMaxBytes ?? 25 * 1024 * 1024,
  },
  repository,
);
const worker = new YtDlpMediaWorker(
  new RedisMediaDownloadQueue(redis),
  store,
  new ProcessYtDlp(
    createYtDlpConfig(
      config.ytDlpBinary ?? "yt-dlp",
      config.ytDlpTempDir ?? "/tmp/saveyour-tech",
      config.mediaMaxBytes ?? 25 * 1024 * 1024,
      config.requestTimeoutMs ?? 10_000,
    ),
  ),
);
console.log("Media downloader worker ready");
while (true) {
  if (!(await worker.runOnce()))
    await new Promise((resolve) => setTimeout(resolve, 1000));
}
