/**
 * ==============================================================================
 * VTO TRAVEL — VIAJES TODO OAXACA
 * Backend en Google Apps Script (Code.gs)
 * ==============================================================================
 */

// CONFIGURACIÓN GLOBAL
const CONFIG = {
  EMAIL_NOTIFICACIONES: 'juanmanuelmunozpena@gmail.com, ednagarciaeg60@gmail.com',
  SHEET_RESERVAS: 'Reservas',
  SHEET_USUARIOS: 'Usuarios',
  SHEET_CLIENTES: 'Clientes',
  APP_TITLE: 'VTO Travel — Panel de Administración',
  CACHE_SESSION_KEY: 'VTO_SESSION_',
  SESSION_DURATION_SEC: 21600 // 6 Horas
};

// Encabezados de la hoja "Reservas" — EL ORDEN IMPORTA, coincide con
// el orden de columnas usado en handleCrearReserva() y en las
// funciones de lectura (adminGetReservas, adminGetDashboard, etc).
const HEADERS_RESERVAS = [
  'UUID',                    // 0
  'Fecha Registro',          // 1
  'Cliente',                 // 2
  'Teléfono',                // 3
  'Personas',                // 4
  'Tour',                    // 5
  'Ruta',                    // 6
  'Horario Tour',            // 7
  'Punto de Encuentro',      // 8
  'Hotel / Airbnb',          // 9
  'Método de Pago',          // 10
  'Notas',                   // 11
  'Precio Unitario (MXN)',   // 12
  'Total (MXN)',             // 13
  'Promotor',                // 14
  'WhatsApp Promotor',       // 15
  'Estatus'                  // 16
];

/* ==============================================================================
   1. RUTAS Y ENTRADA (doGet / doPost)
   ============================================================================== */

function doGet(e) {
  return HtmlService.createTemplateFromFile('Admin')
    .evaluate()
    .setTitle(CONFIG.APP_TITLE)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    const contents = e.postData ? e.postData.contents : null;
    let data = {};

    if (contents) {
      data = JSON.parse(contents);
    } else if (e.parameter) {
      data = e.parameter;
    }

    // Registrar reserva desde la web pública
    if (data.action === 'crearReserva' || (data.cliente && data.tourNombre)) {
      const resultado = handleCrearReserva(data);
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Reserva registrada exitosamente',
        uuid: resultado.uuid
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'Acción no válida'
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/* ==============================================================================
   2. LOGICA DE RESERVAS Y API PÚBLICA
   ============================================================================== */

function handleCrearReserva(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_RESERVAS);

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_RESERVAS);
    sheet.getRange(1, 1, 1, HEADERS_RESERVAS.length).setValues([HEADERS_RESERVAS]);
    estilarEncabezados(sheet, HEADERS_RESERVAS.length);
  }

  const uuid = 'VTO-' + Math.floor(100000 + Math.random() * 900000);
  const fechaRegistro = new Date();

  const personas = Number(data.personas) || 1;
  const precioUnitario = Number(data.precioUnitario) || 0;
  const total = Number(data.total) || (personas * precioUnitario);

  const puntoEncuentroTexto = data.puntoEncuentro === 'hotel' ? 'Hotel / Airbnb' : 'Oficina VTO';
  const metodoPagoTexto = data.metodoPago === 'transferencia' ? 'Transferencia' : 'Efectivo';

  sheet.appendRow([
    uuid,                              // UUID
    fechaRegistro,                     // Fecha Registro
    data.cliente || '',                // Cliente
    data.telefono || '',               // Teléfono
    personas,                          // Personas
    data.tourNombre || '',             // Tour
    data.tourSubtitulo || '',          // Ruta
    data.tourHorario || '',            // Horario Tour
    puntoEncuentroTexto,               // Punto de Encuentro
    data.hotelNombre || '',            // Hotel / Airbnb
    metodoPagoTexto,                   // Método de Pago
    data.notas || '',                  // Notas
    precioUnitario,                    // Precio Unitario (MXN)
    total,                             // Total (MXN)
    data.promotorNombre || '',         // Promotor
    data.promotorWhatsapp || '',       // WhatsApp Promotor
    'Pendiente'                        // Estatus
  ]);

  // Actualizar directorio de clientes (requiere teléfono)
  actualizarDirectorioCliente(data.cliente, data.telefono, total, data.tourNombre);

  // Notificar por correo
  enviarNotificacionEmailReserva({
    uuid: uuid,
    cliente: data.cliente,
    telefono: data.telefono,
    personas: personas,
    tourNombre: data.tourNombre,
    tourSubtitulo: data.tourSubtitulo,
    tourHorario: data.tourHorario,
    puntoEncuentro: puntoEncuentroTexto,
    hotelNombre: data.hotelNombre,
    metodoPago: metodoPagoTexto,
    notas: data.notas,
    total: total,
    promotorNombre: data.promotorNombre
  });

  return { uuid: uuid };
}

