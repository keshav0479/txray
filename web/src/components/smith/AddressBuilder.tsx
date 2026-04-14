"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Zap,
  Clock,
  Hourglass,
  SlidersHorizontal,
  Hammer,
} from "lucide-react";
import { parseAddress } from "@/lib/address";
import {
  fetchAddressUtxos,
  fetchFees,
  fetchTipHeight,
  type MempoolFees,
  type MempoolUtxo,
} from "@/lib/mempool";

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = "idle" | "fetching" | "ready" | "building";
type FeeMode = "fast" | "medium" | "slow" | "custom";

interface FetchedData {
  utxos: MempoolUtxo[];
  fees: MempoolFees;
  tipHeight: number;
  totalSats: number;
}

// ─── Fee estimate helper ──────────────────────────────────────────────────────

/** Conservative vbyte estimate for a send-all sweep (no change output) */
function estimateSweepVbytes(numInputs: number, scriptType: string): number {
  // overhead + outputs (1 recipient, no change)
  const overhead = 10;
  const output = 31;
  let inputSize: number;
  switch (scriptType) {
    case "p2wpkh":
      inputSize = 68;
      break;
    case "p2tr":
      inputSize = 58;
      break;
    case "p2pkh":
      inputSize = 148;
      break;
    case "p2sh":
      inputSize = 91;
      break;
    default:
      inputSize = 100;
  }
  return overhead + numInputs * inputSize + output;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatPill({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl bg-white/4 border border-white/8 min-w-[90px]">
      <span className="text-[10px] uppercase tracking-widest font-mono text-stone-500">
        {label}
      </span>
      <span className="text-sm font-bold text-white">{value}</span>
    </div>
  );
}

function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="text-[10px] font-mono text-stone-500 uppercase tracking-widest ml-1 mb-1 block">
      {children}
      {required && <span className="text-red-400 ml-0.5">*</span>}
    </label>
  );
}

