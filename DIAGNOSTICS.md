# Diagnostics & QA Page

## Overview

The Diagnostics page (`/diagnostics`) provides an end-to-end QA checklist to verify that all Freedoliapp functionality is working correctly. It's useful for:

- **Local development**: Quick verification after code changes
- **Production debugging**: Detect common issues (RLS policies, missing data, broken queries)
- **Pre-deployment checks**: Validate everything works before deploying

## Access

- **Route**: `/diagnostics`
- **Authentication**: Protected route (requires login)
- **Development only**: Optionally hide the link in Sidebar when `VITE_APP_ENV !== 'development'`

## How to Use

1. **Navigate to `/diagnostics`** in your browser
2. **Click "Run All Checks"** to execute all diagnostics
3. **Or run individual checks** using the "Run Check" button on each card
4. **Review results**:
   - ✅ **OK**: Everything working correctly
   - ⚠️ **Warning**: Working but something to note (e.g., Drive not connected)
   - ❌ **Fail**: Issue detected (check error message and console)

## Checks Overview

### 1. Authentication
- Verifies session exists
- Checks `auth.uid()` is accessible
- Shows user email and session expiry

### 2. Database / RLS
- Tests SELECT access to core tables:
  - `projects`
  - `suppliers`
  - `purchase_orders`
  - `tasks`
  - `sticky_notes`
- **Fail if**: RLS policy blocks access

### 3. Sticky Notes CRUD
- **Create**: Creates a test note
- **List**: Retrieves notes
- **Update**: Marks note as done
- **Delete**: Removes test note
- **Overlay rule**: Verifies open+pinned notes are visible
- **Cleanup**: Removes test data after check

### 4. Sticky → Task Conversion
- Creates a sticky note
- Converts it to a task
- Verifies:
  - Task created correctly
  - `linked_task_id` set on sticky note
  - `pinned = false` after conversion
  - Duplicate conversion prevented
- **Cleanup**: Removes test data

### 5. Tasks CRUD
- **Create**: Creates a test task (requires at least one project)
- **List**: Retrieves tasks
- **Update**: Snoozes task (updates `due_date`)
- **Mark done**: Updates status to 'done'
- **Delete**: Removes test task
- **Cleanup**: Removes test data

### 6. Calendar Events
- Fetches calendar events
- Validates event generation for:
  - Tasks (≥0)
  - Shipments (≥0)
  - Manufacturer packs (≥0)
  - Quotes (≥0)
- Validates event structure (id, title, start, type)
- Navigation smoke test (validates routes exist)

### 7. Drive Integration
- Checks if Drive is connected
- If connected: Verifies token is valid
- If not connected: Warning (OK if not using Drive)
- **Fail if**: Connection error or invalid token

### 8. Dashboard Widgets
- Loads dashboard stats
- Validates counts are coherent (not NaN, not negative)
- Shows project counts (total, active, completed)

## Console

The console at the bottom shows:
- ✅ **Success**: Operation completed successfully
- ⚠️ **Warning**: Something to note (non-critical)
- ❌ **Error**: Issue detected
- **Info**: General information

Each log entry includes a timestamp for debugging.

## Tips

1. **Run checks individually** if you suspect a specific issue
2. **Check console logs** for detailed error messages
3. **Use "Fix" button** to navigate to relevant page (if available)
4. **Check fails don't necessarily mean broken** - some are warnings (e.g., Drive not connected)

## Common Issues

### RLS Policy Errors
- **Symptom**: DB check fails for specific table
- **Fix**: Check Supabase RLS policies for that table
- **Navigate**: Use "Fix" button (navigates to Dashboard)

### Missing Data
- **Symptom**: Calendar shows 0 events
- **Fix**: Create some test data (tasks, projects, etc.)
- **Note**: This is normal for new installations

### Drive Not Connected
- **Symptom**: Drive check shows warning
- **Fix**: Connect Drive in Settings (if needed)
- **Note**: This is OK if not using Drive integration

## Cleanup

All test data created during checks is automatically cleaned up after each check completes (or fails). No manual cleanup needed.








