from flask import Flask, render_template, request, jsonify, redirect, url_for
import os
import json
from werkzeug.utils import secure_filename
import uuid
try:
    from mutagen import File
    from mutagen.id3 import ID3, APIC
    from PIL import Image
    import io
    METADATA_SUPPORT = True
except ImportError:
    METADATA_SUPPORT = False
    print("Advertencia: mutagen y/o PIL no están instalados. Las carátulas no estarán disponibles.")

# Obtener el directorio padre (donde están templates y static)
basedir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
template_dir = os.path.join(basedir, 'templates')
static_dir = os.path.join(basedir, 'static')

app = Flask(__name__, template_folder=template_dir, static_folder=static_dir)
app.config['UPLOAD_FOLDER'] = os.path.join(static_dir, 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

covers_dir = os.path.join(static_dir, 'uploads', 'covers')
os.makedirs(covers_dir, exist_ok=True)

# Asegurar que el directorio de uploads existe
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

class SongNode:
    """Nodo para la lista doble de canciones"""
    def __init__(self, song_data):
        self.id = song_data.get('id', str(uuid.uuid4()))
        self.title = song_data.get('title', 'Sin título')
        self.artist = song_data.get('artist', 'Artista desconocido')
        self.filename = song_data.get('filename', '')
        self.duration = song_data.get('duration', '0:00')
        self.album_art = song_data.get('album_art', None)
        self.next = None
        self.prev = None
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'artist': self.artist,
            'filename': self.filename,
            'duration': self.duration,
            'album_art': self.album_art
        }

class DoublyLinkedPlaylist:
    """Lista doble para manejar la playlist de canciones"""
    def __init__(self):
        self.head = None
        self.tail = None
        self.current = None
        self.size = 0
    
    def add_song(self, song_data, position=None):
        """Agregar canción en posición específica o al final"""
        new_node = SongNode(song_data)
        
        if self.size == 0:
            self.head = self.tail = self.current = new_node
        elif position is None or position >= self.size:
            # Agregar al final
            new_node.prev = self.tail
            self.tail.next = new_node
            self.tail = new_node
        elif position == 0:
            # Agregar al inicio
            new_node.next = self.head
            self.head.prev = new_node
            self.head = new_node
        else:
            # Agregar en posición específica
            current = self.head
            for i in range(position):
                current = current.next
            
            new_node.next = current
            new_node.prev = current.prev
            current.prev.next = new_node
            current.prev = new_node
        
        self.size += 1
        return new_node.id
    
    def remove_song(self, song_id):
        """Eliminar canción por ID"""
        current = self.head
        
        while current:
            if current.id == song_id:
                if current.prev:
                    current.prev.next = current.next
                else:
                    self.head = current.next
                
                if current.next:
                    current.next.prev = current.prev
                else:
                    self.tail = current.prev
                
                if self.current == current:
                    self.current = current.next or current.prev
                
                self.size -= 1
                return True
            current = current.next
        
        return False
    
    def next_song(self):
        """Ir a la siguiente canción"""
        if self.current and self.current.next:
            self.current = self.current.next
            return self.current
        elif self.current and self.head and self.size > 1:
            self.current = self.head
            return self.current
        return None
    
    def prev_song(self):
        """Ir a la canción anterior"""
        if self.current and self.current.prev:
            self.current = self.current.prev
            return self.current
        elif self.current and self.tail and self.size > 1:
            self.current = self.tail
            return self.current
        return None
    
    def set_current(self, song_id):
        """Establecer canción actual por ID"""
        current = self.head
        while current:
            if current.id == song_id:
                self.current = current
                return current
            current = current.next
        return None
    
    def get_all_songs(self):
        """Obtener todas las canciones como lista"""
        songs = []
        current = self.head
        while current:
            songs.append(current.to_dict())
            current = current.next
        return songs
    
    def move_song(self, song_id, new_position):
        """Mover canción a nueva posición"""
        # Encontrar la canción
        current = self.head
        while current and current.id != song_id:
            current = current.next
        
        if not current:
            return False
        
        # Remover de posición actual
        song_data = current.to_dict()
        self.remove_song(song_id)
        
        # Agregar en nueva posición
        self.add_song(song_data, new_position)
        return True

# Instancia global de la playlist
playlist = DoublyLinkedPlaylist()

