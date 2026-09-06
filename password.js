/* ==========================================================
   PASSWORD.JS
   Valida la contraseña de esta pantalla. Si es correcta, lleva
   al corazón (index.html); si no, muestra un mensaje de error
   y una pequeña sacudida en la caja.

   Todo lo que normalmente querrías cambiar está en CONFIG.
   ========================================================== */

(function () {
  'use strict';

  const CONFIG = {
    correctPassword: '21',   // el día que cumplen mes
    redirectTo: 'heart.html', // a dónde va si acierta (el corazón)
    shakeDuration: 400,        // debe coincidir con la animación "shake" en password.css (ms)
  };

  const form = document.getElementById('password-form');
  const input = document.getElementById('password-input');
  const errorMessage = document.getElementById('password-error');
  const box = document.querySelector('.password-box');

  function showError() {
    errorMessage.classList.add('is-visible');

    // Reinicia la animación de sacudida aunque se envíe varias veces
    // seguidas (si no se quita la clase antes, el navegador no vuelve
    // a disparar la misma animación).
    box.classList.remove('is-shaking');
    void box.offsetWidth; // fuerza un "reflow" para poder reiniciar la animación
    box.classList.add('is-shaking');

    input.value = '';
    input.focus();
  }

  function hideError() {
    errorMessage.classList.remove('is-visible');
  }

  function handleSubmit(event) {
    event.preventDefault(); // evita que el form recargue la página

    const value = input.value.trim();

    if (value === CONFIG.correctPassword) {
      hideError();
      window.location.href = CONFIG.redirectTo;
    } else {
      showError();
    }
  }

  form.addEventListener('submit', handleSubmit);

  // Oculta el error apenas la persona empieza a corregir su respuesta
  input.addEventListener('input', hideError);
})();
