const messagesEl = document.getElementById('messages');
const promptEl = document.getElementById('prompt');
const sendBtn = document.getElementById('send');
const sendAbmBtn = document.getElementById('sendAbm');
const langSelect = document.getElementById('lang');
const useRagCheckbox = document.getElementById('useRag');
const abmResultsEl = document.getElementById('abm-results');
const abmTargetSelect = document.getElementById('abmTarget');

function addMessage(role, text) {
  const d = document.createElement('div');
  d.className = 'msg ' + (role === 'user' ? 'user' : 'bot');
  d.textContent = (role === 'user' ? 'You: ' : 'Bot: ') + text;
  messagesEl.appendChild(d);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function sendPrompt() {
  const prompt = promptEl.value.trim();
  if (!prompt) return;
  addMessage('user', prompt);
  promptEl.value = '';
  addMessage('bot', '... thinking ...');
  try {
    const payload = {
      messages: [{ role: 'user', content: prompt }],
      options: {
        language: langSelect.value || 'en',
        useRag: useRagCheckbox.checked
      }
    };

    const resp = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await resp.json();
    // remove the last 'thinking' message
    const last = messagesEl.lastChild;
    if (last && last.textContent && last.textContent.includes('... thinking ...')) messagesEl.removeChild(last);
    if (data.ok) addMessage('bot', data.response);
    else addMessage('bot', 'Error: ' + (data.error || 'unknown'));
  } catch (e) {
    const last = messagesEl.lastChild;
    if (last && last.textContent && last.textContent.includes('... thinking ...')) messagesEl.removeChild(last);
    addMessage('bot', 'Network error: ' + e.message);
  }
}

sendBtn.addEventListener('click', sendPrompt);
promptEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendPrompt(); });

// Send the latest bot policy (last bot message) to the ABM simulation endpoint
async function sendToAbm() {
  // find last bot message
  const botMessages = Array.from(messagesEl.querySelectorAll('.bot'));
  if (!botMessages.length) {
    alert('No generated policy found to send to ABM. First generate a policy by clicking Send.');
    return;
  }
  const lastBotText = botMessages[botMessages.length - 1].textContent.replace(/^Bot:\s*/, '');
  abmResultsEl.textContent = 'Running simulation...';
  try {
    const resp = await fetch('/api/abm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ policyText: lastBotText, language: langSelect.value || 'en', targetGroup: abmTargetSelect.value || 'all' })
    });
    const data = await resp.json();
    if (!data.ok) {
      abmResultsEl.textContent = 'ABM error: ' + (data.error || 'unknown');
      return;
    }
    // render results
    abmResultsEl.innerHTML = '';
    data.results.forEach(r => {
      const wrap = document.createElement('div');
      wrap.style.marginBottom = '10px';
      const h = document.createElement('strong');
      h.textContent = r.agent;
      const p = document.createElement('div');
      p.textContent = r.narrative;
      wrap.appendChild(h);
      wrap.appendChild(p);
      abmResultsEl.appendChild(wrap);
    });
  } catch (e) {
    abmResultsEl.textContent = 'Simulation network error: ' + e.message;
  }
}

sendAbmBtn.addEventListener('click', sendToAbm);
