// Script compartido por todas las páginas del mockup. No hay React ni
// nada más: es JavaScript "de toda la vida", pensado para ser fácil de
// leer. Cada bloque revisa primero si los elementos que necesita están
// en la página actual, así el mismo archivo sirve para las 4 páginas
// sin tirar errores en las que no usan esa función.
(function () {

  // ----- 1) Abrir/cerrar el menú de mobile -----
  // Al tocar el botón hamburguesa, se le agrega/saca la clase "is-open"
  // al menú (eso es lo que el CSS usa para mostrarlo u ocultarlo).
  var menuToggle = document.getElementById('menuToggle');
  var mobileNav = document.getElementById('mobileNav');
  if (menuToggle && mobileNav) {
    menuToggle.addEventListener('click', function () {
      var open = mobileNav.classList.toggle('is-open');
      // aria-expanded le avisa a lectores de pantalla si el menú está abierto o cerrado
      menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // ----- 2) Aparición suave de las tarjetas al scrollear (solo home) -----
  // IntersectionObserver le avisa al código cuando un elemento entra en
  // la pantalla. Apenas eso pasa, se le agrega "is-visible" (que en el
  // CSS dispara la animación de opacidad) y se deja de observar esa
  // tarjeta porque ya no hace falta (solo debe pasar una vez).
  var cards = document.querySelectorAll('.card');
  if ('IntersectionObserver' in window && cards.length) {
    var cardObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          cardObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 }); // se dispara cuando el 15% de la tarjeta ya es visible

    cards.forEach(function (card) {
      cardObserver.observe(card);
    });
  } else {
    cards.forEach(function (card) {
      card.classList.add('is-visible');
    });
  }

  // ----- 3) Selector de cantidad (+ / -) en producto y carrito -----
  // Cada ".stepper" tiene un botón restar, un número en el medio y un
  // botón sumar. Se busca ese número dentro del mismo stepper y se le
  // suma o resta 1, sin bajar de 1.
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

  // ----- 4) Tabs "Ingresar" / "Crear cuenta" en login -----
  // Los botones de arriba tienen data-tab="ingresar" o data-tab="registro".
  // Al tocar uno, se le pone is-active a ese botón y se muestra el panel
  // con el mismo data-panel; el resto se oculta.
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
