use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use colored::*;

#[derive(Parser)]
#[command(
    name = "txray",
    about = "txray — Parse. Analyze. Build. Learn.",
    version,
    after_help = "Examples:\n  txray famous                           List all famous blocks\n  txray famous genesis                   Show genesis block details\n  txray fetch --block 170                Fetch Satoshi→Hal Finney block\n  txray parse tx fixture.json            Parse a transaction fixture\n  txray parse block blk.dat rev.dat xor.dat  Parse a block file\n  txray analyze blk.dat rev.dat xor.dat  Run heuristics on a block\n  txray build fixture.json               Build PSBT from fixture"
)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Parse a raw transaction or block
    Parse {
        #[command(subcommand)]
        target: ParseTarget,
    },
    /// Run chain analysis heuristics on a block file
    Analyze {
        /// Path to block .dat file
        blk: String,
        /// Path to undo/rev .dat file
        rev: String,
        /// Path to XOR key .dat file
        xor: String,
    },
    /// Build a PSBT with coin selection from a fixture
    Build {
        /// Path to fixture JSON file
        fixture: String,
    },
    /// Fetch a block or transaction from public APIs
    Fetch {
        /// Block height or hash
        #[arg(long)]
        block: Option<String>,
        /// Transaction ID
        #[arg(long)]
        tx: Option<String>,
        /// API source: mempool or esplora (default: mempool)
        #[arg(long, default_value = "mempool")]
        source: String,
    },
    /// Browse famous historical Bitcoin blocks
    Famous {
        /// Optional: search by name or height
        query: Option<String>,
    },
    /// Explain a transaction in plain English
    Explain {
        /// Path to fixture JSON file
        fixture: String,
    },
    /// Analyze wallet fingerprint of a transaction
    Fingerprint {
        /// Path to fixture JSON file
        fixture: String,
    },
    /// Calculate Boltzmann entropy of a transaction
    Entropy {
        /// Path to fixture JSON file
        fixture: String,
    },
    /// Step through Bitcoin script execution
    DebugScript {
        /// Hex-encoded scriptPubKey to execute
        script_hex: String,
        /// Optional hex-encoded scriptSig
        #[arg(long, default_value = "")]
        script_sig: String,
        /// Optional hex-encoded witness items (comma-separated)
        #[arg(long, default_value = "")]
        witness: String,
    },
}

#[derive(Subcommand)]
enum ParseTarget {
    /// Parse a transaction from a fixture JSON
    Tx {
        /// Path to fixture JSON file
        fixture: String,
    },
    /// Parse a block from raw files
    Block {
        /// Path to block .dat file
        blk: String,
        /// Path to undo/rev .dat file
        rev: String,
        /// Path to XOR key .dat file
        xor: String,
    },
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Parse { target } => match target {
            ParseTarget::Tx { fixture } => cmd_parse_tx(&fixture)?,
            ParseTarget::Block { blk, rev, xor } => cmd_parse_block(&blk, &rev, &xor)?,
        },
        Commands::Analyze { blk, rev, xor } => cmd_analyze(&blk, &rev, &xor)?,
        Commands::Build { fixture } => cmd_build(&fixture)?,
        Commands::Fetch { block, tx, source } => cmd_fetch(block, tx, &source).await?,
        Commands::Famous { query } => cmd_famous(query.as_deref())?,
        Commands::Explain { fixture } => cmd_explain(&fixture)?,
        Commands::Fingerprint { fixture } => cmd_fingerprint(&fixture)?,
        Commands::Entropy { fixture } => cmd_entropy(&fixture)?,
        Commands::DebugScript { script_hex, script_sig, witness } => {
            cmd_debug_script(&script_hex, &script_sig, &witness)?;
        }
    }

    Ok(())
}

fn cmd_parse_tx(fixture_path: &str) -> Result<()> {
    let result =
        txray_lens::analyze_transaction(fixture_path).context("failed to parse transaction")?;
    println!("{}", result);
    Ok(())
}

