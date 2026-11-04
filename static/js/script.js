/**
 * VoiceAI - Automatic Speech Recognition (ASR) Platform
 * Complete Frontend Controller & Audio Processing Logic
 * - Real-Time Web Speech API Streaming
 * - Web Audio API Live Waveform Visualizer
 * - Client-side Audio Transcoder (AudioBuffer -> 16kHz Mono WAV)
 * - File Upload & Drag-and-Drop Handler
 * - Flask REST API Integration & Transcript History
 */

document.addEventListener('DOMContentLoaded', () => {
    // ============================================================
    // DOM Elements
    // ============================================================

    // Language & Mode
    const languageSelect = document.getElementById('languageSelect');
    const tabLiveBtn = document.getElementById('tabLiveBtn');
    const tabUploadBtn = document.getElementById('tabUploadBtn');
    const livePanel = document.getElementById('livePanel');
    const uploadPanel = document.getElementById('uploadPanel');
    const systemStatusPill = document.getElementById('systemStatusPill');

    // Live Recording Elements
    const mainMicBtn = document.getElementById('mainMicBtn');
    const mainMicIcon = document.getElementById('mainMicIcon');
    const micPulseRing = document.getElementById('micPulseRing');
    const startRecBtn = document.getElementById('startRecBtn');
    const stopRecBtn = document.getElementById('stopRecBtn');
    const recStatusBadge = document.getElementById('recStatusBadge');
    const recStatusDot = document.getElementById('recStatusDot');
    const recStatusText = document.getElementById('recStatusText');
    const recordingTimer = document.getElementById('recordingTimer');
    const visualizerCanvas = document.getElementById('visualizerCanvas');
    const visualizerOverlay = document.getElementById('visualizerOverlay');
    const recAudioPreview = document.getElementById('recAudioPreview');
    const recordedAudioPlayer = document.getElementById('recordedAudioPlayer');
    const discardRecBtn = document.getElementById('discardRecBtn');
    const retranscribeRecBtn = document.getElementById('retranscribeRecBtn');
    const asrModeRadios = document.querySelectorAll('input[name="asrMode"]');

    // Upload Elements
    const fileDropzone = document.getElementById('fileDropzone');
    const audioFileInput = document.getElementById('audioFileInput');
    const filePreviewCard = document.getElementById('filePreviewCard');
    const previewFilename = document.getElementById('previewFilename');
    const previewFilesize = document.getElementById('previewFilesize');
    const removeFileBtn = document.getElementById('removeFileBtn');
    const fileAudioPlayer = document.getElementById('fileAudioPlayer');
    const transcribeFileBtn = document.getElementById('transcribeFileBtn');
    const transcribeBtnText = document.getElementById('transcribeBtnText');
    const uploadProgressBox = document.getElementById('uploadProgressBox');
    const progressBarFill = document.getElementById('progressBarFill');
    const progressStatusText = document.getElementById('progressStatusText');
    const progressPercent = document.getElementById('progressPercent');

    // Transcript Elements
    const transcriptTextarea = document.getElementById('transcriptTextarea');
    const wordCountSpan = document.getElementById('wordCount');
    const charCountSpan = document.getElementById('charCount');
    const processDurationSpan = document.getElementById('processDuration');
    const liveTextIndicator = document.getElementById('liveTextIndicator');
    const copyTranscriptBtn = document.getElementById('copyTranscriptBtn');
    const speakTranscriptBtn = document.getElementById('speakTranscriptBtn');
    const downloadTranscriptBtn = document.getElementById('downloadTranscriptBtn');
    const saveServerBtn = document.getElementById('saveServerBtn');
    const clearTranscriptBtn = document.getElementById('clearTranscriptBtn');
    const transcriptMetaBox = document.getElementById('transcriptMetaBox');
    const metaLangInfo = document.getElementById('metaLangInfo');
    const metaEngineInfo = document.getElementById('metaEngineInfo');
    const metaTimestamp = document.getElementById('metaTimestamp');

    // History Modal Elements
    const openHistoryBtn = document.getElementById('openHistoryBtn');
    const navHistoryCount = document.getElementById('navHistoryCount');
    const historyModalBackdrop = document.getElementById('historyModalBackdrop');
    const closeHistoryModal = document.getElementById('closeHistoryModal');
    const closeHistoryBtn = document.getElementById('closeHistoryBtn');
    const historyListContainer = document.getElementById('historyListContainer');
    const clearAllHistoryBtn = document.getElementById('clearAllHistoryBtn');
    const toastContainer = document.getElementById('toastContainer');

    // ============================================================
    // State Variables
    // ============================================================
    let isRecording = false;
    let audioStream = null;
    let audioContext = null;
    let analyserNode = null;
    let visualizerAnimationId = null;
    let mediaRecorder = null;
    let recordedChunks = [];
    let recordedBlob = null;
    let recordingStartTime = 0;
    let timerInterval = null;
    let selectedAudioFile = null;

    // SpeechRecognition instance (Web Speech API)
    let webSpeechRecognition = null;
    const isWebSpeechSupported = ('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window);
    let speechRecognitionActive = false;
    let interimTranscript = '';
    let finalTranscript = '';

    // SpeechSynthesis state
    let isSpeaking = false;

    // ============================================================
    // Initialization
    // ============================================================

    function init() {
        initTabs();
        initWebSpeech();
        initAudioVisualizerCanvas();
        checkBackendHealth();
        refreshHistoryCount();
        setupEventListeners();
    }

    // ============================================================
    // Tabs Navigation
    // ============================================================

    function initTabs() {
        tabLiveBtn.addEventListener('click', () => switchTab('live'));
        tabUploadBtn.addEventListener('click', () => switchTab('upload'));
    }

    function switchTab(mode) {
        if (mode === 'live') {
            tabLiveBtn.classList.add('active');
            tabUploadBtn.classList.remove('active');
            livePanel.classList.add('active');
            uploadPanel.classList.remove('active');
        } else {
            tabUploadBtn.classList.add('active');
            tabLiveBtn.classList.remove('active');
            uploadPanel.classList.add('active');
            livePanel.classList.remove('active');
        }
    }

    // ============================================================
    // Web Speech API Setup (Client-Side Streaming ASR)
    // ============================================================

    function initWebSpeech() {
        if (!isWebSpeechSupported) {
            console.warn('Web Speech API is not supported in this browser. Server ASR will be used.');
            return;
        }

        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        webSpeechRecognition = new SpeechRec();
        webSpeechRecognition.continuous = true;
        webSpeechRecognition.interimResults = true;
        webSpeechRecognition.maxAlternatives = 1;

        webSpeechRecognition.onstart = () => {
            speechRecognitionActive = true;
            liveTextIndicator.style.display = 'flex';
        };

        webSpeechRecognition.onresult = (event) => {
            let currentInterim = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const item = event.results[i];
                if (item.isFinal) {
                    finalTranscript += (finalTranscript ? ' ' : '') + item[0].transcript.trim();
                } else {
                    currentInterim += item[0].transcript;
                }
            }

            const activeText = finalTranscript + (currentInterim ? ' ' + currentInterim : '');
            transcriptTextarea.value = activeText;
            updateMetrics();
        };

        webSpeechRecognition.onerror = (event) => {
            console.warn('Web Speech recognition error:', event.error);
            if (event.error === 'not-allowed') {
                showToast('Microphone permission was denied. Please allow microphone access in your browser settings.', 'error');
            }
        };

        webSpeechRecognition.onend = () => {
            speechRecognitionActive = false;
            liveTextIndicator.style.display = 'none';
            // Automatically restart if user hasn't explicitly stopped recording
            if (isRecording && getAsrMode() === 'streaming') {
                try {
                    webSpeechRecognition.start();
                } catch (e) {
                    // Ignore restart race condition
                }
            }
        };
    }

    function getAsrMode() {
        const checkedRadio = document.querySelector('input[name="asrMode"]:checked');
        return checkedRadio ? checkedRadio.value : 'streaming';
    }

    // ============================================================
    // Real-Time Audio Visualizer (HTML5 Canvas + Web Audio API)
    // ============================================================

    function initAudioVisualizerCanvas() {
        const ctx = visualizerCanvas.getContext('2d');
        const width = visualizerCanvas.width;
        const height = visualizerCanvas.height;

        // Draw initial calm baseline
        ctx.fillStyle = '#080c14';
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
    }

    function startVisualizer() {
        if (!analyserNode) return;
        visualizerOverlay.classList.add('hidden');

        const canvas = visualizerCanvas;
        const ctx = canvas.getContext('2d');
        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        function draw() {
            if (!isRecording) return;
            visualizerAnimationId = requestAnimationFrame(draw);

            analyserNode.getByteFrequencyData(dataArray);

            ctx.fillStyle = '#080c14';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                barHeight = (dataArray[i] / 255) * canvas.height;

                // Gradient from cyan to purple
                const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
                gradient.addColorStop(0, '#0284c7');
                gradient.addColorStop(0.5, '#38bdf8');
                gradient.addColorStop(1, '#818cf8');

                ctx.fillStyle = gradient;
                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

                x += barWidth + 1;
            }
        }

        draw();
    }

    function stopVisualizer() {
        if (visualizerAnimationId) {
            cancelAnimationFrame(visualizerAnimationId);
            visualizerAnimationId = null;
        }
        visualizerOverlay.classList.remove('hidden');
        initAudioVisualizerCanvas();
    }

    // ============================================================
    // Live Voice Recording Controller
    // ============================================================

    async function startRecording() {
        try {
            // Request microphone access
            audioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            // Set up Web Audio Context for visualizer
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            audioContext = new AudioContextClass();
            const source = audioContext.createMediaStreamSource(audioStream);
            analyserNode = audioContext.createAnalyser();
            analyserNode.fftSize = 256;
            source.connect(analyserNode);

            // Set up MediaRecorder
            recordedChunks = [];
            let options = { mimeType: 'audio/webm' };
            if (!MediaRecorder.isTypeSupported('audio/webm')) {
                if (MediaRecorder.isTypeSupported('audio/mp4')) {
                    options = { mimeType: 'audio/mp4' };
                } else {
                    options = {};
                }
            }

            mediaRecorder = new MediaRecorder(audioStream, options);
            mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    recordedChunks.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const mimeType = mediaRecorder.mimeType || 'audio/webm';
                recordedBlob = new Blob(recordedChunks, { type: mimeType });
                const audioUrl = URL.createObjectURL(recordedBlob);
                recordedAudioPlayer.src = audioUrl;
                recAudioPreview.style.display = 'block';

                // If user selected Server ASR Mode, send audio to backend on stop
                if (getAsrMode() === 'server') {
                    await transcribeRecordedBlob(recordedBlob);
                }
            };

            mediaRecorder.start(250); // Slice data every 250ms
            isRecording = true;

            // Update UI State
            updateRecordingUI(true);
            startVisualizer();
            startTimer();

            // Start Web Speech API if streaming mode selected
            const mode = getAsrMode();
            if (mode === 'streaming' && isWebSpeechSupported && webSpeechRecognition) {
                webSpeechRecognition.lang = languageSelect.value;
                try {
                    webSpeechRecognition.start();
                } catch (e) {
                    console.warn('WebSpeech already started or restarting:', e);
                }
            } else if (mode === 'streaming' && !isWebSpeechSupported) {
                showToast('Streaming recognition is not supported in this browser. Server ASR will run when you click Stop.', 'warning');
            }

        } catch (err) {
            console.error('Failed to access microphone:', err);
            let msg = 'Could not access your microphone. ';
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                msg += 'Please click the camera/mic icon in your address bar and allow microphone permissions.';
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                msg += 'No microphone hardware found on your device.';
            } else {
                msg += err.message;
            }
            showToast(msg, 'error');
            resetRecordingState();
        }
    }

    function stopRecording() {
        if (!isRecording) return;
        isRecording = false;

        // Stop MediaRecorder
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }

        // Stop Web Speech API
        if (webSpeechRecognition && speechRecognitionActive) {
            try {
                webSpeechRecognition.stop();
            } catch (e) {
                console.warn(e);
            }
        }

        // Stop Audio Tracks
        if (audioStream) {
            audioStream.getTracks().forEach(track => track.stop());
            audioStream = null;
        }

        // Close AudioContext
        if (audioContext && audioContext.state !== 'closed') {
            audioContext.close().catch(() => {});
        }

        // Stop Visualizer & Timer
        stopVisualizer();
        stopTimer();
        updateRecordingUI(false);
    }

    function updateRecordingUI(active) {
        if (active) {
            mainMicBtn.classList.add('recording');
            mainMicIcon.className = 'fa-solid fa-stop';
            micPulseRing.classList.add('active');
            startRecBtn.disabled = true;
            stopRecBtn.disabled = false;
            recStatusDot.className = 'status-dot-pulse recording';
            recStatusText.textContent = 'Listening & Recording...';
            recAudioPreview.style.display = 'none';
        } else {
            mainMicBtn.classList.remove('recording');
            mainMicIcon.className = 'fa-solid fa-microphone';
            micPulseRing.classList.remove('active');
            startRecBtn.disabled = false;
            stopRecBtn.disabled = true;
            recStatusDot.className = 'status-dot-pulse';
            recStatusText.textContent = 'Recording Stopped';
        }
    }

    function resetRecordingState() {
        isRecording = false;
        updateRecordingUI(false);
        stopVisualizer();
        stopTimer();
    }

    function startTimer() {
        recordingStartTime = Date.now();
        recordingTimer.textContent = '00:00';
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
            const mins = String(Math.floor(elapsed / 60)).padStart(2, '0');
            const secs = String(elapsed % 60).padStart(2, '0');
            recordingTimer.textContent = `${mins}:${secs}`;
        }, 500);
    }

    function stopTimer() {
        clearInterval(timerInterval);
    }

    // ============================================================
    // Client-Side Audio Transcoder (AudioBuffer -> 16kHz PCM WAV)
    // Solves server-side ffmpeg/codec dependency issues completely!
    // ============================================================

    /**
     * Decode any browser-supported audio file (MP3, OGG, M4A, FLAC, WAV)
     * and convert to a clean 16kHz Mono 16-bit PCM WAV Blob.
     */
    async function convertAudioBlobTo16kHzWav(audioBlob) {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const tempCtx = new AudioContextClass();

        let decodedBuffer;
        try {
            decodedBuffer = await tempCtx.decodeAudioData(arrayBuffer);
        } finally {
            tempCtx.close().catch(() => {});
        }

        // Resample/render to 16,000 Hz Mono using OfflineAudioContext
        const targetSampleRate = 16000;
        const numChannels = 1; // Mono for optimal ASR
        const offlineCtx = new OfflineAudioContext(
            numChannels,
            Math.ceil(decodedBuffer.duration * targetSampleRate),
            targetSampleRate
        );

        const bufferSource = offlineCtx.createBufferSource();
        bufferSource.buffer = decodedBuffer;
        bufferSource.connect(offlineCtx.destination);
        bufferSource.start(0);

        const renderedBuffer = await offlineCtx.startRendering();
        return encodeWavFile(renderedBuffer);
    }

    /**
     * Encode an AudioBuffer into standard 16-bit PCM RIFF WAV format.
     */
    function encodeWavFile(audioBuffer) {
        const numChannels = audioBuffer.numberOfChannels;
        const sampleRate = audioBuffer.sampleRate;
        const samples = audioBuffer.getChannelData(0); // Mono channel
        const bufferLength = samples.length * 2; // 2 bytes per sample (16-bit)
        const wavBuffer = new ArrayBuffer(44 + bufferLength);
        const view = new DataView(wavBuffer);

        // RIFF chunk descriptor
        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + bufferLength, true); // File length - 8
        writeString(view, 8, 'WAVE');

        // FMT sub-chunk
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
        view.setUint16(20, 1, true);  // AudioFormat (1 for PCM)
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * numChannels * 2, true); // ByteRate
        view.setUint16(32, numChannels * 2, true); // BlockAlign
        view.setUint16(34, 16, true); // BitsPerSample

        // DATA sub-chunk
        writeString(view, 36, 'data');
        view.setUint32(40, bufferLength, true);

        // Write PCM 16-bit samples
        let offset = 44;
        for (let i = 0; i < samples.length; i++) {
            // Clamp float between -1.0 and 1.0
            const s = Math.max(-1, Math.min(1, samples[i]));
            // Convert to 16-bit signed integer
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            offset += 2;
        }

        return new Blob([view], { type: 'audio/wav' });
    }

    function writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }

    // ============================================================
    // Server-Side Transcription Endpoints
    // ============================================================

    /**
     * Send recorded audio to Flask /api/transcribe-live-audio
     */
    async function transcribeRecordedBlob(blob) {
        showLoadingState('Transcribing recorded audio with Google Speech API...');
        recStatusText.textContent = 'Transcribing with Google ASR...';

        try {
            // Convert blob to 16kHz WAV in the browser for highest compatibility
            let wavBlob;
            try {
                wavBlob = await convertAudioBlobTo16kHzWav(blob);
            } catch (err) {
                console.warn('Browser WAV transcoding failed, sending raw blob:', err);
                wavBlob = blob;
            }

            const formData = new FormData();
            formData.append('audio', wavBlob, 'recorded_audio.wav');
            formData.append('language', languageSelect.value);

            const response = await fetch('/api/transcribe-live-audio', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                transcriptTextarea.value = data.transcript;
                updateMetrics();
                processDurationSpan.textContent = `${data.duration}s`;
                showMetadata('Google Speech Recognition', data.language);
                showToast('Voice transcribed successfully!', 'success');
                recStatusText.textContent = 'Transcription Completed';
            } else {
                showToast(data.error || 'Transcription failed', 'error');
                recStatusText.textContent = 'Transcription Failed';
            }
        } catch (error) {
            console.error('Server transcription error:', error);
            showToast('Network error while transcribing audio. Check server connection.', 'error');
            recStatusText.textContent = 'Network Error';
        } finally {
            hideLoadingState();
        }
    }

    /**
     * Send uploaded file to Flask /api/transcribe-file
     */
    async function transcribeUploadedFile() {
        if (!selectedAudioFile) {
            showToast('Please select or upload an audio file first.', 'warning');
            return;
        }

        showUploadProgress(true, 'Preparing audio for transcription...', 15);
        transcribeFileBtn.disabled = true;
        transcribeBtnText.textContent = 'Processing Audio...';

        try {
            let fileToSend = selectedAudioFile;

            // Check if client-side 16kHz WAV transcoding is needed (e.g. for MP3/M4A/OGG)
            const ext = selectedAudioFile.name.split('.').pop().toLowerCase();
            showUploadProgress(true, `Optimizing audio (${ext.toUpperCase()} to 16kHz WAV)...`, 40);

            try {
                const wavBlob = await convertAudioBlobTo16kHzWav(selectedAudioFile);
                fileToSend = new File([wavBlob], `${selectedAudioFile.name.replace(/\.[^/.]+$/, "")}_16k.wav`, {
                    type: 'audio/wav'
                });
            } catch (convErr) {
                console.warn('Client audio pre-conversion skipped, uploading original file:', convErr);
            }

            showUploadProgress(true, 'Transcribing with Google Speech Recognition...', 70);

            const formData = new FormData();
            formData.append('audio', fileToSend);
            formData.append('language', languageSelect.value);

            const response = await fetch('/api/transcribe-file', {
                method: 'POST',
                body: formData
            });

            showUploadProgress(true, 'Finishing up...', 95);

            const data = await response.json();

            if (data.success) {
                transcriptTextarea.value = data.transcript;
                updateMetrics();
                processDurationSpan.textContent = `${data.duration}s`;
                showMetadata('Google Speech Recognition', data.language);
                showToast(`Transcribed ${data.filename} (${data.word_count} words)!`, 'success');
            } else {
                showToast(data.error || 'Audio transcription failed.', 'error');
            }
        } catch (error) {
            console.error('File transcription request error:', error);
            showToast('Failed to reach backend server. Please verify the Flask server is running.', 'error');
        } finally {
            showUploadProgress(false);
            transcribeFileBtn.disabled = false;
            transcribeBtnText.textContent = 'Transcribe Audio File';
        }
    }

    function showUploadProgress(show, message = '', percent = 0) {
        if (show) {
            uploadProgressBox.style.display = 'block';
            progressStatusText.textContent = message;
            progressBarFill.style.width = `${percent}%`;
            progressPercent.textContent = `${percent}%`;
        } else {
            uploadProgressBox.style.display = 'none';
        }
    }

    function showLoadingState(msg) {
        liveTextIndicator.style.display = 'flex';
        liveTextIndicator.querySelector('span:last-child').textContent = msg;
    }

    function hideLoadingState() {
        liveTextIndicator.style.display = 'none';
        liveTextIndicator.querySelector('span:last-child').textContent = 'Listening and transcribing live...';
    }

    // ============================================================
    // File Upload & Drag-and-Drop Handling
    // ============================================================

    function setupFileUpload() {
        // Dropzone click -> trigger hidden input
        fileDropzone.addEventListener('click', (e) => {
            if (e.target !== audioFileInput) {
                audioFileInput.click();
            }
        });

        // Input change
        audioFileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                handleFileSelection(e.target.files[0]);
            }
        });

        // Drag events
        ['dragenter', 'dragover'].forEach(eventName => {
            fileDropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                fileDropzone.classList.add('drag-over');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            fileDropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                fileDropzone.classList.remove('drag-over');
            });
        });

        fileDropzone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            if (dt && dt.files && dt.files[0]) {
                handleFileSelection(dt.files[0]);
            }
        });

        // Remove file button
        removeFileBtn.addEventListener('click', () => {
            clearSelectedFile();
        });

        // Transcribe button
        transcribeFileBtn.addEventListener('click', () => {
            transcribeUploadedFile();
        });
    }

    function handleFileSelection(file) {
        // Validate size (< 25MB)
        const maxSize = 25 * 1024 * 1024;
        if (file.size > maxSize) {
            showToast('The selected file exceeds the 25 MB limit. Please select a smaller audio clip.', 'error');
            return;
        }

        // Validate audio extension
        const validExtensions = ['wav', 'mp3', 'flac', 'ogg', 'm4a', 'webm', 'aac', 'wma'];
        const ext = file.name.split('.').pop().toLowerCase();
        if (!validExtensions.includes(ext)) {
            showToast(`Unsupported file type (.${ext}). Please upload an audio file (.wav, .mp3, .flac, .ogg, .m4a).`, 'error');
            return;
        }

        selectedAudioFile = file;
        previewFilename.textContent = file.name;
        const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
        previewFilesize.textContent = `${sizeMb} MB • ${ext.toUpperCase()}`;

        // Set audio player source
        const objectUrl = URL.createObjectURL(file);
        fileAudioPlayer.src = objectUrl;

        filePreviewCard.style.display = 'flex';
        fileDropzone.style.display = 'none';

        showToast(`Loaded ${file.name}`, 'info');
    }

    function clearSelectedFile() {
        selectedAudioFile = null;
        audioFileInput.value = '';
        fileAudioPlayer.src = '';
        filePreviewCard.style.display = 'none';
        fileDropzone.style.display = 'block';
    }

    // ============================================================
    // Transcript Management & Toolbar Actions
    // ============================================================

    function updateMetrics() {
        const text = transcriptTextarea.value.trim();
        const words = text ? text.split(/\s+/).length : 0;
        const chars = text.length;

        wordCountSpan.textContent = words;
        charCountSpan.textContent = chars;
    }

    function showMetadata(engine, lang) {
        transcriptMetaBox.style.display = 'flex';
        metaEngineInfo.innerHTML = `<i class="fa-solid fa-robot"></i> Engine: ${engine}`;
        metaLangInfo.innerHTML = `<i class="fa-solid fa-globe"></i> Language: ${lang}`;
        metaTimestamp.innerHTML = `<i class="fa-regular fa-clock"></i> ${new Date().toLocaleTimeString()}`;
    }

    // Copy to clipboard
    function copyTranscript() {
        const text = transcriptTextarea.value;
        if (!text.trim()) {
            showToast('Transcript is empty.', 'warning');
            return;
        }

        navigator.clipboard.writeText(text).then(() => {
            copyTranscriptBtn.classList.add('success');
            copyTranscriptBtn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Copied!</span>';
            showToast('Transcript copied to clipboard!', 'success');

            setTimeout(() => {
                copyTranscriptBtn.classList.remove('success');
                copyTranscriptBtn.innerHTML = '<i class="fa-regular fa-copy"></i> <span>Copy</span>';
            }, 2500);
        }).catch(err => {
            console.error('Clipboard copy failed:', err);
            showToast('Could not copy to clipboard.', 'error');
        });
    }

    // Text to Speech (Read Aloud)
    function toggleSpeechSynthesis() {
        const text = transcriptTextarea.value.trim();
        if (!text) {
            showToast('Nothing to read aloud.', 'warning');
            return;
        }

        if (!('speechSynthesis' in window)) {
            showToast('Text-to-speech is not supported in this browser.', 'warning');
            return;
        }

        if (isSpeaking) {
            window.speechSynthesis.cancel();
            isSpeaking = false;
            speakTranscriptBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i> <span>Read Aloud</span>';
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = languageSelect.value;
        utterance.rate = 1.0;

        utterance.onstart = () => {
            isSpeaking = true;
            speakTranscriptBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i> <span>Stop Reading</span>';
        };

        utterance.onend = () => {
            isSpeaking = false;
            speakTranscriptBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i> <span>Read Aloud</span>';
        };

        utterance.onerror = () => {
            isSpeaking = false;
            speakTranscriptBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i> <span>Read Aloud</span>';
        };

        window.speechSynthesis.speak(utterance);
    }

    // Export TXT
    function downloadTranscriptFile() {
        const text = transcriptTextarea.value;
        if (!text.trim()) {
            showToast('Transcript is empty.', 'warning');
            return;
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `voiceai_transcript_${timestamp}.txt`;

        const blob = new Blob([
            `====================================================\n`,
            ` VoiceAI - Automatic Speech Recognition Transcript\n`,
            ` Exported: ${new Date().toLocaleString()}\n`,
            ` Language: ${languageSelect.value}\n`,
            ` Words: ${wordCountSpan.textContent} | Chars: ${charCountSpan.textContent}\n`,
            `====================================================\n\n`,
            text
        ], { type: 'text/plain;charset=utf-8' });

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast(`Saved as ${filename}`, 'success');
    }

    // Save to History (Backend & LocalStorage)
    async function saveTranscriptToHistory() {
        const text = transcriptTextarea.value.trim();
        if (!text) {
            showToast('Cannot save an empty transcript.', 'warning');
            return;
        }

        saveServerBtn.disabled = true;
        saveServerBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Saving...</span>';

        const title = text.slice(0, 35) + (text.length > 35 ? '...' : '');

        try {
            const response = await fetch('/api/save-transcript', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transcript: text,
                    language: languageSelect.value,
                    title: title
                })
            });

            const data = await response.json();
            if (data.success) {
                showToast('Transcript saved to history archive!', 'success');
                refreshHistoryCount();
            } else {
                showToast(data.error || 'Failed to save transcript', 'error');
            }
        } catch (e) {
            console.warn('Backend save failed, saving to localStorage:', e);
            saveToLocalStorage(text, title);
            showToast('Transcript saved to local browser storage!', 'success');
            refreshHistoryCount();
        } finally {
            saveServerBtn.disabled = false;
            saveServerBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> <span>Save</span>';
        }
    }

    function saveToLocalStorage(text, title) {
        const localList = JSON.parse(localStorage.getItem('voiceai_transcripts') || '[]');
        localList.unshift({
            id: 'local_' + Date.now(),
            title: title,
            formatted_date: new Date().toLocaleString(),
            language: languageSelect.value,
            word_count: text.split(/\s+/).length,
            char_count: text.length,
            transcript: text
        });
        localStorage.setItem('voiceai_transcripts', JSON.stringify(localList.slice(0, 30)));
    }

    function clearTranscript() {
        if (!transcriptTextarea.value.trim()) return;
        if (confirm('Are you sure you want to clear the transcript?')) {
            transcriptTextarea.value = '';
            finalTranscript = '';
            interimTranscript = '';
            updateMetrics();
            processDurationSpan.textContent = '0.0s';
            transcriptMetaBox.style.display = 'none';
            showToast('Transcript cleared.', 'info');
        }
    }

    // ============================================================
    // Saved Transcripts Modal & History Management
    // ============================================================

    async function openHistoryModal() {
        historyModalBackdrop.classList.add('show');
        historyListContainer.innerHTML = '<div class="history-empty"><i class="fa-solid fa-spinner fa-spin"></i><p>Loading transcripts...</p></div>';

        try {
            const response = await fetch('/api/transcripts');
            const data = await response.json();
            let items = data.transcripts || [];

            // Merge with localStorage
            const localItems = JSON.parse(localStorage.getItem('voiceai_transcripts') || '[]');
            const allItems = [...items, ...localItems];

            renderHistoryList(allItems);
        } catch (e) {
            const localItems = JSON.parse(localStorage.getItem('voiceai_transcripts') || '[]');
            renderHistoryList(localItems);
        }
    }

    function renderHistoryList(items) {
        if (!items || items.length === 0) {
            historyListContainer.innerHTML = `
                <div class="history-empty">
                    <i class="fa-solid fa-box-open"></i>
                    <p>No saved transcripts yet. Start transcribing and hit "Save"!</p>
                </div>
            `;
            return;
        }

        historyListContainer.innerHTML = '';
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <div class="history-item-header">
                    <span class="history-item-title">${escapeHtml(item.title || 'Untitled')}</span>
                    <span><i class="fa-regular fa-clock"></i> ${item.formatted_date || 'Recent'}</span>
                </div>
                <div class="history-item-snippet">${escapeHtml(item.transcript || '')}</div>
                <div class="history-item-actions">
                    <button class="btn btn-sm btn-outline load-btn" data-id="${item.id}">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i> Load
                    </button>
                    <button class="btn btn-sm btn-outline copy-btn" data-text="${encodeURIComponent(item.transcript || '')}">
                        <i class="fa-regular fa-copy"></i> Copy
                    </button>
                    <button class="btn btn-sm btn-danger del-btn" data-id="${item.id}">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            `;

            // Load into editor
            div.querySelector('.load-btn').addEventListener('click', () => {
                transcriptTextarea.value = item.transcript || '';
                finalTranscript = item.transcript || '';
                updateMetrics();
                closeHistory();
                showToast('Loaded transcript into editor!', 'success');
            });

            // Copy
            div.querySelector('.copy-btn').addEventListener('click', (e) => {
                const text = decodeURIComponent(e.currentTarget.getAttribute('data-text'));
                navigator.clipboard.writeText(text);
                showToast('Transcript copied!', 'success');
            });

            // Delete
            div.querySelector('.del-btn').addEventListener('click', async () => {
                if (confirm('Delete this saved transcript?')) {
                    await deleteTranscriptItem(item.id);
                    div.remove();
                    refreshHistoryCount();
                }
            });

            historyListContainer.appendChild(div);
        });
    }

    async function deleteTranscriptItem(id) {
        if (id.startsWith('local_')) {
            const localList = JSON.parse(localStorage.getItem('voiceai_transcripts') || '[]');
            const filtered = localList.filter(x => x.id !== id);
            localStorage.setItem('voiceai_transcripts', JSON.stringify(filtered));
        } else {
            try {
                await fetch(`/api/transcripts/${id}`, { method: 'DELETE' });
            } catch (e) {
                console.warn(e);
            }
        }
    }

    async function clearAllHistory() {
        if (!confirm('Are you sure you want to delete ALL saved transcripts? This cannot be undone.')) {
            return;
        }

        localStorage.removeItem('voiceai_transcripts');
        try {
            const res = await fetch('/api/transcripts');
            const data = await res.json();
            for (const item of (data.transcripts || [])) {
                await fetch(`/api/transcripts/${item.id}`, { method: 'DELETE' });
            }
        } catch (e) {
            console.warn(e);
        }

        renderHistoryList([]);
        refreshHistoryCount();
        showToast('All transcript history cleared.', 'info');
    }

    function closeHistory() {
        historyModalBackdrop.classList.remove('show');
    }

    async function refreshHistoryCount() {
        let count = 0;
        try {
            const response = await fetch('/api/transcripts');
            const data = await response.json();
            count = (data.transcripts || []).length;
        } catch (e) {
            // Fallback to local
        }
        const localList = JSON.parse(localStorage.getItem('voiceai_transcripts') || '[]');
        const total = count + localList.length;
        navHistoryCount.textContent = total;
    }

    // ============================================================
    // Backend Health & Helpers
    // ============================================================

    async function checkBackendHealth() {
        try {
            const response = await fetch('/api/health');
            const data = await response.json();
            if (data.status === 'healthy') {
                systemStatusPill.innerHTML = `
                    <span class="status-dot online"></span>
                    <span class="status-text">Cloud Engine Online</span>
                `;
            }
        } catch (e) {
            systemStatusPill.innerHTML = `
                <span class="status-dot offline" style="background:#f59e0b; box-shadow:0 0 8px #f59e0b;"></span>
                <span class="status-text" style="color:#f59e0b;">Local Mode</span>
            `;
        }
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        let icon = 'fa-solid fa-circle-info';
        if (type === 'success') icon = 'fa-solid fa-circle-check';
        if (type === 'error') icon = 'fa-solid fa-triangle-exclamation';
        if (type === 'warning') icon = 'fa-solid fa-circle-exclamation';

        toast.innerHTML = `<i class="${icon}"></i> <span>${escapeHtml(message)}</span>`;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toastIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) reverse forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3800);
    }

    function escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // ============================================================
    // Event Listeners Wire-up
    // ============================================================

    function setupEventListeners() {
        // Live Mic Recording Triggers
        mainMicBtn.addEventListener('click', () => {
            if (isRecording) stopRecording();
            else startRecording();
        });

        startRecBtn.addEventListener('click', startRecording);
        stopRecBtn.addEventListener('click', stopRecording);

        discardRecBtn.addEventListener('click', () => {
            recordedAudioPlayer.src = '';
            recAudioPreview.style.display = 'none';
            recordedBlob = null;
        });

        retranscribeRecBtn.addEventListener('click', () => {
            if (recordedBlob) {
                transcribeRecordedBlob(recordedBlob);
            }
        });

        // Language Select Change
        languageSelect.addEventListener('change', () => {
            if (webSpeechRecognition && speechRecognitionActive) {
                webSpeechRecognition.lang = languageSelect.value;
            }
            showToast(`Language set to ${languageSelect.options[languageSelect.selectedIndex].text}`, 'info');
        });

        // Textarea changes
        transcriptTextarea.addEventListener('input', updateMetrics);

        // Toolbar Buttons
        copyTranscriptBtn.addEventListener('click', copyTranscript);
        speakTranscriptBtn.addEventListener('click', toggleSpeechSynthesis);
        downloadTranscriptBtn.addEventListener('click', downloadTranscriptFile);
        saveServerBtn.addEventListener('click', saveTranscriptToHistory);
        clearTranscriptBtn.addEventListener('click', clearTranscript);

        // History Modal
        openHistoryBtn.addEventListener('click', openHistoryModal);
        closeHistoryModal.addEventListener('click', closeHistory);
        closeHistoryBtn.addEventListener('click', closeHistory);
        clearAllHistoryBtn.addEventListener('click', clearAllHistory);
        historyModalBackdrop.addEventListener('click', (e) => {
            if (e.target === historyModalBackdrop) closeHistory();
        });

        // File Upload
        setupFileUpload();
    }

    // Start App
    init();
});

