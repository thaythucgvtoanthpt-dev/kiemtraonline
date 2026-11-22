const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const ROOT_DIR = __dirname;

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

function listSubdirs(dirName) {
  const fullPath = path.join(ROOT_DIR, dirName);
  if (!fs.existsSync(fullPath)) return [];
  return fs
    .readdirSync(fullPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const indexPath = path.join(fullPath, entry.name, 'index.html');
      let title = entry.name;
      if (fs.existsSync(indexPath)) {
        const html = fs.readFileSync(indexPath, 'utf8');
        const match = html.match(/<title>([^<]*)<\/title>/i);
        if (match && match[1]) title = match[1].trim();
      }
      return {
        slug: entry.name,
        title,
        href: `/${dirName}/${encodeURIComponent(entry.name)}/`,
      };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

function listExams() {
  const examsDir = path.join(ROOT_DIR, 'exams');
  if (!fs.existsSync(examsDir)) return [];
  return fs
    .readdirSync(examsDir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => {
      const filePath = path.join(examsDir, file);
      let meta = {};
      let shortId = file.replace(/\.json$/, '');
      try {
        const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        meta = parsed.metadata || {};
        if (parsed.shortId) shortId = parsed.shortId;
      } catch {
        // Ignore parse errors and still list the file
      }
      return {
        file,
        shortId,
        title: meta.title || shortId,
        grade: meta.grade || '',
        durationMinutes: meta.durationMinutes || null,
        totalQuestions: meta.totalQuestions?.total || null,
        assignedClasses: Array.isArray(meta.assignedClasses) ? meta.assignedClasses : [],
        href: `/exams/${encodeURIComponent(file)}`,
      };
    })
    .sort((a, b) => a.file.localeCompare(b.file));
}

function getDbSummary() {
  const dbPath = path.join(ROOT_DIR, 'data', 'eduexam_db.json');
  if (!fs.existsSync(dbPath)) {
    return { available: false, studentsCount: 0, submissionsCount: 0, catalogCount: 0, updatedAt: null };
  }
  try {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    return {
      available: true,
      studentsCount: Array.isArray(db.students) ? db.students.length : 0,
      submissionsCount: Array.isArray(db.submissions) ? db.submissions.length : 0,
      catalogCount: Array.isArray(db.examsCatalog) ? db.examsCatalog.length : 0,
      updatedAt: db.updatedAt || null,
    };
  } catch {
    return { available: true, studentsCount: 0, submissionsCount: 0, catalogCount: 0, updatedAt: null };
  }
}

app.get('/api/index', (_req, res) => {
  res.json({
    exams: listExams(),
    goLinks: listSubdirs('go'),
    shortLinks: listSubdirs('s'),
    db: getDbSummary(),
  });
});

app.use('/data', express.static(path.join(ROOT_DIR, 'data')));
app.use('/exams', express.static(path.join(ROOT_DIR, 'exams')));
app.use('/go', express.static(path.join(ROOT_DIR, 'go')));
app.use('/s', express.static(path.join(ROOT_DIR, 's')));

app.get('/', (_req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`KiemTraOnline static server running at http://${HOST}:${PORT}`);
});
