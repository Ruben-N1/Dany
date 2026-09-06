# Te amo dany 💗

Página con una pantalla de contraseña y, del otro lado, un corazón
hecho con las palabras "Te amo" y "perdón".

## Estructura del proyecto

```
.
├── index.html        # Pantalla de contraseña (primera pantalla, la que ve todo el mundo)
├── password.css       # Estilos de la pantalla de contraseña
├── password.js         # Valida la contraseña y redirige a heart.html
├── heart.html          # El corazón (solo se llega acá con la contraseña correcta)
├── style.css            # Estilos compartidos: colores, fuentes, layout del corazón
└── script.js             # Lógica del corazón animado en <canvas>
```

- La contraseña es `21`. Se cambia en `password.js`, en la constante `CONFIG.correctPassword`.
- Casi todo lo demás (colores, palabras del corazón, velocidad del brillo, etc.)
  se ajusta desde los bloques `CONFIG` al principio de `script.js` y `password.js`,
  o desde las variables en `:root` al principio de `style.css`.

## Cómo subirlo a GitHub

Si nunca subiste este proyecto a un repositorio, desde esta misma carpeta:

```bash
git init
git add .
git commit -m "Primera versión de la página"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
git push -u origin main
```

(Cambia `TU-USUARIO/TU-REPO` por los datos reales de tu repositorio en GitHub.)

Si el repositorio ya existe y solo quieres actualizar los archivos:

```bash
git add .
git commit -m "Actualizo la página"
git push
```

## Cómo activar GitHub Pages

1. Entra a tu repositorio en GitHub.
2. Ve a **Settings** → **Pages** (en el menú de la izquierda).
3. En **Source**, elige la rama `main` y la carpeta `/ (root)`.
4. Guarda. GitHub te va a dar una URL parecida a:
   `https://TU-USUARIO.github.io/TU-REPO/`
5. Espera uno o dos minutos y entra a esa URL — ahí debería aparecer
   primero la pantalla de contraseña.

No hace falta ningún build ni instalar nada: es HTML/CSS/JS puro,
así que GitHub Pages lo sirve tal cual.
