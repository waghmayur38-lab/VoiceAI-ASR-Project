"""
VoiceAI - Automatic Speech Recognition (ASR) Web Application
A full-stack modern speech-to-text platform built with Flask,
Google Speech Recognition API, and Web Speech API.
"""

import os
import sys
import time
import json
import uuid
import datetime
import logging
from werkzeug.utils import secure_filename
from flask import Flask, render_template, request, jsonify, send_file, send_from_directory

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger("VoiceAI")

# Check speech_recognition library
try:
    import speech_recognition as sr
except ImportError:
    logger.error("speech_recognition library is not installed. Run: pip install SpeechRecognition")
    sr = None

# Optional pydub for server-side audio conversions if ffmpeg is available
try:
    from pydub import AudioSegment
    PYDUB_AVAILABLE = True
except ImportError:
    PYDUB_AVAILABLE = False
    logger.info("pydub not installed. Server will process native WAV/AIFF or client-converted WAV files.")

# Initialize Flask application
app = Flask(__name__)

# Base directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
TRANSCRIPT_FOLDER = os.path.join(BASE_DIR, 'transcripts')

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(TRANSCRIPT_FOLDER, exist_ok=True)

# Configuration
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['TRANSCRIPT_FOLDER'] = TRANSCRIPT_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 25 * 1024 * 1024  # 25 MB max file upload
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'voiceai-asr-secret-key-2025')

# Allowed audio extensions
ALLOWED_EXTENSIONS = {'wav', 'mp3', 'flac', 'ogg', 'm4a', 'aac', 'webm', 'wma'}

# Comprehensive list of supported languages for Google Speech Recognition and Web Speech API
SUPPORTED_LANGUAGES = [
    {"code": "en-US", "name": "English (United States)", "flag": "🇺🇸", "category": "English"},
    {"code": "en-IN", "name": "English (India)", "flag": "🇮🇳", "category": "English"},
    {"code": "en-GB", "name": "English (United Kingdom)", "flag": "🇬🇧", "category": "English"},
    {"code": "hi-IN", "name": "Hindi (हिन्दी)", "flag": "🇮🇳", "category": "Indian"},
    {"code": "mr-IN", "name": "Marathi (मराठी)", "flag": "🇮🇳", "category": "Indian"},
    {"code": "bn-IN", "name": "Bengali (বাংলা)", "flag": "🇮🇳", "category": "Indian"},
    {"code": "ta-IN", "name": "Tamil (தமிழ்)", "flag": "🇮🇳", "category": "Indian"},
    {"code": "te-IN", "name": "Telugu (తెలుగు)", "flag": "🇮🇳", "category": "Indian"},
    {"code": "gu-IN", "name": "Gujarati (ગુજરાતી)", "flag": "🇮🇳", "category": "Indian"},
    {"code": "kn-IN", "name": "Kannada (ಕನ್ನಡ)", "flag": "🇮🇳", "category": "Indian"},
    {"code": "es-ES", "name": "Spanish (Español)", "flag": "🇪🇸", "category": "Global"},
    {"code": "fr-FR", "name": "French (Français)", "flag": "🇫🇷", "category": "Global"},
    {"code": "de-DE", "name": "German (Deutsch)", "flag": "🇩🇪", "category": "Global"},
    {"code": "ja-JP", "name": "Japanese (日本語)", "flag": "🇯🇵", "category": "Global"},
    {"code": "zh-CN", "name": "Chinese (Mandarin)", "flag": "🇨🇳", "category": "Global"},
    {"code": "ar-SA", "name": "Arabic (العربية)", "flag": "🇸🇦", "category": "Global"},
    {"code": "ru-RU", "name": "Russian (Русский)", "flag": "🇷🇺", "category": "Global"},
    {"code": "pt-BR", "name": "Portuguese (Brasil)", "flag": "🇧🇷", "category": "Global"},
    {"code": "it-IT", "name": "Italian (Italiano)", "flag": "🇮🇹", "category": "Global"}
]