function actualizarDirectorioCliente(nombre, telefono, monto, ultimoTour) {
  if (!telefono || !nombre) return;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_CLIENTES);

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_CLIENTES);
    const headers = ['Nombre', 'Teléfono', 'Total Reservas', 'Total Invertido (MXN)', 'Último Tour'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    estilarEncabezados(sheet, headers.length);
  }

  const rows = sheet.getDataRange().getValues();
  let encontrado = false;

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1]).trim() === String(telefono).trim()) {
      encontrado = true;
      const numReservas = (Number(rows[i][2]) || 0) + 1;
      const totalGastado = (Number(rows[i][3]) || 0) + monto;

      sheet.getRange(i + 1, 3).setValue(numReservas);
      sheet.getRange(i + 1, 4).setValue(totalGastado);
      sheet.getRange(i + 1, 5).setValue(ultimoTour || rows[i][4]);
      break;
    }
  }

  if (!encontrado) {
    sheet.appendRow([nombre, telefono, 1, monto, ultimoTour || '']);
  }
}

function enviarNotificacionEmailReserva(p) {
  if (!CONFIG.EMAIL_NOTIFICACIONES) return;

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px;">
      <div style="max-width: 600px; background: #ffffff; margin: 0 auto; border-radius: 16px; padding: 24px; border: 1px solid #e2e8f0;">
        <h2 style="color: #ff5e3a; margin-top: 0;">¡Nueva Reserva Registrada!</h2>
        <p>Se ha recibido una nueva solicitud de tour a través de <strong>VTO Travel</strong>.</p>

        <table style="width: 100%; font-size: 0.9rem; margin-bottom: 16px;">
          <tr><td><strong>Folio:</strong></td><td>${p.uuid}</td></tr>
          <tr><td><strong>Pasajero:</strong></td><td>${p.cliente} (${p.telefono})</td></tr>
          <tr><td><strong>Personas:</strong></td><td>${p.personas}</td></tr>
          <tr><td><strong>Tour:</strong></td><td>${p.tourNombre} — ${p.tourSubtitulo}</td></tr>
          <tr><td><strong>Horario:</strong></td><td>${p.tourHorario}</td></tr>
          <tr><td><strong>Punto de Encuentro:</strong></td><td>${p.puntoEncuentro}${p.hotelNombre ? ' — ' + p.hotelNombre : ''}</td></tr>
          <tr><td><strong>Método de Pago:</strong></td><td>${p.metodoPago}</td></tr>
          ${p.notas ? `<tr><td><strong>Notas:</strong></td><td>${p.notas}</td></tr>` : ''}
          <tr><td><strong>Promotor:</strong></td><td>${p.promotorNombre || 'N/A'}</td></tr>
        </table>

        <h3 style="text-align: right; color: #ff5e3a; margin-top: 16px;">Total: $${Number(p.total).toLocaleString('es-MX')} MXN</h3>
      </div>
    </div>
  `;

  MailApp.sendEmail({
    to: CONFIG.EMAIL_NOTIFICACIONES,
    subject: `Nueva Reserva ${p.uuid} - ${p.cliente}`,
    htmlBody: htmlBody
  });
}

/* ==============================================================================
   3. AUTENTICACIÓN Y SESIONES DE ADMINISTRACIÓN
   ============================================================================== */

function checkGoogleSession() {
  const activeUserEmail = Session.getActiveUser().getEmail();
  if (!activeUserEmail) {
    return { authenticated: false };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_USUARIOS);

  if (!sheet) return { authenticated: false };

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0].toLowerCase() === activeUserEmail.toLowerCase() && rows[i][2] === true) {
      const token = Utilities.getUuid();
      const sessionData = JSON.stringify({ email: activeUserEmail, nombre: rows[i][3] || activeUserEmail });
      CacheService.getScriptCache().put(CONFIG.CACHE_SESSION_KEY + token, sessionData, CONFIG.SESSION_DURATION_SEC);

      return {
        authenticated: true,
        token: token,
        email: activeUserEmail,
        nombre: rows[i][3] || activeUserEmail
      };
    }
  }

  return { authenticated: false };
}

function loginWithPassword(email, password) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_USUARIOS);

  if (!sheet) throw new Error('El sistema de usuarios no está configurado.');

  const rows = sheet.getDataRange().getValues();
  const targetEmail = email.toLowerCase().trim();

  for (let i = 1; i < rows.length; i++) {
    const userEmail = String(rows[i][0]).toLowerCase().trim();
    const storedHash = String(rows[i][1]);
    const activo = rows[i][2];
    const nombre = rows[i][3] || userEmail;

    if (userEmail === targetEmail && activo === true) {
      const inputHash = hashPassword(password);
      if (inputHash === storedHash) {
        const token = Utilities.getUuid();
        const sessionData = JSON.stringify({ email: userEmail, nombre: nombre });
        CacheService.getScriptCache().put(CONFIG.CACHE_SESSION_KEY + token, sessionData, CONFIG.SESSION_DURATION_SEC);

        return {
          authenticated: true,
          token: token,
          email: userEmail,
          nombre: nombre
        };
      }
    }
  }

  throw new Error('Credenciales incorrectas o usuario inactivo.');
}

function validateSession(token) {
  if (!token) throw new Error('Sesión no válida.');
  const cached = CacheService.getScriptCache().get(CONFIG.CACHE_SESSION_KEY + token);
  if (!cached) throw new Error('Sesión expirada. Inicie sesión nuevamente.');
  return JSON.parse(cached);
}

function logout(token) {
  if (token) {
    CacheService.getScriptCache().remove(CONFIG.CACHE_SESSION_KEY + token);
  }
  return true;
}

function hashPassword(pass) {
  const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pass + '_VTO_SALT_2026');
  return rawHash.map(byte => (byte < 0 ? byte + 256 : byte).toString(16).padStart(2, '0')).join('');
}

function crearPrimerAdmin() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_USUARIOS);

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_USUARIOS);
    sheet.appendRow(['Email', 'PasswordHash', 'Activo', 'Nombre']);
    sheet.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#0d1527').setFontColor('#ffffff');
  }

  const emailAdmin = 'admin@vtotravel.com';
  const passAdmin = 'admin123';
  const passHash = hashPassword(passAdmin);

  sheet.appendRow([emailAdmin, passHash, true, 'Administrador VTO']);
  Logger.log('Admin creado correctamente: ' + emailAdmin + ' / ' + passAdmin);
}

/* ==============================================================================
   4. CONTROLADOR DEL PANEL DE ADMINISTRACIÓN
   ============================================================================== */

function adminGetDashboard(token) {
  validateSession(token);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_RESERVAS);

  const vacio = { total: 0, ventasTotales: 0, reservasHoy: 0, ventasSemana: 0, porEstado: {}, porPuntoEncuentro: {} };
  if (!sheet) return vacio;

  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return vacio;

  const todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

  let totalReservas = 0;
  let ventasTotales = 0;
  let reservasHoy = 0;
  let ventasSemana = 0;
  const porEstado = {};
  const porPuntoEncuentro = {};

  const now = new Date();
  const hace7Dias = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const estado = row[16] || 'Pendiente';
    const puntoEncuentro = row[8] || 'Oficina VTO';
    const total = Number(row[13]) || 0;

    let fechaRegStr = '';
    let fechaRegDate = null;
    if (row[1] instanceof Date) {
      fechaRegDate = row[1];
      fechaRegStr = Utilities.formatDate(row[1], Session.getScriptTimeZone(), 'yyyy-MM-dd');
    } else {
      fechaRegDate = new Date(row[1]);
      fechaRegStr = String(row[1] || '');
    }

    totalReservas++;
    if (estado !== 'Cancelado') {
      ventasTotales += total;
    }

    porEstado[estado] = (porEstado[estado] || 0) + 1;
    porPuntoEncuentro[puntoEncuentro] = (porPuntoEncuentro[puntoEncuentro] || 0) + 1;

    if (fechaRegStr === todayStr && estado !== 'Cancelado') {
      reservasHoy++;
    }

    try {
      if (fechaRegDate >= hace7Dias && estado !== 'Cancelado') {
        ventasSemana += total;
      }
    } catch (e) {}
  }

  return {
    total: totalReservas,
    ventasTotales: ventasTotales,
    reservasHoy: reservasHoy,
    ventasSemana: ventasSemana,
    porEstado: porEstado,
    porPuntoEncuentro: porPuntoEncuentro
  };
}

function adminGetReservas(token, filtros) {
  validateSession(token);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_RESERVAS);

  if (!sheet) return [];

  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  const result = [];
  const busqueda = (filtros.busqueda || '').toLowerCase();
  const estadoFiltro = filtros.estado || 'all';

  for (let i = rows.length - 1; i >= 1; i--) {
    const r = rows[i];
    const uuid = String(r[0] || '');
    const cliente = r[2] || '';
    const telefono = String(r[3] || '');
    const estado = r[16] || 'Pendiente';

    let fechaRegistro = '';
    if (r[1] instanceof Date) {
      fechaRegistro = Utilities.formatDate(r[1], Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
    } else {
      fechaRegistro = String(r[1] || '');
    }

    // Filtros
    if (estadoFiltro !== 'all' && estado !== estadoFiltro) continue;
    if (busqueda && !String(cliente).toLowerCase().includes(busqueda) && !telefono.includes(busqueda) && !uuid.toLowerCase().includes(busqueda)) continue;

    result.push({
      uuid: r[0],
      fechaRegistro: fechaRegistro,
      cliente: cliente,
      telefono: telefono,
      personas: Number(r[4]) || 0,
      tourNombre: r[5] || '',
      tourRuta: r[6] || '',
      tourHorario: r[7] || '',
      puntoEncuentro: r[8] || '',
      hotelNombre: r[9] || '',
      metodoPago: r[10] || '',
      notas: r[11] || '',
      precioUnitario: Number(r[12]) || 0,
      total: Number(r[13]) || 0,
      promotor: r[14] || '',
      whatsappPromotor: r[15] || '',
      estado: estado
    });
  }

  return result;
}

function adminActualizarEstadoReserva(token, uuid, nuevoEstado) {
  validateSession(token);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_RESERVAS);

  if (!sheet) throw new Error('Pestaña de reservas no encontrada');

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === uuid) {
      sheet.getRange(i + 1, 17).setValue(nuevoEstado); // columna 17 = Estatus
      return true;
    }
  }

  throw new Error('Reserva no encontrada');
}

function adminCrearReservaManual(token, data) {
  const sesion = validateSession(token);
  if (!data.promotorNombre) data.promotorNombre = 'Registrado por ' + (sesion.nombre || 'Admin');
  return handleCrearReserva(data);
}

function adminGetClientes(token) {
  validateSession(token);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_CLIENTES);

  if (!sheet) return [];

  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  const result = [];
  for (let i = 1; i < rows.length; i++) {
    result.push({
      nombre: rows[i][0],
      telefono: rows[i][1],
      reservas: rows[i][2],
      totalGastado: rows[i][3],
      ultimoTour: rows[i][4]
    });
  }

  return result;
}

/* ==============================================================================
   5. PDF & GENERACIÓN DE COMPROBANTES
   ============================================================================== */

function adminExportReservaPDF(token, uuid) {
  validateSession(token);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_RESERVAS);

  if (!sheet) throw new Error('Base de datos no encontrada');

  const rows = sheet.getDataRange().getValues();
  let p = null;

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === uuid) {
      let fechaRegStr = '';
      if (rows[i][1] instanceof Date) {
        fechaRegStr = Utilities.formatDate(rows[i][1], Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
      } else {
        fechaRegStr = String(rows[i][1] || '');
      }

      p = {
        uuid: rows[i][0],
        fechaRegistro: fechaRegStr,
        cliente: rows[i][2],
        telefono: rows[i][3],
        personas: rows[i][4],
        tourNombre: rows[i][5],
        tourRuta: rows[i][6],
        tourHorario: rows[i][7],
        puntoEncuentro: rows[i][8],
        hotelNombre: rows[i][9],
        metodoPago: rows[i][10],
        notas: rows[i][11],
        precioUnitario: rows[i][12],
        total: rows[i][13]
      };
      break;
    }
  }

  if (!p) throw new Error('Reserva no encontrada');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; color: #1e293b; }
          .header { text-align: center; border-bottom: 2px solid #ff5e3a; padding-bottom: 15px; margin-bottom: 25px; }
          .title { color: #ff5e3a; font-size: 24px; font-weight: bold; margin: 0; }
          .subtitle { color: #64748b; font-size: 14px; margin-top: 5px; }
          .info-table { width: 100%; margin-bottom: 25px; border-collapse: collapse; }
          .info-table td { padding: 6px 0; font-size: 14px; }
          .details-table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px; }
          .details-table th { background: #0d1527; color: #ffffff; padding: 10px; text-align: left; }
          .details-table td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
          .total-box { text-align: right; margin-top: 25px; font-size: 18px; color: #ff5e3a; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">VTO TRAVEL</div>
          <div class="subtitle">Comprobante Oficial de Reserva</div>
        </div>

        <table class="info-table">
          <tr><td><strong>Folio:</strong> ${p.uuid}</td><td><strong>Fecha de Registro:</strong> ${p.fechaRegistro}</td></tr>
          <tr><td><strong>Pasajero:</strong> ${p.cliente}</td><td><strong>Personas:</strong> ${p.personas}</td></tr>
          <tr><td><strong>Teléfono:</strong> ${p.telefono}</td><td><strong>Punto de Encuentro:</strong> ${p.puntoEncuentro}</td></tr>
          ${p.hotelNombre ? `<tr><td colspan="2"><strong>Hotel / Hospedaje:</strong> ${p.hotelNombre}</td></tr>` : ''}
        </table>

        <table class="details-table">
          <thead>
            <tr>
              <th>Tour</th>
              <th>Ruta</th>
              <th>Horario</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${p.tourNombre}</td>
              <td>${p.tourRuta}</td>
              <td>${p.tourHorario}</td>
              <td style="text-align: right;">$${Number(p.total).toLocaleString('es-MX')} MXN</td>
            </tr>
          </tbody>
        </table>

        <div class="total-box">
          Total: $${Number(p.total).toLocaleString('es-MX')} MXN
        </div>
      </body>
    </html>
  `;

  const pdfBlob = Utilities.newBlob(html, 'text/html', 'VOUCHER_' + p.uuid + '.html').getAs('application/pdf');
  const base64 = Utilities.base64Encode(pdfBlob.getBytes());

  return {
    filename: 'VTO_Voucher_' + p.uuid + '.pdf',
    mimeType: 'application/pdf',
    base64: base64
  };
}

