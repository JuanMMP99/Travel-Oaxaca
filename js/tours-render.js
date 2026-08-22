// ============================================================
//  VTO Travel — Renderizado de Tarjetas de Tours
// ============================================================

function crearTarjetaTour(tour, index) {
  const card = document.createElement("article");
  card.className = "tour-card reveal";
  card.setAttribute("data-tags", tour.tags.join(","));

  const lugaresHTML = tour.lugares
    .map((l) => `<li><i class="fa-solid fa-location-dot"></i> <span>${l}</span></li>`)
    .join("");
  const incluyeHTML = tour.incluye
    .map((i) => `<li><i class="fa-solid fa-circle-check"></i> <span>${i}</span></li>`)
    .join("");
  const tagsHTML = tour.tags.map((t) => `<span class="tag">#${t}</span>`).join("");

  const fotoHTML = tour.imagen
    ? `
    <div class="tour-card__foto">
      <img
        src="${tour.imagen}"
        alt="${tour.nombre} — ${tour.subtitulo}"
        loading="lazy"
        onerror="this.closest('.tour-card__foto').remove()"
      />
    </div>`
    : "";

  const iconClass = tour.icon || "fa-compass";

  card.innerHTML = `
    <div class="tour-card__header-bg" style="background: linear-gradient(135deg, ${tour.color}, ${tour.color}cc);">
      <div class="tour-card__top-bar">
        <span class="tour-card__ruta-badge">Ruta ${tour.id}</span>
        <div class="tour-card__icon-badge"><i class="fa-solid ${iconClass}"></i></div>
      </div>
      <h2 class="tour-card__nombre">${tour.nombre}</h2>
      <p class="tour-card__subtitulo">${tour.subtitulo}</p>
      <span class="tour-card__horario"><i class="fa-regular fa-clock"></i> ${tour.horario}</span>
    </div>
    ${fotoHTML}
    <div class="tour-card__body">
      <p class="tour-card__descripcion">"${tour.descripcion}"</p>

      <div class="tour-card__lugares">
        <div class="tour-card__section-title"><i class="fa-solid fa-map-pin"></i> Visitaremos</div>
        <ul>${lugaresHTML}</ul>
      </div>

      <div class="tour-card__incluye">
        <div class="tour-card__section-title"><i class="fa-solid fa-gift"></i> Incluye</div>
        <ul>${incluyeHTML}</ul>
      </div>

      <div class="tour-card__tags">${tagsHTML}</div>
    </div>

    <div class="tour-card__footer">
      <div class="tour-card__precio">
        <span class="tour-card__precio-monto">$${tour.precio}</span>
        <span class="tour-card__precio-label">MXN por persona*</span>
      </div>
      <button
        class="btn btn--reservar"
        onclick="abrirFormulario(${tour.id})"
        aria-label="Reservar ${tour.nombre}"
      >
        Reservar <i class="fa-solid fa-arrow-right"></i>
      </button>
    </div>
  `;

  return card;
}

function renderizarTours(tours) {
  const grid = document.getElementById("tours-grid");
  grid.innerHTML = "";

  if (tours.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; padding:60px 20px; color:var(--text-gray);">
        <div style="font-size:3rem; margin-bottom:12px; color:var(--primary-orange);"><i class="fa-regular fa-compass"></i></div>
        <p>No se encontraron tours con ese filtro.</p>
      </div>
    `;
    return;
  }

  tours.forEach((tour, i) => {
    grid.appendChild(crearTarjetaTour(tour, i));
  });

  // Re-inicializar observador de animación para los elementos nuevos
  initScrollReveal();
}

function inicializarFiltros() {
  const container = document.getElementById("filtros-container");
  container.innerHTML = "";

  const todasTags = new Set();
  TOURS.forEach((t) => t.tags.forEach((tag) => todasTags.add(tag)));

  const btnTodos = document.createElement("button");
  btnTodos.className = "filtro-btn activo";
  btnTodos.innerHTML = '<i class="fa-solid fa-layer-group"></i> Todos';
  btnTodos.dataset.filtro = "todos";
  container.appendChild(btnTodos);

  todasTags.forEach((tag) => {
    const btn = document.createElement("button");
    btn.className = "filtro-btn";
    btn.textContent = tag;
    btn.dataset.filtro = tag;
    container.appendChild(btn);
  });

  container.addEventListener("click", (e) => {
    const btn = e.target.closest(".filtro-btn");
    if (!btn) return;

    document.querySelectorAll(".filtro-btn").forEach((b) => b.classList.remove("activo"));
    btn.classList.add("activo");

    const filtro = btn.dataset.filtro;
    const filtrados = filtro === "todos" ? TOURS : TOURS.filter((t) => t.tags.includes(filtro));

    renderizarTours(filtrados);
  });
}