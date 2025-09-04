#!/usr/bin/env node
// Node script: convert static Tailwind color classes and hex literals to theme CSS variables.
// Scans .tsx files under the workspace and applies best-effort replacements.
// Produces a report at ./tmp/convert-theme-report.json
//
// Usage: node ./scripts/convert-theme-classes.js

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const REPORT_DIR = path.join(ROOT, 'tmp')
if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true })

const colorMap = {
  blue: 'primary',
  indigo: 'primary',
  green: 'success',
  lime: 'success',
  red: 'destructive',
  pink: 'accent',
  purple: 'accent',
  yellow: 'warning',
  orange: 'warning',
  gray: 'muted',
  neutral: 'muted',
  teal: 'secondary',
  cyan: 'info',
}

const hexMap = {
  '#3b82f6': 'hsl(var(--primary))',       // blue-500
  '#10b981': 'hsl(var(--success))',       // green-500
  '#f59e0b': 'hsl(var(--warning))',       // amber-500
  '#8b5cf6': 'hsl(var(--accent))',        // purple-500
  '#ef4444': 'hsl(var(--destructive))',   // red-500
  '#6b7280': 'hsl(var(--muted))',         // gray-500
  '#000000': 'hsl(var(--foreground))',
  '#ffffff': 'hsl(var(--background))',
}

function walkDir(dir, filelist = []) {
  const files = fs.readdirSync(dir)
  files.forEach(f => {
    const full = path.join(dir, f)
    const stat = fs.statSync(full)
    if (stat.isDirectory() && f !== 'node_modules' && f !== '.git') {
      walkDir(full, filelist)
    } else if (stat.isFile() && full.endsWith('.tsx')) {
      filelist.push(full)
    }
  })
  return filelist
}

function replaceClasses(content) {
  let changed = false
  // replace color classes like text-green-600, bg-blue-50, border-red-200
  const classRegex = /\b(bg|text|border)-(blue|indigo|green|lime|red|pink|purple|yellow|orange|gray|neutral|teal|cyan|cyan|teal|pink|purple|orange|indigo|black|white)-(?:50|100|200|300|400|500|600|700|800|900)\b/g
  content = content.replace(classRegex, (m, prefix, color) => {
    const token = colorMap[color] || 'primary'
    changed = true
    if (prefix === 'bg') return `bg-[hsl(var(--${token}))]`
    if (prefix === 'text') return `text-[hsl(var(--${token}-foreground))]`
    if (prefix === 'border') return `border-[hsl(var(--border))]`
    return m
  })

  // replace simpler classes like text-green, bg-red, border-gray (without shade)
  const simpleClassRegex = /\b(bg|text|border)-(blue|green|red|yellow|orange|purple|gray|neutral|indigo|teal|pink|cyan)\b/g
  content = content.replace(simpleClassRegex, (m, prefix, color) => {
    const token = colorMap[color] || 'primary'
    changed = true
    if (prefix === 'bg') return `bg-[hsl(var(--${token}))]`
    if (prefix === 'text') return `text-[hsl(var(--${token}-foreground))]`
    if (prefix === 'border') return `border-[hsl(var(--border))]`
    return m
  })

  // replace explicit hex colors in strings and inline styles
  Object.keys(hexMap).forEach(hex => {
    const re = new RegExp(hex.replace('#','\\#'), 'gi')
    if (re.test(content)) {
      content = content.replace(re, hexMap[hex])
      changed = true
    }
  })

  // replace inline style backgroundColor: '#rrggbb' -> backgroundColor: 'hsl(var(--primary))' / best-effort
  const inlineHexRegex = /backgroundColor:\s*['"]#([0-9a-f]{6}|[0-9a-f]{3})['"]/gi
  content = content.replace(inlineHexRegex, (m) => {
    changed = true
    return `backgroundColor: 'hsl(var(--card))'`
  })

  // replace inline style color: '#rrggbb'
  const colorHexRegex = /color:\s*['"]#([0-9a-f]{6}|[0-9a-f]{3})['"]/gi
  content = content.replace(colorHexRegex, (m) => {
    changed = true
    return `color: 'hsl(var(--foreground))'`
  })

  return { content, changed }
}

function run() {
  const files = walkDir(ROOT)
  const report = { modified: [], skipped: [], errors: [] }
  files.forEach(file => {
    try {
      const src = fs.readFileSync(file, 'utf8')
      const { content: updated, changed } = replaceClasses(src)
      if (changed && updated !== src) {
        fs.writeFileSync(file, updated, 'utf8')
        report.modified.push({ path: path.relative(ROOT, file), timestamp: new Date().toISOString() })
        console.log('Modified:', path.relative(ROOT, file))
      }
    } catch (err) {
      report.errors.push({ path: path.relative(ROOT, file), message: err.message })
    }
  })

  const reportPath = path.join(REPORT_DIR, 'convert-theme-report.json')
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8')
  console.log('Conversion complete. Report written to', reportPath)
}

run()