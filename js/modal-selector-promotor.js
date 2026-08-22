// ============================================================
//  VTO Travel — Modal: Selector de Promotor
//  Construye e inserta el HTML del selector. La lógica de
//  selección/persistencia vive en promotores-data.js; este
//  archivo solo se encarga de la "vista".
// ============================================================

function construirSelectorPromotor() {
  const contenedor = document.getElementById("selector-promotor-overlay");
  if (!contenedor) return;

  contenedor.innerHTML = `
    <div class="selector-promotor">
      <button id="selector-promotor-cerrar" aria-label="Cerrar"><i class="fa-solid fa-xmark"></i></button>
      <h2>¿Quién te compartió ${VTO.negocio.nombre}?</h2>
      <p>Selecciona a tu promotor para que te atienda directamente.</p>
      <div id="selector-promotor-lista" class="selector-promotor__lista"></div>
    </div>
  `;
}