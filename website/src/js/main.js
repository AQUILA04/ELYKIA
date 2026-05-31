/**
 * Aménouvévé-Yaveh — Main JavaScript
 * Handles: navigation, scroll effects, product filtering, form handling
 */

(function () {
  'use strict';

  // --- DOM Elements ---
  const header = document.getElementById('header');
  const navToggle = document.getElementById('nav-toggle');
  const navClose = document.getElementById('nav-close');
  const navMenu = document.getElementById('nav-menu');
  const navLinks = document.querySelectorAll('.nav__link');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const productCards = document.querySelectorAll('.product-card');
  const recruitForm = document.getElementById('recruit-form');

  // --- Header scroll effect ---
  function handleScroll() {
    if (window.scrollY > 50) {
      header.classList.add('header--scrolled');
    } else {
      header.classList.remove('header--scrolled');
    }
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // --- Mobile navigation ---
  function openMenu() {
    navMenu.classList.add('nav__menu--open');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    navMenu.classList.remove('nav__menu--open');
    document.body.style.overflow = '';
  }

  if (navToggle) {
    navToggle.addEventListener('click', openMenu);
  }

  if (navClose) {
    navClose.addEventListener('click', closeMenu);
  }

  // Close menu when clicking a nav link
  navLinks.forEach(function (link) {
    link.addEventListener('click', closeMenu);
  });

  // Close menu when clicking outside
  document.addEventListener('click', function (e) {
    if (navMenu.classList.contains('nav__menu--open') &&
        !navMenu.contains(e.target) &&
        !navToggle.contains(e.target)) {
      closeMenu();
    }
  });

  // --- Product filtering ---
  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      // Update active state
      filterBtns.forEach(function (b) {
        b.classList.remove('filter-btn--active');
      });
      btn.classList.add('filter-btn--active');

      var filter = btn.getAttribute('data-filter');

      productCards.forEach(function (card) {
        if (filter === 'all' || card.getAttribute('data-category') === filter) {
          card.classList.remove('product-card--hidden');
          card.style.display = '';
        } else {
          card.classList.add('product-card--hidden');
          card.style.display = 'none';
        }
      });
    });
  });

  // --- Recruitment form ---
  if (recruitForm) {
    recruitForm.addEventListener('submit', function (e) {
      e.preventDefault();

      var name = document.getElementById('recruit-name').value.trim();
      var phone = document.getElementById('recruit-phone').value.trim();
      var zone = document.getElementById('recruit-zone').value.trim();

      if (!name || !phone || !zone) {
        alert('Veuillez remplir tous les champs.');
        return;
      }

      // Construct WhatsApp message
      var message = encodeURIComponent(
        'Bonjour, je souhaite postuler comme aide commerciale.\n\n' +
        'Nom : ' + name + '\n' +
        'Téléphone : ' + phone + '\n' +
        'Quartier : ' + zone
      );

      var whatsappUrl = 'https://wa.me/22896186822?text=' + message;
      window.open(whatsappUrl, '_blank');

      // Reset form
      recruitForm.reset();
    });
  }

  // --- Smooth reveal on scroll (Intersection Observer) ---
  var observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe elements that should animate in
  var animateElements = document.querySelectorAll(
    '.step, .product-card, .advantage-card, .tontine-card, .testimonial-card, .contact-card'
  );

  animateElements.forEach(function (el) {
    el.classList.add('reveal');
    observer.observe(el);
  });

  // Add CSS for reveal animation
  var style = document.createElement('style');
  style.textContent = [
    '.reveal {',
    '  opacity: 0;',
    '  transform: translateY(20px);',
    '  transition: opacity 0.6s ease, transform 0.6s ease;',
    '}',
    '.revealed {',
    '  opacity: 1;',
    '  transform: translateY(0);',
    '}',
    '@media (prefers-reduced-motion: reduce) {',
    '  .reveal {',
    '    opacity: 1;',
    '    transform: none;',
    '    transition: none;',
    '  }',
    '}'
  ].join('\n');
  document.head.appendChild(style);

})();
