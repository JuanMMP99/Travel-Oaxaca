// ============================================================
//  VTO Travel — Lógica General, Carrusel Hero y Transiciones
// ============================================================

// ── Carrusel Automático del Hero ──────────────────────────────
let currentHeroIndex = 0;
let heroTimer = null;
const heroSlideDuration = 5000; // 5 segundos

function cambiarSlideHero(index) {
  const slides = document.querySelectorAll('.hero__bg-slide');
  const miniCards = document.querySelectorAll('.hero-mini-card');
  const counter = document.getElementById('hero-counter');
  const progressFill = document.getElementById('hero-progress-fill');

  if (!slides.length) return;

  if (index >= slides.length) index = 0;
  if (index < 0) index = slides.length - 1;

  currentHeroIndex = index;

  slides.forEach((slide, i) => {
    slide.classList.toggle('active', i === currentHeroIndex);
  });

  miniCards.forEach((card, i) => {
    card.classList.toggle('active', i === currentHeroIndex);
  });

  if (counter) {
    counter.textContent = String(currentHeroIndex + 1).padStart(2, '0');
  }

  // Reiniciar barra de progreso
  if (progressFill) {
    progressFill.style.transition = 'none';
    progressFill.style.width = '0%';
    setTimeout(() => {
      progressFill.style.transition = `width ${heroSlideDuration}ms linear`;
      progressFill.style.width = '100%';
    }, 50);
  }
}

function siguienteHeroSlide() {
  cambiarSlideHero(currentHeroIndex + 1);
}

function anteriorHeroSlide() {
  cambiarSlideHero(currentHeroIndex - 1);
}

function iniciarHeroCarrusel() {
  cambiarSlideHero(0);
  clearInterval(heroTimer);
  heroTimer = setInterval(siguienteHeroSlide, heroSlideDuration);

  const btnNext = document.getElementById('hero-next');
  const btnPrev = document.getElementById('hero-prev');

  if (btnNext) {
    btnNext.addEventListener('click', () => {
      siguienteHeroSlide();
      reiniciarHeroTimer();
    });
  }

  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      anteriorHeroSlide();
      reiniciarHeroTimer();
    });
  }
}

function seleccionarSlideHero(index) {
  cambiarSlideHero(index);
  reiniciarHeroTimer();
}

function reiniciarHeroTimer() {
  clearInterval(heroTimer);
  heroTimer = setInterval(siguienteHeroSlide, heroSlideDuration);
}

// ── Intersection Observer (Transiciones de entrada al Scroll) ─
function initScrollReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    },
    { threshold: 0.15 }
  );

  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}

// ── Poblar Constantes en la Página ─────────────────────────────
function poblarConstantesEnPagina() {
  const metaDesc = document.getElementById("meta-descripcion");
  if (metaDesc) metaDesc.setAttribute("content", VTO.meta.descripcion);

  document.querySelectorAll("[data-stat]").forEach((el) => {
    const stat = VTO.estadisticas[Number(el.dataset.stat)];
    if (stat) el.textContent = stat.numero;
  });
  document.querySelectorAll("[data-stat-label]").forEach((el) => {
    const stat = VTO.estadisticas[Number(el.dataset.statLabel)];
    if (stat) el.textContent = stat.etiqueta;
  });

  document.querySelectorAll("[data-email]").forEach((el) => {
    el.textContent = VTO.contacto.email;
    if (el.tagName === "A") el.href = `mailto:${VTO.contacto.email}`;
  });
  document.querySelectorAll("[data-sitio-web]").forEach((el) => {
    el.textContent = VTO.contacto.sitioWebTexto;
    if (el.tagName === "A") el.href = VTO.contacto.sitioWebUrl;
  });
  document.querySelectorAll("[data-oficina-corta]").forEach((el) => {
    el.textContent = `${VTO.contacto.oficinaCalle}, ${VTO.contacto.oficinaCiudad}`;
  });
  document.querySelectorAll("[data-oficina-larga]").forEach((el) => {
    el.textContent = `${VTO.contacto.oficinaCalle}, ${VTO.contacto.oficinaReferencia}`;
  });

  const footerAnio = document.getElementById("footer-anio-marca");
  if (footerAnio) {
    footerAnio.textContent = `© ${VTO.negocio.anioCopyright} ${VTO.negocio.nombre} · ${VTO.negocio.slogan}`;
  }

  const footerToursLista = document.getElementById("footer-tours-lista");
  if (footerToursLista) {
    footerToursLista.innerHTML = TOURS.slice(0, 5)
      .map((t) => `<li><i class="fa-solid fa-chevron-right"></i> ${t.subtitulo}</li>`)
      .join("");
  }
}

// ── Inicialización General ────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  poblarConstantesEnPagina();

  inicializarSelectorPromotor();
  aplicarPromotorEnPagina();

  construirModalReserva();
  inicializarModal();

  inicializarFiltros();
  renderizarTours(TOURS);

  iniciarHeroCarrusel();
  initScrollReveal();
});