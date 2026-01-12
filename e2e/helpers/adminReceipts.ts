import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Try to detect bucket name from source code
let DETECTED_BUCKET_NAME: string | null = null;

/**
 * Detects the receipts bucket name from source code or runtime discovery
 */
async function detectReceiptsBucketName(supabase: any): Promise<string> {
  // If already detected, return cached value
  if (DETECTED_BUCKET_NAME) {
    return DETECTED_BUCKET_NAME;
  }

  // Step 1: Try to read from source code (storageBuckets.js)
  try {
    const storageBucketsPath = path.join(process.cwd(), 'src', 'lib', 'storageBuckets.js');
    if (fs.existsSync(storageBucketsPath)) {
      const content = fs.readFileSync(storageBucketsPath, 'utf-8');
      const match = content.match(/RECEIPTS_BUCKET\s*=\s*['"]([^'"]+)['"]/);
      if (match && match[1]) {
        console.log(`📦 Detected bucket from source code: ${match[1]}`);
        DETECTED_BUCKET_NAME = match[1];
        return match[1];
      }
    }
  } catch (error) {
    // Ignore errors reading source code
  }

  // Step 2: Runtime discovery using service role
  console.log('🔍 Discovering bucket name from Supabase storage...');
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      throw new Error(`Failed to list buckets: ${error.message}`);
    }

    if (!buckets || buckets.length === 0) {
      throw new Error('No buckets found in Supabase storage');
    }

    const bucketNames = buckets.map(b => b.name);
    console.log(`📋 Available buckets: ${bucketNames.join(', ')}`);

    // Priority order for bucket selection
    const priorityBuckets = [
      'receipts',
      'expense_attachments',
      'attachments',
      'expenses',
      'files',
      'uploads'
    ];

    // Find first matching bucket by priority
    for (const priorityBucket of priorityBuckets) {
      if (bucketNames.includes(priorityBucket)) {
        console.log(`✅ Selected bucket: ${priorityBucket}`);
        DETECTED_BUCKET_NAME = priorityBucket;
        return priorityBucket;
      }
    }

    // If no priority bucket found, throw error with available buckets
    throw new Error(
      `Could not find receipts bucket. Expected one of: ${priorityBuckets.join(', ')}\n` +
      `Available buckets: ${bucketNames.join(', ')}\n` +
      `Please create a bucket with one of the expected names or update the priority list.`
    );
  } catch (error: any) {
    console.error(`❌ Error discovering bucket: ${error.message}`);
    throw error;
  }
}

/**
 * Creates a Supabase admin client using service role key
 * Reuses the same logic as adminCleanup.ts
 */
function getAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      'SUPABASE_URL environment variable is required.\n' +
      'Please set SUPABASE_URL before running E2E tests.\n' +
      'Example: $env:SUPABASE_URL="https://your-project.supabase.co"'
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY environment variable is required.\n' +
      'This key is needed for admin operations in E2E tests.\n' +
      'You can find it in your Supabase project settings under API > service_role key.\n' +
      'Example: $env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"'
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Safety check: Only allow operations on expenses with reference starting with "QA-E2E-"
 */
function validateReference(reference: string): void {
  if (!reference.startsWith('QA-E2E-')) {
    throw new Error(`Safety check failed: Reference "${reference}" does not start with "QA-E2E-". Operation aborted.`);
  }
}

/**
 * Gets expense ID and user ID by reference (for QA-E2E-* expenses only)
 */
export async function getExpenseInfoByReference(reference: string): Promise<{ expenseId: string; userId: string } | null> {
  validateReference(reference);

  try {
    let supabase;
    try {
      supabase = getAdminClient();
    } catch (envError: any) {
      // If env vars are missing, log and return null (don't throw)
      console.error(`Error getting expense info for reference ${reference}:`, envError.message);
      return null;
    }

    const { data: expense, error } = await supabase
      .from('expenses')
      .select('id, user_id')
      .eq('reference_number', reference)
      .limit(1)
      .single();

    if (error || !expense) {
      return null;
    }

    return {
      expenseId: expense.id,
      userId: expense.user_id
    };
  } catch (error: any) {
    console.error(`Error getting expense info for reference ${reference}:`, error.message);
    return null;
  }
}

