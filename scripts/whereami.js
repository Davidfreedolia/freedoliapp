/**
 * Guard: fail if Cursor is running in a git worktree under .cursor/worktrees.
 * Run from project root: npm run whereami
 */
import { execSync } from 'child_process';

const cwd = process.cwd();
let topLevel = '';
try {
  topLevel = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
} catch {
  console.error('whereami: git rev-parse failed');
  process.exit(1);
}

console.log('cwd:', cwd);
console.log('git top-level:', topLevel);

const bad = /\.cursor[\\/]worktrees/i;
if (bad.test(cwd) || bad.test(topLevel)) {
  console.error('whereami: running inside .cursor/worktrees — use C:\\Users\\David\\Desktop\\freedoliapp');
  process.exit(1);
}
