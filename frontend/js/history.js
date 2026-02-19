function addHistorial(lead, subject) {
  historial.unshift({
    date: new Date().toLocaleString('es-ES'),
    name: lead.name,
    email: lead.email,
    subject: subject || 'Email enviado',
    status: 'sent',
  });
  renderHistorial();
}

function renderHistorial() {
  const tbody = document.getElementById('historial-tbody');
  if (historial.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:32px;">No hay envios registrados aun</td></tr>';
    return;
  }

  tbody.innerHTML = historial.map((h) => `
    <tr>
      <td style="font-size:11px;color:var(--muted);">${h.date}</td>
      <td style="font-weight:600;">${h.name}</td>
      <td style="font-size:12px;color:var(--accent2);">${h.email}</td>
      <td style="font-size:12px;color:var(--muted);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${h.subject}</td>
      <td><span class="badge badge-sent">Enviado</span></td>
    </tr>
  `).join('');
}

function clearHistory() {
  historial = [];
  renderHistorial();
  showToast('success', 'Historial limpiado');
}
