# VoiceAI – Global Automatic Speech Recognition (ASR) Platform

[![Python](https://img.shields.io/badge/Python-3.10%20%7C%203.11%20%7C%203.12-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.1.3-000000?style=for-the-badge&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![Render](https://img.shields.io/badge/Deploy%20to-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://render.com)
[![SpeechRecognition](https://img.shields.io/badge/ASR-Google%20Speech%20API-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://cloud.google.com/speech-to-text)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

> **College Project: CSE / AIML Final Year & Academic Evaluation**  
> A full-stack, cloud-ready Automatic Speech Recognition (ASR) web application that converts spoken voice and uploaded audio files into accurate written text across 15+ global and Indian languages (English, Hindi, Marathi, Spanish, French, and more).

---

## 🌐 Live Public Deployment
- **Public URL**: `https://voiceai-asr.onrender.com` *(Follow the Render deployment steps below to launch your personal live instance)*
- **API Health Check**: `https://voiceai-asr.onrender.com/api/health`

---

## 📋 Table of Contents
1. [Project Overview](#-project-overview)
2. [Key Features](#-key-features)
3. [System Architecture & ASR Pipeline](#-system-architecture--asr-pipeline)
4. [Technology Stack](#-technology-stack)
5. [Directory Structure](#-directory-structure)
6. [Local Setup & Installation](#-local-setup--installation)
7. [Running Test Suite](#-running-test-suite)
8. [GitHub Upload Instructions](#-github-upload-instructions)
9. [Render Cloud Deployment Guide](#-render-cloud-deployment-guide)
10. [REST API Documentation](#-rest-api-documentation)
11. [College Viva & Presentation Defense Guide](#-college-viva--presentation-defense-guide)

---

## 🌟 Project Overview

**VoiceAI** bridges human acoustic speech and machine-readable text. It is designed to demonstrate full-stack engineering principles, signal processing, and cloud deployment. 

Unlike basic prototypes that only run on localhost, VoiceAI is architected with:
- **Dual Recognition Engines**: High-speed, zero-latency streaming via the browser's **Web Speech API**, coupled with high-precision server-side phonetic decoding via the **Google Speech Recognition API**.
- **Client-Side Web Audio Transcoding**: In-browser decoding that converts `.mp3`, `.m4a`, `.ogg`, and `.flac` into uncompressed 16-bit 16kHz mono PCM `.wav` format, resolving server codec and `ffmpeg` dependency hurdles.
- **Real-Time Visualizer**: Interactive HTML5 Canvas displaying real-time audio frequencies while speaking.
- **Ephemeral Privacy Architecture**: Immediate deletion of audio files after processing, preventing disk bloat and safeguarding user privacy.

---

## 🚀 Key Features

### 1. Live Voice Recording
- One-click microphone recording with animated pulse rings.
- Dynamic HTML5 Canvas frequency waveform visualizer using Web Audio `AnalyserNode`.
- Real-time continuous transcription preview.
- In-browser playback player to review recorded voice.

### 2. Audio File Upload
- Drag-and-drop or browse audio files.
- Supports `.wav`, `.mp3`, `.flac`, `.ogg`, `.m4a`, `.aac`, `.webm`.
- File validation (file type verification, 25MB maximum size limit).
- Audio player preview before starting transcription.

### 3. Comprehensive Multilingual Support
Select target language from a dropdown covering:
- **English Accents**: United States (`en-US`), India (`en-IN`), United Kingdom (`en-GB`).
- **Indian Regional Languages**: Hindi (`hi-IN`), Marathi (`mr-IN`), Bengali (`bn-IN`), Tamil (`ta-IN`), Telugu (`te-IN`), Gujarati (`gu-IN`), Kannada (`kn-IN`).
- **Global Languages**: Spanish (`es-ES`), French (`fr-FR`), German (`de-DE`), Japanese (`ja-JP`), Chinese (`zh-CN`), Arabic (`ar-SA`), Russian (`ru-RU`), Portuguese (`pt-BR`), Italian (`it-IT`).

### 4. Transcript Studio & Management
- Real-time **Word Count**, **Character Count**, and **Processing Duration** metrics.
- Editable text editor.
- **Copy to Clipboard** with visual toast confirmation.
- **Text-to-Speech (Read Aloud)** playback in the selected accent/language using browser Speech Synthesis.
- **Export as .TXT** document with header metadata.
- **Save to History Archive**: Saves to the server's `transcripts/` directory and synchronizes with local storage.
- History drawer to reload, copy, or delete previous transcripts.

### 5. Educational Academic Documentation (`/about`)
- In-depth theoretical walkthrough of ASR pipelines, MFCC formulas, acoustic models, and pronunciation dictionaries.
- College presentation and viva questions with model answers.

---

## 🧠 System Architecture & ASR Pipeline

```
+-----------------------------------------------------------------------------------+
|                                 USER INTERFACE                                    |
|   +--------------------------+                 +------------------------------+   |
|   |   Live Microphone Audio  |                 |   Uploaded Audio File        |   |
|   |  (Web Audio AnalyserNode)|                 |   (MP3, WAV, FLAC, M4A, OGG) |   |
|   +------------+-------------+                 +--------------+---------------+   |
+----------------|----------------------------------------------|-------------------+
                 |                                              |
                 v                                              v
+-----------------------------------------------------------------------------------+
|                        CLIENT-SIDE PROCESSING (script.js)                         |
|   - Real-Time Live Streaming (Web Speech API) -> Instant preview in textarea      |
|   - AudioContext Decoding & PCM Downsampling -> 16,000 Hz 16-bit Mono WAV Blob   |
+----------------------------------------+------------------------------------------+
                                         | HTTP POST multipart/form-data
                                         v
+-----------------------------------------------------------------------------------+
|                          BACKEND FLASK SERVER (app.py)                            |
|   +---------------------------------------------------------------------------+   |
|   | 1. Route Validation & Rate/Size Check (werkzeug.secure_filename, 25MB max)|   |
|   | 2. Ambient Noise Calibration (recognizer.adjust_for_ambient_noise)        |   |
|   | 3. Speech Recognition Engine (speech_recognition.Recognizer)              |   |
|   | 4. Google Speech API Remote Dispatch (recognize_google, language=lang)    |   |
|   | 5. Guaranteed Temp File Purge (try ... finally os.remove)                 |   |
|   +------------------------------------+--------------------------------------+   |
+----------------------------------------|------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                          ASR ACOUSTIC & LANGUAGE DECODING                         |
|   [Analog Waveform]                                                               |
|          |                                                                        |
|          v                                                                        |
|   [Windowing & Framing] (20-30 ms frames with 10 ms overlap)                      |
|          |                                                                        |
|          v                                                                        |
|   [Mel Filter Bank & MFCCs] (13-39 Cepstral Coefficients)                         |
|          |                                                                        |
|          v                                                                        |
|   [Deep Neural Acoustic Model] -> Posterior probabilities of phonemes            |
|          |                                                                        |
|          v                                                                        |
|   [Pronunciation Lexicon] -> Grapheme-to-Phoneme dictionary lookup                |
|          |                                                                        |
|          v                                                                        |
|   [Transformer Language Model + Beam Search] -> Most probable text sentence       |
+-----------------------------------------------------------------------------------+
```

---

## 🛠️ Technology Stack

| Component | Technology | Description |
|---|---|---|
| **Frontend** | HTML5, CSS3, JavaScript (ES6+) | Dark & blue gradient theme, glassmorphism UI, responsive CSS Grid. |
| **Icons & Fonts** | FontAwesome 6, Google Fonts | Outfit (headers), Inter (body), JetBrains Mono (metrics). |
| **Audio Processing** | Web Audio API | Client-side visualizer canvas and 16kHz PCM WAV encoder. |
| **Client ASR** | Web Speech API | Instant low-latency live streaming transcription in browser. |
| **Backend** | Python Flask 3.x | Lightweight, robust REST API server. |
| **Server ASR** | `SpeechRecognition` 3.17.0 | Audio recording parser, energy thresholding, and Google Cloud ASR bridge. |
| **Production WSGI**| Gunicorn 23.x | Enterprise multi-threaded HTTP server for Linux deployment. |
| **Deployment** | Render | Automated CI/CD web service with free tier and automated HTTPS. |

---

## 📂 Directory Structure

```
voiceai-asr/
│
├── app.py                     # Flask application entry point and REST API
├── requirements.txt           # Python dependencies for pip
├── Procfile                   # Gunicorn process declaration for Render/Heroku
├── render.yaml                # Render Infrastructure-as-Code Blueprint
├── .gitignore                 # Files excluded from git tracking
├── README.md                  # Complete documentation and deployment guide
├── test_app.py                # Automated test suite (10 unit & API tests)
│
├── templates/                 # Jinja2 HTML templates
│   ├── index.html             # Main transcription studio & dashboard
│   └── about.html             # Academic ASR documentation & Viva Q&A
│
├── static/                    # Frontend static assets
│   ├── css/
│   │   └── style.css          # Modern dark & blue gradient styling
│   ├── js/
│   │   └── script.js          # Audio recording, visualizer & API controller
│   └── images/                # App illustrations and icons
│
├── uploads/                   # Temporary directory for audio processing (auto-cleaned)
│   └── .gitkeep
│
└── transcripts/               # Saved transcript storage (TXT and JSON metadata)
    └── .gitkeep
```

---

## 💻 Local Setup & Installation

### Step 1: Clone or Navigate to Project
```bash
cd "C:\NLP PROJECT"
```

### Step 2: Create a Virtual Environment (Recommended)
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### Step 3: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 4: Run the Application
```bash
python app.py
```
*The server will start at `http://127.0.0.1:5000`.*

### Step 5: Open in Browser
Open Google Chrome, Microsoft Edge, or Firefox and navigate to:
```
http://localhost:5000
```

---

## 🧪 Running Test Suite

An automated test suite (`test_app.py`) is included to verify all 10 core components before presenting or deploying:
```bash
python test_app.py
```
**Test Coverage:**
- Home page template rendering (`200 OK`)
- About page and Viva guide rendering (`200 OK`)
- Languages API returning 15+ language entries
- Health check endpoint (`healthy`)
- Transcript saving, listing, downloading, and deletion
- Audio upload validation and 16kHz WAV recognition error trapping

---

## 🐙 GitHub Upload Instructions

To deploy to Render, your project should be in a GitHub repository:

### Method A: Using Git Command Line (Recommended)
1. Initialize repository and stage files:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: VoiceAI ASR Full-Stack Web Application"
   ```
2. Create a new repository on [GitHub](https://github.com/new) named `voiceai-asr`.
3. Link and push your code:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/voiceai-asr.git
   git push -u origin main
   ```

### Method B: Using GitHub Desktop
1. Open GitHub Desktop and select **File > Add Local Repository**.
2. Browse to `C:\NLP PROJECT` and click **Add Repository** (or **Create Repository** if prompted).
3. Click **Publish repository** to push it to your GitHub account.

---

## 🚀 Render Cloud Deployment Guide

Render allows you to host the application online for free with a public HTTPS URL.

### Step 1: Sign Up on Render
1. Visit [render.com](https://render.com) and sign up with your GitHub account.

### Step 2: Create a New Web Service
1. In the Render Dashboard, click **New +** and select **Web Service**.
2. Select **Build and deploy from a Git repository** and connect your `voiceai-asr` repository.

### Step 3: Configure Service Settings
Fill in the following fields:
- **Name**: `voiceai-asr` (or any preferred name)
- **Region**: Choose the closest region (e.g., *Singapore*, *Frankfurt*, or *Oregon*)
- **Branch**: `main`
- **Root Directory**: *(leave blank)*
- **Runtime**: `Python 3`
- **Build Command**:
  ```bash
  pip install --upgrade pip && pip install -r requirements.txt
  ```
- **Start Command**:
  ```bash
  gunicorn app:app --workers 2 --threads 4 --timeout 120
  ```
- **Instance Type**: **Free**

### Step 4: Environment Variables (Optional but Recommended)
Click **Advanced** > **Add Environment Variable**:
- `PYTHON_VERSION` = `3.12.0`
- `FLASK_DEBUG` = `false`
- `SECRET_KEY` = *(click Generate or enter a random secure string)*

### Step 5: Deploy
1. Click **Create Web Service**.
2. Render will build the environment, install packages from `requirements.txt`, and start Gunicorn.
3. Once the build displays `==> Your service is live 🎉`, your public URL will appear at the top:
   ```
   https://voiceai-asr.onrender.com
   ```
4. Click the URL to test live microphone recording and audio file transcription worldwide!

---

## 📡 REST API Documentation

### 1. File Audio Transcription
- **Endpoint**: `POST /api/transcribe-file`
- **Payload**: `multipart/form-data`
  - `audio`: Audio file binary (`.wav`, `.mp3`, `.flac`, etc.)
  - `language`: BCP-47 language code (e.g. `en-US`, `hi-IN`, `mr-IN`)
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "transcript": "Recognized spoken text here",
    "language": "hi-IN",
    "duration": 1.45,
    "filename": "speech_sample.wav",
    "file_size_kb": 128.4,
    "word_count": 4,
    "char_count": 27,
    "confidence": 0.95
  }
  ```

### 2. Live Audio Blob Transcription
- **Endpoint**: `POST /api/transcribe-live-audio`
- **Payload**: `multipart/form-data` with recorded audio blob and `language` parameter.

### 3. Save Transcript to Archive
- **Endpoint**: `POST /api/save-transcript`
- **Payload**: `application/json`
  ```json
  {
    "transcript": "Text to save",
    "language": "en-US",
    "title": "Meeting Notes"
  }
  ```

### 4. List Saved Transcripts
- **Endpoint**: `GET /api/transcripts`

### 5. Health Check
- **Endpoint**: `GET /api/health`

---

## 🎓 College Viva & Presentation Defense Guide

Use these questions and answers to prepare for your project demonstration:

### Q1: What is the primary metric for evaluating an ASR system?
> **Answer**: The standard evaluation metric is **Word Error Rate (WER)**:
> $$\text{WER} = \frac{S + I + D}{N}$$
> Where:
> - $S$ = Number of word substitutions
> - $I$ = Number of word insertions
> - $D$ = Number of word deletions
> - $N$ = Total number of words in the ground-truth reference transcript  
> For phonetic languages or Devanagari script, **Character Error Rate (CER)** is also computed.

### Q2: Why is 16 kHz (16,000 Hz) the standard sampling rate in speech recognition?
> **Answer**: According to the **Nyquist-Shannon Sampling Theorem**, a bandlimited signal can be perfectly reconstructed if sampled at twice its maximum frequency ($f_s \ge 2 f_{\max}$). Intelligible human speech frequencies fall between 300 Hz and 4,000 Hz (telephony bandwidth) and up to 8,000 Hz for full clarity. A 16 kHz sampling rate captures frequencies up to 8 kHz, preserving formants (vowel resonances) and fricatives while avoiding redundant storage.

### Q3: What are MFCCs and why are they used?
> **Answer**: **Mel-Frequency Cepstral Coefficients (MFCCs)** represent the short-term power spectrum of sound. They use a non-linear Mel frequency scale approximating human ear frequency resolution (sensitive to changes at low frequencies, less sensitive at high frequencies):
> $$\text{Mel}(f) = 2595 \times \log_{10}\left(1 + \frac{f}{700}\right)$$
> Taking the Discrete Cosine Transform (DCT) decorrelates filter bank energies, producing 13–39 coefficients per frame that compress audio into compact representations for acoustic models.

### Q4: How does VoiceAI handle formats like MP3 without crashing when ffmpeg is absent?
> **Answer**: VoiceAI employs **client-side Web Audio transcoding**. The browser decodes compressed audio into raw PCM float samples using `AudioContext.decodeAudioData()`, and renders it into a 16kHz mono 16-bit PCM WAV file before uploading. This eliminates server-side conversion dependencies and ensures standard WAV input for the backend `speech_recognition.AudioFile` parser.

### Q5: How do Acoustic Models differ from Language Models?
> **Answer**:
> - **Acoustic Model (AM)**: Determines $P(\text{Acoustic Features} \mid \text{Phonemes})$. It evaluates: *"What sound was articulated?"*
> - **Language Model (LM)**: Determines $P(\text{Word Sequence})$. It evaluates: *"What sentence is grammatically and semantically probable?"* (e.g. disambiguating *"recognize speech"* from *"wreck a nice beach"*).

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).

