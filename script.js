/*****************************************
 * script.js — version stable & complète (GAS)
 *****************************************/

/** ==== CONFIG GAS ==== */
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwlbnnO-eVRZaaq-5oNEqyhglSwzd9OS67WCsqC-MtGkzFjXEKb8sFRzL5iFqqifkH_Rw/exec';

/** Génère un ID unique format : DEP-YYMMDDHHMM-RR */
const generateUniqueId = (postalCode) => {
  const dep = (postalCode || '').slice(0, 2);
  const now = new Date();
  const YY = String(now.getFullYear()).slice(-2);
  const MM = String(now.getMonth() + 1).padStart(2, "0");
  const DD = String(now.getDate()).padStart(2, "0");
  const HH = String(now.getHours()).padStart(2, "0");
  const MI = String(now.getMinutes()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 90 + 10);
  return `${dep}-${YY}${MM}${DD}${HH}${MI}-${rand}`;
};

/** Départements autorisés */
const ALLOWED_DEPARTMENTS = ['08', '51'];

document.addEventListener('DOMContentLoaded', () => {
  /* ========= EmailJS supprimé ========= */
  // (plus d'init emailjs)
  
  /* ======= Formatage automatique du numéro de téléphone ======= */
  const phoneInput = document.getElementById('phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      // Supprime tout sauf les chiffres
      let val = e.target.value.replace(/\D/g, '');
      // Coupe en groupes de 2 chiffres
      let parts = val.match(/.{1,2}/g);
      // Reformate avec un espace entre chaque groupe
      if (parts) e.target.value = parts.join(' ');
    });

    // Nettoie les espaces avant envoi du formulaire (optionnel)
    phoneInput.addEventListener('blur', (e) => {
      e.target.value = e.target.value.trim();
    });
  }
  /* ======= CGU en modale ======= */
  const CGU_URL   = 'cgu-popup.html';
  const cguModal  = document.getElementById('cgu-modal');
  const cguClose  = document.getElementById('cguClose');
  const cguIframe = document.getElementById('cguIframe');

  // Tous les liens possibles vers les CGU
  const cguTriggers = [
    ...document.querySelectorAll('#cguLink, .cgu-link, a[href*="cgu"]')
  ];

  const openCgu = (e) => {
    if (e) e.preventDefault();
    if (!cguModal || !cguIframe) return;       // sécurité si HTML pas encore en place
    cguIframe.src = CGU_URL;                    // charge la page dans l’iframe
    cguModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');   // optionnel: bloque le scroll de fond
    setTimeout(() => cguClose?.focus(), 0);
  };

  const closeCgu = () => {
    if (!cguModal) return;
    cguModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
  };

  cguTriggers.forEach(a => a.addEventListener('click', openCgu));
  cguClose?.addEventListener('click', closeCgu);
  cguModal?.addEventListener('click', (e) => {
    if (e.target === cguModal) closeCgu();     // clic en dehors du contenu => fermer
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && cguModal?.getAttribute('aria-hidden') === 'false') closeCgu();
  });

  /* ========= Références ========= */
  const form = document.getElementById('repairForm');
  const steps = document.querySelectorAll('.form-step');
  const wizardSteps = document.querySelectorAll('.wizard-step');

  const submitBtn = document.getElementById('submitBtn');
  const prevBtn   = document.getElementById('prevBtn');
  const nextBtn   = document.getElementById('nextBtn');
  const cguCheckbox = document.getElementById('acceptCgu');

  const messageContainer = document.getElementById('messageContainer');

  const postalCodeInput = document.getElementById('postalCode');
  const cityInput = document.getElementById('city');

  // Suggestions ville (conteneur sous le champ CP)
  const citySuggestionsContainer = document.createElement('div');
  citySuggestionsContainer.classList.add('city-suggestions');
  citySuggestionsContainer.setAttribute('role', 'listbox');
  citySuggestionsContainer.style.display = 'none';
  if (postalCodeInput?.parentElement) {
  postalCodeInput.parentElement.appendChild(citySuggestionsContainer);
}

  // Popup “hors zone”
  const popupOverlay  = document.getElementById('popup-departement');
  const popupContent  = popupOverlay?.querySelector('.popup-content') || null;
  const popupSendBtn  = document.getElementById('popupSendBtn');
  const popupCloseBtn = document.getElementById('popupCloseBtn');
  const waitlistEmail = document.getElementById('waitlistEmail');

  let currentStep = 0;

  /* ========= Helpers ========= */
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isAllowedPostalCode = (val) => /^\d{5}$/.test(val) && ALLOWED_DEPARTMENTS.includes(val.slice(0,2));

  const showMessage = (message, type = 'error', timeout = 5000) => {
    if (!messageContainer) return;
    messageContainer.textContent = message;
    messageContainer.className = `message ${type}`;
    messageContainer.style.display = 'block';
    if (timeout > 0) {
      clearTimeout(showMessage._t);
      showMessage._t = setTimeout(() => (messageContainer.style.display = 'none'), timeout);
    }
  };

  const openPopup = () => {
    if (!popupOverlay) {
      showMessage("Désolé, le service n’est pas encore disponible dans votre département. Laissez votre email pour être prévenu.", 'error', 7000);
      return;
    }
    popupOverlay.style.display = 'flex';
    popupOverlay.setAttribute('aria-hidden','false');
    setTimeout(() => waitlistEmail?.focus(), 0);
  };

  const closePopup = () => {
    if (!popupOverlay) return;
    popupOverlay.style.display = 'none';
    popupOverlay.setAttribute('aria-hidden','true');
  };

  popupOverlay?.addEventListener('click', (e) => { if (e.target === popupOverlay) closePopup(); });
  popupCloseBtn?.addEventListener('click', closePopup);
  popupOverlay?.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || !popupContent) return;
    const focusables = popupContent.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
    const list = [...focusables]; if (!list.length) return;
    const first = list[0], last = list[list.length-1];
    if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && popupOverlay?.style.display === 'flex') closePopup(); });

  /* ========= Wizard ========= */
  wizardSteps.forEach((stepElem, i) => {
    stepElem.addEventListener('click', () => {
      if (stepElem.classList.contains('completed') || stepElem.classList.contains('active')) {
        currentStep = i;
        initializeSteps();
      }
    });
  });

  const updateWizardStepsDisplay = (iActive) => {
    wizardSteps.forEach((stepElem, i) => {
      if (i < iActive) { stepElem.classList.add('completed'); stepElem.classList.remove('active'); }
      else if (i === iActive) { stepElem.classList.add('active'); stepElem.classList.remove('completed'); }
      else { stepElem.classList.remove('active', 'completed'); }
    });
  };

  const initializeSteps = () => {
    steps.forEach((step, index) => step.classList.toggle('active', index === currentStep));
    prevBtn.style.display   = currentStep > 0 ? 'inline-block' : 'none';
    nextBtn.style.display   = currentStep < steps.length - 1 ? 'inline-block' : 'none';
    submitBtn.style.display = currentStep === steps.length - 1 ? 'inline-block' : 'none';
    updateWizardStepsDisplay(currentStep);
    if (currentStep === steps.length - 1) updateSummary();
  };

  const updateSummary = () => {
    const map = {
      summaryRole: 'role',
      summaryName: 'name',
      summaryEmail: 'email',
      summaryPhone: 'phone',
      summaryAddress: 'address',
      summaryType: 'type',
      summaryDescription: 'description',
      summaryPriority: 'priority',
    };
    Object.entries(map).forEach(([sumId, fieldId]) => {
      const inputEl = document.getElementById(fieldId);
      const sumEl = document.getElementById(sumId);
      if (inputEl && sumEl) sumEl.textContent = (inputEl.value || '').trim() || 'Non renseigné';
    });
  };

  /* ========= Sélecteurs (inchangé) ========= */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.select-btn');
    if (!btn) return;
    const group = btn.closest('.button-group');
    if (!group) return;

    group.querySelectorAll('.select-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    let hidden = group.nextElementSibling;
    if (hidden && hidden.classList?.contains('field-error')) hidden = hidden.nextElementSibling;
    if (hidden && hidden.type === 'hidden') hidden.value = btn.dataset.value || '';

    const err = group.nextElementSibling?.classList?.contains('field-error') ? group.nextElementSibling : null;
    group.classList.remove('invalid');
    if (err) err.hidden = true;
  });

  /* ========= TOOLTIP tactile (NOUVEAU) =========
     — Affiche une info-bulle sur iPad/mobile par appui long (600 ms).
     — Le hover/focus clavier reste géré par le CSS (::before/::after).
  */
  (function enableLongPressTooltips(){
    const selectButtons = document.querySelectorAll('.select-btn[data-tooltip]');
    if (!selectButtons.length) return;

    const DELAY = 600;   // durée d’appui pour ouvrir
    const HIDE  = 800;   // durée avant fermeture après relâchement
    let timer;

    const start = (btn) => {
      clearTimeout(timer);
      timer = setTimeout(() => btn.classList.add('show-tooltip'), DELAY);
    };
    const cancel = (btn) => {
      clearTimeout(timer);
      setTimeout(() => btn.classList.remove('show-tooltip'), HIDE);
    };

    selectButtons.forEach(btn => {
      btn.addEventListener('touchstart', (e)=>{ e.stopPropagation(); start(btn); }, {passive:true});
      btn.addEventListener('touchend',   ()=> cancel(btn));
      btn.addEventListener('touchcancel',()=> cancel(btn));
      // Tap simple : masque si ouvert
      btn.addEventListener('click', ()=> btn.classList.remove('show-tooltip'));
    });

    // Tap ailleurs : on masque toutes les bulles
    document.addEventListener('touchstart', () => {
      document.querySelectorAll('.select-btn.show-tooltip')
        .forEach(b => b.classList.remove('show-tooltip'));
    }, {passive:true});
  })();

  /* ========= Suggestions de villes ========= */
  let debounceTimeout, abortCtrl;
  const fetchWithTimeout = (url, ms=8000) =>
    Promise.race([
      fetch(url, { signal: abortCtrl?.signal }),
      new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')), ms))
    ]);

  const renderCityList = (list) => {
    if (!Array.isArray(list) || !list.length) {
      citySuggestionsContainer.innerHTML = '<p>Aucune ville trouvée pour ce code postal.</p>';
      citySuggestionsContainer.style.display = 'block';
      return;
    }
    citySuggestionsContainer.innerHTML =
      '<ul>' + list.map(c => `<li tabindex="0">${c.nom}</li>`).join('') + '</ul>';
    citySuggestionsContainer.style.display = 'block';

    citySuggestionsContainer.querySelectorAll('li').forEach((li) => {
      const pick = () => { cityInput.value = li.textContent; citySuggestionsContainer.style.display = 'none'; };
      li.addEventListener('click', pick);
      li.addEventListener('keydown', (e) => { if (e.key === 'Enter') pick(); });
    });
  };

  postalCodeInput.addEventListener('input', () => {
    postalCodeInput.classList.remove('invalid');
    clearTimeout(debounceTimeout);
    if (abortCtrl) abortCtrl.abort();
    abortCtrl = new AbortController();

    debounceTimeout = setTimeout(async () => {
      const cp = postalCodeInput.value.trim();
      if (!/^\d{5}$/.test(cp)) { citySuggestionsContainer.style.display = 'none'; return; }

      try {
        const res = await fetchWithTimeout(
          `https://geo.api.gouv.fr/communes?codePostal=${cp}&fields=nom&format=json&geometry=centre`,
          8000
        );
        if (!res.ok) throw new Error('Erreur réseau');
        const data = await res.json();
        renderCityList(data || []);
      } catch (e) {
        console.error('Erreur villes :', e);
        citySuggestionsContainer.innerHTML = '<p>Impossible de récupérer les données des villes.</p>';
        citySuggestionsContainer.style.display = 'block';
      }
    }, 300);
  });

  postalCodeInput.addEventListener('blur', () => {
    const v = postalCodeInput.value.trim();
    if (/^\d{5}$/.test(v) && !isAllowedPostalCode(v)) openPopup();
  });

  /* ========= Validation / Navigation ========= */
  const validateStep = () => {
    const stepEl = steps[currentStep];
    let isValid = true;

    stepEl.querySelectorAll('input[required]:not([type="hidden"]), textarea[required]').forEach((input) => {
      const val = (input.value || '').trim();

      if (input.type === 'email') {
        const ok = validateEmail(val);
        input.classList.toggle('invalid', !ok);
        if (!ok) isValid = false;
        return;
      }
      if (input.id === 'postalCode') {
        const ok = isAllowedPostalCode(val);
        input.classList.toggle('invalid', !ok);
        if (!ok) isValid = false;
        return;
      }

      const ok = !!val && (!input.pattern || new RegExp(input.pattern).test(val));
      input.classList.toggle('invalid', !ok);
      if (!ok) isValid = false;
    });

    stepEl.querySelectorAll('input[type="hidden"][required]').forEach((hidden) => {
      const ok = !!(hidden.value || '').trim();
      let group = hidden.previousElementSibling;
      if (group && !group.classList?.contains('button-group') && group.classList?.contains('field-error')) {
        group = group.previousElementSibling;
      }
      if (group?.classList?.contains('button-group')) {
        group.classList.toggle('invalid', !ok);
        const err = group.nextElementSibling?.classList?.contains('field-error') ? group.nextElementSibling : null;
        if (err) err.hidden = ok;
      }
      if (!ok) isValid = false;
    });

    return isValid;
  };

  document.querySelectorAll('input, textarea').forEach((el) =>
    el.addEventListener('input', () => el.classList.remove('invalid'))
  );

  prevBtn.addEventListener('click', () => {
    if (currentStep > 0) { currentStep--; initializeSteps(); }
  });

  nextBtn.addEventListener('click', () => {
    if (!validateStep()) {
      if (currentStep === 1) {
        const v = postalCodeInput.value.trim();
        if (/^\d{5}$/.test(v) && !isAllowedPostalCode(v)) openPopup();
      }
      showMessage('Veuillez remplir tous les champs obligatoires correctement avant de continuer.', 'error');
      return;
    }

    if (currentStep === 1) {
      const v = postalCodeInput.value.trim();
      if (!/^\d{5}$/.test(v)) { showMessage('Veuillez saisir un code postal valide (5 chiffres).', 'error'); return; }
      if (!isAllowedPostalCode(v)) { openPopup(); return; }
    }

    if (currentStep < steps.length - 1) { currentStep++; initializeSteps(); }
  });

  /* ========= Spinner & reset ========= */
  const setSubmittingState = (isSubmitting) => {
    if (!submitBtn) return;
    if (isSubmitting) {
      submitBtn.dataset.originalText = submitBtn.textContent;
      submitBtn.textContent = 'Envoi en cours…';
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;
    } else {
      submitBtn.textContent = submitBtn.dataset.originalText || 'Soumettre la demande';
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
    }
  };

  const resetInteractiveState = () => {
    document.querySelectorAll('button, input, textarea, select').forEach(el => el.disabled = false);
    document.querySelectorAll('.loading').forEach(el => el.classList.remove('loading'));
    if (submitBtn) {
      submitBtn.textContent = 'Soumettre la demande';
      submitBtn.removeAttribute('data-original-text');
      submitBtn.disabled = false;
    }
  };

  const resetForm = () => {
    form.reset();
    document.querySelectorAll('.button-group').forEach(g => g.classList.remove('invalid'));
    document.querySelectorAll('.select-btn.active').forEach(b => b.classList.remove('active'));
    citySuggestionsContainer.style.display = 'none';
    ['role','type','priority'].forEach(id => { const h = document.getElementById(id); if (h) h.value = ''; });
    document.querySelector('.form-step.confirmation')?.remove();
    document.querySelectorAll('[id^="summary"]').forEach((el) => el.textContent = 'Non renseigné');
    if (messageContainer) { messageContainer.style.display = 'none'; messageContainer.textContent = ''; }
    resetInteractiveState();
    setSubmittingState(false);
    currentStep = 0;
    initializeSteps();
  };

  const showConfirmationMessage = (requestId) => {
    const confirmationStep = document.createElement('div');
    confirmationStep.classList.add('form-step', 'confirmation');
    confirmationStep.innerHTML = `
      <h2>Confirmation</h2>
      <p>Votre demande a été enregistrée avec succès.</p>
      <p>Numéro unique : <strong>${requestId}</strong></p>
      <p>Nous vous contacterons prochainement.</p>
      <div class="form-navigation">
        <button type="button" id="newRequestBtn" class="nav-btn nav-next">
          <span>Nouvelle demande</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z"/>
          </svg>
        </button>
      </div>
    `;
    document.querySelector('.form-container').appendChild(confirmationStep);
    steps.forEach((s) => s.classList.remove('active'));
    confirmationStep.classList.add('active');
    prevBtn.style.display = 'none';
    nextBtn.style.display = 'none';
    submitBtn.style.display = 'none';
    updateWizardStepsDisplay(wizardSteps.length);
    document.getElementById('newRequestBtn').addEventListener('click', resetForm);
  };

  /* ========= Popup : liste d’attente → envoi vers GAS ========= */