fn cmd_parse_block(blk: &str, rev: &str, xor: &str) -> Result<()> {
    let result = txray_lens::analyze_block(blk, rev, xor).context("failed to parse block")?;
    println!("{}", result);
    Ok(())
}

fn cmd_analyze(blk: &str, rev: &str, xor: &str) -> Result<()> {
    let (json, _blocks) =
        txray_sherlock::analyze_block_file(blk, rev, xor).context("failed to analyze block")?;
    // pretty-print the JSON
    let parsed: serde_json::Value = serde_json::from_str(&json)?;
    println!("{}", serde_json::to_string_pretty(&parsed)?);
    Ok(())
}

fn cmd_build(fixture_path: &str) -> Result<()> {
    let json_str = std::fs::read_to_string(fixture_path).context("failed to read fixture file")?;
    let result =
        txray_smith::build_psbt_from_fixture(&json_str).map_err(|e| anyhow::anyhow!("{}", e))?;
    println!("{}", result);
    Ok(())
}

fn cmd_explain(fixture_path: &str) -> Result<()> {
    let json_str =
        txray_lens::analyze_transaction(fixture_path).context("failed to parse transaction")?;
    let report: serde_json::Value =
        serde_json::from_str(&json_str).context("failed to parse analysis JSON")?;
    let explanation = txray_lens::explain::explain_transaction(&report);
    println!("{}", explanation);
    Ok(())
}

fn cmd_fingerprint(fixture_path: &str) -> Result<()> {
    let json_str =
        std::fs::read_to_string(fixture_path).context("failed to read fixture file")?;
    let report: serde_json::Value =
        serde_json::from_str(&json_str).context("failed to parse fixture JSON")?;

    // Build a RawTransaction from the fixture data
    let raw_hex = report["raw_hex"]
        .as_str()
        .ok_or_else(|| anyhow::anyhow!("fixture missing 'raw_hex' field"))?;
    let raw_bytes = hex::decode(raw_hex).context("failed to decode raw_hex")?;
    let parsed = txray_core::tx::parser::parse_raw_tx(&raw_bytes)
        .map_err(|e| anyhow::anyhow!("failed to parse transaction: {}", e))?;

    // Build prevouts from fixture if available
    let prevouts: Option<Vec<txray_core::block::undo::UndoPrevout>> =
        report["prevouts"].as_array().map(|arr| {
            arr.iter()
                .map(|p| {
                    let value = p["value_sats"].as_u64().unwrap_or(0);
                    let script_hex = p["script_pubkey_hex"].as_str().unwrap_or("");
                    let script = hex::decode(script_hex).unwrap_or_default();
                    txray_core::block::undo::UndoPrevout {
                        value_sats: value,
                        script_pubkey: script,
                    }
                })
                .collect()
        });

    let fp = txray_sherlock::fingerprint::fingerprint_transaction(
        &parsed,
        prevouts.as_deref(),
    );
    println!("{}", fp);
    Ok(())
}

fn cmd_entropy(fixture_path: &str) -> Result<()> {
    let json_str =
        std::fs::read_to_string(fixture_path).context("failed to read fixture file")?;
    let report: serde_json::Value =
        serde_json::from_str(&json_str).context("failed to parse fixture JSON")?;

    // Build a RawTransaction from raw_hex
    let raw_hex = report["raw_hex"]
        .as_str()
        .ok_or_else(|| anyhow::anyhow!("fixture missing 'raw_hex' field"))?;
    let raw_bytes = hex::decode(raw_hex).context("failed to decode raw_hex")?;
    let parsed = txray_core::tx::parser::parse_raw_tx(&raw_bytes)
        .map_err(|e| anyhow::anyhow!("failed to parse transaction: {}", e))?;

    // Get output amounts from the parsed transaction
    let output_amounts: Vec<u64> = parsed.outputs.iter().map(|o| o.value).collect();

    // Get input amounts from prevouts in the fixture
    let input_amounts: Vec<u64> = report["prevouts"]
        .as_array()
        .map(|arr| {
            arr.iter()
                .map(|p| p["value_sats"].as_u64().unwrap_or(0))
                .collect()
        })
        .unwrap_or_default();

    if input_amounts.is_empty() {
        anyhow::bail!("fixture missing 'prevouts' array with input amounts");
    }

    match txray_sherlock::entropy::compute_entropy(&input_amounts, &output_amounts) {
        Some(result) => println!("{}", result),
        None => println!("Cannot compute entropy: empty inputs or outputs"),
    }
    Ok(())
}