def extract_metadata(file_path, filename):
    """Extraer metadatos y carátula de un archivo de audio"""
    if not METADATA_SUPPORT:
        return {
            'title': os.path.splitext(filename)[0],
            'artist': 'Artista desconocido',
            'duration': '0:00',
            'album_art': None
        }
    
    try:
        audio_file = File(file_path)
        if audio_file is None:
            return {
                'title': os.path.splitext(filename)[0],
                'artist': 'Artista desconocido',
                'duration': '0:00',
                'album_art': None
            }
        
        # Extraer información básica
        title = str(audio_file.get('TIT2', [os.path.splitext(filename)[0]])[0]) if audio_file.get('TIT2') else os.path.splitext(filename)[0]
        artist = str(audio_file.get('TPE1', ['Artista desconocido'])[0]) if audio_file.get('TPE1') else 'Artista desconocido'
        
        # Calcular duración
        duration_seconds = audio_file.info.length if hasattr(audio_file, 'info') and audio_file.info else 0
        duration = f"{int(duration_seconds // 60)}:{int(duration_seconds % 60):02d}"
        
        # Extraer carátula
        album_art_filename = None
        if hasattr(audio_file, 'tags') and audio_file.tags:
            for key in audio_file.tags:
                if isinstance(audio_file.tags[key], APIC):
                    try:
                        # Guardar carátula
                        image_data = audio_file.tags[key].data
                        image = Image.open(io.BytesIO(image_data))
                        
                        # Redimensionar si es muy grande
                        if image.width > 500 or image.height > 500:
                            image.thumbnail((500, 500), Image.Resampling.LANCZOS)
                        
                        # Generar nombre único para la carátula
                        cover_filename = f"{uuid.uuid4().hex}.jpg"
                        cover_path = os.path.join(covers_dir, cover_filename)
                        
                        # Convertir a RGB si es necesario y guardar
                        if image.mode in ('RGBA', 'P'):
                            image = image.convert('RGB')
                        image.save(cover_path, 'JPEG', quality=85)
                        
                        album_art_filename = cover_filename
                        break
                    except Exception as e:
                        print(f"Error extrayendo carátula: {e}")
        
        return {
            'title': title,
            'artist': artist,
            'duration': duration,
            'album_art': album_art_filename
        }
        
    except Exception as e:
        print(f"Error extrayendo metadatos: {e}")
        return {
            'title': os.path.splitext(filename)[0],
            'artist': 'Artista desconocido',
            'duration': '0:00',
            'album_art': None
        }

@app.route('/')
def index():
    """Página principal del reproductor"""
    return render_template('index.html')

@app.route('/api/songs', methods=['GET'])
def get_songs():
    """Obtener todas las canciones"""
    songs = playlist.get_all_songs()
    current_song = playlist.current.to_dict() if playlist.current else None
    return jsonify({
        'songs': songs,
        'current': current_song,
        'total': playlist.size
    })

@app.route('/api/upload', methods=['POST'])
def upload_song():
    """Subir nueva canción"""
    if 'file' not in request.files:
        return jsonify({'error': 'No se seleccionó archivo'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No se seleccionó archivo'}), 400
    
    if file and file.filename.lower().endswith(('.mp3', '.wav', '.ogg', '.m4a')):
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        metadata = extract_metadata(file_path, filename)
        
        song_data = {
            'title': metadata['title'],
            'artist': metadata['artist'],
            'filename': filename,
            'duration': metadata['duration'],
            'album_art': metadata['album_art']
        }
        
        position = request.form.get('position')
        if position:
            position = int(position)
        
        song_id = playlist.add_song(song_data, position)
        return jsonify({'success': True, 'song_id': song_id})
    
    return jsonify({'error': 'Formato de archivo no válido'}), 400

@app.route('/api/play/<song_id>')
def play_song(song_id):
    """Reproducir canción específica"""
    song = playlist.set_current(song_id)
    if song:
        return jsonify({'success': True, 'song': song.to_dict()})
    return jsonify({'error': 'Canción no encontrada'}), 404

@app.route('/api/next')
def next_song():
    """Siguiente canción"""
    song = playlist.next_song()
    if song:
        return jsonify({'success': True, 'song': song.to_dict()})
    return jsonify({'success': False, 'message': 'No hay canciones en la playlist'}), 200

@app.route('/api/prev')
def prev_song():
    """Canción anterior"""
    song = playlist.prev_song()
    if song:
        return jsonify({'success': True, 'song': song.to_dict()})
    return jsonify({'success': False, 'message': 'No hay canciones en la playlist'}), 200

@app.route('/api/remove/<song_id>', methods=['DELETE'])
def remove_song(song_id):
    """Eliminar canción"""
    if playlist.remove_song(song_id):
        return jsonify({'success': True})
    return jsonify({'error': 'Canción no encontrada'}), 404

@app.route('/api/move', methods=['POST'])
def move_song():
    """Mover canción a nueva posición"""
    data = request.get_json()
    song_id = data.get('song_id')
    new_position = data.get('position')
    
    if playlist.move_song(song_id, new_position):
        return jsonify({'success': True})
    return jsonify({'error': 'No se pudo mover la canción'}), 400

@app.route('/api/reorder', methods=['POST'])
def reorder_playlist():
    """Reordenar playlist completa"""
    global playlist
    
    try:
        data = request.get_json()
        order = data.get('order', [])
        
        # Crear nueva playlist con el orden especificado
        new_playlist = DoublyLinkedPlaylist()
        
        # Obtener todas las canciones actuales
        current_songs = {song['id']: song for song in playlist.get_all_songs()}
        
        # Agregar canciones en el nuevo orden
        for item in order:
            song_id = item['songId']
            if song_id in current_songs:
                new_playlist.add_song(current_songs[song_id])
        
        # Mantener la canción actual si existe
        if playlist.current:
            new_playlist.set_current(playlist.current.id)
        
        # Reemplazar playlist global
        playlist = new_playlist
        
        return jsonify({'success': True})
        
    except Exception as e:
        print(f"Error reordenando playlist: {e}")
        return jsonify({'error': 'Error reordenando playlist'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
