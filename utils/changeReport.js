/**
 * Detailed change report for HR-ERP backups.
 * Captures git/file changes and MongoDB data deltas vs the previous backup.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');

/** Paths ignored in uncommitted-file lists (server noise, not app source changes) */
const GIT_NOISE_PREFIXES = [
  'node_modules/',
  'hr-erp-frontend/node_modules/',
  'hr-erp-frontend/build/',
  'backups/',
  'uploads/'
];

function parseGitStatusPath(line) {
  const match = line.match(/^.. (.+)$/);
  if (!match) return null;
  let filePath = match[1].trim();
  if (filePath.includes(' -> ')) filePath = filePath.split(' -> ').pop().trim();
  return filePath.replace(/\\/g, '/');
}

function isNoiseGitPath(filePath) {
  if (!filePath) return true;
  const p = filePath.replace(/\\/g, '/');
  return GIT_NOISE_PREFIXES.some((prefix) => p.startsWith(prefix) || p.includes(`/${prefix}`));
}

function filterGitStatusLines(statusLines) {
  const meaningful = [];
  let ignoredCount = 0;
  for (const line of statusLines) {
    const filePath = parseGitStatusPath(line);
    if (isNoiseGitPath(filePath)) {
      ignoredCount++;
      continue;
    }
    meaningful.push(line);
  }
  return { files: meaningful, count: meaningful.length, ignoredCount };
}