def allowed_file(filename):
    """Check if uploaded file has an allowed extension."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def convert_to_wav(source_path, target_path=None):
    """
    Ensure the audio file is converted to a clean 16kHz mono WAV file
    compatible with SpeechRecognition.
    """
    if target_path is None:
        target_path = os.path.splitext(source_path)[0] + "_converted.wav"
        
    ext = os.path.splitext(source_path)[1].lower().replace('.', '')
    
    # If already a WAV file, test if it can be directly opened by speech_recognition
    if ext == 'wav':
        try:
            if sr:
                with sr.AudioFile(source_path) as source:
                    pass
                return source_path, None
        except Exception as e:
            logger.info(f"WAV file needs format normalization: {e}")
            
    # Try pydub conversion if available
    if PYDUB_AVAILABLE:
        try:
            audio = AudioSegment.from_file(source_path)
            # Set to 16kHz mono 16-bit PCM (optimal for ASR)
            audio = audio.set_frame_rate(16000).set_channels(1).set_sample_width(2)
            audio.export(target_path, format="wav")
            return target_path, None
        except Exception as e:
            logger.warning(f"pydub audio conversion failed: {e}")
            return None, (
                "Server audio conversion failed. For compressed audio formats (MP3/OGG/M4A), "
                "please ensure ffmpeg is installed or enable client-side WAV encoding in VoiceAI."
            )
            
    return None, (
        f"Server received a .{ext} file but server-side audio converter (pydub/ffmpeg) is not installed. "
        "VoiceAI automatically converts files to 16kHz WAV in the browser when JavaScript is enabled, "
        "or you can upload a .wav audio file directly."
    )


def transcribe_audio_file(audio_path, language_code='en-US'):
    """
    Perform Speech Recognition using Google Speech Recognition API.
    Returns (transcript_text, duration_seconds, error_message).
    """
    if not sr:
        return None, 0, "SpeechRecognition library is not available on the server."
        
    recognizer = sr.Recognizer()
    recognizer.energy_threshold = 300
    recognizer.dynamic_energy_threshold = True
    
    start_time = time.time()
    converted_path = None
    
    try:
        # Determine whether audio needs conversion
        ext = os.path.splitext(audio_path)[1].lower()
        active_path = audio_path
        
        # If not standard WAV, try to convert
        if ext != '.wav':
            converted_path, conv_err = convert_to_wav(audio_path)
            if conv_err:
                return None, 0, conv_err
            active_path = converted_path

        # Read audio file and transcribe
        with sr.AudioFile(active_path) as source:
            # Adjust for ambient noise to improve accuracy
            recognizer.adjust_for_ambient_noise(source, duration=0.3)
            audio_data = recognizer.record(source)

        transcript = recognizer.recognize_google(audio_data, language=language_code)
        duration = round(time.time() - start_time, 2)
        return transcript, duration, None

    except sr.UnknownValueError:
        return None, 0, (
            "No intelligible speech detected. The audio might be silent, too quiet, "
            "heavily distorted, or in a different language from the one selected."
        )
    except sr.RequestError as e:
        return None, 0, (
            f"Google Speech Recognition service error: Could not connect to API servers ({e}). "
            "Please check internet connectivity."
        )
    except Exception as e:
        logger.error(f"Unexpected transcription error: {e}", exc_info=True)
        return None, 0, f"Transcription processing failed: {str(e)}"
    finally:
        # Clean up temporary converted file if created
        if converted_path and os.path.exists(converted_path) and converted_path != audio_path:
            try:
                os.remove(converted_path)
            except OSError:
                pass


# ==========================================
# Frontend Routes
# ==========================================

@app.route('/')
def index():
    """Render the main VoiceAI studio dashboard."""
    return render_template('index.html', languages=SUPPORTED_LANGUAGES)


@app.route('/about')
def about():
    """Render the About & Educational ASR documentation page."""
    return render_template('about.html')


# ==========================================
# API Endpoints
# ==========================================

@app.route('/api/languages', methods=['GET'])
def get_languages():
    """Return JSON list of supported languages."""
    return jsonify({
        "success": True,
        "languages": SUPPORTED_LANGUAGES
    })


@app.route('/api/transcribe-file', methods=['POST'])
def handle_file_transcription():
    """
    Endpoint for uploading audio files and transcribing them.
    Receives 'audio' file and 'language' code.
    """
    if 'audio' not in request.files:
        return jsonify({"success": False, "error": "No audio file provided in request."}), 400
        
    file = request.files['audio']
    if file.filename == '':
        return jsonify({"success": False, "error": "No file selected."}), 400
        
    language = request.form.get('language', 'en-US')
    
    # Validate language code
    valid_codes = [lang['code'] for lang in SUPPORTED_LANGUAGES]
    if language not in valid_codes:
        language = 'en-US'

    # Secure filename and generate unique temp path
    original_filename = secure_filename(file.filename)
    unique_prefix = uuid.uuid4().hex[:10]
    safe_filename = f"{unique_prefix}_{original_filename}"
    temp_path = os.path.join(app.config['UPLOAD_FOLDER'], safe_filename)

    try:
        file.save(temp_path)
        file_size_bytes = os.path.getsize(temp_path)
        file_size_kb = round(file_size_bytes / 1024, 1)

        # Transcribe audio
        transcript, duration, error = transcribe_audio_file(temp_path, language_code=language)

        if error:
            return jsonify({
                "success": False,
                "error": error,
                "filename": original_filename,
                "file_size_kb": file_size_kb
            }), 422

        words = len(transcript.split()) if transcript else 0
        characters = len(transcript) if transcript else 0

        return jsonify({
            "success": True,
            "transcript": transcript,
            "language": language,
            "duration": duration,
            "filename": original_filename,
            "file_size_kb": file_size_kb,
            "word_count": words,
            "char_count": characters,
            "confidence": 0.95
        })

    except Exception as e:
        logger.error(f"Error handling file transcription: {e}", exc_info=True)
        return jsonify({"success": False, "error": f"Internal server error: {str(e)}"}), 500
    finally:
        # Guarantee cleanup of uploaded audio file
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass


@app.route('/api/transcribe-live-audio', methods=['POST'])
def handle_live_audio_transcription():
    """
    Endpoint for receiving recorded audio blobs (WAV/WEBM)
    recorded from the user's microphone.
    """
    if 'audio' not in request.files:
        return jsonify({"success": False, "error": "No audio blob received."}), 400

    file = request.files['audio']
    language = request.form.get('language', 'en-US')

    unique_id = uuid.uuid4().hex[:10]
    filename = secure_filename(f"recording_{unique_id}.wav")
    temp_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)

    try:
        file.save(temp_path)
        file_size_kb = round(os.path.getsize(temp_path) / 1024, 1)

        transcript, duration, error = transcribe_audio_file(temp_path, language_code=language)

        if error:
            return jsonify({
                "success": False,
                "error": error,
                "file_size_kb": file_size_kb
            }), 422

        words = len(transcript.split()) if transcript else 0
        characters = len(transcript) if transcript else 0

        return jsonify({
            "success": True,
            "transcript": transcript,
            "language": language,
            "duration": duration,
            "file_size_kb": file_size_kb,
            "word_count": words,
            "char_count": characters
        })

    except Exception as e:
        logger.error(f"Error handling recorded audio: {e}", exc_info=True)
        return jsonify({"success": False, "error": f"Internal server error: {str(e)}"}), 500
    finally:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass


@app.route('/api/save-transcript', methods=['POST'])
def save_transcript():
    """
    Save a generated transcript to the server's transcripts/ directory.
    Stores metadata (timestamp, language, word count) alongside text.
    """
    data = request.get_json(silent=True) or {}
    transcript_text = data.get('transcript', '').strip()
    language = data.get('language', 'en-US')
    title = data.get('title', 'Untitled Transcript').strip()

    if not transcript_text:
        return jsonify({"success": False, "error": "Transcript content cannot be empty."}), 400

    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    clean_title = secure_filename(title[:30]).replace(' ', '_') or "transcript"
    file_id = f"{timestamp}_{clean_title}"

    txt_filename = f"{file_id}.txt"
    json_filename = f"{file_id}.json"

    txt_path = os.path.join(app.config['TRANSCRIPT_FOLDER'], txt_filename)
    json_path = os.path.join(app.config['TRANSCRIPT_FOLDER'], json_filename)

    # Word and character count
    word_count = len(transcript_text.split())
    char_count = len(transcript_text)

    # Format header in text file
    content = (
        f"====================================================\n"
        f" VoiceAI - Automatic Speech Recognition Transcript\n"
        f" Title: {title}\n"
        f" Date: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
        f" Language: {language}\n"
        f" Words: {word_count} | Characters: {char_count}\n"
        f"====================================================\n\n"
        f"{transcript_text}\n"
    )

    try:
        # Write .txt file
        with open(txt_path, 'w', encoding='utf-8') as f:
            f.write(content)

        # Write .json metadata file
        meta = {
            "id": file_id,
            "title": title,
            "date": datetime.datetime.now().isoformat(),
            "formatted_date": datetime.datetime.now().strftime('%b %d, %Y %I:%M %p'),
            "language": language,
            "word_count": word_count,
            "char_count": char_count,
            "transcript": transcript_text,
            "filename": txt_filename
        }
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(meta, f, indent=2, ensure_ascii=False)

        return jsonify({
            "success": True,
            "message": "Transcript saved successfully.",
            "file_id": file_id,
            "filename": txt_filename,
            "meta": meta
        })
    except Exception as e:
        logger.error(f"Error saving transcript: {e}", exc_info=True)
        return jsonify({"success": False, "error": f"Failed to save transcript: {str(e)}"}), 500


@app.route('/api/transcripts', methods=['GET'])
def list_transcripts():
    """List all saved transcripts from the transcripts folder."""
    transcripts = []
    try:
        for filename in os.listdir(app.config['TRANSCRIPT_FOLDER']):
            if filename.endswith('.json'):
                json_path = os.path.join(app.config['TRANSCRIPT_FOLDER'], filename)
                try:
                    with open(json_path, 'r', encoding='utf-8') as f:
                        meta = json.load(f)
                        transcripts.append(meta)
                except Exception:
                    continue
        # Sort descending by date
        transcripts.sort(key=lambda x: x.get('date', ''), reverse=True)
        return jsonify({"success": True, "transcripts": transcripts})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/transcripts/<file_id>', methods=['DELETE'])
def delete_transcript(file_id):
    """Delete a saved transcript and its metadata."""
    safe_id = secure_filename(file_id)
    txt_path = os.path.join(app.config['TRANSCRIPT_FOLDER'], f"{safe_id}.txt")
    json_path = os.path.join(app.config['TRANSCRIPT_FOLDER'], f"{safe_id}.json")

    deleted = False
    for p in [txt_path, json_path]:
        if os.path.exists(p):
            try:
                os.remove(p)
                deleted = True
            except OSError:
                pass

    if deleted:
        return jsonify({"success": True, "message": "Transcript deleted."})
    return jsonify({"success": False, "error": "Transcript not found."}), 404


@app.route('/api/download-transcript/<filename>', methods=['GET'])
def download_transcript(filename):
    """Download a saved transcript TXT file."""
    safe_name = secure_filename(filename)
    file_path = os.path.join(app.config['TRANSCRIPT_FOLDER'], safe_name)
    if os.path.exists(file_path):
        return send_file(file_path, as_attachment=True, download_name=safe_name)
    return jsonify({"success": False, "error": "File not found."}), 404


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint for Render and deployment monitors."""
    return jsonify({
        "status": "healthy",
        "service": "VoiceAI ASR",
        "timestamp": datetime.datetime.now().isoformat(),
        "python_version": sys.version.split()[0],
        "speech_recognition_available": sr is not None,
        "pydub_available": PYDUB_AVAILABLE
    })


@app.errorhandler(413)
def request_entity_too_large(error):
    """Handle file exceeding max content length."""
    return jsonify({
        "success": False,
        "error": "The uploaded audio file exceeds the maximum allowed size (25 MB). Please choose a smaller file."
    }), 413


@app.errorhandler(404)
def not_found(error):
    return jsonify({"success": False, "error": "Endpoint not found."}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({"success": False, "error": "Internal server error occurred."}), 500


if __name__ == '__main__':
    # Determine port from environment (Render sets PORT)
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'False').lower() in ('true', '1')
    logger.info(f"Starting VoiceAI ASR application on port {port} (Debug: {debug})...")
    app.run(host='0.0.0.0', port=port, debug=debug)

