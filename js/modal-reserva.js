// ============================================================
//  VTO Travel — Modal: Formulario de Reserva Rediseñado
// ============================================================

function construirModalReserva() {
  const contenedor = document.getElementById("modal-reserva-container");
  if (!contenedor) return;

  contenedor.innerHTML = `
    <div id="modal-overlay" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
      <div class="modal">

        <div class="modal__header">
          <h2 id="modal-titulo">Reservar Tu Aventura</h2>
          <p>Completa tus datos y confirmamos tu lugar por WhatsApp</p>
          <button class="modal__close" onclick="cerrarFormulario()" aria-label="Cerrar formulario"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <div class="modal__body">
          <div class="tour-resumen">
            <div class="tour-resumen__icon" id="resumen-icon"><i class="fa-solid fa-compass"></i></div>
            <div class="tour-resumen__info">
              <h3 id="resumen-nombre">Nombre del tour</h3>
              <p id="resumen-subtitulo">Subtítulo · Horario · Precio</p>
            </div>
          </div>

          <form id="form-reserva" novalidate>
            <div class="form-group">
              <label for="campo-nombre">Nombre completo <span class="req">*</span></label>
              <div class="input-with-icon">
                <i class="fa-solid fa-user"></i>
                <input type="text" id="campo-nombre" class="form-control" placeholder="Ej. Ana García López" autocomplete="name" />
              </div>
              <p class="error-msg" id="error-nombre">Por favor ingresa tu nombre completo.</p>
            </div>

            <div class="form-group">
              <label for="campo-telefono">Teléfono / WhatsApp <span class="req">*</span></label>
              <div class="input-with-icon">
                <i class="fa-solid fa-phone"></i>
                <input type="tel" id="campo-telefono" class="form-control" placeholder="Ej. 951 123 4567" autocomplete="tel" />
              </div>
              <p class="error-msg" id="error-telefono">Ingresa un número de teléfono válido.</p>
            </div>

            <div class="form-group">
              <label for="campo-personas">¿Cuántas personas viajan? <span class="req">*</span></label>
              <div class="input-with-icon">
                <i class="fa-solid fa-users"></i>
                <input type="number" id="campo-personas" class="form-control" placeholder="Ej. 2" min="1" max="20" />
              </div>
              <p class="error-msg" id="error-personas">Indica el número de personas (mínimo 1).</p>
            </div>

            <div class="form-group">
              <label>Punto de Encuentro <span class="req">*</span></label>
              <div class="radio-cards-grid" role="radiogroup" aria-label="Punto de encuentro">
                <label class="radio-card">
                  <input type="radio" name="recoleccion" value="hotel" />
                  <i class="fa-solid fa-hotel"></i>
                  <span>Me recogen en Hotel / Airbnb</span>
                </label>
                <label class="radio-card">
                  <input type="radio" name="recoleccion" value="oficina" />
                  <i class="fa-solid fa-building-user"></i>
                  <span>Llego a la Oficina</span>
                </label>
              </div>
              <p class="error-msg" id="error-recoleccion">Selecciona dónde te recogemos.</p>

              <div id="campo-hotel">
                <div class="input-with-icon" style="margin-top: 10px;">
                  <i class="fa-solid fa-location-dot"></i>
                  <input type="text" id="campo-hotel-nombre" class="form-control" placeholder="Nombre de hotel / airbnb y dirección" />
                </div>
                <p class="error-msg" id="error-hotel">Por favor indica la ubicación de tu hotel.</p>
              </div>
            </div>

            <div class="form-group">
              <label>Método de Pago Preferido <span class="req">*</span></label>
              <div class="radio-cards-grid" role="radiogroup" aria-label="Método de pago">
                <label class="radio-card">
                  <input type="radio" name="pago" value="transferencia" />
                  <i class="fa-solid fa-money-bill-transfer"></i>
                  <span>Transferencia</span>
                </label>
                <label class="radio-card">
                  <input type="radio" name="pago" value="efectivo" />
                  <i class="fa-solid fa-money-bill-wave"></i>
                  <span>Efectivo</span>
                </label>
              </div>
              <p class="error-msg" id="error-pago">Selecciona tu método de pago.</p>
            </div>

            <div class="form-group">
              <label for="campo-notas">Notas o solicitudes especiales</label>
              <textarea id="campo-notas" class="form-control" rows="3" placeholder="Ej. Viajamos con niños, alguna alergia o duda..." style="resize: vertical"></textarea>
            </div>
          </form>
        </div>

        <div class="modal__footer">
          <button id="btn-whatsapp" class="btn--whatsapp" type="button">
            <i class="fa-brands fa-whatsapp"></i>
            Confirmar Reserva por WhatsApp
          </button>
          <button class="btn--cancelar" type="button" onclick="cerrarFormulario()">Cancelar</button>
        </div>

      </div>
    </div>
  `;
}
