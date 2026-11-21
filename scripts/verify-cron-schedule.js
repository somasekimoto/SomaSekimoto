#!/usr/bin/env node
'use strict';

// Verifies .github/workflows/profile-summary-cards.yml fires on a schedule
// that matches exactly once per day (issue #4), and that workflow_dispatch
// is still present for manual runs.

const fs = require('fs');
const path = require('path');

const WORKFLOW_PATH = path.join(
  __dirname,
  '..',
  '.github',
  'workflows',
  'profile-summary-cards.yml'
);

function parseField(expr, min, max) {
  const values = new Set();
  for (const part of expr.split(',')) {
    let m;
    if (part === '*') {
      for (let v = min; v <= max; v++) values.add(v);
    } else if ((m = part.match(/^(\*|\d+)\/(\d+)$/))) {
      const base = m[1] === '*' ? min : parseInt(m[1], 10);
      const step = parseInt(m[2], 10);
      for (let v = base; v <= max; v += step) values.add(v);
    } else if ((m = part.match(/^(\d+)-(\d+)$/))) {
      for (let v = parseInt(m[1], 10); v <= parseInt(m[2], 10); v++) {
        values.add(v);
      }
    } else {
      values.add(parseInt(part, 10));
    }
  }
  return values;
}

function matchesPerDay(cronExpr) {
  const [minute, hour] = cronExpr.trim().split(/\s+/);
  const minuteSet = parseField(minute, 0, 59);
  const hourSet = parseField(hour, 0, 23);
  return minuteSet.size * hourSet.size;
}

function main() {
  const yml = fs.readFileSync(WORKFLOW_PATH, 'utf8');

  const cronMatch = yml.match(/cron:\s*'([^']+)'/);
  if (!cronMatch) {
    console.error('FAIL: could not find a schedule cron expression');
    process.exit(1);
  }
  const cronExpr = cronMatch[1];

  const perDay = matchesPerDay(cronExpr);
  if (perDay !== 1) {
    console.error(
      `FAIL: cron '${cronExpr}' fires ${perDay} time(s) per day, expected exactly 1`
    );
    process.exit(1);
  }

  if (!/workflow_dispatch:/.test(yml)) {
    console.error('FAIL: workflow_dispatch trigger is missing');
    process.exit(1);
  }

  console.log(
    `PASS: cron '${cronExpr}' fires exactly once per day; workflow_dispatch present`
  );
}

main();
