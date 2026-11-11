// Build the site and publish dist/ to the `gh-pages` branch of the `origin` remote.
// Usage: npm run deploy
import { execSync } from 'node:child_process'
import fs from 'node:fs'

const sh = (cmd, cwd) => execSync(cmd, { stdio: 'inherit', cwd })
const out = (cmd) => execSync(cmd).toString().trim()

const remote = out('git remote get-url origin')
const name = out('git config user.name')
const email = out('git config user.email')

sh('npm run build')
fs.writeFileSync('dist/.nojekyll', '') // serve files as-is (no Jekyll processing)
fs.rmSync('dist/.git', { recursive: true, force: true })
sh('git init -q -b gh-pages', 'dist')
sh('git add -A', 'dist')
sh(`git -c user.name="${name}" -c user.email="${email}" commit -q -m "Deploy ${new Date().toISOString()}"`, 'dist')
sh(`git push -f "${remote}" gh-pages`, 'dist')
fs.rmSync('dist/.git', { recursive: true, force: true })
console.log('\nPublished to gh-pages.')
