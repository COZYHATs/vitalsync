const patient = sessionStorage.patient;
let current = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!patient) return;
  generate.onclick = generateInsights;
  await load();
});

async function load() {
  try {
    const body = await api(`/patients/${patient}/insights`);
    current = body.insights;
    insights.className = '';
    insights.innerHTML = current.length ? current.map(row).join('') : '<p class="muted">No insights yet. Generate candidates from verified records when ready.</p>';
  } catch (e) {
    message.textContent = e.message;
  }
}

function row(i) {
  return `<article class="relationship-row insight-${esc(i.status.toLowerCase())}">
    <button type="button" onclick="showInsight('${i.id}')">
      <b>${esc(i.title)}</b>
      <span>${esc(label(i.type))}</span>
      <b>${esc(i.status)}</b>
      <small>${i.ai_generated ? 'AI-generated observation' : 'User-authored'} · Confidence ${pct(i.confidence)}</small>
    </button>
  </article>`;
}

async function showInsight(id) {
  try {
    const body = await api(`/patients/${patient}/insights/${id}`);
    const i = body.insight;
    detail.className = '';
    detail.innerHTML = `<h3>${esc(i.title)}</h3>
      <p><b>Status:</b> ${esc(i.status)}</p>
      <p><b>Type:</b> ${esc(label(i.type))}</p>
      <p><b>AI confidence:</b> ${pct(i.confidence)} <span class="muted">support confidence, not medical certainty</span></p>
      <p>${esc(i.summary)}</p>
      ${i.details ? `<p>${esc(i.details)}</p>` : ''}
      <h3>Evidence</h3>
      ${i.sources.length ? i.sources.map(sourceRow).join('') : '<p class="muted">No evidence sources linked.</p>'}
      <p>${actions(i)}</p>`;
  } catch (e) {
    detail.className = 'muted';
    detail.textContent = e.message;
  }
}

function sourceRow(s) {
  const doc = s.document_id ? ` <a target="_blank" href="${API}/documents/${s.document_id}/file">View source document</a>` : '';
  return `<section class="source-panel">
    <p><b>${esc(label(s.source_type))}</b></p>
    <p><code>${esc(s.source_id)}</code></p>
    ${s.evidence_reference ? `<p>${esc(s.evidence_reference)}</p>` : ''}
    ${doc}
  </section>`;
}

function actions(i) {
  if (i.status === 'PENDING_REVIEW') {
    return `<button onclick="statusInsight('${i.id}','verify')">Verify</button> <button onclick="editInsight('${i.id}')">Edit</button> <button class="danger" onclick="statusInsight('${i.id}','reject')">Reject</button>`;
  }
  if (i.status === 'VERIFIED') {
    return `<button onclick="editInsight('${i.id}')">Correct</button> <button class="danger" onclick="statusInsight('${i.id}','revoke')">Revoke</button>`;
  }
  return '';
}

async function generateInsights() {
  try {
    message.style.color = '#176b87';
    message.textContent = 'Generating insight candidates...';
    const r = await api(`/patients/${patient}/insights/generate`, { method: 'POST' });
    message.textContent = `Generated ${r.created} insight candidates.`;
    await load();
  } catch (e) {
    message.style.color = '';
    message.textContent = e.message;
  }
}

async function statusInsight(id, action) {
  try {
    await api(`/patients/${patient}/insights/${id}/${action}`, { method: 'POST' });
    message.style.color = '#176b87';
    message.textContent = 'Insight updated.';
    await load();
    await showInsight(id);
  } catch (e) {
    message.style.color = '';
    message.textContent = e.message;
  }
}

async function editInsight(id) {
  const body = await api(`/patients/${patient}/insights/${id}`);
  const i = body.insight;
  const title = prompt('Title:', i.title);
  if (title === null) return;
  const summary = prompt('Summary:', i.summary);
  if (summary === null) return;
  const details = prompt('Details:', i.details || '') ?? '';
  const reason = prompt('Correction reason (optional):', '') ?? '';
  try {
    await api(`/patients/${patient}/insights/${id}/correct`, { method: 'POST', body: JSON.stringify({ title, summary, details, reason }) });
    message.style.color = '#176b87';
    message.textContent = 'Insight corrected.';
    await load();
    await showInsight(id);
  } catch (e) {
    message.style.color = '';
    message.textContent = e.message;
  }
}

function label(v) {
  return String(v || '').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function pct(v) {
  return Math.round(Number(v || 0) * 100) + '%';
}
