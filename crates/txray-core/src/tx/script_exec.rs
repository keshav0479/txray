//! Script step-through debugger - execute Bitcoin Script opcodes with stack snapshots.
//!
//! Educational tool: walks through P2PKH and P2WPKH verification flows
//! opcode-by-opcode, showing the stack state at each step. OP_CHECKSIG is
//! marked "assumed valid" (no actual elliptic curve verification).

use crate::tx::hash;

/// Status of a single execution step.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum StepStatus {
    /// Step executed successfully
    Ok,
    /// Step failed with an error
    Error(String),
    /// Cryptographic operation assumed valid (e.g., OP_CHECKSIG)
    AssumedValid,
    /// Script finished
    Finished,
}

/// A single step in script execution.
#[derive(Debug, Clone)]
pub struct ScriptStep {
    /// Step number (1-indexed)
    pub step_number: usize,
    /// Human-readable opcode name
    pub opcode: String,
    /// Main stack after this step (hex-encoded items, top-of-stack last)
    pub main_stack: Vec<String>,
    /// Alt stack after this step
    pub alt_stack: Vec<String>,
    /// Status of this step
    pub status: StepStatus,
}

/// Execute a Bitcoin script for educational purposes, returning step-by-step
/// stack snapshots.
///
/// For legacy P2PKH: runs scriptSig first, then scriptPubKey (combined execution).
/// For SegWit P2WPKH: runs the witness program (constructs implied P2PKH script).
///
/// OP_CHECKSIG and OP_CHECKMULTISIG are "assumed valid" - no actual signature
/// verification is performed.
pub fn execute_script(
    script_pubkey: &[u8],
    script_sig: &[u8],
    witness: &[Vec<u8>],
) -> Vec<ScriptStep> {
    let mut steps = Vec::new();
    let mut stack: Vec<Vec<u8>> = Vec::new();
    let mut alt_stack: Vec<Vec<u8>> = Vec::new();
    let mut step_num = 0usize;

    // Detect script type to decide execution mode
    let script_type = classify_for_exec(script_pubkey);

    match script_type {
        ExecType::P2wpkh => {
            // SegWit P2WPKH: witness = [signature, pubkey]
            // Implied script: OP_DUP OP_HASH160 <pubkeyhash> OP_EQUALVERIFY OP_CHECKSIG
            if witness.len() < 2 {
                steps.push(ScriptStep {
                    step_number: 1,
                    opcode: "SETUP".to_string(),
                    main_stack: Vec::new(),
                    alt_stack: Vec::new(),
                    status: StepStatus::Error("P2WPKH requires 2 witness items".to_string()),
                });
                return steps;
            }

            // Push witness items onto stack (signature first, then pubkey)
            stack.push(witness[0].clone());
            step_num += 1;
            steps.push(ScriptStep {
                step_number: step_num,
                opcode: "WITNESS_PUSH (signature)".to_string(),
                main_stack: stack_to_hex(&stack),
                alt_stack: stack_to_hex(&alt_stack),
                status: StepStatus::Ok,
            });

            stack.push(witness[1].clone());
            step_num += 1;
            steps.push(ScriptStep {
                step_number: step_num,
                opcode: "WITNESS_PUSH (pubkey)".to_string(),
                main_stack: stack_to_hex(&stack),
                alt_stack: stack_to_hex(&alt_stack),
                status: StepStatus::Ok,
            });

            // Build implied P2PKH script from the witness program hash
            let pubkey_hash = &script_pubkey[2..22]; // 0014<20-byte-hash>
            let mut implied = vec![0x76, 0xa9, 0x14]; // OP_DUP OP_HASH160 OP_PUSHBYTES_20
            implied.extend_from_slice(pubkey_hash);
            implied.push(0x88); // OP_EQUALVERIFY
            implied.push(0xac); // OP_CHECKSIG

            // Execute the implied script
            execute_opcodes(
                &implied,
                &mut stack,
                &mut alt_stack,
                &mut steps,
                &mut step_num,
            );
        }
        ExecType::P2pkh | ExecType::Other => {
            // Legacy: execute scriptSig first, then scriptPubKey
            if !script_sig.is_empty() {
                execute_opcodes(
                    script_sig,
                    &mut stack,
                    &mut alt_stack,
                    &mut steps,
                    &mut step_num,
                );

                // Check if scriptSig execution failed
                if let Some(last) = steps.last() {
                    if matches!(last.status, StepStatus::Error(_)) {
                        return steps;
                    }
                }
            }

            // Execute scriptPubKey
            if !script_pubkey.is_empty() {
                execute_opcodes(
                    script_pubkey,
                    &mut stack,
                    &mut alt_stack,
                    &mut steps,
                    &mut step_num,
                );
            }
        }
    }

    // Final verification: check if stack top is truthy
    let had_error = steps
        .last()
        .map(|s| matches!(s.status, StepStatus::Error(_)))
        .unwrap_or(false);

    if !had_error {
        step_num += 1;
        let success = stack
            .last()
            .map(|item| item.iter().any(|&b| b != 0))
            .unwrap_or(false);
        steps.push(ScriptStep {
            step_number: step_num,
            opcode: "VERIFY_RESULT".to_string(),
            main_stack: stack_to_hex(&stack),
            alt_stack: stack_to_hex(&alt_stack),
            status: if success {
                StepStatus::Finished
            } else {
                StepStatus::Error("Script failed: stack top is not truthy".to_string())
            },
        });
    }

    steps
}

