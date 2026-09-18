const patient = sessionStorage.patient;
let current = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!patient) return;
  filters.onsubmit = e => {
    e.preventDefault();
    load();
  };
  rebuild.onclick = rebuildGraph;
  await load();
});

async function load() {
  try {
    const params = new URLSearchParams(new FormData(filters));
    const body = await api(`/patients/${patient}/relationships?${params}`);
    current = body.relationships;
    relationships.className = '';
    relationships.innerHTML = current.length ? current.map(row).join('') : '<p class="muted">No relationships yet. Rebuild the graph after verifying timeline data.</p>';
    await loadGraph();
  } catch (e) {
    message.textContent = e.message;
  }
}

function row(r) {
  return `<article class="relationship-row">
    <button type="button" onclick="showRelationship('${r.id}')">
      <b>${esc(r.source_label)}</b>
      <span>${esc(label(r.relationship_type))}</span>
      <b>${esc(r.target_label)}</b>
      <small>${esc(r.status)} · ${esc(r.origin)}</small>
    </button>
  </article>`;
}

async function showRelationship(id) {
  const r = current.find(x => x.id === id) || (await api(`/patients/${patient}/relationships/${id}`)).relationship;
  detail.className = '';
  detail.innerHTML = `<p><b>${esc(r.source_label)}</b></p>
    <p>${esc(label(r.relationship_type))}</p>
    <p><b>${esc(r.target_label)}</b></p>
    <p><b>Status:</b> ${esc(r.status)}</p>
    <p><b>Why?</b> ${esc(r.evidence.reason)}</p>
    ${r.evidence.page ? `<p><b>Evidence:</b> Page ${esc(r.evidence.page)}</p>` : ''}
    ${r.evidence.document_id ? `<p><a class="button" target="_blank" href="${API}/documents/${r.evidence.document_id}/file">View source document</a></p>` : ''}
    <p><button onclick="statusChange('${r.id}','verify')">Verify</button> <button onclick="statusChange('${r.id}','reject')">Reject</button> <button class="danger" onclick="statusChange('${r.id}','revoke')">Revoke</button></p>`;
}

async function statusChange(id, action) {
  try {
    const method = action === 'revoke' ? 'DELETE' : 'POST';
    const path = action === 'revoke' ? `/patients/${patient}/relationships/${id}` : `/patients/${patient}/relationships/${id}/${action}`;
    await api(path, { method });
    message.style.color = '#176b87';
    message.textContent = 'Relationship updated.';
    await load();
  } catch (e) {
    message.style.color = '';
    message.textContent = e.message;
  }
}

async function rebuildGraph() {
  try {
    const r = await api(`/patients/${patient}/relationships/rebuild`, { method: 'POST' });
    message.style.color = '#176b87';
    message.textContent = `Graph rebuilt with ${r.relationships} deterministic relationships.`;
    await load();
  } catch (e) {
    message.style.color = '';
    message.textContent = e.message;
  }
}

async function loadGraph() {
  try {
    const params = new URLSearchParams(new FormData(filters));
    const g = await api(`/patients/${patient}/graph?${params}`);
    graph.className = 'graph-view';
    graph.innerHTML = g.edges.length ? g.edges.slice(0, 80).map(edge => {
      const a = g.nodes.find(n => n.id === edge.source);
      const b = g.nodes.find(n => n.id === edge.target);
      return `<div class="graph-edge"><span>${esc(a?.label || edge.source)}</span><b>${esc(label(edge.type))}</b><span>${esc(b?.label || edge.target)}</span></div>`;
    }).join('') : '<p class="muted">No verified graph edges match these filters.</p>';
  } catch (e) {
    graph.textContent = e.message;
  }
}

function label(v) {
  return String(v || '').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}