popupSendBtn?.addEventListener('click', async () => {
  const email = (waitlistEmail?.value || '').trim();
  if (!validateEmail(email)) {
    alert('Veuillez saisir un email valide.');
    return;
  }

  // Infos utiles à transmettre
  const cp   = (postalCodeInput?.value || '').trim();
  const city = (cityInput?.value || '').trim();

  // Préviens le user immédiatement
  popupSendBtn.disabled = true;
  popupSendBtn.textContent = 'Envoi…';

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // même technique que le formulaire
      mode: 'cors',
      signal: controller.signal,
      body: JSON.stringify({
        action: 'waitlist',
        email,
        postalCode: cp,
        city,
        source: 'smartimmo-web',
        ua: navigator?.userAgent || ''
      })
    });
    clearTimeout(t);

    const out = await res.json().catch(() => ({}));
    if (!res.ok || !out.ok) throw new Error(out?.error || `HTTP ${res.status}`);

    alert('Merci ! Nous vous préviendrons dès que le service sera disponible.');
    closePopup();
    if (waitlistEmail) waitlistEmail.value = '';
  } catch (err) {
    console.error('Waitlist error:', err);
    alert('Désolé, l’enregistrement a échoué. Réessayez dans un instant.');
  } finally {
    popupSendBtn.disabled = false;
    popupSendBtn.textContent = 'Me prévenir';
  }
});
  /* ========= Soumission → Google Apps Script (Modèle B) ========= */
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (submitBtn?.disabled) return;
  
  // Validations déjà en place
  if (!validateStep()) {
    showMessage('Veuillez remplir tous les champs obligatoires correctement avant de soumettre.', 'error');
    return;
  }
  if (!cguCheckbox?.checked) {
    showMessage('Vous devez accepter les Conditions Générales d’Utilisation avant de soumettre le formulaire.', 'error');
    return;
  }
