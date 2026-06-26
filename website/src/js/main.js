/* ============================================================
   AMENOUVEVE-YAVEH — Main JavaScript v2
   "Alive" — Scroll animations, counters, 3D effects
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

  // ── Header glassmorphism on scroll ─────────────────────────
  const header = document.getElementById('header');
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 20) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }, { passive: true });
  }

  // ── Active nav link on scroll ──────────────────────────────
  const sections    = document.querySelectorAll('section[id]');
  const allNavLinks = document.querySelectorAll('.nav__link[href^="#"]');

  function updateActiveLink() {
    const scrollY = window.scrollY + 120;
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

  // ── Scroll-driven Reveal Animations ───────────────────────
  function initReveal() {
    const revealEls     = document.querySelectorAll('.reveal');
    const staggerGroups = document.querySelectorAll('.reveal-stagger');

    if (!('IntersectionObserver' in window)) {
      revealEls.forEach(el => el.classList.add('is-visible'));
      staggerGroups.forEach(el => el.classList.add('is-visible'));
      return;
    }

    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(el => revealObs.observe(el));

    const staggerObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          staggerObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

    staggerGroups.forEach(el => staggerObs.observe(el));
  }

  initReveal();

  // ── Animated Counters ─────────────────────────────────────
  function animateCounter(el, target, duration) {
    const start    = performance.now();
    const isLarge  = target >= 100;

    function update(now) {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased    = 1 - Math.pow(1 - progress, 3);
      const current  = Math.round(eased * target);
      el.textContent = isLarge ? current.toLocaleString('fr-FR') : current;
      if (progress < 1) requestAnimationFrame(update);
      else el.textContent = isLarge ? target.toLocaleString('fr-FR') : target;
    }
    requestAnimationFrame(update);
  }

  function initCounters() {
    const statNumbers = document.querySelectorAll('.stat-number[data-target]');
    if (!statNumbers.length) return;

    if (!('IntersectionObserver' in window)) {
      statNumbers.forEach(el => {
        el.textContent = el.dataset.target;
      });
      return;
    }

    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const target   = parseInt(entry.target.dataset.target, 10);
          const duration = target >= 1000 ? 2000 : target >= 100 ? 1500 : 1000;
          animateCounter(entry.target, target, duration);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    statNumbers.forEach(el => obs.observe(el));
  }

  initCounters();

  // ── Impact Carousel ────────────────────────────────────────
  const track   = document.getElementById('carousel-track');
  const dots    = document.querySelectorAll('.impact__dot');
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
      const gap     = 24;
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
      }, 4500);
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

    // Touch swipe on hero
    let heroTouchX = 0;
    heroSlider.addEventListener('touchstart', e => { heroTouchX = e.touches[0].clientX; }, { passive: true });
    heroSlider.addEventListener('touchend', e => {
      const diff = heroTouchX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) { goToHeroSlide(diff > 0 ? heroIndex + 1 : heroIndex - 1); resetHeroAuto(); }
    });

    startHeroAuto();
  }

  // ── Product cards — 3D tilt on mouse move ─────────────────
  function initTilt() {
    const cards = document.querySelectorAll('.product-card');
    cards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect   = card.getBoundingClientRect();
        const x      = e.clientX - rect.left;
        const y      = e.clientY - rect.top;
        const cx     = rect.width  / 2;
        const cy     = rect.height / 2;
        const rotateX = ((y - cy) / cy) * -6;
        const rotateY = ((x - cx) / cx) *  6;
        card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
        card.style.transition = 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.4s ease, border-color 0.4s ease';
      });
      card.addEventListener('mouseenter', () => {
        card.style.transition = 'none';
      });
    });
  }
  initTilt();

  // ── Notify button ─────────────────────────────────────────
  const notifyBtn = document.getElementById('notify-btn');
  if (notifyBtn) {
    notifyBtn.addEventListener('click', () => {
      notifyBtn.textContent = '✓ Vous serez notifié !';
      notifyBtn.style.color = '#A8DADC';
      notifyBtn.style.borderColor = 'rgba(168,218,220,0.4)';
      notifyBtn.disabled = true;
    });
  }

  // ── Parallax on hero visual ────────────────────────────────
  const heroVisual = document.querySelector('.hero__image-wrapper');
  if (heroVisual && window.innerWidth > 768) {
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      heroVisual.style.transform = `translateY(${scrollY * 0.06}px)`;
    }, { passive: true });
  }

})();
