"use client";

import { useScrollSpy } from "@/hooks/useScrollSpy";
import { ScrollytellingLayout } from "@/components/shared/ScrollytellingLayout";
import { AnimatedTransactionFlow } from "@/components/lens/AnimatedTransactionFlow";
import { StoryCard } from "@/components/shared/StoryCard";
import { HexTerminal } from "@/components/lens/HexTerminal";
import { Tooltip } from "@/components/ui/Tooltip";
import { useMempool } from "@/context/MempoolContext";
import {
  Eye,
  ArrowRightLeft,
  ShieldCheck,
  AlertTriangle,
  Zap,
  Scale,
} from "lucide-react";
import type { AnalyzedTx, Warning } from "@/lib/layout";

type ConfirmationState = "confirmed" | "unconfirmed" | "unknown";
type DisplayWarning = Warning & { context?: string };

interface AnalysisViewProps {
  data: AnalyzedTx;
  onReset?: () => void;
  onBack?: () => void;
  hideTerminal?: boolean;
  confirmationState?: ConfirmationState;
}

// Hoisted outside component to avoid new array identity each render
const CARD_IDS = ["card-0", "card-1", "card-2", "card-3"];

function formatFeeRate(value: number) {
  if (!Number.isFinite(value)) return "0";
  if (value >= 10) return Math.round(value).toString();
  return value.toFixed(1).replace(/\.0$/, "");
}

function explainWarning(
  warning: DisplayWarning,
  confirmationState: ConfirmationState,
) {
  if (warning.code === "RBF_SIGNALING") {
    if (confirmationState === "confirmed") {
      return "This transaction signaled Replace-By-Fee before confirmation. Now that it is confirmed, the replacement window is closed.";
    }
    if (confirmationState === "unconfirmed") {
      return "This transaction signals Replace-By-Fee, so the sender can still replace it with a higher-fee version until it confirms.";
    }
    return "This transaction signals Replace-By-Fee. If it is still unconfirmed, the sender may be able to fee-bump or replace it.";
  }

  const warningExplanations: Record<string, string> = {
    HIGH_FEE:
      confirmationState === "unconfirmed"
        ? "The fee crosses txray's high-fee guardrail. Compare it with the current fast-fee estimate before deciding if that urgency is worth it."
        : "The fee crosses txray's static high-fee guardrail. For large or historical transactions this can be informational, not automatically a mistake.",
    CURRENT_MARKET_HIGH_FEE:
      "This unconfirmed transaction is paying much more than the current fast-fee estimate. It may confirm quickly, but it is expensive relative to today's mempool.",
    DUST_OUTPUT:
      "One or more outputs are so tiny that they cost more in fees to spend than they're actually worth.",
    UNKNOWN_OUTPUT_SCRIPT:
      "This transaction uses a non-standard or unrecognized locking script, which could indicate experimental or custom usage.",
    MULTISIG:
      "This transaction involves a multi-signature setup, requiring multiple private keys to authorize spending.",
    LARGE_TX:
      "This transaction is unusually large in data size, consuming a significant portion of a block's available space.",
    LOCKTIME:
      "This transaction has a timelock, meaning it cannot be confirmed until a specific block height or point in time.",
  };

  return (
    warningExplanations[warning.code] ||
    warning.message ||
    "Something unusual was detected in this transaction."
  );
}