fn cmd_debug_script(script_hex: &str, script_sig_hex: &str, witness_hex: &str) -> Result<()> {
    let script_pubkey = hex::decode(script_hex).context("failed to decode scriptPubKey hex")?;
    let script_sig = if script_sig_hex.is_empty() {
        vec![]
    } else {
        hex::decode(script_sig_hex).context("failed to decode scriptSig hex")?
    };
    let witness: Vec<Vec<u8>> = if witness_hex.is_empty() {
        vec![]
    } else {
        witness_hex
            .split(',')
            .map(|item| hex::decode(item.trim()).context("failed to decode witness item hex"))
            .collect::<Result<Vec<_>>>()?
    };

    let steps = txray_core::tx::script_exec::execute_script(&script_pubkey, &script_sig, &witness);

    println!("{}", "Script Execution Trace".bold().cyan());
    println!("{}", "═".repeat(70).dimmed());
    println!();
    for step in &steps {
        println!("{}", step);
    }
    println!();
    Ok(())
}

async fn cmd_fetch(block: Option<String>, tx: Option<String>, source: &str) -> Result<()> {
    let api_source = match source {
        "esplora" => txray_net::ApiSource::Esplora,
        _ => txray_net::ApiSource::MempoolSpace,
    };

    if let Some(block_id) = block {
        let id = if block_id.len() == 64 && block_id.chars().all(|c| c.is_ascii_hexdigit()) {
            txray_net::BlockId::Hash(block_id)
        } else {
            let height: u64 = block_id
                .parse()
                .context("block must be a height (number) or hash (64-char hex)")?;
            txray_net::BlockId::Height(height)
        };

        println!("{}", "Fetching block...".dimmed());
        let bytes = txray_net::fetch_raw_block(&api_source, &id)
            .await
            .map_err(|e| anyhow::anyhow!("{}", e))?;

        println!("{} {} bytes fetched", "✓".green().bold(), bytes.len());

        // Try to parse the block header
        match txray_core::block::parser::parse_raw_block(&bytes) {
            Ok(raw_block) => {
                let hash = txray_core::block::parser::reversed_hex(&raw_block.header.block_hash);
                let prev =
                    txray_core::block::parser::reversed_hex(&raw_block.header.prev_block_hash);
                let merkle = txray_core::block::parser::reversed_hex(&raw_block.header.merkle_root);

                println!();
                println!("{}", "Block Header".bold().cyan());
                println!("  {} {}", "Hash:".dimmed(), hash);
                println!("  {} {}", "Prev:".dimmed(), prev);
                println!("  {} {}", "Merkle:".dimmed(), merkle);
                println!("  {} {}", "Version:".dimmed(), raw_block.header.version);
                println!("  {} {}", "Timestamp:".dimmed(), raw_block.header.timestamp);
                println!("  {} {}", "Nonce:".dimmed(), raw_block.header.nonce);

                // Count transactions
                if let Ok(raw_txs) =
                    txray_core::block::parser::extract_raw_transactions(&raw_block.payload)
                {
                    println!("  {} {}", "Transactions:".dimmed(), raw_txs.len());
                }

                // Check if this is a famous block
                if let Some(famous) = txray_corpus::find_by_name(&hash[..16]) {
                    println!();
                    println!("  {} {}", "📚".bold(), famous.name.yellow().bold());
                    println!("  {}", famous.description.dimmed());
                } else if let txray_net::BlockId::Height(h) = &id {
                    if let Some(famous) = txray_corpus::find_by_height(*h) {
                        println!();
                        println!("  {} {}", "📚".bold(), famous.name.yellow().bold());
                        println!("  {}", famous.description.dimmed());
                    }
                }
            }
            Err(e) => {
                println!("{} Could not parse block header: {}", "⚠".yellow(), e);
                println!(
                    "Raw hex (first 160 chars): {}",
                    &hex::encode(&bytes[..bytes.len().min(80)])
                );
            }
        }
    } else if let Some(txid) = tx {
        println!("{}", "Fetching transaction...".dimmed());
        let bytes = txray_net::fetch_raw_tx(&api_source, &txid)
            .await
            .map_err(|e| anyhow::anyhow!("{}", e))?;

        println!("{} {} bytes fetched", "✓".green().bold(), bytes.len());

        match txray_core::tx::parser::parse_raw_tx(&bytes) {
            Ok(parsed) => {
                let computed_txid = txray_core::tx::hash::compute_txid(&parsed.base_bytes);
                let weight = txray_core::tx::weight::compute_weight_info(&parsed);

                println!();
                println!("{}", "Transaction".bold().cyan());
                println!("  {} {}", "TxID:".dimmed(), computed_txid);
                println!("  {} {}", "Version:".dimmed(), parsed.version);
                println!("  {} {}", "SegWit:".dimmed(), parsed.is_segwit);
                println!("  {} {}", "Inputs:".dimmed(), parsed.inputs.len());
                println!("  {} {}", "Outputs:".dimmed(), parsed.outputs.len());
                println!("  {} {} bytes", "Size:".dimmed(), weight.size_bytes);
                println!("  {} {} WU", "Weight:".dimmed(), weight.weight);
                println!("  {} {} vB", "VBytes:".dimmed(), weight.vbytes);
                println!("  {} {}", "Locktime:".dimmed(), parsed.locktime);
            }
            Err(e) => {
                println!("{} Could not parse transaction: {}", "⚠".yellow(), e);
            }
        }
    } else {
        anyhow::bail!("specify --block <height_or_hash> or --tx <txid>");
    }

    Ok(())
}

