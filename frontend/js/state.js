let leads = [];
let selectedLeads = new Set();
let templates = [];
let historial = [];
let isScraping = false;
let isSending = false;
let sendInterval = null;
let activeSource = 'openstreetmap';
let toastTimeout;
let authToken = localStorage.getItem('auth_token') || '';
let currentUser = null;

const pageTitles = {
  dashboard: ['Dashboard', 'Resumen general del proceso de outreach'],
  scraping: ['Busqueda de Leads', 'Encuentra farmacias por zona o codigo postal'],
  leads: ['CaptTable de Leads', 'Gestiona y filtra tus leads de farmacias'],
  template: ['Plantillas de Email', 'Disena mensajes personalizados con variables dinamicas'],
  envio: ['Configuracion y Envio', 'Conecta Gmail y lanza tu campana de outreach'],
  historial: ['Historial de Envios', 'Registro completo de emails enviados']
};
