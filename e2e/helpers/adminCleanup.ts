import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase admin client using service role key
 * This bypasses RLS and should ONLY be used for test cleanup
 */
function getAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      'SUPABASE_URL environment variable is required.\n' +
      'Please set SUPABASE_URL before running E2E tests.\n' +
      'Example: $env:SUPABASE_URL="https://your-project.supabase.co"'
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY environment variable is required for test cleanup.\n' +
      'This key is needed to delete test expenses via Supabase admin API.\n' +
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
 * Safety check: Only allow deletion of expenses with reference starting with "QA-E2E-"
 */
function validateReference(reference: string): void {
  if (!reference.startsWith('QA-E2E-')) {
    throw new Error(`Safety check failed: Reference "${reference}" does not start with "QA-E2E-". Deletion aborted.`);
  }
}

/**
 * Deletes an expense by reference using Supabase admin client
 * Only deletes expenses with reference starting with "QA-E2E-"
 * 
 * @param reference The expense reference (must start with "QA-E2E-")
 * @returns Object with success status and deleted expense ID
 */
export async function deleteExpenseByReference(reference: string): Promise<{ success: boolean; expenseId?: number; error?: string }> {
  try {
    // Safety check
    validateReference(reference);

    let supabase;
    try {
      supabase = getAdminClient();
    } catch (envError: any) {
      // If env vars are missing, log a helpful message and return gracefully
      console.warn(`⚠️  Cannot cleanup expense ${reference} via API: ${envError.message}`);
      console.warn('   Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables for automatic cleanup.');
      return { success: false, error: envError.message };
    }

    // Find expense by reference
    const { data: expenses, error: findError } = await supabase
      .from('expenses')
      .select('id')
      .eq('reference_number', reference)
      .limit(1);

    if (findError) {
      console.error(`Error finding expense with reference ${reference}:`, findError);
      return { success: false, error: findError.message };
    }

    if (!expenses || expenses.length === 0) {
      // Expense not found - this is OK, it might have been deleted already
      console.log(`Expense with reference ${reference} not found (may have been deleted already)`);
      return { success: true };
    }

    const expenseId = expenses[0].id;

    // Delete attachments first (foreign key constraint)
    const { error: attachmentsError } = await supabase
      .from('expense_attachments')
      .delete()
      .eq('expense_id', expenseId);

    if (attachmentsError) {
      console.error(`Error deleting attachments for expense ${expenseId}:`, attachmentsError);
      // Continue with expense deletion anyway
    } else {
      console.log(`Deleted attachments for expense ${expenseId}`);
    }

    // Delete the expense
    const { error: deleteError } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId);

    if (deleteError) {
      console.error(`Error deleting expense ${expenseId}:`, deleteError);
      return { success: false, error: deleteError.message };
    }

    console.log(`✅ Successfully deleted expense ${expenseId} with reference ${reference}`);
    return { success: true, expenseId };
  } catch (error: any) {
    console.error(`Failed to delete expense with reference ${reference}:`, error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Deletes all test expenses with reference starting with "QA-E2E-"
 * Useful for bulk cleanup after test runs
 * 
 * @returns Number of expenses deleted
 */
export async function deleteAllTestExpenses(): Promise<number> {
  try {
    const supabase = getAdminClient();

    // Find all QA-E2E expenses
    const { data: expenses, error: findError } = await supabase
      .from('expenses')
      .select('id')
      .like('reference_number', 'QA-E2E-%');

    if (findError) {
      console.error('Error finding test expenses:', findError);
      return 0;
    }

    if (!expenses || expenses.length === 0) {
      console.log('No test expenses found to delete');
      return 0;
    }

    const expenseIds = expenses.map(e => e.id);

    // Delete attachments for all expenses
    const { error: attachmentsError } = await supabase
      .from('expense_attachments')
      .delete()
      .in('expense_id', expenseIds);

    if (attachmentsError) {
      console.error('Error deleting attachments:', attachmentsError);
    }

    // Delete all expenses
    const { error: deleteError } = await supabase
      .from('expenses')
      .delete()
      .in('id', expenseIds);

    if (deleteError) {
      console.error('Error deleting expenses:', deleteError);
      return 0;
    }

    console.log(`✅ Successfully deleted ${expenses.length} test expenses`);
    return expenses.length;
  } catch (error: any) {
    console.error('Failed to delete test expenses:', error);
    return 0;
  }
}