/* ==============================================================================
   6. RESPALDOS AUTOMATIZADOS Y CONFIGURACIÓN
   ============================================================================== */

function adminGetBackupInfo(token) {
  validateSession(token);
  const props = PropertiesService.getScriptProperties();
  return {
    lastBackupDate: props.getProperty('LAST_BACKUP_DATE') || null,
    lastBackupUrl: props.getProperty('LAST_BACKUP_URL') || null
  };
}

function adminForzarRespaldo(token) {
  validateSession(token);
  return generarRespaldoBD();
}

function generarRespaldoBD() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const file = DriveApp.getFileById(ss.getId());

  // Buscar o crear carpeta de respaldos en Drive
  let folder;
  const folders = DriveApp.getFoldersByName('VTO_Travel_Backups');
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = DriveApp.createFolder('VTO_Travel_Backups');
  }

  const fechaStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HH-mm');
  const copyFile = file.makeCopy('Respaldo_VTO_' + fechaStr, folder);

  const props = PropertiesService.getScriptProperties();
  props.setProperty('LAST_BACKUP_DATE', new Date().toISOString());
  props.setProperty('LAST_BACKUP_URL', copyFile.getUrl());

  return { url: copyFile.getUrl() };
}

function instalarTriggerRespaldoSemanal() {
  // Eliminar triggers duplicados de respaldos
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === 'generarRespaldoBD') {
      ScriptApp.deleteTrigger(t);
    }
  });

  // Ejecutar todos los Lunes a las 3 AM
  ScriptApp.newTrigger('generarRespaldoBD')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(3)
    .create();

  Logger.log('Trigger de respaldo semanal programado con éxito.');
}

