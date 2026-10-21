// Upload the built site (dist/) to Hostpoint over FTPS (encrypted FTP).
//   npm run deploy              build + upload (+ set the CMS password on the very first deploy)
//   npm run deploy -- --password    also change the CMS password
//   npm run deploy -- --verbose     show the FTP conversation (passwords are masked)
// Asks for the FTP login every time and never stores it.
import { Client } from 'basic-ftp'
import { createHash, randomBytes } from 'node:crypto'
import { readdirSync, statSync } from 'node:fs'
import { join, posix } from 'node:path'
import { createInterface } from 'node:readline'
import { Readable } from 'node:stream'

const DIST = new URL('../dist/', import.meta.url).pathname
const changePassword = process.argv.includes('--password')
const verbose = process.argv.includes('--verbose')

/* ───────── prompts ───────── */

function ask(question, { fallback = '' } = {}) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim() || fallback)
    })
  })
}

/** Read a secret without echoing it — also when it is pasted. */
function askHidden(question) {
  return new Promise((resolve) => {
    const { stdin, stdout } = process
    stdout.write(question)
    stdin.setRawMode(true)
    stdin.setEncoding('utf8')
    stdin.resume()
    let value = ''
    const finish = () => {
      stdin.off('data', onData)
      stdin.setRawMode(false)
      stdin.pause()
      stdout.write('\n')
    }
    const onData = (chunk) => {
      for (const ch of chunk.replace(/\x1b\[[0-9;]*[~A-Za-z]/g, '')) { // drop terminal escape codes (e.g. paste markers)
        if (ch === '\r' || ch === '\n') return finish(), resolve(value)
        if (ch === '\u0003') return finish(), process.exit(130) // Ctrl-C
        if (ch === '\u007f' || ch === '\b') value = value.slice(0, -1)
        else if (ch >= ' ') value += ch
      }
    }
    stdin.on('data', onData)
  })
}

/* ───────── helpers ───────── */

function localFiles(dir, base = '') {
  return readdirSync(join(dir, base)).flatMap((name) => {
    const rel = base ? `${base}/${name}` : name
    return statSync(join(dir, rel)).isDirectory() ? localFiles(dir, rel) : [rel]
  })
}

async function setCmsPassword(client, site, webDir) {
  console.log('\nSet the CMS login (used at /login):')
  const username = await ask('  CMS username [lorenzo.reimann]: ', { fallback: 'lorenzo.reimann' })
  const password = await askHidden('  New CMS password (min. 10 characters): ')
  if ((await askHidden('  Repeat the password: ')) !== password) throw new Error("The passwords don't match")
  if (password.length < 10) throw new Error('Use at least 10 characters')

  // one-time code: only its hash goes to the server, the code itself only over HTTPS
  const token = randomBytes(32).toString('hex')
  const hash = createHash('sha256').update(token).digest('hex')
  await client.uploadFrom(Readable.from([hash]), posix.join(webDir, 'api/.setup-token'))
  const res = await fetch(`${site}/api/index.php?r=setup`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-requested-with': 'cms' },
    body: JSON.stringify({ token, username, password }),
  })
  await client.remove(posix.join(webDir, 'api/.setup-token')).catch(() => {}) // normally already deleted by the server
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Setting the password failed: ${data.error ?? res.status}`)
  console.log(`  ✓ CMS login saved for ${username}`)
}

/* ───────── main ───────── */

const files = localFiles(DIST)
if (!files.includes('index.html')) throw new Error('dist/ is empty — run `npm run build` first')

console.log('Deploy to Hostpoint (nothing you type here is saved)\n')
const host = await ask('FTP server: ')
const user = await ask('FTP username: ')
const password = await askHidden('FTP password: ')
if (!host || !user || !password) throw new Error('Server, username and password are all needed')
const site = (await ask('Website address [https://lorenzo-reimann.com]: ', { fallback: 'https://lorenzo-reimann.com' })).replace(/\/$/, '')

const client = new Client(30_000)
client.ftp.verbose = verbose
try {
  await client.access({ host, user, password, secure: true }) // TLS required, certificate verified
  const root = await client.list()
  const folders = root.filter((f) => f.isDirectory).map((f) => f.name)
  console.log('\nConnected (encrypted). Folders on the server:', folders.join(', ') || '—')

  // Hostpoint: the website lives in www/ (or a folder named after the domain inside it)
  let suggested = '/'
  if (folders.includes('www')) {
    const inWww = (await client.list('www')).filter((f) => f.isDirectory).map((f) => f.name)
    suggested = inWww.includes(new URL(site).hostname) ? `www/${new URL(site).hostname}` : 'www'
  }
  let webDir = await ask(`Web folder of ${new URL(site).hostname} — press Enter to use [${suggested}]: `, { fallback: suggested })
  // the control panel shows full paths (/home/<account>/www/…); the FTP login already starts in /home/<account>
  webDir = webDir.replace(/^\/home\/[^/]+\/?/, '').replace(/^\/+|\/+$/g, '') || '/'
  console.log(`  → uploading into: ${webDir}`)

  // copies from earlier attempts that landed outside the web folder (FTP root or a parent folder): offer to remove them
  const ours = ['index.html', 'favicon.svg', '.htaccess', 'api', 'assets', 'media']
  const parts = webDir === '/' ? [] : webDir.split('/')
  const leftovers = []
  for (let depth = 0; depth < parts.length; depth++) {
    const dir = parts.slice(0, depth).join('/')
    for (const f of dir ? await client.list(dir) : root) {
      const path = dir ? `${dir}/${f.name}` : f.name
      const onTheWay = f.name === parts[depth]
      const wrongHome = depth === 0 && f.name === 'home' && f.isDirectory && parts[0] !== 'home'
      if ((ours.includes(f.name) && !onTheWay) || wrongHome) leftovers.push({ path, isDirectory: f.isDirectory })
    }
  }
  if (leftovers.length && /^y/i.test(await ask(`Remove earlier uploads in the wrong place (${leftovers.map((f) => f.path).join(', ')})? [y/N] `))) {
    for (const f of leftovers) await (f.isDirectory ? client.removeDir(f.path) : client.remove(f.path))
    await client.cd('/')
    console.log('  ✓ Removed')
  }

  console.log(`\nUploading ${files.length} files…`)
  await client.uploadFromDir(DIST, webDir) // creates the folder if needed; keeps the working directory

  // remove outdated build files (hashed names change every build); uploads/ is never touched
  const assetsDir = posix.join(webDir, 'assets')
  const keep = new Set(files.filter((f) => f.startsWith('assets/')).map((f) => f.slice('assets/'.length)))
  for (const f of await client.list(assetsDir)) if (f.isFile && !keep.has(f.name)) await client.remove(posix.join(assetsDir, f.name))
  console.log('  ✓ Site uploaded')

  const setup = await fetch(`${site}/api/index.php?r=setup`).then((r) => (r.ok ? r.json() : null)).catch(() => null)
  if (!setup) console.warn(`  ! ${site}/api/index.php did not answer — check that the domain points to this folder and PHP 8.1+ is enabled.`)
  else if (setup.needed || changePassword) await setCmsPassword(client, site, webDir)

  console.log(`\nDone → ${site}`)
} catch (err) {
  const code = err.code ?? ''
  const message = err.message?.startsWith(String(code)) ? err.message : [code, err.message].filter(Boolean).join(' ')
  console.error(`\n✗ ${message || String(err)}`)
  if (code === 530) console.error('  → Wrong FTP username or password (Hostpoint control panel → FTP users).')
  else if (/timeout|socket|ECONN/i.test(`${code} ${err.message}`))
    console.error('  → The server closed the connection. Wait a minute (too many quick logins get blocked briefly), then try again.\n    To see the details: npm run deploy -- --verbose')
  process.exitCode = 1
} finally {
  client.close()
}