/// Script types for execution mode selection.
enum ExecType {
    P2pkh,
    P2wpkh,
    Other,
}

fn classify_for_exec(script_pubkey: &[u8]) -> ExecType {
    if script_pubkey.len() == 22 && script_pubkey[0] == 0x00 && script_pubkey[1] == 0x14 {
        ExecType::P2wpkh
    } else if script_pubkey.len() == 25
        && script_pubkey[0] == 0x76
        && script_pubkey[1] == 0xa9
        && script_pubkey[2] == 0x14
        && script_pubkey[23] == 0x88
        && script_pubkey[24] == 0xac
    {
        ExecType::P2pkh
    } else {
        ExecType::Other
    }
}

/// Execute opcodes from a script buffer, modifying the stack in place.
fn execute_opcodes(
    script: &[u8],
    stack: &mut Vec<Vec<u8>>,
    alt_stack: &mut Vec<Vec<u8>>,
    steps: &mut Vec<ScriptStep>,
    step_num: &mut usize,
) {
    let mut offset = 0;

    while offset < script.len() {
        let opcode = script[offset];
        offset += 1;

        match opcode {
            // Data push: 1-75 bytes
            0x01..=0x4b => {
                let len = opcode as usize;
                if offset + len > script.len() {
                    *step_num += 1;
                    steps.push(ScriptStep {
                        step_number: *step_num,
                        opcode: format!("OP_PUSHBYTES_{}", len),
                        main_stack: stack_to_hex(stack),
                        alt_stack: stack_to_hex(alt_stack),
                        status: StepStatus::Error("Truncated push data".to_string()),
                    });
                    return;
                }
                let data = script[offset..offset + len].to_vec();
                offset += len;
                stack.push(data);
                *step_num += 1;
                steps.push(ScriptStep {
                    step_number: *step_num,
                    opcode: format!("OP_PUSHBYTES_{}", len),
                    main_stack: stack_to_hex(stack),
                    alt_stack: stack_to_hex(alt_stack),
                    status: StepStatus::Ok,
                });
            }

            // OP_0
            0x00 => {
                stack.push(vec![]);
                *step_num += 1;
                steps.push(ScriptStep {
                    step_number: *step_num,
                    opcode: "OP_0".to_string(),
                    main_stack: stack_to_hex(stack),
                    alt_stack: stack_to_hex(alt_stack),
                    status: StepStatus::Ok,
                });
            }

            // OP_1 through OP_16
            0x51..=0x60 => {
                let num = opcode - 0x50;
                stack.push(vec![num]);
                *step_num += 1;
                steps.push(ScriptStep {
                    step_number: *step_num,
                    opcode: format!("OP_{}", num),
                    main_stack: stack_to_hex(stack),
                    alt_stack: stack_to_hex(alt_stack),
                    status: StepStatus::Ok,
                });
            }

            // OP_DUP (0x76)
            0x76 => {
                *step_num += 1;
                if stack.is_empty() {
                    steps.push(ScriptStep {
                        step_number: *step_num,
                        opcode: "OP_DUP".to_string(),
                        main_stack: stack_to_hex(stack),
                        alt_stack: stack_to_hex(alt_stack),
                        status: StepStatus::Error("Stack underflow".to_string()),
                    });
                    return;
                }
                let top = stack.last().unwrap().clone();
                stack.push(top);
                steps.push(ScriptStep {
                    step_number: *step_num,
                    opcode: "OP_DUP".to_string(),
                    main_stack: stack_to_hex(stack),
                    alt_stack: stack_to_hex(alt_stack),
                    status: StepStatus::Ok,
                });
            }

            // OP_DROP (0x75)
            0x75 => {
                *step_num += 1;
                if stack.is_empty() {
                    steps.push(ScriptStep {
                        step_number: *step_num,
                        opcode: "OP_DROP".to_string(),
                        main_stack: stack_to_hex(stack),
                        alt_stack: stack_to_hex(alt_stack),
                        status: StepStatus::Error("Stack underflow".to_string()),
                    });
                    return;
                }
                stack.pop();
                steps.push(ScriptStep {
                    step_number: *step_num,
                    opcode: "OP_DROP".to_string(),
                    main_stack: stack_to_hex(stack),
                    alt_stack: stack_to_hex(alt_stack),
                    status: StepStatus::Ok,
                });
            }

            // OP_SWAP (0x7c)
            0x7c => {
                *step_num += 1;
                if stack.len() < 2 {
                    steps.push(ScriptStep {
                        step_number: *step_num,
                        opcode: "OP_SWAP".to_string(),
                        main_stack: stack_to_hex(stack),
                        alt_stack: stack_to_hex(alt_stack),
                        status: StepStatus::Error("Stack underflow".to_string()),
                    });
                    return;
                }
                let len = stack.len();
                stack.swap(len - 1, len - 2);
                steps.push(ScriptStep {
                    step_number: *step_num,
                    opcode: "OP_SWAP".to_string(),
                    main_stack: stack_to_hex(stack),
                    alt_stack: stack_to_hex(alt_stack),
                    status: StepStatus::Ok,
                });
            }

            // OP_HASH160 (0xa9) - RIPEMD160(SHA256(data))
            0xa9 => {
                *step_num += 1;
                if stack.is_empty() {
                    steps.push(ScriptStep {
                        step_number: *step_num,
                        opcode: "OP_HASH160".to_string(),
                        main_stack: stack_to_hex(stack),
                        alt_stack: stack_to_hex(alt_stack),
                        status: StepStatus::Error("Stack underflow".to_string()),
                    });
                    return;
                }
                let data = stack.pop().unwrap();
                let hashed = hash::hash160(&data);
                stack.push(hashed);
                steps.push(ScriptStep {
                    step_number: *step_num,
                    opcode: "OP_HASH160".to_string(),
                    main_stack: stack_to_hex(stack),
                    alt_stack: stack_to_hex(alt_stack),
                    status: StepStatus::Ok,
                });
            }

            // OP_EQUAL (0x87)
            0x87 => {
                *step_num += 1;
                if stack.len() < 2 {
                    steps.push(ScriptStep {
                        step_number: *step_num,
                        opcode: "OP_EQUAL".to_string(),
                        main_stack: stack_to_hex(stack),
                        alt_stack: stack_to_hex(alt_stack),
                        status: StepStatus::Error("Stack underflow".to_string()),
                    });
                    return;
                }
                let a = stack.pop().unwrap();
                let b = stack.pop().unwrap();
                stack.push(if a == b { vec![1] } else { vec![] });
                steps.push(ScriptStep {
                    step_number: *step_num,
                    opcode: "OP_EQUAL".to_string(),
                    main_stack: stack_to_hex(stack),
                    alt_stack: stack_to_hex(alt_stack),
                    status: StepStatus::Ok,
                });
            }

            // OP_EQUALVERIFY (0x88) - OP_EQUAL + OP_VERIFY
            0x88 => {
                *step_num += 1;
                if stack.len() < 2 {
                    steps.push(ScriptStep {
                        step_number: *step_num,
                        opcode: "OP_EQUALVERIFY".to_string(),
                        main_stack: stack_to_hex(stack),
                        alt_stack: stack_to_hex(alt_stack),
                        status: StepStatus::Error("Stack underflow".to_string()),
                    });
                    return;
                }
                let a = stack.pop().unwrap();
                let b = stack.pop().unwrap();
                if a == b {
                    steps.push(ScriptStep {
                        step_number: *step_num,
                        opcode: "OP_EQUALVERIFY".to_string(),
                        main_stack: stack_to_hex(stack),
                        alt_stack: stack_to_hex(alt_stack),
                        status: StepStatus::Ok,
                    });
                } else {
                    steps.push(ScriptStep {
                        step_number: *step_num,
                        opcode: "OP_EQUALVERIFY".to_string(),
                        main_stack: stack_to_hex(stack),
                        alt_stack: stack_to_hex(alt_stack),
                        status: StepStatus::Error("Values not equal".to_string()),
                    });
                    return;
                }
            }

            // OP_VERIFY (0x69)
            0x69 => {
                *step_num += 1;
                if stack.is_empty() {
                    steps.push(ScriptStep {
                        step_number: *step_num,
                        opcode: "OP_VERIFY".to_string(),
                        main_stack: stack_to_hex(stack),
                        alt_stack: stack_to_hex(alt_stack),
                        status: StepStatus::Error("Stack underflow".to_string()),
                    });
                    return;
                }
                let top = stack.pop().unwrap();
                let truthy = top.iter().any(|&b| b != 0);
                if truthy {
                    steps.push(ScriptStep {
                        step_number: *step_num,
                        opcode: "OP_VERIFY".to_string(),
                        main_stack: stack_to_hex(stack),
                        alt_stack: stack_to_hex(alt_stack),
                        status: StepStatus::Ok,
                    });
                } else {
                    steps.push(ScriptStep {
                        step_number: *step_num,
                        opcode: "OP_VERIFY".to_string(),
                        main_stack: stack_to_hex(stack),
                        alt_stack: stack_to_hex(alt_stack),
                        status: StepStatus::Error("Verification failed".to_string()),
                    });
                    return;
                }
            }

            // OP_CHECKSIG (0xac) - assumed valid for educational purposes
            0xac => {
                *step_num += 1;
                if stack.len() < 2 {
                    steps.push(ScriptStep {
                        step_number: *step_num,
                        opcode: "OP_CHECKSIG".to_string(),
                        main_stack: stack_to_hex(stack),
                        alt_stack: stack_to_hex(alt_stack),
                        status: StepStatus::Error("Stack underflow".to_string()),
                    });
                    return;
                }
                // Pop pubkey and signature, push TRUE
                stack.pop(); // pubkey
                stack.pop(); // signature
                stack.push(vec![1]); // TRUE - assumed valid
                steps.push(ScriptStep {
                    step_number: *step_num,
                    opcode: "OP_CHECKSIG".to_string(),
                    main_stack: stack_to_hex(stack),
                    alt_stack: stack_to_hex(alt_stack),
                    status: StepStatus::AssumedValid,
                });
            }

            // OP_RETURN (0x6a) - marks output as unspendable
            0x6a => {
                *step_num += 1;
                steps.push(ScriptStep {
                    step_number: *step_num,
                    opcode: "OP_RETURN".to_string(),
                    main_stack: stack_to_hex(stack),
                    alt_stack: stack_to_hex(alt_stack),
                    status: StepStatus::Error("OP_RETURN: script is unspendable".to_string()),
                });
                return;
            }

            // OP_TOALTSTACK (0x6b)
            0x6b => {
                *step_num += 1;
                if stack.is_empty() {
                    steps.push(ScriptStep {
                        step_number: *step_num,
                        opcode: "OP_TOALTSTACK".to_string(),
                        main_stack: stack_to_hex(stack),
                        alt_stack: stack_to_hex(alt_stack),
                        status: StepStatus::Error("Stack underflow".to_string()),
                    });
                    return;
                }
                let item = stack.pop().unwrap();
                alt_stack.push(item);
                steps.push(ScriptStep {
                    step_number: *step_num,
                    opcode: "OP_TOALTSTACK".to_string(),
                    main_stack: stack_to_hex(stack),
                    alt_stack: stack_to_hex(alt_stack),
                    status: StepStatus::Ok,
                });
            }

            // OP_FROMALTSTACK (0x6c)
            0x6c => {
                *step_num += 1;
                if alt_stack.is_empty() {
                    steps.push(ScriptStep {
                        step_number: *step_num,
                        opcode: "OP_FROMALTSTACK".to_string(),
                        main_stack: stack_to_hex(stack),
                        alt_stack: stack_to_hex(alt_stack),
                        status: StepStatus::Error("Alt stack underflow".to_string()),
                    });
                    return;
                }
                let item = alt_stack.pop().unwrap();
                stack.push(item);
                steps.push(ScriptStep {
                    step_number: *step_num,
                    opcode: "OP_FROMALTSTACK".to_string(),
                    main_stack: stack_to_hex(stack),
                    alt_stack: stack_to_hex(alt_stack),
                    status: StepStatus::Ok,
                });
            }

            // Unsupported opcode
            _ => {
                *step_num += 1;
                let name = crate::tx::script::opcode_name_from_byte(opcode);
                steps.push(ScriptStep {
                    step_number: *step_num,
                    opcode: name,
                    main_stack: stack_to_hex(stack),
                    alt_stack: stack_to_hex(alt_stack),
                    status: StepStatus::Ok,
                });
            }
        }
    }
}

