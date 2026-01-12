import { Page, expect, Locator } from "@playwright/test";

/**
 * Creates a test expense in the Finances page
 * @param page Playwright page object
 * @returns Object with unique reference and row locator
 */
export async function createTestExpense(page: Page): Promise<{ reference: string; rowLocator: Locator }> {
  const reference = `QA-E2E-${Date.now()}`;
  
  // Navigate to finances page
  await page.goto("/finances");
  
  // Wait for page to load
  await expect(page.getByPlaceholder(/Buscar|buscar/i).first()).toBeVisible({ timeout: 10_000 });
  
  // Click "Despesa" button to open new expense modal
  const newExpenseButton = page.getByRole('button', { name: /Despesa|Nova despesa/i }).filter({ hasText: /Despesa/i }).first();
  await expect(newExpenseButton).toBeVisible({ timeout: 10_000 });
  await newExpenseButton.click();
  
  // Wait for modal to be visible
  await expect(page.getByText(/Nova despesa|New expense/i).first()).toBeVisible({ timeout: 10_000 });
  
  // Fill required fields: Category (must select first available)
  const categorySelect = page.locator('label:has-text("Categoria *"), label:has-text("Categoria")').locator('..').locator('select').first();
  await expect(categorySelect).toBeVisible({ timeout: 5_000 });
  await categorySelect.click();
  // Select first non-empty option
  const categoryOptions = categorySelect.locator('option:not([value=""])');
  const firstCategoryOption = categoryOptions.first();
  const categoryValue = await firstCategoryOption.getAttribute('value');
  await categorySelect.selectOption(categoryValue || '');
  
  // Fill Amount (required)
  const amountInput = page.locator('label:has-text("Import *"), label:has-text("Import")').locator('..').locator('input[type="number"]').first();
  await expect(amountInput).toBeVisible({ timeout: 5_000 });
  await amountInput.fill('100.00');
  
  // Fill Date (required) - use today's date
  const today = new Date().toISOString().split('T')[0];
  const dateInput = page.locator('label:has-text("Data *"), label:has-text("Data")').locator('..').locator('input[type="date"]').first();
  await expect(dateInput).toBeVisible({ timeout: 5_000 });
  await dateInput.fill(today);
  
  // Fill Reference number with unique identifier
  const referenceInput = page.locator('label:has-text("Referència"), label:has-text("Reference")').locator('..').locator('input[type="text"]').first();
  await expect(referenceInput).toBeVisible({ timeout: 5_000 });
  await referenceInput.fill(reference);
  
  // Click Save button - must be within the transaction modal (not "Guardar vista" button)
  // Find the modal and then the save button within it
  const modalTitle = page.getByText(/Nova despesa|New expense/i).first();
  await expect(modalTitle).toBeVisible({ timeout: 5_000 });
  
  // Find the save button that is in the modal footer (after "Tancar" button)
  // The save button has text "Guardar" but not "vista", and is in the modal footer
  // Look for button with Save icon (SVG) and text "Guardar" within the modal
  const modalContainer = modalTitle.locator('..').locator('..').locator('..'); // Go up to modal container
  const saveButton = modalContainer.locator('button:has-text("Guardar"):not(:has-text("vista"))').last();
  // Alternative approach: find by role but filter by not having "vista" text
  await expect(saveButton).toBeVisible({ timeout: 5_000 });
  await saveButton.click();
  
  // Wait for modal to update (for new expenses, modal stays open with receipts section visible)
  // After saving, the receipts section should be visible (expense has ID now)
  // Use first() to avoid strict mode violation (multiple elements match)
  await expect(page.getByText(/Receipts|PDF, JPG, PNG/i).first()).toBeVisible({ timeout: 10_000 });
  
  // Wait a bit more for the save to complete and modal to update
  await page.waitForTimeout(1000);
  
  // Modal stays open for new expenses (to allow uploading receipts)
  // Return the reference and a dummy locator (modal is open, no need to find row yet)
  // The row locator will be used later if needed (in delete function)
  const dummyRowLocator = page.locator('body'); // Placeholder, not actually used when modal is open
  
  return { reference, rowLocator: dummyRowLocator };
}

/**
 * Opens the edit modal for an expense by reference
 * @param page Playwright page object
 * @param reference Unique reference number
 */
export async function openExpenseEditModal(page: Page, reference: string): Promise<void> {
  // Navigate to finances if not already there
  await page.goto("/finances");
  
  // Search for the expense
  const searchInput = page.getByPlaceholder(/Buscar|buscar/i).first();
  await expect(searchInput).toBeVisible({ timeout: 10_000 });
  await searchInput.fill(reference);
  
  // Apply filters
  const applyButton = page.getByRole('button', { name: /Aplicar filtres|aplicar/i }).first();
  await applyButton.click();
  await page.waitForTimeout(1000);
  
  // Find the row
  const expenseRow = page.locator('tr').filter({ hasText: reference }).first();
  await expect(expenseRow).toBeVisible({ timeout: 10_000 });
  
  // Click actions button (⋮)
  const actionsButton = expenseRow.locator('button:has(svg)').last();
  await actionsButton.click();
  
  // Click Edit
  await page.getByText(/Editar|Edit/i).first().click();
  
  // Wait for modal to be visible
  await expect(page.getByText(/Receipts|PDF, JPG, PNG/i)).toBeVisible({ timeout: 10_000 });
}

