// curated list of historically significant Bitcoin transactions and blocks
// each entry has enough context for the famous gallery and the landing page chips

export interface FamousEntry {
  id: string; // url-safe slug
  name: string;
  type: "block" | "tx";
  // for blocks: height. for txs: the txid
  height?: number;
  txid?: string;
  date: string; // human-readable date
  tagline: string; // one-liner for cards/chips
  story: string; // 2-3 sentence story for the gallery detail
  whyInteresting: string; // educational focus
  category: "genesis" | "milestone" | "privacy" | "technical" | "cultural";
}

export const FAMOUS_ENTRIES: FamousEntry[] = [
  // ─── Blocks (from txray-corpus) ───
  {
    id: "genesis",
    name: "Genesis Block",
    type: "block",
    height: 0,
    date: "Jan 3, 2009",
    tagline: "The block that started it all",
    story:
      'Block 0 was hardcoded into Bitcoin\'s source code by Satoshi Nakamoto. Its coinbase contains the famous Times headline: "Chancellor on brink of second bailout for banks."',
    whyInteresting:
      "The coinbase script embeds a newspaper headline, proving no pre-mining before this date. The 50 BTC reward is unspendable.",
    category: "genesis",
  },
  {
    id: "first-transfer",
    name: "First Transaction",
    type: "block",
    height: 170,
    date: "Jan 12, 2009",
    tagline: "Satoshi sends Bitcoin to Hal Finney",
    story:
      "Block 170 contains the first-ever Bitcoin transfer between two people. Satoshi Nakamoto sent 10 BTC to cryptographer Hal Finney.",
    whyInteresting:
      "Uses Pay-to-Public-Key (P2PK), the earliest script type. No addresses, just raw public keys. Zero fee, because fees weren't needed yet.",
    category: "genesis",
  },
  {
    id: "pizza",
    name: "Pizza Transaction",
    type: "block",
    height: 57043,
    date: "May 22, 2010",
    tagline: "10,000 BTC for two pizzas",
    story:
      "Laszlo Hanyecz paid 10,000 BTC for two Papa John's pizzas, marking the first real-world Bitcoin purchase. May 22 is now celebrated as Bitcoin Pizza Day.",
    whyInteresting:
      "The first commercial Bitcoin transaction. Those 10,000 BTC would be worth hundreds of millions today. Shows early P2PK script usage.",
    category: "cultural",
  },
  {
    id: "first-op-return",
    name: "First OP_RETURN",
    type: "block",
    height: 252490,
    date: "Apr 13, 2013",
    tagline: "Data embedded permanently on-chain",
    story:
      "This block contains the first use of OP_RETURN, a script opcode that allows embedding arbitrary data in the blockchain without creating unspendable UTXOs.",
    whyInteresting:
      "OP_RETURN was controversial: some saw it as blockchain pollution, others as a feature. It's now used for Omni Layer, timestamping, and Ordinals metadata.",
    category: "technical",
  },
  {
    id: "segwit-activation",
    name: "SegWit Activation",
    type: "block",
    height: 481824,
    date: "Aug 24, 2017",
    tagline: "The upgrade that fixed malleability",
    story:
      "Block 481,824 activated Segregated Witness (SegWit), the most significant Bitcoin protocol upgrade. It moved signature data to a separate witness structure.",
    whyInteresting:
      "SegWit fixed transaction malleability, enabled Lightning Network, and reduced fees by changing how transaction weight is calculated. Look for the first witness data.",
    category: "milestone",
  },
  {
    id: "largest-tx",
    name: "Largest Transaction",
    type: "block",
    height: 484986,
    date: "Oct 12, 2017",
    tagline: "The heaviest transaction ever recorded",
    story:
      "This block contains the largest Bitcoin transaction by raw size ever mined. It demonstrates the upper bounds of what the protocol allows.",
    whyInteresting:
      "Massive consolidation of hundreds of inputs into a single output. Shows how transaction weight scales with input count.",
    category: "technical",
  },
  {
    id: "wasabi-coinjoin",
    name: "Wasabi CoinJoin",
    type: "block",
    height: 530484,
    date: "Jul 4, 2018",
    tagline: "Privacy through collaborative mixing",
    story:
      "This block contains an early Wasabi Wallet CoinJoin transaction, where multiple users combine their inputs to break the common-input-ownership heuristic.",
    whyInteresting:
      "CoinJoin transactions have equal-valued outputs, making it impossible to tell which input funded which output. High entropy defeats chain analysis.",
    category: "privacy",
  },
  {
    id: "first-taproot",
    name: "First Taproot Spends",
    type: "block",
    height: 709635,
    date: "Nov 14, 2021",
    tagline: "Bitcoin's newest script upgrade in action",
    story:
      "Block 709,635 is the first block after Taproot activation to contain P2TR (Pay-to-Taproot) spends, enabling Schnorr signatures and MAST scripts.",
    whyInteresting:
      "Taproot makes complex smart contracts look identical to simple payments on-chain, dramatically improving privacy. Look for P2TR script types.",
    category: "milestone",
  },

  // ─── Notable Individual Transactions ───
  {
    id: "satoshi-to-finney",
    name: "Satoshi → Hal Finney",
    type: "tx",
    txid: "f4184fc596403b9d638783cf57adfe4c75c605f6356fbc91338530e9831e9e16",
    date: "Jan 12, 2009",
    tagline: "The first person-to-person Bitcoin transfer",
    story:
      'Satoshi Nakamoto sent 10 BTC to Hal Finney, a cryptographer and early Bitcoin contributor. Finney famously tweeted "Running bitcoin" just days before.',
    whyInteresting:
      "Uses P2PK (raw public key), not P2PKH (address). Zero fee. Only 2 outputs: 10 BTC to Finney, 40 BTC change back to Satoshi.",
    category: "genesis",
  },
  {
    id: "pizza-tx",
    name: "The Pizza Transaction",
    type: "tx",
    txid: "a1075db55d416d3ca199f55b6084e2115b9345e16c5cf302fc80e9d5fbf5d48d",
    date: "May 22, 2010",
    tagline: "10,000 BTC buys two pizzas",
    story:
      "The specific transaction where Laszlo Hanyecz sent 10,000 BTC to jercos for two Papa John's pizzas. The most expensive pizza purchase in history.",
    whyInteresting:
      "10,000 BTC sent in a single output. P2PK script type. Zero fee. Shows how early Bitcoin transactions were simple P2PK without change outputs.",
    category: "cultural",
  },
  {
    id: "mtgox-theft",
    name: "Mt. Gox Hack Tx",
    type: "tx",
    txid: "05f6dff67d2f64e09e62fcfcdf59c3c7d0e7c51b92663adb0abe4252dd42bb40",
    date: "Mar 1, 2014",
    tagline: "The exchange collapse that shook Bitcoin",
    story:
      "One of the transactions linked to the Mt. Gox theft. The exchange lost 850,000 BTC, triggering the first major Bitcoin bear market.",
    whyInteresting:
      "Large value transfer during the exchange's collapse. Shows how blockchain transparency eventually helped trace stolen funds.",
    category: "cultural",
  },
];

// quick lookup helpers
export function findBySlug(slug: string): FamousEntry | undefined {
  return FAMOUS_ENTRIES.find((e) => e.id === slug);
}

export function famousBlocks(): FamousEntry[] {
  return FAMOUS_ENTRIES.filter((e) => e.type === "block");
}

export function famousTxs(): FamousEntry[] {
  return FAMOUS_ENTRIES.filter((e) => e.type === "tx");
}

export function famousByCategory(cat: FamousEntry["category"]): FamousEntry[] {
  return FAMOUS_ENTRIES.filter((e) => e.category === cat);
}
