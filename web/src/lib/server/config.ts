import os from "os";
import path from "path";

const DEFAULT_MEMPOOL_API = "https://mempool.space/api";
const DEFAULT_ESPLORA_API = "https://blockstream.info/api";

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export function getApiSources(): string[] {
  const candidates = [
    process.env.TXRAY_MEMPOOL_API || DEFAULT_MEMPOOL_API,
    process.env.TXRAY_ESPLORA_API || DEFAULT_ESPLORA_API,
  ].map(normalizeBaseUrl);

  return candidates.filter((url, index, all) => url && all.indexOf(url) === index);
}

export function getPrimaryApiBase(): string {
  return getApiSources()[0];
}

export function getDataDir(): string {
  return process.env.TXRAY_DATA_DIR || path.join(os.tmpdir(), "txray");
}

export function getResultsDir(): string {
  return path.join(getDataDir(), "out");
}
