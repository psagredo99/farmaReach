function updateCampaignSummary() {
  const selected = [...selectedLeads].map((id) => leads.find((l) => l.id === id)).filter(Boolean);
  const withEmail = selected.filter((l) => l.email);
  const delay = parseInt(document.getElementById('send-delay')?.value || 30, 10);
  const minutes = Math.ceil((withEmail.length * delay) / 60);

  document.getElementById('cs-selected').textContent = selected.length;
  document.getElementById('cs-email').textContent = withEmail.length;
  document.getElementById('cs-time').textContent = minutes > 0 ? `~${minutes}min` : '-';
}
