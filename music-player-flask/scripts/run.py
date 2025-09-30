#!/usr/bin/env python3
"""
Script para ejecutar el reproductor de música Flask
"""

import subprocess
import sys
import os

def install_requirements():
    """Instalar dependencias necesarias"""
    print("Instalando dependencias...")
    requirements_path = os.path.join(os.path.dirname(__file__), "requirements.txt")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", requirements_path])

def create_directories():
    """Crear directorios necesarios"""
    base_dir = os.path.dirname(os.path.dirname(__file__))  # Directorio padre de scripts/
    directories = [
        os.path.join(base_dir, "static", "uploads"),
        os.path.join(base_dir, "static", "css"), 
        os.path.join(base_dir, "static", "js"),
        os.path.join(base_dir, "templates")
    ]
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        print(f"Directorio creado: {directory}")

def run_app():
    """Ejecutar la aplicación Flask"""
    print("\n" + "="*50)
    print("🎵 REPRODUCTOR DE MÚSICA CON LISTAS DOBLES 🎵")
    print("="*50)
    print("Iniciando servidor Flask...")
    print("Accede a: http://localhost:5000")
    print("Presiona Ctrl+C para detener")
    print("="*50 + "\n")
    
    app_path = os.path.join(os.path.dirname(__file__), "app.py")
    subprocess.run([sys.executable, app_path])

if __name__ == "__main__":
    try:
        install_requirements()
        create_directories()
        run_app()
    except KeyboardInterrupt:
        print("\n\nServidor detenido. ¡Gracias por usar MusicPlayer!")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
