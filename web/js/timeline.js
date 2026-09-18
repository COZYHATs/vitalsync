const patient = sessionStorage.patient;
let events = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!patient) {
    timeline.textContent = 'Select a patient from the dashboard first.';
    return;
  }
  filters.onsubmit = e => {
    e.preventDefault();
    load();
  };
  rebuild.onclick = rebuildTimeline;
  await load();
  const eventId = new URLSearchParams(location.search).get('event');
  if (eventId) showEvent(eventId);
});

async function load() {
  try {
    const params = new URLSearchParams(new FormData(filters));
    const body = await api(`/patients/${patient}/timeline?${params}`);
    events = body.events;
    timeline.className = 'timeline-list';
    timeline.innerHTML = events.length ? events.map(renderEvent).join('') : '<p class="muted">No verified timeline events match these filters.</p>';
  } catch (e) {
    message.textContent = e.message;
  }
}

function renderEvent(e) {
  return `<article class="timeline-event">
    <button type="button" onclick="showEvent('${e.id}')">
      <span class="event-date">${esc(formatDate(e))}</span>
      <span class="event-title">${esc(e.title)}</span>
      <span class="event-summary">${esc(e.summary)}</span>
      <span class="event-status">Verified${e.possible_duplicate ? ' · Possible duplicate' : ''}</span>
    </button>
  </article>`;
}

async function showEvent(id) {
  try {
    const e = await api(`/timeline/${id}`);
    details.className = '';
    details.innerHTML = `<h3>${esc(e.title)}</h3>
      <p><b>Date:</b> ${esc(formatDate(e))}</p>
      <p><b>Date type:</b> ${esc(e.event_date_type)}</p>
      <p><b>Value:</b> ${esc(e.summary)}</p>
      <p><b>Status:</b> ${esc(e.verification_status)}</p>
      <p><b>Type:</b> ${esc(e.event_type)}</p>
      <p><button type="button" onclick="editVerified('${e.id}')">Edit verified value</button> <a class="button" href="relationships.html?event=${e.id}">View relationships</a></p>
      <h3>Source</h3>
      ${e.sources.length ? e.sources.map(sourcePanel).join('') : '<p class="muted">No source document linked.</p>'}`;
  } catch (err) {
    details.className = 'muted';
    details.textContent = err.message;
  }
}

function sourcePanel(s) {
  const page = s.page ? `<p><b>Evidence:</b> Page ${esc(s.page)}</p>` : '<p><b>Evidence:</b> Source document available</p>';
  const open = s.available ? `<a class="button" target="_blank" href="${API}/documents/${s.document_id}/file">View source document</a>` : '<span class="muted">Source document unavailable</span>';
  return `<section class="source-panel">
    <p><b>${esc(s.filename)}</b></p>
    <p><b>Uploaded:</b> ${new Date(s.uploaded_at).toLocaleString()}</p>
    ${page}
    ${open}
  </section>`;
}

async function rebuildTimeline() {
  try {
    const r = await api(`/patients/${patient}/timeline/rebuild`, { method: 'POST' });
    message.style.color = '#176b87';
    message.textContent = `Timeline rebuilt from ${r.records} verified records.`;
    await load();
  } catch (e) {
    message.style.color = '';
    message.textContent = e.message;
  }
}

async function editVerified(id) {
  const e = await api(`/timeline/${id}`);
  const name = prompt('Name:', e.title.replace(/^[^-]+-?\s*/, ''));
  if (name === null) return;
  const value = prompt('Corrected value:', '');
  if (value === null) return;
  const unit = prompt('Unit (optional):', '') ?? '';
  const reason = prompt('Reason for correction (optional):', '') ?? '';
  const entity = { type: e.event_type, name, value, unit };
  try {
    await api(`/timeline/${id}`, { method: 'PATCH', body: JSON.stringify({ entity, reason }) });
    message.style.color = '#176b87';
    message.textContent = 'Verified value corrected.';
    await load();
    await showEvent(id);
  } catch (err) {
    message.style.color = '';
    message.textContent = err.message;
  }
}

function formatDate(e) {
  if (!e.event_date) return 'Date unknown';
  if (e.date_precision === 'MONTH') return e.event_date.slice(0, 7);
  if (e.date_precision === 'YEAR') return e.event_date.slice(0, 4);
  return e.event_date;
}
