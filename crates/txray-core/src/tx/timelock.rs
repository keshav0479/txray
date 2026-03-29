/// Timelock information for a transaction
#[derive(Debug, Clone)]
pub struct TimelockInfo {
    pub rbf_signaling: bool,
    pub locktime_type: &'static str,
    pub locktime_value: u64,
}

/// Relative timelock for a single input (BIP68)
#[derive(Debug, Clone)]
pub struct RelativeTimelock {
    pub enabled: bool,
    pub timelock_type: Option<&'static str>, // "blocks" or "seconds"
    pub value: Option<u64>,
}

/// Analyze transaction-level timelock fields.
pub fn analyze_timelock(_version: i32, locktime: u32, sequences: &[u32]) -> TimelockInfo {
    // RBF: any input with sequence < 0xFFFFFFFE
    let rbf_signaling = sequences.iter().any(|&seq| seq < 0xFFFFFFFE);

    // Locktime type
    let (locktime_type, locktime_value) = if locktime == 0 {
        ("none", 0u64)
    } else if locktime < 500_000_000 {
        ("block_height", locktime as u64)
    } else {
        ("unix_timestamp", locktime as u64)
    };

    TimelockInfo {
        rbf_signaling,
        locktime_type,
        locktime_value,
    }
}

/// Analyze BIP68 relative timelock for a single input.
pub fn analyze_relative_timelock(version: i32, sequence: u32) -> RelativeTimelock {
    // BIP68 is only active for tx version >= 2
    if version < 2 {
        return RelativeTimelock {
            enabled: false,
            timelock_type: None,
            value: None,
        };
    }

    // BIP68: bit 31 (disable flag) must be 0 for relative timelock to be active
    let disable_flag = (sequence >> 31) & 1;
    if disable_flag != 0 {
        return RelativeTimelock {
            enabled: false,
            timelock_type: None,
            value: None,
        };
    }

    // Bit 22 = type flag: 0 = blocks, 1 = time-based
    let type_flag = (sequence >> 22) & 1;
    let masked_value = (sequence & 0x0000FFFF) as u64;

    if type_flag == 0 {
        // Block-based: value is number of blocks
        RelativeTimelock {
            enabled: true,
            timelock_type: Some("blocks"),
            value: Some(masked_value),
        }
    } else {
        // Time-based: value in units of 512 seconds
        RelativeTimelock {
            enabled: true,
            timelock_type: Some("time"),
            value: Some(masked_value * 512),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // --- analyze_timelock tests ---

    #[test]
    fn test_rbf_signaling_true() {
        // sequence < 0xFFFFFFFE signals RBF
        let info = analyze_timelock(2, 0, &[0xFFFFFFFD]);
        assert!(info.rbf_signaling);
    }

    #[test]
    fn test_rbf_signaling_false_fffffffe() {
        // 0xFFFFFFFE does NOT signal RBF
        let info = analyze_timelock(2, 0, &[0xFFFFFFFE]);
        assert!(!info.rbf_signaling);
    }

    #[test]
    fn test_rbf_signaling_false_ffffffff() {
        let info = analyze_timelock(2, 0, &[0xFFFFFFFF]);
        assert!(!info.rbf_signaling);
    }

    #[test]
    fn test_rbf_mixed_inputs() {
        // One signaling, one not → RBF true (any input suffices)
        let info = analyze_timelock(2, 0, &[0xFFFFFFFF, 0x00000001]);
        assert!(info.rbf_signaling);
    }

    #[test]
    fn test_locktime_none() {
        let info = analyze_timelock(2, 0, &[0xFFFFFFFF]);
        assert_eq!(info.locktime_type, "none");
        assert_eq!(info.locktime_value, 0);
    }

    #[test]
    fn test_locktime_block_height() {
        let info = analyze_timelock(2, 800_000, &[0xFFFFFFFF]);
        assert_eq!(info.locktime_type, "block_height");
        assert_eq!(info.locktime_value, 800_000);
    }

    #[test]
    fn test_locktime_block_height_boundary() {
        // 499_999_999 is just below the timestamp threshold
        let info = analyze_timelock(2, 499_999_999, &[0xFFFFFFFF]);
        assert_eq!(info.locktime_type, "block_height");
    }

    #[test]
    fn test_locktime_unix_timestamp() {
        let info = analyze_timelock(2, 500_000_000, &[0xFFFFFFFF]);
        assert_eq!(info.locktime_type, "unix_timestamp");
        assert_eq!(info.locktime_value, 500_000_000);
    }

    #[test]
    fn test_locktime_unix_timestamp_large() {
        let info = analyze_timelock(2, 1_710_000_000, &[0xFFFFFFFF]);
        assert_eq!(info.locktime_type, "unix_timestamp");
        assert_eq!(info.locktime_value, 1_710_000_000);
    }

    // --- analyze_relative_timelock tests ---

    #[test]
    fn test_relative_timelock_version_1_disabled() {
        // BIP68 only active for version >= 2
        let rt = analyze_relative_timelock(1, 0x00000007);
        assert!(!rt.enabled);
        assert!(rt.timelock_type.is_none());
    }

    #[test]
    fn test_relative_timelock_bit31_set_disabled() {
        // Bit 31 = disable flag
        let rt = analyze_relative_timelock(2, 0x80000007);
        assert!(!rt.enabled);
    }

    #[test]
    fn test_relative_timelock_blocks() {
        // Version 2, bit 31 clear, bit 22 clear → blocks
        let rt = analyze_relative_timelock(2, 0x00000007);
        assert!(rt.enabled);
        assert_eq!(rt.timelock_type, Some("blocks"));
        assert_eq!(rt.value, Some(7));
    }

    #[test]
    fn test_relative_timelock_time() {
        // Version 2, bit 31 clear, bit 22 set → time (value × 512)
        let sequence = 0x00400003; // bit 22 set, value = 3
        let rt = analyze_relative_timelock(2, sequence);
        assert!(rt.enabled);
        assert_eq!(rt.timelock_type, Some("time"));
        assert_eq!(rt.value, Some(3 * 512));
    }

    #[test]
    fn test_relative_timelock_ffffffff_disabled() {
        // 0xFFFFFFFF has bit 31 set → disabled
        let rt = analyze_relative_timelock(2, 0xFFFFFFFF);
        assert!(!rt.enabled);
    }

    #[test]
    fn test_relative_timelock_fffffffd_blocks() {
        // 0xFFFFFFFD: bit 31 set → disabled
        let rt = analyze_relative_timelock(2, 0xFFFFFFFD);
        assert!(!rt.enabled);
    }
}
