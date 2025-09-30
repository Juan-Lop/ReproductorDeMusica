class MusicPlayer {
  constructor() {
    this.audio = document.getElementById("audioPlayer")
    this.isPlaying = false
    this.currentSong = null
    this.playlist = []
    this.volume = 0.5
    this.draggedElement = null

    this.initializeElements()
    this.bindEvents()
    this.loadPlaylist()
  }

  initializeElements() {
    // Controles principales
    this.playPauseBtn = document.getElementById("playPauseBtn")
    this.prevBtn = document.getElementById("prevBtn")
    this.nextBtn = document.getElementById("nextBtn")
    this.volumeBtn = document.getElementById("volumeBtn")
    this.volumeRange = document.getElementById("volumeRange")

    // Elementos de progreso
    this.progressBar = document.querySelector(".progress-bar")
    this.progressFill = document.querySelector(".progress-fill")
    this.progressHandle = document.querySelector(".progress-handle")
    this.timeCurrent = document.querySelector(".time-current")
    this.timeTotal = document.querySelector(".time-total")

    // Información de canción
    this.songTitle = document.querySelector(".song-title")
    this.songArtist = document.querySelector(".song-artist")

    this.mainAlbumArt = document.getElementById("mainAlbumArt")
    this.mainAlbumImage = document.getElementById("mainAlbumImage")
    this.mainAlbumPlaceholder = document.getElementById("mainAlbumPlaceholder")

    // Playlist
    this.playlistElement = document.getElementById("playlist")
    this.playlistEmpty = document.getElementById("playlistEmpty")
    this.songCount = document.querySelector(".song-count")

    // Upload
    this.fileInput = document.getElementById("fileInput")
    this.uploadModal = document.getElementById("uploadModal")
    this.uploadArea = document.getElementById("uploadArea")
  }

  bindEvents() {
    // Controles de reproducción
    this.playPauseBtn.addEventListener("click", () => this.togglePlayPause())
    this.prevBtn.addEventListener("click", () => this.previousSong())
    this.nextBtn.addEventListener("click", () => this.nextSong())

    // Control de volumen
    this.volumeRange.addEventListener("input", (e) => this.setVolume(e.target.value / 100))
    this.volumeBtn.addEventListener("click", () => this.toggleMute())

    // Barra de progreso
    this.progressBar.addEventListener("click", (e) => this.seekTo(e))

    this.audio.addEventListener("loadedmetadata", () => this.updateDuration())
    this.audio.addEventListener("timeupdate", () => this.updateProgress())
    this.audio.addEventListener("ended", () => this.nextSong())
    this.audio.addEventListener("error", (e) => this.handleAudioError(e))
    this.audio.addEventListener("play", () => {
      this.isPlaying = true
      this.updatePlayPauseButton()
    })
    this.audio.addEventListener("pause", () => {
      this.isPlaying = false
      this.updatePlayPauseButton()
    })
    this.audio.addEventListener("canplay", () => {
      console.log("[v0] Audio listo para reproducir")
    })

    // Upload de archivos
    this.fileInput.addEventListener("change", (e) => this.handleFileUpload(e))

    // Drag and drop para upload
    this.uploadArea.addEventListener("dragover", (e) => {
      e.preventDefault()
      this.uploadArea.style.borderColor = "var(--accent-blue)"
    })

    this.uploadArea.addEventListener("dragleave", () => {
      this.uploadArea.style.borderColor = "var(--border-color)"
    })

    this.uploadArea.addEventListener("drop", (e) => {
      e.preventDefault()
      this.uploadArea.style.borderColor = "var(--border-color)"
      this.handleFileDrop(e)
    })

    this.uploadArea.addEventListener("click", () => {
      this.fileInput.click()
    })

    this.bindPlaylistDragEvents()
  }

  bindPlaylistDragEvents() {
    this.playlistElement.addEventListener("dragover", (e) => {
      e.preventDefault()
      const afterElement = this.getDragAfterElement(this.playlistElement, e.clientY)
      const dragging = document.querySelector(".dragging")

      if (afterElement == null) {
        this.playlistElement.appendChild(dragging)
      } else {
        this.playlistElement.insertBefore(dragging, afterElement)
      }
    })

    this.playlistElement.addEventListener("drop", (e) => {
      e.preventDefault()
      this.handlePlaylistDrop()
    })
  }

  getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll(".playlist-item:not(.dragging)")]

    return draggableElements.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect()
        const offset = y - box.top - box.height / 2

        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child }
        } else {
          return closest
        }
      },
      { offset: Number.NEGATIVE_INFINITY },
    ).element
  }

  async handlePlaylistDrop() {
    const items = [...this.playlistElement.querySelectorAll(".playlist-item")]
    const newOrder = items.map((item, index) => ({
      songId: item.dataset.songId,
      position: index,
    }))

    try {
      const response = await fetch("/api/reorder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ order: newOrder }),
      })

      if (response.ok) {
        await this.loadPlaylist()
      }
    } catch (error) {
      console.error("Error reordenando playlist:", error)
    }
  }

  async loadPlaylist() {
    try {
      const response = await fetch("/api/songs")
      const data = await response.json()

      this.playlist = data.songs
      this.currentSong = data.current

      this.renderPlaylist()
      this.updateSongCount()

      if (this.currentSong) {
        this.updateMainSongInfo(this.currentSong)
      }
    } catch (error) {
      console.error("Error cargando playlist:", error)
    }
  }

  renderPlaylist() {
    if (this.playlist.length === 0) {
      this.playlistEmpty.style.display = "block"
      this.playlistElement.style.display = "none"
      return
    }

    this.playlistEmpty.style.display = "none"
    this.playlistElement.style.display = "block"

    this.playlistElement.innerHTML = ""

    this.playlist.forEach((song, index) => {
      const li = document.createElement("li")
      li.className = "playlist-item"
      li.dataset.songId = song.id
      li.draggable = true

      if (this.currentSong && song.id === this.currentSong.id) {
        li.classList.add("playing")
      }

      li.innerHTML = `
        <div class="drag-handle">
          <i class="fas fa-grip-vertical"></i>
        </div>
        <div class="song-number">${index + 1}</div>
        <div class="song-thumbnail">
          ${
            song.album_art
              ? `<img src="/static/uploads/covers/${song.album_art}" alt="Album Art">`
              : `<div class="song-thumbnail-placeholder"><i class="fas fa-music"></i></div>`
          }
        </div>
        <div class="song-details">
          <div class="song-title">${song.title}</div>
          <div class="song-artist">${song.artist}</div>
        </div>
        <div class="song-duration">${song.duration}</div>
        <div class="song-actions">
          <button class="action-btn" onclick="player.playSong('${song.id}')">
            <i class="fas fa-play"></i>
          </button>
          <button class="action-btn" onclick="player.removeSong('${song.id}')">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `

      li.addEventListener("dragstart", (e) => {
        li.classList.add("dragging")
        this.draggedElement = li
      })

      li.addEventListener("dragend", () => {
        li.classList.remove("dragging")
        this.draggedElement = null
      })

      li.addEventListener("dblclick", () => this.playSong(song.id))
      this.playlistElement.appendChild(li)
    })
  }

  updateSongCount() {
    this.songCount.textContent = `${this.playlist.length} canciones`
  }

  async playSong(songId) {
    try {
      console.log("[v0] Intentando reproducir canción:", songId)
      const response = await fetch(`/api/play/${songId}`)
      const data = await response.json()

      if (data.success) {
        this.currentSong = data.song
        const audioUrl = `/static/uploads/${this.currentSong.filename}`
        console.log("[v0] URL de audio:", audioUrl)

        this.audio.src = audioUrl
        this.audio.load()

        this.updateMainSongInfo(this.currentSong)
        this.updatePlayingState()

        try {
          await this.audio.play()
          this.isPlaying = true
          this.updatePlayPauseButton()
          console.log("[v0] Reproducción iniciada exitosamente")
        } catch (error) {
          console.error("[v0] Error reproduciendo:", error)
          this.isPlaying = false
          this.updatePlayPauseButton()
        }
      }
    } catch (error) {
      console.error("Error reproduciendo canción:", error)
    }
  }

  togglePlayPause() {
    if (!this.currentSong) {
      if (this.playlist.length > 0) {
        this.playSong(this.playlist[0].id)
      }
      return
    }

    if (this.isPlaying) {
      this.audio.pause()
    } else {
      this.audio.play().catch((error) => {
        console.error("Error reproduciendo:", error)
      })
    }
  }

  async previousSong() {
    try {
      console.log("[v0] Intentando reproducir canción anterior")
      const response = await fetch("/api/prev")
      const data = await response.json()

      if (data.success) {
        this.currentSong = data.song
        const audioUrl = `/static/uploads/${this.currentSong.filename}`
        this.audio.src = audioUrl
        this.audio.load()

        this.updateMainSongInfo(this.currentSong)
        this.updatePlayingState()

        if (this.isPlaying) {
          try {
            await this.audio.play()
          } catch (error) {
            console.error("Error reproduciendo canción anterior:", error)
          }
        }
      } else {
        console.log("No hay más canciones o playlist vacía")
      }
    } catch (error) {
      console.error("Error canción anterior:", error)
    }
  }

  async nextSong() {
    try {
      console.log("[v0] Intentando reproducir siguiente canción")
      const response = await fetch("/api/next")
      const data = await response.json()

      if (data.success) {
        this.currentSong = data.song
        const audioUrl = `/static/uploads/${this.currentSong.filename}`
        this.audio.src = audioUrl
        this.audio.load()

        this.updateMainSongInfo(this.currentSong)
        this.updatePlayingState()

        if (this.isPlaying) {
          try {
            await this.audio.play()
          } catch (error) {
            console.error("Error reproduciendo siguiente canción:", error)
          }
        }
      } else {
        console.log("No hay más canciones o playlist vacía")
      }
    } catch (error) {
      console.error("Error siguiente canción:", error)
    }
  }

  setVolume(volume) {
    this.volume = volume
    this.audio.volume = volume
    this.updateVolumeIcon()
  }

  toggleMute() {
    if (this.audio.volume > 0) {
      this.audio.volume = 0
      this.volumeRange.value = 0
    } else {
      this.audio.volume = this.volume
      this.volumeRange.value = this.volume * 100
    }
    this.updateVolumeIcon()
  }

  seekTo(e) {
    if (!this.audio.duration) return

    const rect = this.progressBar.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    const seekTime = percent * this.audio.duration

    this.audio.currentTime = seekTime
  }

  updateProgress() {
    if (!this.audio.duration) return

    const percent = (this.audio.currentTime / this.audio.duration) * 100
    this.progressFill.style.width = `${percent}%`
    this.progressHandle.style.left = `${percent}%`

    this.timeCurrent.textContent = this.formatTime(this.audio.currentTime)
  }

  updateDuration() {
    this.timeTotal.textContent = this.formatTime(this.audio.duration)
  }

  updateMainSongInfo(song) {
    this.songTitle.textContent = song.title
    this.songArtist.textContent = song.artist

    // Actualizar carátula principal
    if (song.album_art) {
      this.mainAlbumImage.src = `/static/uploads/covers/${song.album_art}`
      this.mainAlbumImage.style.display = "block"
      this.mainAlbumPlaceholder.style.display = "none"
    } else {
      this.mainAlbumImage.style.display = "none"
      this.mainAlbumPlaceholder.style.display = "flex"
    }
  }

  updatePlayPauseButton() {
    const icon = this.playPauseBtn.querySelector("i")
    icon.className = this.isPlaying ? "fas fa-pause" : "fas fa-play"
  }

  updateVolumeIcon() {
    const icon = this.volumeBtn.querySelector("i")
    const volume = this.audio.volume

    if (volume === 0) {
      icon.className = "fas fa-volume-mute"
    } else if (volume < 0.5) {
      icon.className = "fas fa-volume-down"
    } else {
      icon.className = "fas fa-volume-up"
    }
  }

  updatePlayingState() {
    document.querySelectorAll(".playlist-item").forEach((item) => {
      item.classList.remove("playing")
      if (this.currentSong && item.dataset.songId === this.currentSong.id) {
        item.classList.add("playing")
      }
    })
  }

  async handleFileUpload(e) {
    const files = Array.from(e.target.files)
    await this.uploadFiles(files)
  }

  async handleFileDrop(e) {
    const files = Array.from(e.dataTransfer.files)
    await this.uploadFiles(files)
  }

  async uploadFiles(files) {
    const audioFiles = files.filter((file) => file.type.startsWith("audio/") || /\.(mp3|wav|ogg|m4a)$/i.test(file.name))

    if (audioFiles.length === 0) {
      alert("Por favor selecciona archivos de audio válidos")
      return
    }

    for (const file of audioFiles) {
      await this.uploadSingleFile(file)
    }

    await this.loadPlaylist()
  }

  async uploadSingleFile(file) {
    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!data.success) {
        console.error("Error subiendo archivo:", data.error)
      }
    } catch (error) {
      console.error("Error en upload:", error)
    }
  }

  async removeSong(songId) {
    if (!confirm("¿Estás seguro de que quieres eliminar esta canción?")) {
      return
    }

    try {
      const response = await fetch(`/api/remove/${songId}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (data.success) {
        await this.loadPlaylist()
      }
    } catch (error) {
      console.error("Error eliminando canción:", error)
    }
  }

  formatTime(seconds) {
    if (isNaN(seconds)) return "0:00"

    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  handleAudioError(e) {
    console.error("[v0] Error de audio:", e)
    console.error("[v0] Código de error:", this.audio.error?.code)
    console.error("[v0] Mensaje de error:", this.audio.error?.message)
    this.isPlaying = false
    this.updatePlayPauseButton()
  }
}

function closeUploadModal() {
  document.getElementById("uploadModal").classList.remove("show")
}

document.addEventListener("DOMContentLoaded", () => {
  window.player = new MusicPlayer()
})