/**
 * Builds receipt storage path (same format as frontend)
 */
function buildReceiptPath(userId: string, expenseId: string, fileName: string): string {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${userId}/expenses/${expenseId}/${timestamp}_${sanitizedFileName}`;
}

/**
 * Uploads a file to Supabase Storage receipts bucket using admin client
 * @param filePath Local file path
 * @param storagePath Path in storage bucket
 * @param contentType MIME type
 */
export async function uploadToStorageAdmin(
  filePath: string,
  storagePath: string,
  contentType: string
): Promise<void> {
  try {
    const supabase = getAdminClient();

    // Detect bucket name (cached after first call)
    const bucketName = await detectReceiptsBucketName(supabase);

    // Read file from disk as Buffer
    const fileBuffer = fs.readFileSync(filePath);
    
    // Convert Buffer to Blob (Node.js 18+ has Blob, but for compatibility use File if available)
    // Supabase storage accepts File, Blob, or ArrayBuffer
    let fileData: Blob | File | ArrayBuffer;
    
    if (typeof Blob !== 'undefined') {
      fileData = new Blob([fileBuffer], { type: contentType });
    } else {
      // Fallback: use ArrayBuffer
      fileData = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength);
    }

    // Upload to storage
    const { error } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, fileData, {
        cacheControl: '3600',
        upsert: false,
        contentType
      });

    if (error) {
      throw new Error(`Failed to upload to storage: ${error.message}`);
    }

    console.log(`✅ Uploaded file to storage: ${storagePath} (bucket: ${bucketName})`);
  } catch (error: any) {
    console.error(`Error uploading to storage:`, error.message);
    throw error;
  }
}

/**
 * Creates an expense attachment row in the database
 */
export async function createExpenseAttachmentRowAdmin(params: {
  expenseId: string;
  userId: string;
  file_path: string;
  file_name: string;
  mime_type: string;
  size: number;
  is_demo?: boolean;
}): Promise<{ id: string }> {
  try {
    const supabase = getAdminClient();

    // Verify expense reference starts with QA-E2E- (safety check)
    const { data: expense } = await supabase
      .from('expenses')
      .select('reference_number')
      .eq('id', params.expenseId)
      .single();

    if (!expense) {
      throw new Error(`Expense ${params.expenseId} not found`);
    }

    validateReference(expense.reference_number);

    const { data, error } = await supabase
      .from('expense_attachments')
      .insert([{
        user_id: params.userId,
        expense_id: params.expenseId,
        file_path: params.file_path,
        file_name: params.file_name,
        mime_type: params.mime_type,
        size: params.size,
        is_demo: params.is_demo || false
      }])
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create attachment row: ${error.message}`);
    }

    console.log(`✅ Created attachment row: ${data.id}`);
    return { id: data.id };
  } catch (error: any) {
    console.error(`Error creating attachment row:`, error.message);
    throw error;
  }
}

/**
 * Replaces an expense attachment (updates file_path, file_name, mime_type, size)
 */
export async function replaceExpenseAttachmentAdmin(params: {
  attachmentId: string;
  newFile_path: string;
  newFile_name: string;
  mime_type: string;
  size: number;
}): Promise<{ id: string; file_path: string; file_name: string }> {
  try {
    const supabase = getAdminClient();

    // First, get the attachment to verify it belongs to a QA-E2E expense
    const { data: attachment, error: fetchError } = await supabase
      .from('expense_attachments')
      .select('expense_id, expenses!inner(reference_number)')
      .eq('id', params.attachmentId)
      .single();

    if (fetchError || !attachment) {
      throw new Error(`Attachment ${params.attachmentId} not found`);
    }

    // Safety check: verify expense reference
    const expense = attachment.expenses as any;
    validateReference(expense.reference_number);

    // Update the attachment
    const { data, error } = await supabase
      .from('expense_attachments')
      .update({
        file_path: params.newFile_path,
        file_name: params.newFile_name,
        mime_type: params.mime_type,
        size: params.size
      })
      .eq('id', params.attachmentId)
      .select('id, file_path, file_name')
      .single();

    if (error) {
      throw new Error(`Failed to replace attachment: ${error.message}`);
    }

    console.log(`✅ Replaced attachment: ${data.id} -> ${params.newFile_name}`);
    return {
      id: data.id,
      file_path: data.file_path,
      file_name: data.file_name
    };
  } catch (error: any) {
    console.error(`Error replacing attachment:`, error.message);
    throw error;
  }
}

