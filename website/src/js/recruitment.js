(function () {
  'use strict';

  var FALLBACK_IMAGE = 'assets/images/recruitment-team.png';
  var apiBase = window.ELYKIA_API_BASE || '';

  var offersContainer = document.getElementById('recruitment-offers');
  var modal = document.getElementById('recruitment-modal');
  var modalBackdrop = document.getElementById('recruitment-modal-backdrop');
  var modalClose = document.getElementById('recruitment-modal-close');
  var modalTitle = document.getElementById('recruitment-modal-offer-title');
  var applyForm = document.getElementById('recruitment-apply-form');
  var jobOfferIdInput = document.getElementById('apply-job-offer-id');
  var formError = document.getElementById('recruitment-form-error');
  var formSuccess = document.getElementById('recruitment-form-success');

  if (!offersContainer || !apiBase) {
    if (offersContainer) {
      offersContainer.innerHTML = '<p class="recruitment__empty">Les offres seront bientôt disponibles.</p>';
    }
    return;
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  function renderOffers(offers) {
    if (!offers || !offers.length) {
      offersContainer.innerHTML = '<p class="recruitment__empty">Aucune offre pour le moment. Revenez bientôt !</p>';
      return;
    }

    offersContainer.innerHTML = offers.map(function (offer) {
      var highlights = (offer.highlights || []).map(function (h) {
        return '<li class="recruitment__list-item"><span class="recruitment__list-icon">✓</span>' + escapeHtml(h) + '</li>';
      }).join('');

      return (
        '<article class="recruitment-card reveal">' +
          '<div class="recruitment-card__image">' +
            '<img src="' + escapeHtml(offer.imageUrl || FALLBACK_IMAGE) + '" alt="" loading="lazy">' +
          '</div>' +
          '<div class="recruitment-card__body">' +
            '<h3 class="recruitment-card__title">' + escapeHtml(offer.title) + '</h3>' +
            '<p class="recruitment-card__description">' + escapeHtml(offer.description || '') + '</p>' +
            (highlights ? '<ul class="recruitment__list">' + highlights + '</ul>' : '') +
            '<button type="button" class="btn btn--primary recruitment-card__apply" data-offer-id="' + offer.id + '" data-offer-title="' + escapeHtml(offer.title) + '">Postuler</button>' +
          '</div>' +
        '</article>'
      );
    }).join('');

    offersContainer.querySelectorAll('.recruitment-card__apply').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openModal(btn.getAttribute('data-offer-id'), btn.getAttribute('data-offer-title'));
      });
    });
  }

  function loadOffers() {
    fetch(apiBase + '/public/recruitment/offers')
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (payload) {
        var data = payload.data || payload;
        renderOffers(Array.isArray(data) ? data : []);
      })
      .catch(function () {
        offersContainer.innerHTML = '<p class="recruitment__empty">Impossible de charger les offres pour le moment.</p>';
      });
  }

  function openModal(offerId, offerTitle) {
    if (!modal) return;
    jobOfferIdInput.value = offerId;
    modalTitle.textContent = offerTitle || '';
    formError.hidden = true;
    formSuccess.hidden = true;
    applyForm.reset();
    jobOfferIdInput.value = offerId;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modalBackdrop) modalBackdrop.addEventListener('click', closeModal);

  if (applyForm) {
    applyForm.addEventListener('submit', function (e) {
      e.preventDefault();
      formError.hidden = true;
      formSuccess.hidden = true;

      var fd = new FormData(applyForm);
      fd.set('jobOfferId', jobOfferIdInput.value);
      var cv = applyForm.querySelector('input[name="cv"]');
      if (cv && cv.files && cv.files[0]) {
        fd.set('cv', cv.files[0]);
      }

      fetch(apiBase + '/public/recruitment/applications', {
        method: 'POST',
        body: fd
      })
        .then(function (res) {
          if (!res.ok) {
            return res.json().then(function (err) {
              throw new Error((err && err.message) || 'Erreur lors de l\'envoi');
            });
          }
          return res.json();
        })
        .then(function () {
          formSuccess.textContent = 'Candidature envoyée avec succès. Merci !';
          formSuccess.hidden = false;
          applyForm.querySelector('button[type="submit"]').disabled = true;
        })
        .catch(function (err) {
          formError.textContent = err.message || 'Une erreur est survenue.';
          formError.hidden = false;
        });
    });
  }

  loadOffers();
})();