export function AnalysisView({
  data,
  onReset,
  onBack,
  hideTerminal,
  confirmationState = "unknown",
}: AnalysisViewProps) {
  // Track which card is in view
  const activeCardId = useScrollSpy(CARD_IDS, "-40% 0px -40% 0px");
  const { fees } = useMempool();

  // --- Transaction Type Detection ---
  const isCoinbase =
    data.vin.length === 1 && data.vin[0].txid === "0".repeat(64);
  const isConsolidation =
    !isCoinbase && data.vin.length > 10 && data.vout.length <= 3;
  const isDistribution =
    !isCoinbase && data.vin.length <= 3 && data.vout.length > 10;
  // else: regular transaction

  const totalOutputBtc = (data.total_output_sats / 100_000_000).toFixed(4);
  const feeBtc = (data.fee_sats / 100_000_000).toFixed(8);
  const feeRate = data.fee_rate_sat_vb;
  const currentFastFee = fees?.fastestFee ?? null;
  const coreWarnings = data.warnings ?? [];
  const displayedCoreWarnings = coreWarnings.map((warning) =>
    warning.code === "HIGH_FEE" &&
    confirmationState === "unconfirmed" &&
    currentFastFee !== null
      ? {
          ...warning,
          context: `${formatFeeRate(feeRate)} sat/vB vs ${formatFeeRate(currentFastFee)} sat/vB fast fee`,
        }
      : warning,
  );
  const hasCoreHighFeeWarning = coreWarnings.some((w) => w.code === "HIGH_FEE");
  const feeLooksHighAgainstCurrentMarket =
    !isCoinbase &&
    !hasCoreHighFeeWarning &&
    confirmationState === "unconfirmed" &&
    currentFastFee !== null &&
    feeRate >= Math.max(10, currentFastFee * 3);
  const displayedWarnings: DisplayWarning[] = [
    ...displayedCoreWarnings,
    ...(feeLooksHighAgainstCurrentMarket
      ? [
          {
            code: "CURRENT_MARKET_HIGH_FEE",
            context: `${formatFeeRate(feeRate)} sat/vB vs ${formatFeeRate(currentFastFee)} sat/vB fast fee`,
          },
        ]
      : []),
  ];

  return (
    <div className="w-full bg-transparent text-white animate-in fade-in duration-1000">
      {/* Floating action bar - only shown when handlers provided (Lens page, not /tx/ page) */}
      {(onBack || onReset) && (
        <div className="w-full max-w-7xl mx-auto px-6 py-3 flex justify-end gap-3 z-50 relative">
          {onBack && (
            <button
              onClick={onBack}
              className="text-sm font-medium text-zinc-400 hover:text-white border border-white/10 hover:border-white/20 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full transition-all"
            >
              {"->"} Back to Overview
            </button>
          )}
          {onReset && (
            <button
              onClick={onReset}
              className="text-sm font-medium text-white hover:text-white border border-lens-500/50 bg-lens-500/20 hover:bg-lens-500/40 backdrop-blur-md px-5 py-2 rounded-full transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)]"
            >
              Analyze Another
            </button>
          )}
        </div>
      )}
      <div className="pt-0">
        <ScrollytellingLayout
          graphObject={
            <AnimatedTransactionFlow
              activeCardId={activeCardId}
              txData={data}
            />
          }
        >
          {/* ===== CARD 0: What happened? ===== */}
          <div id="card-0">
            <StoryCard
              title={isCoinbase ? "The Block Reward" : "What happened?"}
              icon={<Eye />}
              isActive={activeCardId === "card-0"}
            >
              {isCoinbase ? (
                <>
                  <p className="mb-4">
                    This is the{" "}
                    <strong className="text-lens-400">
                      very first transaction
                    </strong>{" "}
                    in the block, and it&apos;s special. No one &quot;sent&quot;
                    this. The miner who built this block created{" "}
                    <strong>{totalOutputBtc} BTC</strong> of brand new Bitcoin
                    as their reward.
                  </p>
                  <p className="mb-4">
                    This reward includes both the{" "}
                    <Tooltip
                      term="block subsidy"
                      definition="The fixed amount of newly minted Bitcoin awarded to the miner. This amount halves roughly every 4 years."
                      analogy="Like a gold mine that pays miners a fixed salary, but the salary shrinks over time."
                    >
                      block subsidy
                    </Tooltip>{" "}
                    (newly minted coins) and all the processing fees collected
                    from every other transaction in this block.
                  </p>
                </>
              ) : isConsolidation ? (
                <>
                  <p className="mb-4">
                    This looks like a{" "}
                    <strong className="text-emerald-400">
                      cleanup transaction
                    </strong>
                    . Someone combined <strong>{data.vin.length}</strong> small
                    coins into just <strong>{data.vout.length}</strong> bigger
                    one{data.vout.length > 1 ? "s" : ""}.
                  </p>
                  <p className="mb-4">
                    Think of it like exchanging a jar of {data.vin.length} loose
                    coins for{" "}
                    {data.vout.length === 1
                      ? "a single clean bill"
                      : "a few clean bills"}{" "}
                    -- fewer items to manage, and cheaper to spend in the
                    future.
                  </p>
                </>
              ) : isDistribution ? (
                <>
                  <p className="mb-4">
                    This looks like a{" "}
                    <strong className="text-violet-400">mass payout</strong>.{" "}
                    {data.vin.length === 1
                      ? "A single large coin was"
                      : `${data.vin.length} coins were`}{" "}
                    split into <strong>{data.vout.length}</strong> smaller ones
                    going to different recipients.
                  </p>
                  <p className="mb-4">
                    This is common for exchanges or employers -- like a company
                    paying {data.vout.length} workers from one bank account in a
                    single batch.
                  </p>
                </>
              ) : (
                <>
                  <p className="mb-4">
                    Bitcoin doesn&apos;t use bank balances. Instead, people own
                    individual &quot;coins&quot; of different sizes -- like
                    having a $500 note and a $100 note instead of a $600
                    balance.
                  </p>
                  <p className="mb-4">
                    In this transaction, the sender picked up{" "}
                    <strong>{data.vin.length}</strong> existing coin
                    {data.vin.length > 1 ? "s" : ""} and melted{" "}
                    {data.vin.length > 1 ? "them" : "it"} down to create{" "}
                    <strong>{data.vout.length}</strong> brand new coin
                    {data.vout.length > 1 ? "s" : ""} -- sending value to{" "}
                    {data.vout.length > 1
                      ? "one or more recipients"
                      : "a recipient"}
                    .
                  </p>
                </>
              )}
              <p className="text-sm break-all text-text-muted mt-6 p-3 bg-black/40 rounded-lg border border-white/5 font-mono">
                <span className="text-lens-500 mr-2">TXID:</span> {data.txid}
              </p>
            </StoryCard>
          </div>

          {/* ===== CARD 1: The Money Flow ===== */}
          <div id="card-1">
            <StoryCard
              title={isCoinbase ? "Where the Reward Goes" : "The Money Flow"}
              icon={<ArrowRightLeft />}
              isActive={activeCardId === "card-1"}
            >
              {isCoinbase ? (
                <>
                  <p className="mb-4">
                    There are no real coins on the left side. The single input
                    is a special marker -- the miner can write any message
                    inside it (mining pools often embed their name or signature
                    here).
                  </p>
                  <p className="mb-4">
                    The{" "}
                    <strong className="text-violet-400">
                      purple nodes on the right
                    </strong>{" "}
                    show where the miner sends their freshly minted reward --
                    usually to their own wallet or mining pool address.
                  </p>
                </>
              ) : isConsolidation ? (
                <>
                  <p className="mb-4">
                    The{" "}
                    <strong className="text-emerald-400">
                      green nodes on the left
                    </strong>{" "}
                    are all the small coins being swept up. Each one required
                    the owner to prove they own it with the correct password
                    (digital signature).
                  </p>
                  <p className="mb-4">
                    On the right, they&apos;re all merged into{" "}
                    {data.vout.length === 1
                      ? "one bigger coin"
                      : `${data.vout.length} bigger coins`}
                    . Fewer coins = cheaper future transactions.
                  </p>
                </>
              ) : isDistribution ? (
                <>
                  <p className="mb-4">
                    The{" "}
                    <strong className="text-emerald-400">
                      {data.vin.length === 1
                        ? "single green node"
                        : "green nodes"}{" "}
                      on the left
                    </strong>{" "}
                    {data.vin.length === 1 ? "is" : "are"} the source of funds.
                    The owner proved ownership and split the value across many
                    recipients.
                  </p>
                  <p className="mb-4">
                    The{" "}
                    <strong className="text-violet-400">
                      purple nodes on the right
                    </strong>{" "}
                    are the individual payouts -- each going to a different
                    address. One of them is likely the sender&apos;s change (the
                    leftover coins coming back).
                  </p>
                </>
              ) : (
                <>
                  <p className="mb-4">
                    Follow the flow from left to right in the graph. The{" "}
                    <strong className="text-emerald-400">
                      green nodes on the left
                    </strong>{" "}
                    are the coins being spent -- the sender proved they own
                    these with the correct password (a digital signature), and
                    they&apos;re now used up forever.
                  </p>
                  <p className="mb-4">
                    The{" "}
                    <strong className="text-violet-400">
                      purple nodes on the right
                    </strong>{" "}
                    are the brand new coins created. The same total value flows
                    through -- what goes in must come out (minus a small fee).
                  </p>
                </>
              )}
              <p className="text-sm text-text-muted">
                {isCoinbase ? (
                  'The outputs labeled "Data Payload" are OP_RETURN messages -- data permanently written into the blockchain, not actual payments.'
                ) : (
                  <>
                    The labels on each node (like{" "}
                    <Tooltip
                      term="Native SegWit"
                      definition="A modern, efficient address format starting with 'bc1q'. Think of it as a newer, cheaper way to lock your Bitcoin."
                      analogy="Like upgrading from a heavy padlock to a lightweight digital lock -- same security, less weight, lower shipping cost."
                    >
                      Native SegWit
                    </Tooltip>{" "}
                    or{" "}
                    <Tooltip
                      term="Taproot"
                      definition="The newest Bitcoin address format starting with 'bc1p'. It offers better privacy and lower fees for complex transactions."
                      analogy="Like a safe that looks identical from the outside, whether it has 1 lock or 10 -- nobody can tell the difference."
                    >
                      Taproot
                    </Tooltip>
                    ) show what kind of &quot;lock&quot; protects each coin.
                  </>
                )}
              </p>
            </StoryCard>
          </div>

          {/* ===== CARD 2: The Processing Fee ===== */}
          <div id="card-2">
            <StoryCard
              title={isCoinbase ? "No Fee Needed" : "The Processing Fee"}
              icon={<Zap />}
              isActive={activeCardId === "card-2"}
            >
              {isCoinbase ? (
                <>
                  <p className="mb-4">
                    Coinbase transactions don&apos;t have a processing fee --
                    the miner <em>is</em> the one who would collect it!
                    They&apos;re already being paid through the block reward.
                  </p>
                  <p className="mb-4">
                    However, this block&apos;s transactions collectively paid
                    the miner in fees on top of the block subsidy, making mining
                    profitable.
                  </p>
                </>
              ) : (
                <>
                  <p className="mb-4">
                    Every Bitcoin transaction needs to be permanently recorded
                    by a{" "}
                    <Tooltip
                      term="Miner"
                      definition="A computer that validates transactions and adds them to the blockchain. In return, miners earn fees from each transaction."
                      analogy="Like a postal worker who delivers your package and keeps a small tip for the service."
                    >
                      miner
                    </Tooltip>
                    . See the{" "}
                    <strong className="text-flow-fee">red branch</strong> in the
                    graph? That&apos;s the fee.
                  </p>
                  <p className="mb-4">
                    The coins going in add up to slightly more than the coins
                    going out. That leftover -- exactly{" "}
                    <strong className="text-flow-fee">{feeBtc} BTC</strong> --
                    is paid to the miner as a processing fee.{" "}
                    {isConsolidation
                      ? "Consolidation transactions usually pay moderate fees since they're not urgent."
                      : "Higher fees get your transaction confirmed faster."}
                  </p>
                </>
              )}
              <div className="p-4 rounded-xl bg-surface-bg border border-surface-border font-mono text-sm mt-6">
                <div className="flex justify-between mb-3 border-b border-white/5 pb-3">
                  <span className="text-text-muted">Transaction Size:</span>
                  <span className="text-text-primary">
                    {data.weight} WU ({Math.ceil(data.weight / 4)}{" "}
                    <Tooltip
                      term="vB (Virtual Bytes)"
                      definition="How much space this transaction takes up in a block. Bigger transactions cost more in fees -- like heavier packages cost more to ship."
                      analogy="Like the weight of a package determining shipping costs."
                    >
                      vB
                    </Tooltip>
                    )
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Price Per Unit:</span>
                  <span className="text-text-primary">
                    {Math.max(
                      1,
                      Math.round(data.fee_sats / Math.ceil(data.weight / 4)),
                    )}{" "}
                    <Tooltip
                      term="sat/vB"
                      definition="Satoshis per virtual byte -- this is the 'price per gram' of your transaction. 1 sat = 0.00000001 BTC. Higher sat/vB means faster confirmation."
                      analogy="Like choosing between standard and express shipping -- you pay more per gram for faster delivery."
                    >
                      sat/vB
                    </Tooltip>
                  </span>
                </div>
              </div>

              {/* SegWit Savings Visualization */}
              {data.segwit_savings && data.segwit_savings.savings_pct > 0 && (
                <div className="p-4 rounded-xl bg-surface-bg border border-surface-border text-sm mt-3">
                  <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/5">
                    <span className="font-medium text-text-primary flex items-center gap-2">
                      <Scale className="w-4 h-4 text-lens-400" />
                      SegWit Discount
                    </span>
                    <span className="bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded text-xs font-semibold">
                      {Math.round(data.segwit_savings.savings_pct)}% lighter
                    </span>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-text-primary">
                          Actual Weight (SegWit)
                        </span>
                        <span className="font-mono text-text-muted">
                          {data.segwit_savings.weight_actual} WU
                        </span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-lens-500 rounded-full h-full"
                          style={{
                            width: `${(data.segwit_savings.weight_actual / data.segwit_savings.weight_if_legacy) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-text-muted">
                          Hypothetical Legacy Weight
                        </span>
                        <span className="font-mono text-text-muted">
                          {data.segwit_savings.weight_if_legacy} WU
                        </span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-2.5 overflow-hidden">
                        <div className="bg-white/10 rounded-full h-full w-full"></div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-text-muted leading-relaxed">
                    Signatures are stored separately as &quot;witness&quot;
                    data, saving{" "}
                    <strong className="text-text-primary font-normal">
                      {data.segwit_savings.weight_if_legacy -
                        data.segwit_savings.weight_actual}{" "}
                      WU
                    </strong>{" "}
                    of block space vs legacy format -- directly lowering miner
                    fees.
                  </p>
                </div>
              )}
            </StoryCard>
          </div>

          {/* ===== CARD 3: Safety Check ===== */}
          <div id="card-3">
            <StoryCard
              title="Safety Check"
              icon={<ShieldCheck />}
              isActive={activeCardId === "card-3"}
            >
              <p className="mb-6">
                txray automatically scans every transaction for anything unusual
                -- overpaying on fees, tiny useless amounts, or non-standard
                patterns that might indicate a mistake or security risk.
              </p>

              {displayedWarnings.length > 0 ? (
                <div className="space-y-3">
                  {displayedWarnings.map((w, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400"
                    >
                      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-300 mb-1">
                          {w.code.replace(/_/g, " ")}
                        </p>
                        {"context" in w && typeof w.context === "string" && (
                          <p className="text-xs text-amber-300/80 font-mono mb-1">
                            {w.context}
                          </p>
                        )}
                        <p className="text-sm text-amber-400/70 leading-relaxed">
                          {explainWarning(w, confirmationState)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-start gap-4 p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <ShieldCheck className="w-6 h-6 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-emerald-300 mb-1">
                      All Clear!
                    </h3>
                    <p className="text-sm opacity-80 leading-relaxed">
                      This transaction looks perfectly normal. No overpaid fees,
                      no wastefully tiny amounts, and no unusual patterns were
                      found.
                    </p>
                  </div>
                </div>
              )}
            </StoryCard>
          </div>
        </ScrollytellingLayout>
      </div>

      {!hideTerminal && <HexTerminal rawJsonData={data} />}
    </div>
  );
}
