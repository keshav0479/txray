"use client";

import { useEffect, useRef, useState } from "react";
import { fetchBlockByHeight, fetchFees, fetchTipHeight } from "@/lib/mempool";

const MEMPOOL_WS_URL = "wss://mempool.space/api/v1/ws";
const BASE_RECONNECT_MS = 1_000;
const MAX_RECONNECT_MS = 15_000;
const REST_RECONCILE_MS = 45_000;

export interface LiveFeeRates {
  fastestFee: number;
  halfHourFee: number;
  economyFee: number;
}

export type MempoolWSConnectionState =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

export interface UseMempoolWSResult {
  tipHeight: number | null;
  fees: LiveFeeRates | null;
  mempoolTxCount: number | null;
  lastBlockTimestamp: number | null;
  isConnected: boolean;
  isConnecting: boolean;
  connectionState: MempoolWSConnectionState;
  reconnectAttempt: number;
  lastMessageAt: number | null;
  error: string | null;
}

type AnyRecord = Record<string, unknown>;

interface FeePatch {
  fastestFee?: number;
  halfHourFee?: number;
  economyFee?: number;
}

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readNumber(record: AnyRecord, keys: string[]): number | undefined {
  for (const key of keys) {
    const next = toFiniteNumber(record[key]);
    if (next !== undefined) return next;
  }
  return undefined;
}

function normalizeUnixSeconds(value: number): number {
  if (!Number.isFinite(value)) return 0;
  // API data is usually unix seconds, but occasionally milliseconds can appear.
  if (value > 10_000_000_000) return Math.floor(value / 1_000);
  return Math.floor(value);
}

function extractTipHeight(payload: AnyRecord): number | undefined {
  const topLevelBlock = payload.block;
  if (isRecord(topLevelBlock)) {
    const blockHeight = readNumber(topLevelBlock, ["height", "blockHeight"]);
    if (blockHeight !== undefined) return Math.round(blockHeight);
  }

  const blocks = payload.blocks;
  if (Array.isArray(blocks)) {
    const heights = blocks
      .map((b) => {
        if (!isRecord(b)) return undefined;
        return readNumber(b, ["height", "blockHeight"]);
      })
      .filter((v): v is number => v !== undefined);
    if (heights.length > 0) return Math.round(Math.max(...heights));
  }

  const mempoolInfo = payload.mempoolInfo;
  if (isRecord(mempoolInfo)) {
    const blockHeight = readNumber(mempoolInfo, ["blockHeight", "height"]);
    if (blockHeight !== undefined) return Math.round(blockHeight);
  }

  return undefined;
}

function extractBlockTimestamp(payload: AnyRecord): number | undefined {
  const topLevelBlock = payload.block;
  if (isRecord(topLevelBlock)) {
    const ts = readNumber(topLevelBlock, ["timestamp", "time"]);
    if (ts !== undefined) return normalizeUnixSeconds(ts);
  }

  const blocks = payload.blocks;
  if (Array.isArray(blocks) && blocks.length > 0) {
    const timestamps = blocks
      .map((block) => {
        if (!isRecord(block)) return undefined;
        return readNumber(block, ["timestamp", "time"]);
      })
      .filter((v): v is number => v !== undefined);
    if (timestamps.length > 0) {
      return normalizeUnixSeconds(Math.max(...timestamps));
    }
  }

  return undefined;
}

function extractFeePatch(candidate: unknown): FeePatch | null {
  if (!isRecord(candidate)) return null;

  const fastestFee = readNumber(candidate, ["fastestFee", "fastest", "fast"]);
  const halfHourFee = readNumber(candidate, [
    "halfHourFee",
    "halfHour",
    "half_hour_fee",
  ]);
  const economyFee = readNumber(candidate, [
    "economyFee",
    "economy",
    "minimumFee",
    "minimum",
  ]);

  if (
    fastestFee === undefined &&
    halfHourFee === undefined &&
    economyFee === undefined
  ) {
    return null;
  }

  return { fastestFee, halfHourFee, economyFee };
}

function extractFees(payload: AnyRecord): FeePatch | null {
  const direct = extractFeePatch(payload.fees);
  if (direct) return direct;

  const stats = payload.stats;
  const fromStats = extractFeePatch(stats);
  if (fromStats) return fromStats;

  const mempoolInfo = payload.mempoolInfo;
  if (isRecord(mempoolInfo)) {
    const fromMempoolInfo = extractFeePatch(mempoolInfo.fees);
    if (fromMempoolInfo) return fromMempoolInfo;
  }

  return null;
}