function InlineError({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <p className="text-xs text-red-400 mt-1 ml-1 flex items-center gap-1">
      <AlertCircle className="w-3 h-3 shrink-0" />
      {msg}
    </p>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface AddressBuilderProps {
  onError: (msg: string | null) => void;
}

export function AddressBuilder({ onError }: AddressBuilderProps) {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("idle");
  const [senderAddr, setSenderAddr] = useState("");
  const [fetched, setFetched] = useState<FetchedData | null>(null);

  // form fields (visible in "ready" phase)
  const [recipientAddr, setRecipientAddr] = useState("");
  const [amountSats, setAmountSats] = useState("");
  const [sendAll, setSendAll] = useState(false);
  const [feeMode, setFeeMode] = useState<FeeMode>("medium");
  const [customFeeRate, setCustomFeeRate] = useState("");
  const [rbf, setRbf] = useState(true);

  // inline field errors
  const [senderErr, setSenderErr] = useState<string | null>(null);
  const [recipientErr, setRecipientErr] = useState<string | null>(null);
  const [amountErr, setAmountErr] = useState<string | null>(null);

  // ── Fetch UTXOs ──

  const doFetch = useCallback(async () => {
    const parsed = parseAddress(senderAddr.trim());
    if (!parsed) {
      setSenderErr("Invalid Bitcoin address");
      return;
    }
    setSenderErr(null);
    onError(null);
    setPhase("fetching");

    try {
      const [utxos, fees, tipHeight] = await Promise.all([
        fetchAddressUtxos(senderAddr.trim()),
        fetchFees(),
        fetchTipHeight(),
      ]);

      if (utxos.length === 0) {
        setPhase("idle");
        onError("No unspent outputs found for this address");
        return;
      }

      const totalSats = utxos.reduce((s, u) => s + u.value, 0);
      setFetched({ utxos, fees, tipHeight, totalSats });
      setPhase("ready");
    } catch {
      setPhase("idle");
      onError("Could not reach mempool.space - check your connection");
    }
  }, [senderAddr, onError]);

  const handleAddrKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") doFetch();
  };

  // ── Build ──

  const handleBuild = useCallback(() => {
    if (!fetched) return;

    const senderParsed = parseAddress(senderAddr.trim())!;
    const recipientParsed = parseAddress(recipientAddr.trim());

    // Validate recipient
    if (!recipientParsed) {
      setRecipientErr("Invalid recipient address");
      return;
    }
    if (recipientParsed.network !== senderParsed.network) {
      setRecipientErr(
        `Network mismatch - sender is ${senderParsed.network}, recipient is ${recipientParsed.network}`,
      );
      return;
    }
    setRecipientErr(null);

    // Resolve fee rate
    const { fees, utxos, totalSats } = fetched;
    const feeRateMap: Record<FeeMode, number> = {
      fast: fees.fastestFee,
      medium: fees.halfHourFee,
      slow: fees.hourFee,
      custom: parseFloat(customFeeRate) || 1,
    };
    const feeRate = feeRateMap[feeMode];

    // Resolve amount
    let paymentSats: number;
    if (sendAll) {
      const vbytes = estimateSweepVbytes(
        utxos.length,
        senderParsed.scriptType,
      );
      const estimatedFee = Math.ceil(feeRate * vbytes);
      paymentSats = totalSats - estimatedFee;
      if (paymentSats <= 546) {
        setAmountErr(
          `Insufficient funds after fees. Need at least ${estimatedFee + 546} sats, have ${totalSats}.`,
        );
        return;
      }
    } else {
      const parsed = parseInt(amountSats.replace(/,/g, ""), 10);
      if (!parsed || parsed <= 0) {
        setAmountErr("Enter a valid amount in sats");
        return;
      }
      if (parsed >= totalSats) {
        setAmountErr(
          `Insufficient funds. Available: ${totalSats.toLocaleString()} sats`,
        );
        return;
      }
      paymentSats = parsed;
    }
    setAmountErr(null);

    // Construct fixture JSON matching Rust CLI schema
    const fixture = {
      network: senderParsed.network,
      utxos: utxos.map((u) => ({
        txid: u.txid,
        vout: u.vout,
        value_sats: u.value,
        script_pubkey_hex: senderParsed.scriptPubkeyHex,
        script_type: senderParsed.scriptType,
        address: senderAddr.trim(),
      })),
      payments: [
        {
          address: recipientAddr.trim(),
          script_pubkey_hex: recipientParsed.scriptPubkeyHex,
          script_type: recipientParsed.scriptType,
          value_sats: paymentSats,
        },
      ],
      ...(sendAll
        ? {}
        : {
            change: {
              address: senderAddr.trim(),
              script_pubkey_hex: senderParsed.scriptPubkeyHex,
              script_type: senderParsed.scriptType,
            },
          }),
      fee_rate_sat_vb: feeRate,
      rbf,
    };

    setPhase("building");
    sessionStorage.setItem("coinsmith_fixture", JSON.stringify(fixture));
    router.push("/build/result");
  }, [
    fetched,
    senderAddr,
    recipientAddr,
    sendAll,
    amountSats,
    feeMode,
    customFeeRate,
    rbf,
    router,
  ]);

  // ── Fee buttons ──

  const FEE_TIERS: Array<{
    mode: FeeMode;
    label: string;
    icon: React.ElementType;
    sublabel: string;
    rate: (f: MempoolFees) => number;
  }> = [
    {
      mode: "fast",
      label: "Fast",
      icon: Zap,
      sublabel: "~10 min",
      rate: (f) => f.fastestFee,
    },
    {
      mode: "medium",
      label: "Medium",
      icon: Clock,
      sublabel: "~30 min",
      rate: (f) => f.halfHourFee,
    },
    {
      mode: "slow",
      label: "Slow",
      icon: Hourglass,
      sublabel: "~1 hr",
      rate: (f) => f.hourFee,
    },
    {
      mode: "custom",
      label: "Custom",
      icon: SlidersHorizontal,
      sublabel: "sat/vB",
      rate: () => 0,
    },
  ];

  // ── Render ──

  return (
    <div className="max-w-lg mx-auto">
      <div className="rounded-3xl border border-white/8 bg-stone-950/50 backdrop-blur-xl p-8 space-y-6">
        {/* Header */}
        <div className="text-center">
          <Wallet className="w-10 h-10 text-smith-500 mx-auto mb-3 opacity-80" />
          <h3 className="text-xl font-bold text-white mb-2">
            Build from Address
          </h3>
          <p className="text-sm text-stone-400">
            Enter your Bitcoin address to load real UTXOs and craft a
            transaction.
          </p>
        </div>

        {/* Sender address input */}
        <div>
          <FieldLabel required>Your Bitcoin Address</FieldLabel>
          <div className="flex gap-2">
            <input
              value={senderAddr}
              onChange={(e) => {
                setSenderAddr(e.target.value);
                setSenderErr(null);
              }}
              onKeyDown={handleAddrKeyDown}
              disabled={phase === "fetching" || phase === "building"}
              placeholder="bc1q... or 1... or 3... or bc1p..."
              className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-stone-300 placeholder:text-stone-600 focus:outline-none focus:border-smith-500/40 transition-colors font-mono disabled:opacity-50"
            />
            <button
              onClick={doFetch}
              disabled={
                !senderAddr.trim() ||
                phase === "fetching" ||
                phase === "building"
              }
              className="shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-smith-500/10 border border-smith-500/20 text-smith-400 hover:bg-smith-500/20 hover:border-smith-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              title="Fetch UTXOs"
            >
              {phase === "fetching" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </button>
          </div>
          <InlineError msg={senderErr} />
        </div>

        {/* UTXO summary (once fetched) */}
        <AnimatePresence>
          {phase !== "idle" && phase !== "fetching" && fetched && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="flex gap-2 flex-wrap">
                <StatPill
                  label="UTXOs"
                  value={fetched.utxos.length.toString()}
                />
                <StatPill
                  label="Balance"
                  value={
                    fetched.totalSats >= 100_000_000
                      ? `${(fetched.totalSats / 1e8).toFixed(4)} BTC`
                      : `${fetched.totalSats.toLocaleString()} sats`
                  }
                />
                <StatPill
                  label="Network"
                  value={parseAddress(senderAddr.trim())?.network ?? "-"}
                />
              </div>

              <div className="mt-1 flex items-center gap-1.5 text-xs text-smith-400/70 ml-1">
                <CheckCircle2 className="w-3 h-3" />
                UTXOs loaded from mempool.space
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form - only shown in ready/building phase */}
        <AnimatePresence>
          {(phase === "ready" || phase === "building") && fetched && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-5"
            >
              {/* Recipient */}
              <div>
                <FieldLabel required>Recipient Address</FieldLabel>
                <input
                  value={recipientAddr}
                  onChange={(e) => {
                    setRecipientAddr(e.target.value);
                    setRecipientErr(null);
                  }}
                  disabled={phase === "building"}
                  placeholder="bc1q... recipient address"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-stone-300 placeholder:text-stone-600 focus:outline-none focus:border-smith-500/40 transition-colors font-mono disabled:opacity-50"
                />
                <InlineError msg={recipientErr} />
              </div>

              {/* Amount */}
              <div>
                <FieldLabel required={!sendAll}>Amount (sats)</FieldLabel>
                <div className="flex items-center gap-3">
                  <input
                    value={amountSats}
                    onChange={(e) => {
                      setAmountSats(e.target.value);
                      setAmountErr(null);
                    }}
                    disabled={sendAll || phase === "building"}
                    placeholder="e.g. 50000"
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-stone-300 placeholder:text-stone-600 focus:outline-none focus:border-smith-500/40 transition-colors font-mono disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                  <label className="flex items-center gap-2 cursor-pointer select-none shrink-0">
                    <span
                      className={`text-xs font-medium transition-colors ${sendAll ? "text-smith-400" : "text-stone-500"}`}
                    >
                      Send All
                    </span>
                    <button
                      role="switch"
                      aria-checked={sendAll}
                      onClick={() => {
                        setSendAll((v) => !v);
                        setAmountErr(null);
                      }}
                      disabled={phase === "building"}
                      className={`relative w-9 h-5 rounded-full transition-colors ${sendAll ? "bg-smith-500/70" : "bg-white/10"} disabled:opacity-50`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${sendAll ? "translate-x-4" : "translate-x-0"}`}
                      />
                    </button>
                  </label>
                </div>
                <InlineError msg={amountErr} />
                {sendAll && (
                  <p className="text-xs text-stone-500 mt-1 ml-1">
                    Fee will be deducted from the total. No change output.
                  </p>
                )}
              </div>

              {/* Fee rate */}
              <div>
                <FieldLabel>Fee Rate</FieldLabel>
                <div className="grid grid-cols-4 gap-2">
                  {FEE_TIERS.map(({ mode, label, icon: Icon, sublabel, rate }) => (
                    <button
                      key={mode}
                      onClick={() => setFeeMode(mode)}
                      disabled={phase === "building"}
                      className={`flex flex-col items-center gap-0.5 px-2 py-2.5 rounded-xl border text-xs font-medium transition-all disabled:opacity-50 ${
                        feeMode === mode
                          ? "bg-smith-500/15 border-smith-500/30 text-smith-400"
                          : "bg-white/3 border-white/8 text-stone-500 hover:text-stone-300 hover:border-white/15"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{label}</span>
                      <span
                        className={`text-[10px] font-mono ${feeMode === mode ? "text-smith-400/70" : "text-stone-600"}`}
                      >
                        {mode === "custom" ? sublabel : `${rate(fetched.fees)} s/vB`}
                      </span>
                    </button>
                  ))}
                </div>

                {feeMode === "custom" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-2 overflow-hidden"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        value={customFeeRate}
                        onChange={(e) => setCustomFeeRate(e.target.value)}
                        disabled={phase === "building"}
                        placeholder="e.g. 15"
                        type="number"
                        min="1"
                        className="w-28 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-sm text-stone-300 placeholder:text-stone-600 focus:outline-none focus:border-smith-500/40 transition-colors font-mono"
                      />
                      <span className="text-xs text-stone-500">sat / vbyte</span>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* RBF toggle */}
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rbf}
                  onChange={(e) => setRbf(e.target.checked)}
                  disabled={phase === "building"}
                  className="w-4 h-4 accent-smith-400"
                />
                <span className="text-sm text-stone-400">
                  Enable RBF{" "}
                  <span className="text-stone-600 text-xs">(recommended - allows fee bumping)</span>
                </span>
              </label>

              {/* Build button */}
              <button
                onClick={handleBuild}
                disabled={
                  !recipientAddr.trim() ||
                  (!sendAll && !amountSats.trim()) ||
                  phase === "building"
                }
                className="group w-full flex items-center justify-center gap-2 font-bold px-6 py-4 rounded-xl transition-all duration-300 border bg-transparent border-smith-500/50 text-smith-400 hover:bg-smith-500/10 hover:border-smith-400 hover:text-smith-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.3),inset_0_0_10px_rgba(16,185,129,0.1)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:bg-transparent disabled:hover:border-smith-500/50 disabled:hover:text-smith-400 text-sm"
              >
                {phase === "building" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Building...
                  </>
                ) : (
                  <>
                    <Hammer className="w-4 h-4 opacity-80 group-hover:opacity-100 transition-opacity" />{" "}
                    Build Transaction
                  </>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Idle hint */}
        {phase === "idle" && (
          <p className="text-center text-xs text-stone-600">
            Enter a mainnet or testnet address, then press Enter or click the
            refresh button.
          </p>
        )}
      </div>
    </div>
  );
}