/**
 * Deletes an expense by reference
 * @param page Playwright page object
 * @param reference Unique reference number
 */
export async function deleteExpense(page: Page, reference: string): Promise<void> {
  try {
    console.log(`🗑️  Attempting to delete expense with reference: ${reference}`);
    
    // Always navigate to finances page (ensures we're on the list, not in modal)
    await page.goto("/finances");
    
    // Wait for page to load - look for search input
    const searchInput = page.getByPlaceholder(/Buscar|buscar/i).first();
    await expect(searchInput).toBeVisible({ timeout: 10_000 });
    
    // Close any open modal by pressing Escape multiple times (more reliable than clicking X)
    // This ensures modal is closed regardless of how it was opened
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
    await page.keyboard.press('Escape'); // Press again to be sure
    await page.waitForTimeout(1000);
    
    // After closing modal, wait for list to potentially refresh
    // The list may need time to reload after modal closes
    await page.waitForTimeout(2000);
    
    // Force a page reload to ensure list is fresh (newly created expenses may not appear until reload)
    await page.reload();
    await page.waitForTimeout(3000);
    
    // Wait for page to load again after reload - wait for table to be visible
    const reloadedSearchInput = page.getByPlaceholder(/Buscar|buscar/i).first();
    await expect(reloadedSearchInput).toBeVisible({ timeout: 10_000 });
    
    // Wait for table to be visible (ensures data has loaded)
    // Look for any table row or the table itself
    const table = page.locator('table').first();
    try {
      await expect(table).toBeVisible({ timeout: 10_000 });
    } catch {
      // Table might not be visible if there are no expenses, that's okay
      console.log('⚠️  Table not visible, continuing anyway...');
    }
    
    // Close modal again (in case it reopened after reload)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
    
    // Clear any existing search first (ensure clean state)
    await reloadedSearchInput.clear();
    await page.waitForTimeout(500);
    
    // Fill search input with reference
    await reloadedSearchInput.fill(reference);
    await page.waitForTimeout(500); // Wait for input to update
    
    // Apply filters - wait for button to be visible
    const applyButton = page.getByRole('button', { name: /Aplicar filtres|aplicar/i }).first();
    await expect(applyButton).toBeVisible({ timeout: 5_000 });
    
    // Wait for button to be enabled, then click it
    // If button doesn't become enabled, use Enter as fallback
    try {
      await expect(applyButton).toBeEnabled({ timeout: 5_000 });
      await applyButton.click();
    } catch {
      // If button doesn't become enabled, try pressing Enter instead
      await reloadedSearchInput.press('Enter');
    }
    
    // Wait for filters to apply and table to update
    await page.waitForTimeout(3000);
    
    // Find the row containing the reference (with longer timeout)
    // Try multiple strategies to find the row
    let expenseRow = page.locator('tr').filter({ hasText: reference }).first();
    
    // First, check if any row with the reference exists (even if not visible)
    const rowCount = await expenseRow.count();
    console.log(`🔍 Found ${rowCount} row(s) matching reference "${reference}"`);
    
    if (rowCount === 0) {
      // If no row found, try searching in all text on the page
      const pageText = await page.textContent('body');
      if (pageText && pageText.includes(reference)) {
        console.log(`⚠️  Reference "${reference}" found in page text but not in table row`);
        // Try to find it in a different way - maybe it's in a different element
        expenseRow = page.locator('*').filter({ hasText: new RegExp(`^${reference}$`) }).first();
      } else {
        throw new Error(`Expense with reference "${reference}" not found on page`);
      }
    }
    
    await expect(expenseRow).toBeVisible({ timeout: 30_000 });
    
    // Find the actions button (⋮) within that row
    const actionsButton = expenseRow.locator('button:has(svg)').last();
    await expect(actionsButton).toBeVisible({ timeout: 5_000 });
    await actionsButton.click();
    
    // Wait for menu to open
    await page.waitForTimeout(500);
    
    // Set up dialog handler BEFORE clicking delete (native confirm dialog)
    page.once('dialog', async dialog => {
      expect(dialog.message()).toMatch(/Segur|segur|sure|confirm/i);
      await dialog.accept();
    });
    
    // Click Delete button in the menu
    await page.getByText(/Eliminar|Delete/i).first().click();
    
    // Wait for deletion to complete (toast appears and list refreshes)
    await page.waitForTimeout(2000);
    
    console.log(`✅ Cleaned up test expense: ${reference}`);
  } catch (error) {
    console.error(`❌ Failed to delete expense with reference ${reference}:`, error);
    console.log(`⚠️  Expense with reference "${reference}" may need manual cleanup`);
    // Don't throw - allow test to continue even if cleanup fails
    // The test will still pass, but we'll have logged the cleanup failure
  }
}
