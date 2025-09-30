# 🎵 PlayOn — Reproductor de Música Web (Mejorado)

![PlayOn Screenshot](https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-L2VNPmbpYkPgj4JNdooNPRJMRRj9CK.png)

**PlayOn** es un reproductor de música web limpio, rápido y fácil de usar, construido con **Flask** en el backend y **JavaScript (vanilla)** en el frontend. Está pensado para servir como base para proyectos personales, prototipos o demostraciones donde se necesite reproducción local de audio, gestión de playlists y extracción automática de metadatos y carátulas.

---

## ✨ Características clave

* Reproducción completa: **play / pause / next / prev / seek**.
* Interfaz responsiva que funciona en móviles y escritorio.
* Extracción automática de **metadatos** (título, artista, duración) y **carátulas** desde MP3.
* Gestión de playlists: agregar, eliminar y **reordenar mediante drag & drop**.
* Reproducción cíclica (loop) y soporte de distintos formatos: **MP3, WAV, OGG, M4A**.
* Subida de archivos **sin recarga** (AJAX / Fetch API).
* Estructura de datos optimizada (lista doblemente enlazada) para navegación O(1).

---

## 🧰 Tecnologías

**Backend**

* Flask  (Python)
* Mutagen (lectura de metadatos)
* Pillow (procesamiento de carátulas)
* Werkzeug (utilidades WSGI)

**Frontend**

* HTML5 Audio API
* JavaScript ES6+ (modular)
* CSS3 (Flexbox / Grid)
* Font Awesome (iconos)

---

## 📁 Estructura recomendada del proyecto

```
PlayOn/
├── scripts/
│   ├── app.py            # Aplicación Flask
│   ├── run.py            # Script de inicio
│   └── requirements.txt  # Dependencias
├── templates/
│   ├── base.html
│   └── index.html
├── static/
   ├── css/
   │   └── style.css
   ├── js/
   │   └── app.js
   └── uploads/
       └── covers/

```

---

## 🚀 Instalación rápida

**Prerequisitos**: Python 3.8+, `pip`.

```bash
# Clonar
git clone https://github.com/tu-usuario/playon-music-player.git
cd playon-music-player

# Crear e activar entorno (recomendado)
python -m venv venv
# macOS / Linux
source venv/bin/activate
# Windows (PowerShell)
venv\Scripts\Activate.ps1

# Instalar dependencias
pip install -r scripts/requirements.txt

# Ejecutar
python scripts/run.py
```

Accede en: `http://localhost:5000`

> **Tip:** Para desarrollo, activa el modo debug en Flask o usa `FLASK_APP=scripts.app FLASK_ENV=development flask run`.

---

## 🧭 Uso básico

### Subir canciones

1. Clic en el botón **+** (subir).
2. Selecciona uno o varios archivos (MP3, WAV, OGG, M4A).
3. El servidor extraerá metadatos y guardará la carátula (si existe).

### Controles

* **Play / Pause**: botón central.
* **Siguiente / Anterior**: botones de navegación.
* **Seleccionar canción**: clic en el item de la lista.
* **Reordenar**: arrastrar y soltar.
* **Eliminar**: icono de papelera junto a cada canción.

---

## 🛠️ API (endpoints principales)

| Método | Endpoint           | Descripción                            |
| ------ | ------------------ | -------------------------------------- |
| GET    | `/`                | Página principal                       |
| GET    | `/api/songs`       | Obtener todas las canciones (JSON)     |
| POST   | `/api/upload`      | Subir una o varias canciones           |
| GET    | `/api/play/<id>`   | Reproducir canción por id              |
| GET    | `/api/next`        | Obtener siguiente canción              |
| GET    | `/api/prev`        | Obtener anterior                       |
| DELETE | `/api/remove/<id>` | Eliminar canción                       |
| POST   | `/api/reorder`     | Reordenar playlist (body: nuevo orden) |

> Asegúrate de validar y sanitizar las rutas/IDs en producción.

---

## 🧩 Arquitectura y diseño

* **MVC ligero** en Flask: `routes` → `servicios` → `storage`.
* **Frontend** orientado a componentes JS (clase `MusicPlayer`) que maneja estado, eventos y renderizado DOM.
* **Playlist**: lista doblemente enlazada con punteros a nodo actual para permitir saltos O(1), operaciones de inserción/eliminación eficientes y fácil implementación de loop.

```python
class DoublyLinkedPlaylist:
    # operaciones: append, remove(id), move(old_idx, new_idx), next(), prev()
    # permite reproducción cíclica y navegación O(1)
    pass
```

---

## ✅ Mejores prácticas y seguridad

* Valida tipos de archivo (`mimetype`) y tamaño máximo al subir.
* Protege los endpoints con autenticación si el proyecto se vuelve público.
* Almacena uploads fuera de la carpeta pública o usa nombres seguros y aleatorios.
* Evita exponer rutas absolutas ni información sensible en respuestas JSON.

---

## 🤝 Contribuciones

1. Haz fork del repositorio
2. Crea una rama: `git checkout -b feature/nueva-funcionalidad`
3. Haz commits claros y atómicos
4. Abre un Pull Request describiendo el cambio

Por favor agrega tests para nuevas funcionalidades.

---

## 📝 Licencia

Proyecto bajo **MIT License**. Revisa `LICENSE` para detalles.

---

## 📬 Contacto

Si quieres ayudar, reportar un bug o pedir una característica:

* Issues en GitHub: `https://github.com/tu-usuario/playon-music-player/issues`
* Email: `tu.email@ejemplo.com`
* Twitter: `@tu_twitter`

---

⭐ Si te gustó el proyecto, ¡dale una estrella en GitHub!
