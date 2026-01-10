// ============================================
// STORAGE BUCKETS CONFIGURATION
// ============================================
// Centralized bucket names to avoid typos and make configuration easier

export const RECEIPTS_BUCKET = 'receipts'

// Helper to validate bucket exists (throws clear error if missing)
export const getReceiptsBucket = () => RECEIPTS_BUCKET