function extractMempoolTxCount(payload: AnyRecord): number | undefined {
  const mempoolInfo = payload.mempoolInfo;
  if (isRecord(mempoolInfo)) {
    const count = readNumber(mempoolInfo, [
      "count",
      "size",
      "txCount",
      "tx_count",
      "transactions",
    ]);
    if (count !== undefined) return Math.max(0, Math.round(count));
  }

  const stats = payload.stats;
  if (isRecord(stats)) {
    const count = readNumber(stats, ["mempoolTxCount", "txCount", "count"]);
    if (count !== undefined) return Math.max(0, Math.round(count));
  }

  const mempoolBlocks = payload["mempool-blocks"];
  if (Array.isArray(mempoolBlocks)) {
    const total = mempoolBlocks.reduce((sum, block) => {
      if (!isRecord(block)) return sum;
      const txs = readNumber(block, ["nTx", "tx_count", "count"]);
      return sum + (txs ?? 0);
    }, 0);
    if (total > 0) return Math.round(total);
  }

  return undefined;
}

function mergeFees(previous: LiveFeeRates | null, patch: FeePatch | null): LiveFeeRates | null {
  if (!patch) return previous;

  const fastestFee = patch.fastestFee ?? previous?.fastestFee;
  const halfHourFee = patch.halfHourFee ?? previous?.halfHourFee;
  const economyFee = patch.economyFee ?? previous?.economyFee;

  if (
    fastestFee === undefined ||
    halfHourFee === undefined ||
    economyFee === undefined
  ) {
    return previous;
  }

  return {
    fastestFee: Math.max(1, Math.round(fastestFee)),
    halfHourFee: Math.max(1, Math.round(halfHourFee)),
    economyFee: Math.max(1, Math.round(economyFee)),
  };
}

function mergeBlockProgress(
  previousHeight: number | null,
  previousTimestamp: number | null,
  candidateHeight?: number,
  candidateTimestamp?: number,
): { tipHeight: number | null; lastBlockTimestamp: number | null } {
  let tipHeight = previousHeight;
  let lastBlockTimestamp = previousTimestamp;

  // No block signal in this message.
  if (candidateHeight === undefined && candidateTimestamp === undefined) {
    return { tipHeight, lastBlockTimestamp };
  }

  // Height-driven update: only move forward (or refresh timestamp for same height).
  if (candidateHeight !== undefined) {
    if (tipHeight === null || candidateHeight > tipHeight) {
      tipHeight = candidateHeight;
      if (candidateTimestamp !== undefined) {
        lastBlockTimestamp = candidateTimestamp;
      }
      return { tipHeight, lastBlockTimestamp };
    }

    if (candidateHeight === tipHeight) {
      if (
        candidateTimestamp !== undefined &&
        (lastBlockTimestamp === null || candidateTimestamp > lastBlockTimestamp)
      ) {
        lastBlockTimestamp = candidateTimestamp;
      }
      return { tipHeight, lastBlockTimestamp };
    }

    // Stale block signal (lower height): ignore completely.
    return { tipHeight, lastBlockTimestamp };
  }

  // Timestamp-only packets can initialize timestamp if we have nothing yet.
  if (tipHeight === null && candidateTimestamp !== undefined && lastBlockTimestamp === null) {
    lastBlockTimestamp = candidateTimestamp;
  }

  return { tipHeight, lastBlockTimestamp };
}

