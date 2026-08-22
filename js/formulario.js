// ============================================================
//  VTO Travel — Formulario de Reserva, guardado en Sheets y envío por WhatsApp
// ============================================================

// ── El número de WhatsApp ya NO es fijo: se toma del promotor
//    activo (ver js/promotores-data.js), según el link o QR con el
//    que haya llegado el usuario. ──

// ── Estado actual del tour seleccionado ──
let tourSeleccionado = null;

// ── Abrir modal ──────────────────────────────────────────────
function abrirFormulario(tourId) {
  tourSeleccionado = TOURS.find(t => t.id === tourId);
  if (!tourSeleccionado) return;

  // Actualizar header del modal con color del tour
  const header = document.querySelector('.modal__header');
  header.style.background = `linear-gradient(135deg, ${tourSeleccionado.color}ee, ${tourSeleccionado.color}aa)`;

  // Actualizar resumen
  document.getElementById('resumen-nombre').textContent = tourSeleccionado.nombre;
  document.getElementById('resumen-subtitulo').textContent =
    `${tourSeleccionado.subtitulo} · ${tourSeleccionado.horario} · $${tourSeleccionado.precio} MXN/persona`;

  // Limpiar formulario
  limpiarFormulario();

  // Mostrar modal
  document.getElementById('modal-overlay').classList.add('activo');
  document.body.style.overflow = 'hidden';

  // Focus al primer campo
  setTimeout(() => document.getElementById('campo-nombre').focus(), 350);
}

// ── Cerrar modal ─────────────────────────────────────────────
function cerrarFormulario() {
  document.getElementById('modal-overlay').classList.remove('activo');
  document.body.style.overflow = '';
  tourSeleccionado = null;
}

// ── Limpiar formulario ────────────────────────────────────────
function limpiarFormulario() {
  document.getElementById('form-reserva').reset();
  document.getElementById('campo-hotel').classList.remove('visible');
  document.querySelectorAll('.form-control.error').forEach(el => el.classList.remove('error'));
  document.querySelectorAll('.error-msg.visible').forEach(el => el.classList.remove('visible'));
}

// ── Lógica campo hotel / oficina ──────────────────────────────
function manejarRecoleccion() {
  const seleccion = document.querySelector('input[name="recoleccion"]:checked');
  const campoHotel = document.getElementById('campo-hotel');
  if (seleccion && seleccion.value === 'hotel') {
    campoHotel.classList.add('visible');
  } else {
    campoHotel.classList.remove('visible');
    document.getElementById('campo-hotel-nombre').value = '';
  }
}

// ── Validación simple ─────────────────────────────────────────
function validarCampo(id, condicion, mensajeId) {
  const campo = document.getElementById(id);
  const msg = document.getElementById(mensajeId);
  if (!condicion) {
    campo.classList.add('error');
    msg.classList.add('visible');
    return false;
  }
  campo.classList.remove('error');
  msg.classList.remove('visible');
  return true;
}

// ── Guardar la reserva en Google Sheets (a través de Code.gs) ──
// Se hace en segundo plano: si falla la conexión, no bloquea el
// envío de WhatsApp, que es el canal principal de confirmación.
function guardarReservaEnSheet(payload) {
  const url = VTO.backend && VTO.backend.appsScriptUrl;
  if (!url || url.indexOf('PEGA_AQUI') !== -1) {
    console.warn('VTO Travel: falta configurar VTO.backend.appsScriptUrl en constants.js');
    return;
  }

  // Content-Type "text/plain" evita el preflight de CORS y Apps
  // Script igual puede leer el body con JSON.parse(e.postData.contents).
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  }).catch(err => {
    console.warn('No se pudo guardar la reserva en la hoja de cálculo:', err);
  });
}