/**
 * Deletes a storage object (best effort, non-critical)
 */
export async function deleteStorageObjectAdmin(file_path: string): Promise<void> {
  try {
    const supabase = getAdminClient();

    // Detect bucket name (cached after first call)
    const bucketName = await detectReceiptsBucketName(supabase);

    const { error } = await supabase.storage
      .from(bucketName)
      .remove([file_path]);

    if (error) {
      console.warn(`⚠️  Failed to delete storage object ${file_path}: ${error.message}`);
    } else {
      console.log(`✅ Deleted storage object: ${file_path} (bucket: ${bucketName})`);
    }
  } catch (error: any) {
    console.warn(`⚠️  Error deleting storage object: ${error.message}`);
    // Non-critical, don't throw
  }
}

/**
 * Helper: Upload file and create attachment row in one call
 */
export async function uploadReceiptAdmin(params: {
  expenseReference: string;
  localFilePath: string;
  fileName: string;
  mimeType: string;
}): Promise<{ attachmentId: string; file_path: string }> {
  // Get expense info
  const expenseInfo = await getExpenseInfoByReference(params.expenseReference);
  if (!expenseInfo) {
    throw new Error(`Expense with reference ${params.expenseReference} not found`);
  }

  // Build storage path
  const storagePath = buildReceiptPath(expenseInfo.userId, expenseInfo.expenseId, params.fileName);

  // Upload to storage
  await uploadToStorageAdmin(params.localFilePath, storagePath, params.mimeType);

  // Get file size
  const fileStats = fs.statSync(params.localFilePath);
  const fileSize = fileStats.size;

  // Create attachment row
  const attachment = await createExpenseAttachmentRowAdmin({
    expenseId: expenseInfo.expenseId,
    userId: expenseInfo.userId,
    file_path: storagePath,
    file_name: params.fileName,
    mime_type: params.mimeType,
    size: fileSize,
    is_demo: false
  });

  return {
    attachmentId: attachment.id,
    file_path: storagePath
  };
}

/**
 * Helper: Replace receipt (upload new file and update attachment row)
 */
export async function replaceReceiptAdmin(params: {
  expenseReference: string;
  attachmentId: string;
  localFilePath: string;
  fileName: string;
  mimeType: string;
}): Promise<{ file_path: string; file_name: string }> {
  // Get expense info
  const expenseInfo = await getExpenseInfoByReference(params.expenseReference);
  if (!expenseInfo) {
    throw new Error(`Expense with reference ${params.expenseReference} not found`);
  }

  // Build new storage path
  const newStoragePath = buildReceiptPath(expenseInfo.userId, expenseInfo.expenseId, params.fileName);

  // Upload new file to storage
  await uploadToStorageAdmin(params.localFilePath, newStoragePath, params.mimeType);

  // Get file size
  const fileStats = fs.statSync(params.localFilePath);
  const fileSize = fileStats.size;

  // Update attachment row
  const updated = await replaceExpenseAttachmentAdmin({
    attachmentId: params.attachmentId,
    newFile_path: newStoragePath,
    newFile_name: params.fileName,
    mime_type: params.mimeType,
    size: fileSize
  });

  return {
    file_path: updated.file_path,
    file_name: updated.file_name
  };
}
