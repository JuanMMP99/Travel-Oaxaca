// ============================================================
//  VTO Travel — Promotores
//  Edita este archivo para agregar, quitar o modificar promotores.
//  Cada promotor necesita: nombre (se muestra en el navbar) y
//  whatsapp (número con código de país, sin signos ni espacios).
// ============================================================

const PROMOTORES = {
  edna: { nombre: "Edna Citlali", whatsapp: "529514990142" },

  // Agrega más promotores así (el código de la izquierda es el que
  // va en el link, ej. vtotravel.com?p=juan):
  // juan:  { nombre: "Juan Pérez",   whatsapp: "529511234567" },
  // maria: { nombre: "María López",  whatsapp: "529517654321" },
};

// Promotor que se asigna cuando no hay selección ni parámetro en la URL.
const PROMOTOR_DEFAULT_CODIGO = "edna";

const PROMOTOR_STORAGE_KEY = "vto_promotor";

// ── Determina el código del promotor activo ───────────────────
// Prioridad: 1) parámetro ?p= en la URL   2) selección guardada
// en visitas anteriores   3) promotor por default.
function obtenerCodigoPromotor() {
  const params = new URLSearchParams(window.location.search);
  const desdeUrl = params.get("p");

  if (desdeUrl && PROMOTORES[desdeUrl]) {
    localStorage.setItem(PROMOTOR_STORAGE_KEY, desdeUrl);
    return desdeUrl;
  }

  const guardado = localStorage.getItem(PROMOTOR_STORAGE_KEY);
  if (guardado && PROMOTORES[guardado]) {
    return guardado;
  }

  return PROMOTOR_DEFAULT_CODIGO;
}

// ── Devuelve el objeto {nombre, whatsapp} del promotor activo ──
function obtenerPromotorActivo() {
  const codigo = obtenerCodigoPromotor();
  return PROMOTORES[codigo] || PROMOTORES[PROMOTOR_DEFAULT_CODIGO];
}

// ── Guarda la elección del usuario y refleja el cambio en la página ──
function seleccionarPromotor(codigo) {
  if (!PROMOTORES[codigo]) return;

  localStorage.setItem(PROMOTOR_STORAGE_KEY, codigo);

  // Actualiza la URL visible (sin recargar) para que si el usuario
  // comparte el link ya quede con su promotor asignado.
  const url = new URL(window.location.href);
  url.searchParams.set("p", codigo);
  window.history.replaceState({}, "", url);

  aplicarPromotorEnPagina();
}

// ── Aplica el promotor activo a todos los elementos de la página ──
// (nombre en navbar + todos los links directos de WhatsApp)
function aplicarPromotorEnPagina() {
  const promotor = obtenerPromotorActivo();

  const nombreEl = document.getElementById("promotor-nombre");
  if (nombreEl) nombreEl.textContent = `Promotor ${promotor.nombre}`;

  document.querySelectorAll('a[href^="https://wa.me/"]').forEach((link) => {
    link.href = `https://wa.me/${promotor.whatsapp}`;
  });
}

// ── ¿Debe mostrarse la pantalla de selección de promotor? ──────
// Solo si el usuario llegó sin parámetro ?p= y nunca ha elegido antes.
function debeMostrarSelectorPromotor() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("p")) return false;
  if (localStorage.getItem(PROMOTOR_STORAGE_KEY)) return false;
  return true;
}

// ── Inicializa el modal de selección de promotor ────────────────
function inicializarSelectorPromotor() {
  construirSelectorPromotor(); // ver js/modal-selector-promotor.js

  const overlay = document.getElementById("selector-promotor-overlay");
  const lista = document.getElementById("selector-promotor-lista");
  if (!overlay || !lista) return;

  Object.entries(PROMOTORES).forEach(([codigo, datos]) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "selector-promotor__btn";
    btn.textContent = datos.nombre;
    btn.addEventListener("click", () => {
      seleccionarPromotor(codigo);
      cerrarSelectorPromotor();
    });
    lista.appendChild(btn);
  });

  const cerrar = document.getElementById("selector-promotor-cerrar");
  if (cerrar) cerrar.addEventListener("click", cerrarSelectorPromotor);

  if (debeMostrarSelectorPromotor()) {
    overlay.classList.add("activo");
    document.body.style.overflow = "hidden";
  }
}

function cerrarSelectorPromotor() {
  const overlay = document.getElementById("selector-promotor-overlay");
  if (!overlay) return;
  overlay.classList.remove("activo");
  document.body.style.overflow = "";
}