function runGit(args, fallback = '') {
  try {
    return execSync(`git ${args}`, {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  } catch {
    return fallback;
  }
}

function getGitSnapshot() {
  const branch = runGit('rev-parse --abbrev-ref HEAD', 'unknown');
  const commit = runGit('rev-parse HEAD', 'unknown');
  const shortCommit = runGit('rev-parse --short HEAD', commit.slice(0, 7));
  const subject = runGit('log -1 --pretty=%s', '');
  const author = runGit('log -1 --pretty=format:%an', '');
  const authorEmail = runGit('log -1 --pretty=format:%ae', '');
  const commitDate = runGit('log -1 --pretty=%cI', '');

  const statusLines = runGit('status --short', '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const filtered = filterGitStatusLines(statusLines);
  const unstagedStat = runGit('diff --stat -- . ":(exclude)node_modules" ":(exclude)hr-erp-frontend/node_modules" ":(exclude)hr-erp-frontend/build" ":(exclude)backups" ":(exclude)uploads"', '');
  const stagedStat = runGit('diff --cached --stat -- . ":(exclude)node_modules" ":(exclude)hr-erp-frontend/node_modules" ":(exclude)hr-erp-frontend/build" ":(exclude)backups" ":(exclude)uploads"', '');

  return {
    branch,
    commit,
    shortCommit,
    subject,
    author: authorEmail ? `${author} <${authorEmail}>` : author,
    commitDate,
    uncommitted: {
      count: filtered.count,
      ignoredCount: filtered.ignoredCount,
      files: filtered.files,
      unstagedDiffStat: unstagedStat || null,
      stagedDiffStat: stagedStat || null
    }
  };
}

function getGitChangesSince(baseCommit, sinceDate) {
  if (!baseCommit || baseCommit === 'unknown') {
    if (!sinceDate) {
      return {
        baseCommit: null,
        sinceDate: null,
        commits: [],
        commitCount: 0,
        diffStat: null,
        filesChanged: []
      };
    }

    const since = new Date(sinceDate).toISOString();
    const commitsRaw = runGit(`log --since="${since}" --oneline`, '');
    const commits = commitsRaw
      ? commitsRaw.split('\n').map((line) => {
          const space = line.indexOf(' ');
          return {
            hash: space > 0 ? line.slice(0, space) : line,
            message: space > 0 ? line.slice(space + 1) : ''
          };
        })
      : [];

    return {
      baseCommit: null,
      sinceDate: since,
      commitCount: commits.length,
      commits,
      diffStat: null,
      filesChanged: [],
      note: 'Previous backup had no git commit recorded; listing commits since that backup time.'
    };
  }

  const range = `${baseCommit}..HEAD`;
  const commitsRaw = runGit(`log ${range} --oneline`, '');
  const commits = commitsRaw
    ? commitsRaw.split('\n').map((line) => {
        const space = line.indexOf(' ');
        return {
          hash: space > 0 ? line.slice(0, space) : line,
          message: space > 0 ? line.slice(space + 1) : ''
        };
      })
    : [];

  const diffStat = runGit(`diff ${range} --stat`, '') || null;
  const nameStatus = runGit(`diff ${range} --name-status`, '');
  const filesChanged = nameStatus
    ? nameStatus.split('\n').map((line) => {
        const parts = line.split('\t');
        return { status: parts[0], path: parts.slice(1).join('\t') };
      })
    : [];

  return {
    baseCommit,
    sinceDate: null,
    commitCount: commits.length,
    commits,
    diffStat,
    filesChanged
  };
}

async function getDataSnapshot(mongoose) {
  if (mongoose.connection.readyState !== 1) {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hr-erp';
    await mongoose.connect(mongoURI);
  }

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  const collectionCounts = {};

  for (const { name } of collections) {
    collectionCounts[name] = await db.collection(name).countDocuments();
  }

  const User = require('../models/User');
  const Form = require('../models/Form');
  const Audit = require('../models/Audit');

  const usersByStatus = await User.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  const formsByStatus = await Form.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  const formsByType = await Form.aggregate([
    { $group: { _id: '$type', count: { $sum: 1 } } }
  ]);

  const negativeVacationUsers = await User.find(
    { vacationDaysLeft: { $lt: 0 } },
    { name: 1, email: 1, employeeCode: 1, vacationDaysLeft: 1 }
  ).lean();

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const auditByAction = await Audit.aggregate([
    { $match: { timestamp: { $gte: since } } },
    { $group: { _id: '$action', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  const recentBalanceChanges = await Audit.find({
    action: 'VACATION_DAYS_MODIFIED',
    timestamp: { $gte: since }
  })
    .sort({ timestamp: -1 })
    .limit(50)
    .select('timestamp description reason oldValues newValues details performedBy')
    .lean();

  const recentFormActions = await Audit.find({
    action: { $in: ['FORM_APPROVED', 'FORM_REJECTED', 'FORM_CREATED', 'FORM_UPDATED'] },
    timestamp: { $gte: since }
  })
    .sort({ timestamp: -1 })
    .limit(30)
    .select('timestamp action description details')
    .lean();

  return {
    capturedAt: new Date().toISOString(),
    collectionCounts,
    usersByStatus: Object.fromEntries(usersByStatus.map((r) => [r._id || 'unknown', r.count])),
    formsByStatus: Object.fromEntries(formsByStatus.map((r) => [r._id || 'unknown', r.count])),
    formsByType: Object.fromEntries(formsByType.map((r) => [r._id || 'unknown', r.count])),
    negativeVacationUsers,
    auditSummaryLast30Days: Object.fromEntries(auditByAction.map((r) => [r._id, r.count])),
    recentBalanceChanges,
    recentFormActions
  };
}

function diffCounts(current, previous) {
  if (!previous) return null;
  const allKeys = new Set([...Object.keys(current || {}), ...Object.keys(previous || {})]);
  const delta = {};
  for (const key of allKeys) {
    const cur = current?.[key] ?? 0;
    const prev = previous?.[key] ?? 0;
    if (cur !== prev) delta[key] = { before: prev, after: cur, change: cur - prev };
  }
  return Object.keys(delta).length ? delta : null;
}

function buildDataDelta(currentSnapshot, previousSnapshot, baselineMeta) {
  if (!previousSnapshot) {
    const message = baselineMeta?.backupId
      ? `Previous backup \`${baselineMeta.backupId}\` (${baselineMeta.createdAt}) had no data snapshot (standard backup). Counts below are saved for the next detailed backup comparison.`
      : 'No previous backup — counts recorded for next comparison.';
    return { hasBaseline: false, message };
  }

  return {
    hasBaseline: true,
    previousCapturedAt: previousSnapshot.capturedAt,
    collectionCountDelta: diffCounts(
      currentSnapshot.collectionCounts,
      previousSnapshot.collectionCounts
    ),
    usersByStatusDelta: diffCounts(
      currentSnapshot.usersByStatus,
      previousSnapshot.usersByStatus
    ),
    formsByStatusDelta: diffCounts(
      currentSnapshot.formsByStatus,
      previousSnapshot.formsByStatus
    ),
    formsByTypeDelta: diffCounts(
      currentSnapshot.formsByType,
      previousSnapshot.formsByType
    ),
    negativeVacationCount: {
      before: (previousSnapshot.negativeVacationUsers || []).length,
      after: (currentSnapshot.negativeVacationUsers || []).length
    }
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# HR-ERP Detailed Backup Change Report');
  lines.push('');
  lines.push(`**Generated:** ${report.generatedAt}`);
  lines.push(`**Backup ID:** ${report.backupId}`);
  lines.push('');

  lines.push('## Git / code changes');
  lines.push('');
  lines.push(`- **Branch:** ${report.git.branch}`);
  lines.push(`- **Commit:** ${report.git.shortCommit} — ${report.git.subject}`);
  lines.push(`- **Author:** ${report.git.author}`);
  lines.push(`- **Date:** ${report.git.commitDate}`);
  lines.push('');

  if (report.previousBackup) {
    lines.push(`- **Compared to backup:** \`${report.previousBackup.id}\` (${report.previousBackup.createdAt})`);
    lines.push('');
  }

  if (report.gitChanges.baseCommit) {
    lines.push(`### Commits since last backup (\`${report.gitChanges.baseCommit.slice(0, 7)}\`)`);
    lines.push('');
    if (report.gitChanges.commits.length) {
      for (const c of report.gitChanges.commits) {
        lines.push(`- \`${c.hash}\` ${c.message}`);
      }
    } else {
      lines.push('- _(no new commits — same git revision as previous backup)_');
    }
    lines.push('');
    if (report.gitChanges.filesChanged.length) {
      lines.push('### Files changed since last backup');
      lines.push('');
      for (const f of report.gitChanges.filesChanged) {
        lines.push(`- \`${f.status}\` ${f.path}`);
      }
      lines.push('');
    }
    if (report.gitChanges.diffStat) {
      lines.push('```');
      lines.push(report.gitChanges.diffStat);
      lines.push('```');
      lines.push('');
    }
  } else if (report.gitChanges.sinceDate && report.gitChanges.commits?.length) {
    lines.push(`### Commits since previous backup time`);
    lines.push('');
    if (report.gitChanges.note) {
      lines.push(`> ${report.gitChanges.note}`);
      lines.push('');
    }
    for (const c of report.gitChanges.commits) {
      lines.push(`- \`${c.hash}\` ${c.message}`);
    }
    lines.push('');
  } else if (report.previousBackup) {
    lines.push('### Commits since last backup');
    lines.push('');
    lines.push('- _(no new commits since previous backup)_');
    lines.push('');
  }

  if (report.git.uncommitted.count > 0) {
    lines.push('### Uncommitted app changes (excluding node_modules, build, backups, uploads)');
    lines.push('');
    for (const f of report.git.uncommitted.files) {
      lines.push(`- ${f}`);
    }
    lines.push('');
  } else if (report.git.uncommitted.ignoredCount > 0) {
    lines.push(`> ${report.git.uncommitted.ignoredCount} server-only file changes ignored (node_modules, build artifacts, backups, uploads).`);
    lines.push('');
  }

  lines.push('## Database snapshot');
  lines.push('');
  lines.push(`**Captured:** ${report.dataSnapshot.capturedAt}`);
  lines.push('');
  lines.push('### Collection counts');
  lines.push('');
  lines.push('| Collection | Documents |');
  lines.push('|------------|-----------|');
  for (const [name, count] of Object.entries(report.dataSnapshot.collectionCounts).sort()) {
    lines.push(`| ${name} | ${count} |`);
  }
  lines.push('');

  if (report.dataDelta?.hasBaseline) {
    lines.push('### Data changes vs previous backup');
    lines.push('');
    lines.push(`Previous snapshot: ${report.dataDelta.previousCapturedAt}`);
    lines.push('');

    const printDelta = (title, delta) => {
      if (!delta) return;
      lines.push(`#### ${title}`);
      lines.push('');
      lines.push('| Item | Before | After | Δ |');
      lines.push('|------|--------|-------|---|');
      for (const [key, v] of Object.entries(delta)) {
        lines.push(`| ${key} | ${v.before} | ${v.after} | ${v.change >= 0 ? '+' : ''}${v.change} |`);
      }
      lines.push('');
    };

    printDelta('Collections', report.dataDelta.collectionCountDelta);
    printDelta('Users by status', report.dataDelta.usersByStatusDelta);
    printDelta('Forms by status', report.dataDelta.formsByStatusDelta);
    printDelta('Forms by type', report.dataDelta.formsByTypeDelta);

    if (report.dataDelta.negativeVacationCount) {
      const n = report.dataDelta.negativeVacationCount;
      lines.push(`- **Negative vacation balances:** ${n.before} → ${n.after}`);
      lines.push('');
    }
  } else {
    lines.push(`> ${report.dataDelta?.message || 'No baseline for comparison.'}`);
    lines.push('');
  }

  if (report.dataSnapshot.negativeVacationUsers?.length) {
    lines.push('### Users with negative vacation balance');
    lines.push('');
    for (const u of report.dataSnapshot.negativeVacationUsers) {
      lines.push(`- **${u.name}** (${u.email || u.employeeCode || 'no code'}): **${u.vacationDaysLeft}** days`);
    }
    lines.push('');
  }

  lines.push('## Audit activity (last 30 days)');
  lines.push('');
  for (const [action, count] of Object.entries(report.dataSnapshot.auditSummaryLast30Days || {}).sort((a, b) => b[1] - a[1])) {
    lines.push(`- **${action}:** ${count}`);
  }
  lines.push('');

  if (report.dataSnapshot.recentBalanceChanges?.length) {
    lines.push('## Recent vacation balance modifications');
    lines.push('');
    for (const entry of report.dataSnapshot.recentBalanceChanges.slice(0, 20)) {
      const oldV = entry.oldValues?.vacationDaysLeft;
      const newV = entry.newValues?.vacationDaysLeft;
      lines.push(`- **${new Date(entry.timestamp).toLocaleString()}** — ${entry.description}`);
      if (oldV != null || newV != null) {
        lines.push(`  - Balance: ${oldV ?? '?'} → ${newV ?? '?'}`);
      }
      if (entry.reason) lines.push(`  - Reason: ${entry.reason}`);
    }
    lines.push('');
  }

  if (report.dataSnapshot.recentFormActions?.length) {
    lines.push('## Recent form actions');
    lines.push('');
    for (const entry of report.dataSnapshot.recentFormActions.slice(0, 15)) {
      lines.push(`- **${new Date(entry.timestamp).toLocaleString()}** [${entry.action}] ${entry.description}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('_End of change report_');
  return lines.join('\n');
}

function getPreviousBackupBaseline(options = {}) {
  const { listBackups } = require('./backup');
  const backups = listBackups();
  if (backups.length === 0) return null;

  let prev;
  if (options.excludeBackupId) {
    prev = backups.find((b) => b.id !== options.excludeBackupId) || null;
  } else {
    prev = backups[0];
  }
  if (!prev) return null;

  const manifest = prev.manifest;
  if (!manifest) return { backupId: prev.id, createdAt: prev.createdAt };

  return {
    backupId: prev.id,
    createdAt: prev.createdAt,
    gitCommit: manifest.git?.commit || null,
    dataSnapshot: manifest.dataSnapshot || null
  };
}

async function generateChangeReport(backupId, backupPath, options = {}) {
  const baseline =
    options.baseline !== undefined
      ? options.baseline
      : getPreviousBackupBaseline({ excludeBackupId: backupId });
  const git = getGitSnapshot();
  const gitChanges = getGitChangesSince(baseline?.gitCommit, baseline?.createdAt);

  let dataSnapshot = null;
  let dataDelta = null;

  if (!options.skipDatabase) {
    const mongoose = require('mongoose');
    try {
      dataSnapshot = await getDataSnapshot(mongoose);
      dataDelta = buildDataDelta(dataSnapshot, baseline?.dataSnapshot, baseline);
    } finally {
      if (mongoose.connection.readyState === 1) {
        await mongoose.disconnect();
      }
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    backupId,
    previousBackup: baseline
      ? { id: baseline.backupId, createdAt: baseline.createdAt, gitCommit: baseline.gitCommit }
      : null,
    git,
    gitChanges,
    dataSnapshot,
    dataDelta
  };

  const jsonPath = path.join(backupPath, 'change-report.json');
  const mdPath = path.join(backupPath, 'change-report.md');

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(mdPath, renderMarkdown(report));

  return {
    jsonPath,
    mdPath,
    report,
    gitForManifest: {
      branch: git.branch,
      commit: git.commit,
      shortCommit: git.shortCommit,
      subject: git.subject,
      commitDate: git.commitDate
    },
    dataSnapshotForManifest: dataSnapshot
      ? {
          capturedAt: dataSnapshot.capturedAt,
          collectionCounts: dataSnapshot.collectionCounts,
          usersByStatus: dataSnapshot.usersByStatus,
          formsByStatus: dataSnapshot.formsByStatus,
          formsByType: dataSnapshot.formsByType,
          negativeVacationUsers: dataSnapshot.negativeVacationUsers
        }
      : null
  };
}

module.exports = {
  generateChangeReport,
  getGitSnapshot,
  getDataSnapshot,
  renderMarkdown,
  getPreviousBackupBaseline
};
