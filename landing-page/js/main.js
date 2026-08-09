(() => {
  const header = document.querySelector("#header");
  const toggle = document.querySelector(".nav-toggle");
  const mobileNav = document.querySelector(".mobile-nav");
  const year = document.querySelector("#year");
  const form = document.querySelector("#demo-form");
  const formNote = document.querySelector("#form-note");
  const submitBtn = document.querySelector("#demo-submit");
  const glow = document.querySelector(".cursor-glow");

  const DEMO_EMAIL = "support.elykia@optimizesolux.com";

  if (year) year.textContent = String(new Date().getFullYear());

  const onScroll = () => {
    if (!header) return;
    header.classList.toggle("scrolled", window.scrollY > 8);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  if (toggle && mobileNav) {
    const setMenuOpen = (open) => {
      if (open) {
        mobileNav.removeAttribute("hidden");
        mobileNav.classList.add("is-open");
      } else {
        mobileNav.setAttribute("hidden", "");
        mobileNav.classList.remove("is-open");
      }
      toggle.setAttribute("aria-expanded", String(open));
    };

    toggle.addEventListener("click", () => {
      const open = mobileNav.hasAttribute("hidden");
      setMenuOpen(open);
    });

    mobileNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setMenuOpen(false));
    });

    window.matchMedia("(min-width: 900px)").addEventListener("change", (e) => {
      if (e.matches) setMenuOpen(false);
    });
  }

  const reveals = document.querySelectorAll(".reveal");
  const staggerGroups = document.querySelectorAll(".reveal-stagger");

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" }
    );
    reveals.forEach((el) => io.observe(el));

    const staggerIo = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            staggerIo.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    staggerGroups.forEach((el) => staggerIo.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("visible"));
    staggerGroups.forEach((el) => el.classList.add("is-visible"));
  }

  const finePointer = window.matchMedia("(pointer: fine)").matches;
  if (finePointer && glow) {
    document.body.classList.add("is-desktop");
    let raf = 0;
    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;

    const tick = () => {
      x += (targetX - x) * 0.12;
      y += (targetY - y) * 0.12;
      glow.style.left = `${x}px`;
      glow.style.top = `${y}px`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener(
      "pointermove",
      (e) => {
        targetX = e.clientX;
        targetY = e.clientY;
        if (!raf) raf = requestAnimationFrame(tick);
      },
      { passive: true }
    );
  }

  function setNote(text, kind) {
    if (!formNote) return;
    formNote.textContent = text;
    formNote.classList.remove("is-success", "is-error");
    if (kind) formNote.classList.add(kind);
  }

  function openMailtoFallback(payload) {
    const subject = encodeURIComponent("Demande de démo Elykia");
    const body = encodeURIComponent(
      [
        `Nom: ${payload.name}`,
        `Email: ${payload.email}`,
        `Entreprise: ${payload.company}`,
        `Téléphone: ${payload.phone || "—"}`,
        "",
        payload.message,
      ].join("\n")
    );
    window.location.href = `mailto:${DEMO_EMAIL}?subject=${subject}&body=${body}`;
  }

  if (form && formNote && submitBtn) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const data = new FormData(form);
      if (String(data.get("_gotcha") || "").trim()) return;

      const payload = {
        name: String(data.get("name") || "").trim(),
        email: String(data.get("email") || "").trim(),
        company: String(data.get("company") || "").trim(),
        phone: String(data.get("phone") || "").trim(),
        message: String(data.get("message") || "").trim(),
      };

      if (!payload.name || !payload.email || !payload.company || !payload.message) {
        setNote("Merci de remplir les champs obligatoires.", "is-error");
        return;
      }

      submitBtn.disabled = true;
      setNote("Envoi de votre demande…");

      try {
        const res = await fetch(`https://formsubmit.co/ajax/${DEMO_EMAIL}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            name: payload.name,
            email: payload.email,
            company: payload.company,
            phone: payload.phone || "—",
            message: payload.message,
            _subject: "Demande de démo Elykia",
            _template: "table",
            _replyto: payload.email,
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        form.reset();
        setNote(
          "Demande envoyée. Nous vous recontactons sous 48 h ouvrées.",
          "is-success"
        );
      } catch {
        setNote(
          "Envoi automatique indisponible — ouverture de votre client mail…",
          "is-error"
        );
        openMailtoFallback(payload);
        window.setTimeout(() => {
          setNote(
            `Si rien ne s’est ouvert, écrivez-nous à ${DEMO_EMAIL}`,
            "is-error"
          );
        }, 2500);
      } finally {
        submitBtn.disabled = false;
      }
    });
  }
})();
