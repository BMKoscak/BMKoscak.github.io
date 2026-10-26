// Build the site and publish dist/ to the `main` branch, which GitHub Pages serves.
// The Astro source lives on the `source` branch. Usage: npm run deploy
import { execSync } from 'node:child_process';
import { cpSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const run = (cmd, opts = {}) => execSync(cmd, { stdio: 'inherit', ...opts });
const out = (cmd) => execSync(cmd).toString().trim();

const branch = out('git rev-parse --abbrev-ref HEAD');
if (branch !== 'source') throw new Error(`Run deploy from the "source" branch (you are on "${branch}").`);
if (out('git status --porcelain')) throw new Error('Commit or stash your changes first.');

run('npm run build');

const dir = '.deploy';
if (existsSync(dir)) run(`git worktree remove --force ${dir}`);
run('git fetch origin main');
run(`git worktree add -B main ${dir} origin/main`);

for (const f of readdirSync(dir)) if (f !== '.git') rmSync(join(dir, f), { recursive: true, force: true });
cpSync('dist', dir, { recursive: true });

const sha = out('git rev-parse --short HEAD');
run('git add -A', { cwd: dir });
try {
	run(`git commit -m "Deploy ${sha}"`, { cwd: dir });
	run('git push origin main', { cwd: dir });
} catch {
	console.log('Nothing new to deploy.');
}
run(`git worktree remove --force ${dir}`);