export function useMempoolWS(): UseMempoolWSResult {
  const wsRef = useRef<WebSocket | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconcileTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const disposedRef = useRef(false);
  const latestTipRef = useRef<number | null>(null);
  const latestTimestampRef = useRef<number | null>(null);

  const [state, setState] = useState<UseMempoolWSResult>({
    tipHeight: null,
    fees: null,
    mempoolTxCount: null,
    lastBlockTimestamp: null,
    isConnected: false,
    isConnecting: true,
    connectionState: "connecting",
    reconnectAttempt: 0,
    lastMessageAt: null,
    error: null,
  });

  useEffect(() => {
    latestTipRef.current = state.tipHeight;
    latestTimestampRef.current = state.lastBlockTimestamp;
  }, [state.tipHeight, state.lastBlockTimestamp]);

  useEffect(() => {
    const clearRetryTimer = () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };

    const clearReconcileTimer = () => {
      if (reconcileTimerRef.current) {
        clearInterval(reconcileTimerRef.current);
        reconcileTimerRef.current = null;
      }
    };

    const closeSocket = () => {
      if (!wsRef.current) return;
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    };

    const scheduleReconnect = () => {
      if (disposedRef.current || retryTimerRef.current) return;

      reconnectAttemptRef.current += 1;
      const expDelay = Math.min(
        MAX_RECONNECT_MS,
        BASE_RECONNECT_MS * 2 ** (reconnectAttemptRef.current - 1),
      );
      const jitter = Math.floor(Math.random() * 400);
      const delayMs = expDelay + jitter;

      setState((prev) => ({
        ...prev,
        isConnected: false,
        isConnecting: true,
        connectionState: "reconnecting",
        reconnectAttempt: reconnectAttemptRef.current,
      }));

      retryTimerRef.current = setTimeout(() => {
        retryTimerRef.current = null;
        connect();
      }, delayMs);
    };

    const connect = () => {
      if (disposedRef.current) return;

      clearRetryTimer();
      closeSocket();

      setState((prev) => ({
        ...prev,
        isConnecting: true,
        error: null,
        connectionState:
          reconnectAttemptRef.current > 0 ? "reconnecting" : "connecting",
      }));

      const ws = new WebSocket(MEMPOOL_WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (disposedRef.current || wsRef.current !== ws) return;

        reconnectAttemptRef.current = 0;
        setState((prev) => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          connectionState: "connected",
          reconnectAttempt: 0,
          error: null,
        }));

        const subscriptions: object[] = [
          { action: "want", data: ["blocks", "stats"] },
          { action: "want", data: ["mempool-blocks"] },
          { "track-blocks": true, "track-stats": true },
          { "track-mempool-blocks": true },
        ];

        for (const sub of subscriptions) {
          try {
            ws.send(JSON.stringify(sub));
          } catch {
            // ignore send failures and let reconnect logic handle a bad socket
          }
        }
      };

      ws.onmessage = (event) => {
        if (disposedRef.current || wsRef.current !== ws) return;
        if (typeof event.data !== "string") return;

        let parsed: unknown;
        try {
          parsed = JSON.parse(event.data);
        } catch {
          return;
        }

        if (!isRecord(parsed)) return;

        const nextTipHeight = extractTipHeight(parsed);
        const nextFeesPatch = extractFees(parsed);
        const nextMempoolTxCount = extractMempoolTxCount(parsed);
        const nextBlockTimestamp = extractBlockTimestamp(parsed);

        setState((prev) => {
          const blockProgress = mergeBlockProgress(
            prev.tipHeight,
            prev.lastBlockTimestamp,
            nextTipHeight,
            nextBlockTimestamp,
          );

          const nextState: UseMempoolWSResult = {
            ...prev,
            tipHeight: blockProgress.tipHeight,
            fees: mergeFees(prev.fees, nextFeesPatch),
            mempoolTxCount: nextMempoolTxCount ?? prev.mempoolTxCount,
            lastBlockTimestamp: blockProgress.lastBlockTimestamp,
            isConnected: true,
            isConnecting: false,
            connectionState: "connected",
            lastMessageAt: Date.now(),
            error: null,
          };

          return nextState;
        });
      };

      ws.onerror = () => {
        if (disposedRef.current || wsRef.current !== ws) return;
        setState((prev) => ({
          ...prev,
          error: "WebSocket error",
        }));
      };

      ws.onclose = () => {
        if (disposedRef.current || wsRef.current !== ws) return;
        wsRef.current = null;
        setState((prev) => ({
          ...prev,
          isConnected: false,
          isConnecting: true,
          connectionState: "reconnecting",
        }));
        scheduleReconnect();
      };
    };

    const syncLatestSnapshot = async () => {
      try {
        const [tip, feeData] = await Promise.all([fetchTipHeight(), fetchFees()]);
        if (disposedRef.current) return;

        let tipTimestamp: number | undefined;
        const knownTip = latestTipRef.current;
        const knownTimestamp = latestTimestampRef.current;
        const shouldFetchTipBlock =
          knownTip === null ||
          tip > knownTip ||
          (tip === knownTip && knownTimestamp === null);

        if (shouldFetchTipBlock) {
          try {
            const block = await fetchBlockByHeight(tip);
            tipTimestamp = normalizeUnixSeconds(block.timestamp);
          } catch {
            // Timestamp enrichment is best-effort.
          }
        }
        if (disposedRef.current) return;

        const feePatch: FeePatch = {
          fastestFee: feeData.fastestFee,
          halfHourFee: feeData.halfHourFee,
          economyFee: feeData.economyFee,
        };

        setState((prev) => {
          const blockProgress = mergeBlockProgress(
            prev.tipHeight,
            prev.lastBlockTimestamp,
            tip,
            tipTimestamp,
          );

          return {
            ...prev,
            tipHeight: blockProgress.tipHeight,
            fees: mergeFees(prev.fees, feePatch),
            lastBlockTimestamp: blockProgress.lastBlockTimestamp,
          };
        });
      } catch {
        // Keep UI driven by websocket if REST bootstrap fails.
      }
    };

    void syncLatestSnapshot();
    reconcileTimerRef.current = setInterval(() => {
      void syncLatestSnapshot();
    }, REST_RECONCILE_MS);
    connect();

    return () => {
      disposedRef.current = true;
      clearRetryTimer();
      clearReconcileTimer();
      closeSocket();
      setState((prev) => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        connectionState: "disconnected",
      }));
    };
  }, []);

  return state;
}