if (typeof navigator !== 'undefined' && navigator && navigator.onLine === false) {
  showMessage('Vous êtes hors-ligne. Vérifiez votre connexion internet.', 'error');
  return;
}
  const cp = (postalCodeInput.value || '').trim();
  if (!/^\d{5}$/.test(cp) || !isAllowedPostalCode(cp)) { openPopup(); return; }

  // ID ticket
  const requestId = generateUniqueId(cp);

  // 🔁 Payload Modèle B (et compat anciennes clés)
  const payload = {
    // Modèle B
    request_id: requestId,
    name:        (document.getElementById('name').value || '').trim(),
    email:       (document.getElementById('email').value || '').trim(),
    phone: (document.getElementById('phone').value || '').replace(/\s+/g, '').trim(),
    role:        (document.getElementById('role').value || '').trim(),
    address:     (document.getElementById('address').value || '').trim(),
    addressComplement: (document.getElementById('addressComplement')?.value || '').trim(),
    postalCode:  cp,
    city:        (cityInput.value || '').trim(),
    type:        (document.getElementById('type').value || '').trim(),
    description: (document.getElementById('description').value || '').trim(),
    priority:    (document.getElementById('priority').value || '').trim(),
    source:      'smartimmo-web',

    // Compat ancien schéma (si besoin ailleurs)
    ticketId:         requestId,
    nom:              (document.getElementById('name').value || '').trim(),
    telephone: (document.getElementById('phone').value || '').replace(/\s+/g, '').trim(),
    ville:            (cityInput.value || '').trim(),
    typeIntervention: (document.getElementById('type').value || '').trim()
  };
// Défauts si l’utilisateur n’a pas cliqué un bouton
payload.role     = payload.role     || 'N/C';
payload.priority = payload.priority || 'Non';
payload.type     = payload.type     || 'N/C';
  try {
    setSubmittingState(true);

    // Anti-prévol CORS : on poste en text/plain
    const controller = new AbortController();
const t = setTimeout(() => controller.abort(), 15000);

const res = await fetch(GAS_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
  mode: 'cors',
  body: JSON.stringify(payload),
  signal: controller.signal
});
clearTimeout(t);

    const out = await res.json().catch(() => ({}));
    console.log('GAS status', res.status, 'response', out); // log utile

    if (!res.ok || !out.ok) {
      const msg = out?.error || `HTTP ${res.status}`;
      showMessage(`Erreur d'enregistrement : ${msg}`, 'error');
      setSubmittingState(false);
      return;
    }

    // Succès
    showConfirmationMessage(requestId);
  } catch (err) {
    console.error('Erreur lors de l’envoi :', err);
    showMessage('Une erreur est survenue lors de l’envoi. Veuillez réessayer.', 'error');
    setSubmittingState(false);
  }
});

  /* GO */
  initializeSteps();
});