fn cmd_famous(query: Option<&str>) -> Result<()> {
    match query {
        None => {
            println!("{}", "📚 Famous Bitcoin Blocks".bold().cyan());
            println!("{}", "═".repeat(50).dimmed());
            println!();
            for block in txray_corpus::list_famous() {
                println!(
                    "  {} {:>9}  {}",
                    "▸".cyan(),
                    format!("#{}", block.height).yellow(),
                    block.name.bold()
                );
                println!("    {}", block.description.dimmed());
                println!();
            }
            println!(
                "{}",
                "Use 'txray famous <name>' for details, or 'txray fetch --block <height>' to fetch."
                    .dimmed()
            );
        }
        Some(q) => {
            // try by height first
            let found = q
                .parse::<u64>()
                .ok()
                .and_then(txray_corpus::find_by_height)
                .or_else(|| txray_corpus::find_by_name(q));

            match found {
                Some(block) => {
                    println!();
                    println!("{} {}", "📚".bold(), block.name.bold().cyan());
                    println!("{}", "─".repeat(50).dimmed());
                    println!(
                        "  {} #{}",
                        "Height:".dimmed(),
                        block.height.to_string().yellow()
                    );
                    println!("  {} {}", "Hash:".dimmed(), block.hash);
                    println!();
                    println!("  {}", block.description);
                    println!();
                    println!("  {}", "Why it's interesting:".bold());
                    println!("  {}", block.why_interesting);
                    println!();
                    println!("  {}", "What to look for:".bold());
                    for item in block.what_to_look_for {
                        println!("    {} {}", "•".cyan(), item);
                    }
                    println!();
                    println!(
                        "  {} txray fetch --block {}",
                        "Fetch it:".dimmed(),
                        block.height
                    );
                    println!();
                }
                None => {
                    println!("{} No famous block matching '{}'", "✗".red().bold(), q);
                    println!(
                        "  {}",
                        "Try: genesis, pizza, segwit, taproot, coinjoin".dimmed()
                    );
                }
            }
        }
    }
    Ok(())
}