/**
 * ==============================================================================
 * INICIALIZADOR DEL SISTEMA
 * Ejecuta esta función una sola vez para estructurar el Google Sheet desde cero.
 * ==============================================================================
 */
function inicializarSistema() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Pestaña: Reservas
  let sheetReservas = ss.getSheetByName(CONFIG.SHEET_RESERVAS);
  if (!sheetReservas) {
    sheetReservas = ss.insertSheet(CONFIG.SHEET_RESERVAS);
  } else {
    sheetReservas.clear();
  }

  sheetReservas.getRange(1, 1, 1, HEADERS_RESERVAS.length).setValues([HEADERS_RESERVAS]);
  estilarEncabezados(sheetReservas, HEADERS_RESERVAS.length);

  // 2. Pestaña: Usuarios
  let sheetUsuarios = ss.getSheetByName(CONFIG.SHEET_USUARIOS);
  if (!sheetUsuarios) {
    sheetUsuarios = ss.insertSheet(CONFIG.SHEET_USUARIOS);
  } else {
    sheetUsuarios.clear();
  }

  const headersUsuarios = ['Email', 'PasswordHash', 'Activo', 'Nombre'];
  sheetUsuarios.getRange(1, 1, 1, headersUsuarios.length).setValues([headersUsuarios]);
  estilarEncabezados(sheetUsuarios, headersUsuarios.length);

  // Insertar usuario Admin por defecto
  const passAdmin = 'admin123';
  const passHash = hashPassword(passAdmin);
  sheetUsuarios.appendRow(['admin@vtotravel.com', passHash, true, 'Administrador VTO']);

  // 3. Pestaña: Clientes
  let sheetClientes = ss.getSheetByName(CONFIG.SHEET_CLIENTES);
  if (!sheetClientes) {
    sheetClientes = ss.insertSheet(CONFIG.SHEET_CLIENTES);
  } else {
    sheetClientes.clear();
  }

  const headersClientes = ['Nombre', 'Teléfono', 'Total Reservas', 'Total Invertido (MXN)', 'Último Tour'];
  sheetClientes.getRange(1, 1, 1, headersClientes.length).setValues([headersClientes]);
  estilarEncabezados(sheetClientes, headersClientes.length);

  // Eliminar la hoja "Hoja 1" o "Sheet1" predeterminada si existe
  const hojaDefault = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
  if (hojaDefault && ss.getSheets().length > 1) {
    ss.deleteSheet(hojaDefault);
  }

  Logger.log('¡Base de datos VTO Travel inicializada correctamente!');
}

/**
 * Aplica formato visual a los encabezados
 */
function estilarEncabezados(sheet, columnas) {
  const range = sheet.getRange(1, 1, 1, columnas);
  range.setFontWeight('bold')
       .setBackground('#0d1527')
       .setFontColor('#ffffff')
       .setVerticalAlignment('middle')
       .setHorizontalAlignment('center');

  sheet.setRowHeight(1, 35);
  sheet.setFrozenRows(1);
}
