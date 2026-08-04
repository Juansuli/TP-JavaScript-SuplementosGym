// Script shared by all pages of the mockup. There's no React or
// anything else here: it's plain, old-fashioned JavaScript, written to
// be easy to read. Each block first checks whether the elements it
// needs exist on the current page, so the same file works across all
// 4 pages without throwing errors on the ones that don't use that
// particular feature.
(function () {

  // ----- 1) Open/close the mobile menu -----
  // Clicking the hamburger button adds/removes the "is-open" class on
  // the menu (that's what the CSS uses to show or hide it).
  var menuToggle = document.getElementById('menuToggle');
  var mobileNav = document.getElementById('mobileNav');
  if (menuToggle && mobileNav) {
    menuToggle.addEventListener('click', function () {
      var open = mobileNav.classList.toggle('is-open');
      // aria-expanded tells screen readers whether the menu is open or closed
      menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // ----- 2) Cards fading in on scroll (home page only) -----
  // IntersectionObserver notifies the code when an element enters the
  // viewport. As soon as that happens, "is-visible" gets added (which
  // triggers the opacity animation in the CSS) and that card stops
  // being observed, since it only needs to happen once.
  var cards = document.querySelectorAll('.card');
  if ('IntersectionObserver' in window && cards.length) {
    var cardObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          cardObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 }); // fires once 15% of the card is already visible

    cards.forEach(function (card) {
      cardObserver.observe(card);
    });
  } else {
    cards.forEach(function (card) {
      card.classList.add('is-visible');
    });
  }

  // ----- 3) Quantity stepper (+ / -) on product and cart pages -----
  // Each ".stepper" has a minus button, a number in the middle, and a
  // plus button. This finds that number inside the same stepper and
  // adds or subtracts 1, never going below 1.
  document.querySelectorAll('.stepper').forEach(function (stepper) {
    var valueEl = stepper.querySelector('.qty-value');
    var minusBtn = stepper.querySelector('[data-step="-1"]');
    var plusBtn = stepper.querySelector('[data-step="1"]');
    if (!valueEl || !minusBtn || !plusBtn) return;

    function setQty(n) {
      valueEl.textContent = n;
    }
    minusBtn.addEventListener('click', function () {
      var current = parseInt(valueEl.textContent, 10) || 1;
      if (current > 1) setQty(current - 1);
    });
    plusBtn.addEventListener('click', function () {
      var current = parseInt(valueEl.textContent, 10) || 1;
      setQty(current + 1);
    });
  });

  // ----- 4) "Login" / "Register" tabs on the login page -----
  // The buttons above have data-tab="login" or data-tab="register".
  // Clicking one marks that button as is-active and shows the panel
  // with the matching data-panel; the rest get hidden.
  var tabButtons = document.querySelectorAll('[data-tab]');
  if (tabButtons.length) {
    tabButtons.forEach(function (button) {
      button.addEventListener('click', function () {
        var target = button.getAttribute('data-tab');

        tabButtons.forEach(function (b) {
          b.classList.toggle('is-active', b === button);
        });
        document.querySelectorAll('[data-panel]').forEach(function (panel) {
          panel.classList.toggle('is-active', panel.getAttribute('data-panel') === target);
        });
      });
    });
  }
})();
