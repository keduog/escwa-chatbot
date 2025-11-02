const http = require('http');
const fs = require('fs');
const path = require('path');
const { callFanar } = require('./fanarAdapter');

const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = process.env.PORT || 3000;

function sendJSON(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function serveStatic(req, res) {
  let urlPath = req.url === '/' ? '/index.html' : req.url;
  // prevent path traversal
  const safePath = path.normalize(urlPath).replace(/^\.+/, '');
  const filePath = path.join(PUBLIC_DIR, safePath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const map = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' };
    res.writeHead(200, { 'Content-Type': map[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function parseJSONBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // simple CORS for local testing
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET') {
    serveStatic(req, res);
    return;
  }

  if (req.method === 'POST' && req.url === '/api/chat') {
    try {
      const body = await parseJSONBody(req);
      const messages = body.messages || (body.prompt ? [{ role: 'user', content: body.prompt }] : null);
      const options = body.options || {};
      if (!messages) return sendJSON(res, 400, { error: 'messages or prompt required' });
      const fanarResponse = await callFanar(messages, options);
      return sendJSON(res, 200, { ok: true, response: fanarResponse });
    } catch (err) {
      console.error(err);
      return sendJSON(res, 500, { error: err.message || 'server error' });
    }
  }

  if (req.method === 'POST' && req.url === '/api/abm') {
    try {
      const body = await parseJSONBody(req);
      const policyText = body.policyText || '';
      const language = body.language || 'en';
      const targetGroup = (body.targetGroup || 'all').toLowerCase();
      if (!policyText) return sendJSON(res, 400, { error: 'policyText required' });

      // Agent definitions with associated groups for filtering
      const agentsDef = [
        { name: 'Farmer', groups: ['employed'] },
        { name: 'Trader', groups: ['employed'] },
        { name: 'Urban resident', groups: ['youths','unemployed','employed'] },
        { name: 'Government agency', groups: ['institutions'] },
        { name: 'NGO', groups: ['institutions','women'] },
        { name: 'Women (community)', groups: ['women'] },
        { name: 'Youth (community)', groups: ['youths'] },
      ];

      // Simple deterministic mock ABM simulation: produce narratives influenced by the policy and targetGroup
      function simulate(policy, lang, target) {
        const seed = policy.split('').reduce((s,c)=>s + c.charCodeAt(0), 0);
        const baseSeverity = (seed % 5); // 0..4
        const allResults = agentsDef.map((a, i) => {
          const severity = (baseSeverity + i * 7) % 5; // 0..4
          const impact = ['no change','small','moderate','significant','transformative'][severity];
          let narrative;
          if (lang === 'ar') {
            narrative = `${a.name} يتأثر بتأثير ${impact} بسبب السياسة المقدمة.`;
          } else {
            narrative = `${a.name} experiences a ${impact} impact due to the proposed policy.`;
          }
          // If target is specific and agent is in that group, emphasize impact
          if (target !== 'all' && a.groups.includes(target)) {
            const emphasis = lang === 'ar' ? ' (أثر مكبر على هذه الفئة)' : ' (heightened effect for this group)';
            narrative += emphasis;
          }
          return { agent: a.name, groups: a.groups, impact, narrative };
        });

        // If target filter provided, return only matching agents; otherwise return all
        if (target === 'all') return allResults;
        const filtered = allResults.filter(r => r.groups.includes(target));
        // If nothing matched, return a helpful note
        if (!filtered.length) {
          return [{ agent: 'System', impact: 'no data', narrative: lang === 'ar' ? 'لا توجد بيانات لوصف هذه الفئة.' : 'No agents match the selected target group.' }];
        }
        return filtered;
      }

      const results = simulate(policyText, language, targetGroup);
      return sendJSON(res, 200, { ok: true, results });
    } catch (err) {
      console.error(err);
      return sendJSON(res, 500, { error: err.message || 'abm server error' });
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
