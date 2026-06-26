/* ============================================================
   AMENOUVEVE-YAVEH — Main JavaScript
   ============================================================ */

(function () {
  'use strict';

  // ── Mobile Navigation ──────────────────────────────────────
  const navToggle  = document.getElementById('nav-toggle');
  const navClose   = document.getElementById('nav-close');
  const navMenu    = document.getElementById('nav-menu');
  const navOverlay = document.getElementById('nav-overlay');
  const navLinks   = navMenu ? navMenu.querySelectorAll('.nav__link') : [];

  function openMenu() {
    navMenu.classList.add('is-open');
    navOverlay.classList.add('is-open');
    navToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    navMenu.classList.remove('is-open');
    navOverlay.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  if (navToggle)  navToggle.addEventListener('click', openMenu);
  if (navClose)   navClose.addEventListener('click', closeMenu);
  if (navOverlay) navOverlay.addEventListener('click', closeMenu);
  navLinks.forEach(link => link.addEventListener('click', closeMenu));

  // ── Header scroll shadow ───────────────────────────────────
  const header = document.getElementById('header');
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 10) {
        header.style.background = 'rgba(247, 249, 251, 0.97)';
      } else {
        header.style.background = 'rgba(247, 249, 251, 0.88)';
      }
    }, { passive: true });
  }

  // ── Active nav link on scroll ──────────────────────────────
  const sections = document.querySelectorAll('section[id]');
  const allNavLinks = document.querySelectorAll('.nav__link[href^="#"]');

  function updateActiveLink() {
    const scrollY = window.scrollY + 100;
    sections.forEach(section => {
      const top    = section.offsetTop;
      const height = section.offsetHeight;
      const id     = section.getAttribute('id');
      if (scrollY >= top && scrollY < top + height) {
        allNavLinks.forEach(link => {
          link.classList.remove('nav__link--active');
          if (link.getAttribute('href') === '#' + id) {
            link.classList.add('nav__link--active');
          }
        });
      }
    });
  }

  window.addEventListener('scroll', updateActiveLink, { passive: true });

  // ── Impact Carousel ────────────────────────────────────────
  const track  = document.getElementById('carousel-track');
  const dots   = document.querySelectorAll('.impact__dot');
  const prevBtn = document.getElementById('carousel-prev');
  const nextBtn = document.getElementById('carousel-next');

  if (track) {
    const slides    = track.querySelectorAll('.impact__slide');
    const total     = slides.length;
    let current     = 0;
    let autoTimer   = null;

    function getVisibleCount() {
      return window.innerWidth <= 768 ? 1 : 2;
    }

    function getSlideWidth() {
      const visible = getVisibleCount();
      const gap = 24;
      return (track.parentElement.offsetWidth - gap * (visible - 1)) / visible + gap;
    }

    function goTo(index) {
      const maxIndex = total - getVisibleCount();
      current = Math.max(0, Math.min(index, maxIndex));
      track.style.transform = `translateX(-${current * getSlideWidth()}px)`;
      dots.forEach((dot, i) => {
        dot.classList.toggle('impact__dot--active', i === current);
      });
    }

    function startAuto() {
      stopAuto();
      autoTimer = setInterval(() => {
        const maxIndex = total - getVisibleCount();
        goTo(current >= maxIndex ? 0 : current + 1);
      }, 4000);
    }

    function stopAuto() {
      if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
    }

    if (prevBtn) prevBtn.addEventListener('click', () => { stopAuto(); goTo(current - 1); startAuto(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { stopAuto(); goTo(current + 1); startAuto(); });

    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => { stopAuto(); goTo(i); startAuto(); });
    });

    // Touch / swipe
    let touchStartX = 0;
    track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; stopAuto(); }, { passive: true });
    track.addEventListener('touchend', e => {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) goTo(diff > 0 ? current + 1 : current - 1);
      startAuto();
    });

    window.addEventListener('resize', () => goTo(current), { passive: true });
    startAuto();
  }

  // ── Hero Image Slider ────────────────────────────────────
  const heroSlider = document.getElementById('hero-slider');
  if (heroSlider) {
    const heroSlides = heroSlider.querySelectorAll('.hero__slide');
    const heroDots   = heroSlider.querySelectorAll('.hero__dot');
    let heroIndex    = 0;
    let heroTimer    = null;

    function goToHeroSlide(idx) {
      heroSlides[heroIndex].classList.remove('active');
      heroDots[heroIndex].classList.remove('active');
      heroIndex = (idx + heroSlides.length) % heroSlides.length;
      heroSlides[heroIndex].classList.add('active');
      heroDots[heroIndex].classList.add('active');
    }

    function startHeroAuto() {
      heroTimer = setInterval(() => goToHeroSlide(heroIndex + 1), 4000);
    }

    function resetHeroAuto() {
      clearInterval(heroTimer);
      startHeroAuto();
    }

    heroDots.forEach((dot, i) => {
      dot.addEventListener('click', () => { goToHeroSlide(i); resetHeroAuto(); });
    });

    startHeroAuto();
  }

  // ── Smooth scroll for anchor links ────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  // Fade-in on scroll
  const animatedEls = document.querySelectorAll(
    '.service-card, .product-card, .step-item, .testimonial-card, .recruitment__content, .recruitment__image'
  );
  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.style.opacity = '1';
          e.target.style.transform = 'translateY(0)';
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.05 });
    animatedEls.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'opacity 0.45s ease ' + Math.min(i*0.04,0.28) + 's, transform 0.45s ease ' + Math.min(i*0.04,0.28) + 's';
      obs.observe(el);
    });
  } else {
    animatedEls.forEach(el => { el.style.opacity = '1'; el.style.transform = 'none'; });
  }

})();