/// Convert stack items to hex strings for display.
fn stack_to_hex(stack: &[Vec<u8>]) -> Vec<String> {
    stack
        .iter()
        .map(|item| {
            if item.is_empty() {
                "<empty>".to_string()
            } else {
                hex::encode(item)
            }
        })
        .collect()
}

impl std::fmt::Display for ScriptStep {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let status_icon = match &self.status {
            StepStatus::Ok => "✓",
            StepStatus::Error(_) => "✗",
            StepStatus::AssumedValid => "✓*",
            StepStatus::Finished => "●",
        };
        write!(
            f,
            "  {:>2}. {} {:<25} stack: [{}]",
            self.step_number,
            status_icon,
            self.opcode,
            self.main_stack.join(", ")
        )?;
        if let StepStatus::Error(msg) = &self.status {
            write!(f, "  ERROR: {}", msg)?;
        }
        if self.status == StepStatus::AssumedValid {
            write!(f, "  (assumed valid)")?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn p2pkh_script(hash: &[u8; 20]) -> Vec<u8> {
        let mut s = vec![0x76, 0xa9, 0x14];
        s.extend_from_slice(hash);
        s.push(0x88);
        s.push(0xac);
        s
    }

    fn p2wpkh_script(hash: &[u8; 20]) -> Vec<u8> {
        let mut s = vec![0x00, 0x14];
        s.extend_from_slice(hash);
        s
    }

    #[test]
    fn p2pkh_full_flow() {
        // Simulate a P2PKH spend:
        // scriptSig: <sig> <pubkey>
        // scriptPubKey: OP_DUP OP_HASH160 <pubkeyhash> OP_EQUALVERIFY OP_CHECKSIG
        let fake_pubkey = vec![0x04; 33]; // compressed pubkey
        let pubkey_hash = hash::hash160(&fake_pubkey);
        let mut expected_hash = [0u8; 20];
        expected_hash.copy_from_slice(&pubkey_hash);

        let script_pubkey = p2pkh_script(&expected_hash);

        // scriptSig: push 72 bytes (sig) + push 33 bytes (pubkey)
        let fake_sig = vec![0x30; 72];
        let mut script_sig = vec![72u8]; // OP_PUSHBYTES_72
        script_sig.extend_from_slice(&fake_sig);
        script_sig.push(33); // OP_PUSHBYTES_33
        script_sig.extend_from_slice(&fake_pubkey);

        let steps = execute_script(&script_pubkey, &script_sig, &[]);

        // Should have steps: push sig, push pubkey, OP_DUP, OP_HASH160, push hash,
        // OP_EQUALVERIFY, OP_CHECKSIG, VERIFY_RESULT
        assert!(steps.len() >= 7);

        // Last step should be VERIFY_RESULT with Finished status
        let last = steps.last().unwrap();
        assert_eq!(last.opcode, "VERIFY_RESULT");
        assert_eq!(last.status, StepStatus::Finished);

        // OP_CHECKSIG should be AssumedValid
        let checksig = steps.iter().find(|s| s.opcode == "OP_CHECKSIG").unwrap();
        assert_eq!(checksig.status, StepStatus::AssumedValid);
    }

    #[test]
    fn p2wpkh_flow() {
        // SegWit P2WPKH: witness = [sig, pubkey]
        let fake_pubkey = vec![0x02; 33];
        let pubkey_hash = hash::hash160(&fake_pubkey);
        let mut hash_arr = [0u8; 20];
        hash_arr.copy_from_slice(&pubkey_hash);

        let script_pubkey = p2wpkh_script(&hash_arr);
        let witness = vec![vec![0x30; 72], fake_pubkey]; // sig, pubkey

        let steps = execute_script(&script_pubkey, &[], &witness);

        // Should have: WITNESS_PUSH x2, OP_DUP, OP_HASH160, push hash,
        // OP_EQUALVERIFY, OP_CHECKSIG, VERIFY_RESULT
        assert!(steps.len() >= 7);

        let last = steps.last().unwrap();
        assert_eq!(last.opcode, "VERIFY_RESULT");
        assert_eq!(last.status, StepStatus::Finished);
    }

    #[test]
    fn op_return_fails_immediately() {
        let script = vec![0x6a, 0x04, 0x01, 0x02, 0x03, 0x04]; // OP_RETURN <data>
        let steps = execute_script(&script, &[], &[]);

        assert_eq!(steps.len(), 1);
        assert_eq!(steps[0].opcode, "OP_RETURN");
        assert!(matches!(steps[0].status, StepStatus::Error(_)));
    }

    #[test]
    fn empty_script() {
        let steps = execute_script(&[], &[], &[]);
        // Only VERIFY_RESULT, which fails (empty stack)
        assert_eq!(steps.len(), 1);
        assert_eq!(steps[0].opcode, "VERIFY_RESULT");
        assert!(matches!(steps[0].status, StepStatus::Error(_)));
    }

    #[test]
    fn stack_underflow_on_dup() {
        // OP_DUP with empty stack
        let script = vec![0x76];
        let steps = execute_script(&script, &[], &[]);
        assert_eq!(steps[0].opcode, "OP_DUP");
        assert!(matches!(steps[0].status, StepStatus::Error(_)));
    }

    #[test]
    fn op_equal_works() {
        // Push two identical values, then OP_EQUAL
        let mut script = vec![0x02, 0xaa, 0xbb]; // push 2 bytes
        script.extend_from_slice(&[0x02, 0xaa, 0xbb]); // push same 2 bytes
        script.push(0x87); // OP_EQUAL

        let steps = execute_script(&script, &[], &[]);

        let equal_step = steps.iter().find(|s| s.opcode == "OP_EQUAL").unwrap();
        assert_eq!(equal_step.status, StepStatus::Ok);
        // Stack should have [01] (true)
        assert_eq!(equal_step.main_stack, vec!["01"]);
    }

    #[test]
    fn p2wpkh_insufficient_witness() {
        let script_pubkey = p2wpkh_script(&[0xaa; 20]);
        let witness = vec![vec![0x30; 72]]; // only 1 item, need 2

        let steps = execute_script(&script_pubkey, &[], &witness);
        assert_eq!(steps.len(), 1);
        assert!(matches!(steps[0].status, StepStatus::Error(_)));
    }
}
