"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useScrollSpy } from "@/hooks/useScrollSpy";
import { ScrollytellingLayout } from "@/components/shared/ScrollytellingLayout";
import {
  AnimatedPsbtFlow,
  type BuildResult,
} from "@/components/smith/AnimatedPsbtFlow";
import { StoryCard } from "@/components/shared/StoryCard";
import { Tooltip } from "@/components/ui/Tooltip";
import {
  Bitcoin,
  ArrowRightLeft,
  Zap,
  Settings,
  ShieldCheck,
  AlertTriangle,
  Copy,
  Check,
  Download,
  ArrowLeft,
  Loader2,
  Lock,
  Package,
  RefreshCw,
  Hammer,
  X,
  Sparkles,
  Shuffle,
  Shield,
  Snail,
} from "lucide-react";

const CARD_IDS = ["card-0", "card-1", "card-2", "card-3", "card-4"];

const FORGING_STEPS = [
  "Selecting optimal coins...",
  "Calculating miner fees...",
  "Checking for dust outputs...",
  "Constructing unsigned PSBT...",
];

type PageState = "loading" | "forging" | "result" | "error";

export default function BuildPage() {
  const router = useRouter();
  const [state, setState] = useState<PageState>("loading");
  const [data, setData] = useState<BuildResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [forgingStep, setForgingStep] = useState(0);
  const [summaryModal, setSummaryModal] = useState<"inputs" | "outputs" | null>(
    null,
  );
  const activeCardId = useScrollSpy(CARD_IDS, "-40% 0px -40% 0px", state);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (summaryModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [summaryModal]);

  useEffect(() => {
    const fixture = sessionStorage.getItem("coinsmith_fixture");
    if (!fixture) {
      router.push("/build");
      return;
    }

    const build = async () => {
      try {
        const res = await fetch("/api/build", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: fixture,
        });
        const json = await res.json();
        if (json.ok === false) {
          setErrorMsg(json.error?.message || "Build failed");
          setState("error");
        } else {
          setData(json);
          setState("forging");
          setForgingStep(0);
        }
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Network error");
        setState("error");
      }
    };

    build();
  }, [router]);

  const handleCopy = () => {
    if (data?.psbt_base64) {
      navigator.clipboard.writeText(data.psbt_base64);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!data?.psbt_base64) return;
    const binary = atob(data.psbt_base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transaction.psbt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const warningExplanations: Record<string, string> = {
    SEND_ALL:
      "All input value goes to outputs and fees — no change comes back to your wallet. This happens when the leftover would be too small (dust) to be worth keeping.",
    HIGH_FEE:
      "The total fee is unusually high relative to the amount being sent. Double-check the fee rate if you didn't intend to overpay.",
    RBF_SIGNALING:
      "This transaction signals Replace-By-Fee, meaning you can bump the fee later if it gets stuck in the mempool waiting for confirmation.",
    DUST_CHANGE:
      "A change output was created but its value is below the dust threshold (546 sats). It costs more in fees to spend than it's worth.",
  };

  useEffect(() => {
    if (state !== "forging") return;
    if (forgingStep < FORGING_STEPS.length) {
      const timer = setTimeout(() => setForgingStep((s) => s + 1), 350);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setState("result");
        window.scrollTo(0, 0);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [state, forgingStep]);

  /* ---- LOADING STATE ---- */
  if (state === "loading" || state === "forging") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95, filter: "blur(8px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full min-h-screen flex flex-col items-center justify-center gap-8 pt-24"
      >
        {/* Scanner animation */}
        <div className="relative w-28 h-28">
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-brand-500/30"
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute inset-3 rounded-full border border-brand-500/50"
            style={{
              borderTopColor: "rgb(59 130 246)",
              borderRightColor: "transparent",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute inset-6 rounded-full border border-brand-500/20"
            style={{
              borderBottomColor: "rgb(59 130 246 / 0.6)",
              borderLeftColor: "transparent",
            }}
            animate={{ rotate: -360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Hammer className="w-8 h-8 text-brand-500" />
          </div>
          <motion.div
            className="absolute inset-0"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          >
            <div
              className="w-1/2 h-0.5 bg-linear-to-r from-transparent to-brand-500 absolute top-1/2 left-1/2 origin-left"
              style={{ filter: "drop-shadow(0 0 6px rgb(59 130 246))" }}
            />
          </motion.div>
        </div>
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-white mb-2">
            Forging Transaction...
          </h2>
          <p className="text-zinc-400">
            Crafting the optimal unsigned transaction
          </p>
        </div>
        {state === "forging" && (
          <div className="flex flex-col gap-3 w-full max-w-xs">
            {FORGING_STEPS.map((step, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: i <= forgingStep ? 1 : 0.2, x: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="flex items-center gap-3 text-sm"
              >
                {i < forgingStep ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : i === forgingStep ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  >
                    <Loader2 className="w-4 h-4 text-brand-400 shrink-0" />
                  </motion.div>
                ) : (
                  <div className="w-4 h-4 rounded-full border border-zinc-700 shrink-0" />
                )}
                <span
                  className={
                    i < forgingStep
                      ? "text-zinc-300"
                      : i === forgingStep
                        ? "text-white"
                        : "text-zinc-600"
                  }
                >
                  {step}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    );
  }

  /* ---- ERROR STATE ---- */
  if (state === "error") {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center gap-6 pt-24 px-6">
        <div className="p-8 rounded-2xl bg-red-500/10 border border-red-500/20 max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Build Failed</h2>
          <p className="text-red-400 text-sm mb-6">{errorMsg}</p>
          <button
            onClick={() => router.push("/build")}
            className="px-6 py-2 rounded-full bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-colors"
          >
            ← Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const hasSendAll = data.warnings.some((w) => w.code === "SEND_ALL");
  const totalInputSats = data.selected_inputs.reduce(
    (sum, inp) => sum + inp.value_sats,
    0,
  );
  const totalOutputSats = data.outputs.reduce(
    (sum, out) => sum + out.value_sats,
    0,
  );
  const totalInputBtc = (totalInputSats / 100_000_000).toFixed(8);
  const totalOutputBtc = (totalOutputSats / 100_000_000).toFixed(8);
  const feeBtc = (data.fee_sats / 100_000_000).toFixed(8);

  const isConsolidation =
    data.selected_inputs.length > 3 && data.outputs.length <= 1 && !hasSendAll;
  const isSingleInput = data.selected_inputs.length === 1;
  const scriptTypes = new Set(data.selected_inputs.map((i) => i.script_type));
  const hasMixedScripts = scriptTypes.size > 1;
  const isHighFee = data.fee_rate_sat_vb > 20;
  const isLowFee = data.fee_rate_sat_vb <= 2;
  const isAntiFeeSnipe =
    data.locktime > 0 && data.locktime < 500_000_000 && data.locktime > 800_000;

  /* ---- RESULT STATE (Scrollytelling) ---- */
  return (
    <>
      <motion.div
        initial={{ opacity: 0, filter: "blur(8px)" }}
        animate={{ opacity: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full bg-transparent text-white"
      >
        {/* Top action bar */}
        <div className="w-full max-w-7xl mx-auto px-6 py-3 flex justify-between items-center z-50 relative pt-20">
          <button
            onClick={() => router.push("/build")}
            className="text-sm font-medium text-zinc-400 hover:text-white border border-white/10 hover:border-white/20 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full transition-all flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> New Build
          </button>

          <div className="hidden md:flex items-center gap-4 text-sm font-mono bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-5 py-2">
            <span className="text-zinc-300">{data.fee_sats} sats fee</span>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-400">
              {data.fee_rate_sat_vb.toFixed(1)} sat/vB
            </span>
            {data.rbf_signaling && (
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30 inline-flex items-center gap-1">
                <Zap className="w-3 h-3" /> RBF
              </span>
            )}
            {data.locktime > 0 && (
              <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/30 inline-flex items-center gap-1">
                <Lock className="w-3 h-3" /> {data.locktime}
              </span>
            )}
          </div>
        </div>

        <div className="pt-0">
          <ScrollytellingLayout
            graphObject={
              <AnimatedPsbtFlow
                activeCardId={activeCardId}
                data={data}
                onSummaryClick={(type) => setSummaryModal(type)}
              />
            }
          >
            {/* ===== CARD 0: Your Wallet's Coins ===== */}
            <div id="card-0">
              <StoryCard
                title="Your Wallet's Coins"
                icon={<Bitcoin />}
                isActive={activeCardId === "card-0"}
              >
                <p className="mb-4">
                  Bitcoin doesn&apos;t have a &quot;balance&quot; like a bank
                  account. Instead, your wallet owns individual digital coins
                  called{" "}
                  <Tooltip
                    term="UTXOs"
                    definition="Unspent Transaction Outputs — the individual coins your wallet owns. Each has a specific amount and can only be spent whole."
                    analogy="Like having specific bills in your wallet — a ₹500 note and a ₹100 note, not just a ₹600 balance."
                  >
                    UTXOs
                  </Tooltip>
                  .
                </p>
                <p className="mb-4">
                  For this transaction, Coin Smith examined your wallet and
                  selected{" "}
                  <strong className="text-emerald-400">
                    {data.selected_inputs.length}
                  </strong>{" "}
                  coin{data.selected_inputs.length > 1 ? "s" : ""} totaling{" "}
                  <strong className="text-white">{totalInputBtc} BTC</strong>.
                  The{" "}
                  <Tooltip
                    term="coin selection"
                    definition="The algorithm that picks the best combination of UTXOs to cover your payment + fees, minimizing waste."
                    analogy="Like choosing which banknotes to hand over at a shop — you want the fewest notes possible to avoid getting lots of small change."
                  >
                    selection engine
                  </Tooltip>{" "}
                  tried 5 different strategies and picked the one that minimizes
                  fees.
                </p>
                {isConsolidation && (
                  <p className="mb-4 text-sm text-emerald-400/80 bg-emerald-500/5 border border-emerald-500/10 rounded-xl px-4 py-3">
                    <Hammer className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
                    This looks like a <strong>consolidation</strong> — merging{" "}
                    {data.selected_inputs.length} small coins into one larger
                    UTXO. This reduces future fees by cleaning up your wallet.
                  </p>
                )}
                {isSingleInput && (
                  <p className="mb-4 text-sm text-blue-400/80 bg-blue-500/5 border border-blue-500/10 rounded-xl px-4 py-3">
                    <Sparkles className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
                    Only <strong>one coin</strong> was needed to cover this
                    payment — a clean, efficient selection.
                  </p>
                )}
                {hasMixedScripts && (
                  <p className="mb-4 text-sm text-violet-400/80 bg-violet-500/5 border border-violet-500/10 rounded-xl px-4 py-3">
                    <Shuffle className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
                    Your coins span{" "}
                    <strong>{scriptTypes.size} address types</strong>:{" "}
                    {[...scriptTypes]
                      .map((s) =>
                        s === "p2pkh"
                          ? "Legacy"
                          : s === "p2wpkh"
                            ? "SegWit"
                            : s === "p2tr"
                              ? "Taproot"
                              : s === "p2sh"
                                ? "Script Hash"
                                : s,
                      )
                      .join(", ")}
                    . Mixing scripts increases transaction weight slightly.
                  </p>
                )}
                <p className="text-sm text-zinc-500">
                  See the{" "}
                  <strong className="text-emerald-400">green nodes</strong> on
                  the left — those are the coins being consumed.
                </p>
              </StoryCard>
            </div>

            {/* ===== CARD 1: The Money Flow ===== */}
            <div id="card-1">
              <StoryCard
                title="The Money Flow"
                icon={<ArrowRightLeft />}
                isActive={activeCardId === "card-1"}
              >
                <p className="mb-4">
                  Follow the animated dots flowing from left to right. Each
                  input coin is melted down, and the value is recast into brand
                  new outputs.
                </p>
                {hasSendAll ? (
                  <p className="mb-4">
                    This is a{" "}
                    <strong className="text-amber-400">Send-All</strong>{" "}
                    transaction — every single satoshi goes to the recipient
                    {data.outputs.length > 1 ? "s" : ""} and the miner fee. No{" "}
                    <Tooltip
                      term="change"
                      definition="Leftover value from your inputs that gets sent back to your own wallet."
                      analogy="Like paying ₹500 for a ₹350 item — the ₹150 you get back is your change."
                    >
                      change
                    </Tooltip>{" "}
                    comes back to your wallet.
                  </p>
                ) : (
                  <>
                    <p className="mb-4">
                      The{" "}
                      <strong className="text-violet-400">purple nodes</strong>{" "}
                      on the right are payments going to recipients.
                      {data.change_index !== null && (
                        <>
                          {" "}
                          The one marked{" "}
                          <strong className="text-emerald-400 inline-flex items-center gap-1">
                            <RefreshCw className="w-4 h-4 inline" /> Change
                          </strong>{" "}
                          is your leftover — it routes back to your wallet, just
                          like getting{" "}
                          <Tooltip
                            term="change"
                            definition="Leftover value from your inputs that gets sent back to your own wallet."
                            analogy="Like paying ₹500 for a ₹350 item — the ₹150 you get back is your change."
                          >
                            change
                          </Tooltip>{" "}
                          at a shop.
                        </>
                      )}
                    </p>
                  </>
                )}
                <p className="text-sm text-zinc-500">
                  Total in: {totalInputBtc} BTC → Total out: {totalOutputBtc}{" "}
                  BTC + {feeBtc} BTC fee
                </p>
              </StoryCard>
            </div>

            {/* ===== CARD 2: The Cost of Sending ===== */}
            <div id="card-2">
              <StoryCard
                title="The Cost of Sending"
                icon={<Zap />}
                isActive={activeCardId === "card-2"}
              >
                <p className="mb-4">
                  Every Bitcoin transaction must be permanently recorded by a{" "}
                  <Tooltip
                    term="miner"
                    definition="A computer that validates transactions and adds them to the blockchain. Miners earn fees from each transaction."
                    analogy="Like a postal worker who delivers your package and keeps a small tip for the service."
                  >
                    miner
                  </Tooltip>
                  . See the <strong className="text-red-400">red branch</strong>{" "}
                  in the graph? That&apos;s the fee going to the miner.
                </p>
                <p className="mb-4">
                  The fee is calculated as:{" "}
                  <Tooltip
                    term="fee rate"
                    definition="Cost per virtual byte of transaction data. Higher rates = faster confirmation."
                    analogy="Like choosing shipping speed — express costs more per gram."
                  >
                    fee rate
                  </Tooltip>{" "}
                  × transaction size = total fee.
                </p>
                <div className="p-4 rounded-xl bg-surface-bg border border-surface-border font-mono text-sm mt-4">
                  <div className="flex justify-between mb-3 border-b border-white/5 pb-3">
                    <span className="text-text-muted">Transaction Size:</span>
                    <span className="text-text-primary">
                      {data.vbytes}{" "}
                      <Tooltip
                        term="vBytes"
                        definition="Virtual bytes — how much block space your transaction uses. More inputs = heavier = costlier."
                        analogy="Like the weight of a package determining shipping costs."
                      >
                        vB
                      </Tooltip>
                    </span>
                  </div>
                  <div className="flex justify-between mb-3 border-b border-white/5 pb-3">
                    <span className="text-text-muted">Fee Rate:</span>
                    <span className="text-text-primary">
                      {data.fee_rate_sat_vb.toFixed(1)}{" "}
                      <Tooltip
                        term="sat/vB"
                        definition="Satoshis per virtual byte — the 'price per gram.' 1 sat = 0.00000001 BTC."
                        analogy="Like choosing between standard and express shipping — more per gram for faster delivery."
                      >
                        sat/vB
                      </Tooltip>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Total Fee:</span>
                    <span className="text-red-400 font-bold">
                      {data.fee_sats} sats ({feeBtc} BTC)
                    </span>
                  </div>
                </div>
                <div className="mt-4 p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                  <p className="text-sm font-semibold text-zinc-300 mb-1.5 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <Tooltip
                      term="Dust Threshold"
                      definition="The minimum useful output amount. Anything smaller costs more in fees to spend than it's worth — permanently stuck in your wallet."
                      analogy="Like a coin so small it costs more to pick up than its face value."
                    >
                      Dust Limit: 546 sats
                    </Tooltip>
                  </p>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    If a change output would be smaller than 546 sats, it&apos;s
                    not worth creating — it would cost more in future fees to
                    spend than it&apos;s worth. In that case, the leftover is
                    absorbed into the miner fee instead.
                  </p>
                </div>
                {isHighFee && (
                  <p className="text-sm text-amber-400/80 bg-amber-500/5 border border-amber-500/10 rounded-xl px-4 py-3 mt-3">
                    <Zap className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
                    This is a <strong>high-priority</strong> transaction at{" "}
                    {data.fee_rate_sat_vb.toFixed(1)} sat/vB — it should confirm
                    quickly.
                  </p>
                )}
                {isLowFee && (
                  <p className="text-sm text-cyan-400/80 bg-cyan-500/5 border border-cyan-500/10 rounded-xl px-4 py-3 mt-3">
                    <Snail className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
                    Economy rate at {data.fee_rate_sat_vb.toFixed(1)} sat/vB —
                    this may take longer to confirm during busy periods.
                  </p>
                )}
              </StoryCard>
            </div>

            {/* ===== CARD 3: Transaction Settings ===== */}
            <div id="card-3">
              <StoryCard
                title="Transaction Settings"
                icon={<Settings />}
                isActive={activeCardId === "card-3"}
              >
                <p className="mb-6">
                  Beyond the basic money flow, transactions can carry special
                  signals that control <em>when</em> and <em>how</em>{" "}
                  they&apos;re processed.
                </p>

                <div className="space-y-4">
                  <div
                    className={`p-4 rounded-xl border ${data.rbf_signaling ? "bg-blue-500/10 border-blue-500/20" : "bg-white/5 border-white/10"}`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`text-sm font-bold flex items-center gap-1.5 ${data.rbf_signaling ? "text-blue-400" : "text-zinc-500"}`}
                      >
                        <Zap className="w-4 h-4" /> RBF (
                        {data.rbf_signaling ? "Enabled" : "Disabled"})
                      </span>
                    </div>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      <Tooltip
                        term="Replace-By-Fee"
                        definition="Allows you to rebroadcast this transaction with a higher fee if it gets stuck waiting for confirmation."
                        analogy="Like being able to upgrade your shipping from standard to express after dropping the package off."
                      >
                        RBF
                      </Tooltip>{" "}
                      {data.rbf_signaling
                        ? "is enabled — you can bump the fee later if this transaction gets stuck in the mempool."
                        : "is disabled — once broadcast, you cannot replace this transaction with a higher-fee version."}
                    </p>
                  </div>

                  <div
                    className={`p-4 rounded-xl border ${data.locktime > 0 ? "bg-purple-500/10 border-purple-500/20" : "bg-white/5 border-white/10"}`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`text-sm font-bold flex items-center gap-1.5 ${data.locktime > 0 ? "text-purple-400" : "text-zinc-500"}`}
                      >
                        <Lock className="w-4 h-4" /> Locktime (
                        {data.locktime > 0 ? data.locktime : "None"})
                      </span>
                    </div>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      <Tooltip
                        term="Locktime"
                        definition="A field that prevents the transaction from being accepted until a specific block height or Unix timestamp."
                        analogy="Like scheduling a letter to be delivered only after a certain date."
                      >
                        Locktime
                      </Tooltip>{" "}
                      {data.locktime > 0
                        ? data.locktime >= 500_000_000
                          ? `is set to Unix timestamp ${data.locktime} — this transaction can't be confirmed until that time.`
                          : `is set to block height ${data.locktime} — this transaction can't be confirmed until that block is mined.`
                        : "is not set — this transaction can be confirmed immediately."}
                    </p>
                    {isAntiFeeSnipe && (
                      <p className="text-xs text-purple-400/70 mt-2">
                        <Shield className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />
                        This locktime likely provides{" "}
                        <strong>anti-fee-sniping protection</strong> — it
                        prevents miners from re-mining old blocks to steal fees.
                      </p>
                    )}
                  </div>
                </div>
              </StoryCard>
            </div>

            {/* ===== CARD 4: Safety Check & PSBT ===== */}
            <div id="card-4">
              <StoryCard
                title="Safety Check & PSBT"
                icon={<ShieldCheck />}
                isActive={activeCardId === "card-4"}
              >
                <p className="mb-6">
                  Coin Smith automatically scans your transaction for anything
                  unusual before producing the final unsigned transaction.
                </p>

                {data.warnings.length > 0 ? (
                  <div className="space-y-3 mb-6">
                    {data.warnings.map((w, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400"
                      >
                        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-amber-300 mb-1">
                            {w.code.replace(/_/g, " ")}
                          </p>
                          <p className="text-sm text-amber-400/70 leading-relaxed">
                            {warningExplanations[w.code] ||
                              "Something unusual was detected in this transaction."}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-start gap-4 p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-6">
                    <ShieldCheck className="w-6 h-6 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-emerald-300 mb-1">
                        All Clear!
                      </h3>
                      <p className="text-sm opacity-80 leading-relaxed">
                        No warnings detected. The transaction looks balanced and
                        efficient.
                      </p>
                    </div>
                  </div>
                )}

                <div className="p-4 rounded-xl bg-surface-bg border border-surface-border">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                      <Package className="w-4 h-4" />{" "}
                      <Tooltip
                        term="PSBT"
                        definition="Partially Signed Bitcoin Transaction — an unsigned transaction packaged with all metadata needed for safe offline signing."
                        analogy="A pre-filled check with the amount, recipient, and date filled in. It just needs your signature to become active."
                      >
                        PSBT
                      </Tooltip>
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCopy}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-medium transition-colors border border-white/10"
                      >
                        {copied ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        {copied ? "Copied!" : "Copy"}
                      </button>
                      <button
                        onClick={handleDownload}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-medium transition-colors border border-white/10"
                      >
                        <Download className="w-3 h-3" /> .psbt
                      </button>
                    </div>
                  </div>
                  <div className="bg-black/50 rounded-lg p-3 font-mono text-xs text-zinc-400 break-all max-h-32 overflow-y-auto border border-white/5">
                    {data.psbt_base64}
                  </div>
                  <p className="text-xs text-zinc-500 mt-3 leading-relaxed">
                    This unsigned transaction is safe to share. It cannot move
                    your funds until signed by your private key or hardware
                    wallet.
                  </p>
                </div>
              </StoryCard>
            </div>
          </ScrollytellingLayout>
        </div>
      </motion.div>
      {/* Summary Modal — portaled to body so fixed positioning works */}
      {summaryModal &&
        data &&
        createPortal(
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setSummaryModal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-lg mx-4 max-h-[70vh] bg-surface-card/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                <h3 className="text-lg font-bold text-white">
                  {summaryModal === "inputs"
                    ? `Selected Inputs (${data.selected_inputs.length})`
                    : `Outputs (${data.outputs.length})`}
                </h3>
                <button
                  onClick={() => setSummaryModal(null)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto max-h-[calc(70vh-64px)] divide-y divide-white/5">
                {summaryModal === "inputs"
                  ? data.selected_inputs.map((input, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-emerald-400 shrink-0">●</span>
                          <div className="min-w-0">
                            <p className="text-sm text-white font-mono truncate">
                              {input.txid.slice(0, 20)}...:{input.vout}
                            </p>
                            <p className="text-xs text-zinc-500 uppercase">
                              {input.script_type}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm text-white font-semibold font-mono shrink-0">
                          {(input.value_sats / 100_000_000).toFixed(8)} BTC
                        </span>
                      </div>
                    ))
                  : data.outputs.map((output, i) => {
                      const isChange = data.change_index === i;
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-between px-5 py-3 hover:bg-white/5 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={
                                isChange
                                  ? "text-emerald-400"
                                  : "text-violet-400"
                              }
                            >
                              ●
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm text-white">
                                {isChange
                                  ? "↩ Change Output"
                                  : `Payment #${i + 1}`}
                              </p>
                              <p className="text-xs text-zinc-500 uppercase">
                                {output.script_type}
                              </p>
                            </div>
                          </div>
                          <span className="text-sm text-white font-semibold font-mono shrink-0">
                            {(output.value_sats / 100_000_000).toFixed(8)} BTC
                          </span>
                        </div>
                      );
                    })}
              </div>
            </motion.div>
          </motion.div>,
          document.body,
        )}
    </>
  );
}