// ── Enviar por WhatsApp (y guardar en la hoja de cálculo) ─────
function enviarWhatsApp() {
  if (!tourSeleccionado) return;

  // ─ Recopilar datos ─
  const nombre   = document.getElementById('campo-nombre').value.trim();
  const telefono = document.getElementById('campo-telefono').value.trim();
  const personas = document.getElementById('campo-personas').value;
  const recOpc   = document.querySelector('input[name="recoleccion"]:checked');
  const pagoOpc  = document.querySelector('input[name="pago"]:checked');
  const hotel    = document.getElementById('campo-hotel-nombre').value.trim();
  const notas    = document.getElementById('campo-notas').value.trim();

  // ─ Validaciones ─
  let valido = true;

  valido = validarCampo(
    'campo-nombre',
    nombre.length >= 2,
    'error-nombre'
  ) && valido;

  valido = validarCampo(
    'campo-telefono',
    telefono.replace(/\D/g, '').length >= 10,
    'error-telefono'
  ) && valido;

  valido = validarCampo(
    'campo-personas',
    personas && parseInt(personas) >= 1,
    'error-personas'
  ) && valido;

  if (!recOpc) {
    document.getElementById('error-recoleccion').classList.add('visible');
    valido = false;
  } else {
    document.getElementById('error-recoleccion').classList.remove('visible');
  }

  if (recOpc && recOpc.value === 'hotel') {
    valido = validarCampo(
      'campo-hotel-nombre',
      hotel.length >= 2,
      'error-hotel'
    ) && valido;
  }

  if (!pagoOpc) {
    document.getElementById('error-pago').classList.add('visible');
    valido = false;
  } else {
    document.getElementById('error-pago').classList.remove('visible');
  }

  if (!valido) return;

  const totalEstimado = parseInt(personas) * tourSeleccionado.precio;

  // ─ Construir mensaje de WhatsApp ─
  const recoleccion = recOpc.value === 'hotel'
    ? `📍 Recolección en hotel/airbnb: ${hotel}`
    : `📍 Llegará a la oficina (${VTO.contacto.oficinaCalle}, ${VTO.contacto.oficinaReferencia})`;

  const pago = pagoOpc.value === 'transferencia'
    ? '💳 Pago: Transferencia bancaria'
    : '💵 Pago: Efectivo';

  const notasLinea = notas ? `\n📝 Notas: ${notas}` : '';

  const mensaje = [
    `¡Hola! Me gustaría reservar un tour con Travel 🌟`,
    ``,
    `🗺️ *Tour:* ${tourSeleccionado.nombre} (Ruta ${tourSeleccionado.id})`,
    `   ${tourSeleccionado.subtitulo}`,
    `⏱️ *Horario:* ${tourSeleccionado.horario}`,
    ``,
    `👤 *Nombre:* ${nombre}`,
    `📱 *Teléfono:* ${telefono}`,
    `👥 *Personas:* ${personas}`,
    `💰 *Precio estimado:* $${totalEstimado} MXN (${personas} × $${tourSeleccionado.precio})`,
    ``,
    recoleccion,
    pago,
    notasLinea,
    ``,
    `¡Gracias! Espero su confirmación 🙏`,
  ].join('\n');

  const promotorActivo = obtenerPromotorActivo();

  // ─ Guardar la reserva en la hoja de cálculo (Google Sheets) ─
  guardarReservaEnSheet({
    action: 'crearReserva',
    tourId: tourSeleccionado.id,
    tourNombre: tourSeleccionado.nombre,
    tourSubtitulo: tourSeleccionado.subtitulo,
    tourHorario: tourSeleccionado.horario,
    precioUnitario: tourSeleccionado.precio,
    cliente: nombre,
    telefono: telefono,
    personas: parseInt(personas),
    total: totalEstimado,
    puntoEncuentro: recOpc.value,       // 'hotel' | 'oficina'
    hotelNombre: recOpc.value === 'hotel' ? hotel : '',
    metodoPago: pagoOpc.value,          // 'transferencia' | 'efectivo'
    notas: notas,
    promotorNombre: promotorActivo.nombre,
    promotorWhatsapp: promotorActivo.whatsapp,
  });

  // ─ Abrir WhatsApp con el promotor asignado ─
  const url = `https://wa.me/${promotorActivo.whatsapp}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');
  cerrarFormulario();
}

// ── Inicializar eventos del modal ─────────────────────────────
function inicializarModal() {
  // Cerrar al click en overlay
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) cerrarFormulario();
  });

  // Cerrar con Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cerrarFormulario();
  });

  // Radio de recolección
  document.querySelectorAll('input[name="recoleccion"]').forEach(radio => {
    radio.addEventListener('change', manejarRecoleccion);
  });

  // Botón WhatsApp
  document.getElementById('btn-whatsapp').addEventListener('click', enviarWhatsApp);
}
