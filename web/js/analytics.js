const patient = sessionStorage.patient;

document.addEventListener('DOMContentLoaded', async () => {
  if (!patient) {
    message.textContent = 'Select a patient from the dashboard first.';
    return;
  }
  filters.onsubmit = e => {
    e.preventDefault();
    load();
  };
  await load();
});

async function load() {
  try {
    message.textContent = 'Loading analytics...';
    const params = new URLSearchParams(new FormData(filters));
    const [ov, docs, tl, rel, dq] = await Promise.all([
      api(`/patients/${patient}/analytics/overview`),
      api(`/patients/${patient}/analytics/documents`),
      api(`/patients/${patient}/analytics/timeline?${params}`),
      api(`/patients/${patient}/analytics/relationships`),
      api(`/patients/${patient}/analytics/data-quality`)
    ]);
    message.textContent = '';
    renderOverview(ov.overview);
    timelineChart.innerHTML = bars(tl.timeline.by_month, 'No dated timeline activity in this filter.');
    documentTypes.innerHTML = bars(docs.documents.by_type, 'No documents uploaded yet.');
    eventTypes.innerHTML = bars(tl.timeline.by_type, 'No verified timeline events yet.');
    relationshipStats.innerHTML = bars(rel.relationships.by_status, 'No relationships yet.') + bars(rel.relationships.by_type, '');
    quality.innerHTML = qualitySummary(dq.data_quality);
    attention.innerHTML = attentionList(dq.data_quality.needs_attention);
  } catch (e) {
    message.textContent = e.message;
  }
}

function renderOverview(o) {
  overview.innerHTML = metric('Documents', o.documents) + metric('Verified records', o.verified_records) + metric('Timeline events', o.timeline_events) + metric('Relationships', o.relationships) + metric('Pending review', o.pending_review);
}

function metric(label, value) {
  return `<div class="card"><div class="muted">${esc(label)}</div><div class="metric">${esc(value)}</div></div>`;
}

function bars(items, empty) {
  if (!items || !items.length) return empty ? `<p class="muted">${esc(empty)}</p>` : '';
  const max = Math.max(...items.map(x => x.count), 1);
  return `<div class="bars">${items.map(x => `<div class="bar-row"><span>${esc(x.key)}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.max(4, x.count / max * 100)}%"></div></div><b>${esc(x.count)}</b></div>`).join('')}</div>`;
}

function qualitySummary(q) {
  return `<div class="quality-grid">
    <p><b>Source coverage:</b> ${pct(q.source_coverage)}</p>
    <p><b>Timeline source coverage:</b> ${pct(q.timeline_source_coverage)}</p>
    <p><b>Relationship evidence:</b> ${pct(q.relationship_evidence_coverage)}</p>
    <p><b>Unknown dates:</b> ${esc(q.unknown_date_count)}</p>
    <p><b>Pending review:</b> ${esc(q.pending_review)}</p>
    <p><b>Conflict detection:</b> ${esc(q.conflict_detection)}</p>
  </div>`;
}

function attentionList(items) {
  const active = (items || []).filter(x => x.count > 0);
  if (!active.length) return '<p class="muted">No current data-quality flags.</p>';
  return active.map(x => `<article class="mini-event"><b>${esc(x.code)}</b><p>${esc(x.label)}</p><div class="metric">${esc(x.count)}</div></article>`).join('');
}

function pct(v) {
  return Math.round(Number(v || 0) * 100) + '%';
}
