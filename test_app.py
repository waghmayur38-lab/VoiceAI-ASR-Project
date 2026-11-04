"""
VoiceAI Test Suite
Validates all Flask endpoints, template rendering, and API handlers.
"""

import io
import wave
import struct
import json
from app import app

def test_voiceai():
    print("==================================================")
    print(" Running VoiceAI Comprehensive Test Suite")
    print("==================================================")

    client = app.test_client()

    # 1. Test Home page
    res = client.get('/')
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    assert b"VoiceAI" in res.data, "Home page missing brand name"
    assert b"Transcription Studio" in res.data, "Home page missing Studio section"
    print("[PASS] 1. Home page renders correctly (Status 200)")

    # 2. Test About page
    res = client.get('/about')
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    assert b"Automatic Speech Recognition" in res.data, "About page missing title"
    assert b"College Project Viva" in res.data, "About page missing Viva section"
    print("[PASS] 2. About page renders correctly (Status 200)")

    # 3. Test Languages API
    res = client.get('/api/languages')
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data["success"] is True
    assert len(data["languages"]) >= 15
    print(f"[PASS] 3. Languages API returned {len(data['languages'])} supported languages")

    # 4. Test Health Check API
    res = client.get('/api/health')
    assert res.status_code == 200
    data = json.loads(res.data)
    assert data["status"] == "healthy"
    print(f"[PASS] 4. Health check API is healthy (Python: {data['python_version']})")

    # 5. Test Save Transcript API
    save_payload = {
        "transcript": "Hello, this is a test transcription for VoiceAI Automatic Speech Recognition.",
        "language": "en-US",
        "title": "Unit Test Sample"
    }
    res = client.post('/api/save-transcript', json=save_payload)
    assert res.status_code == 200
    save_data = json.loads(res.data)
    assert save_data["success"] is True
    file_id = save_data["file_id"]
    filename = save_data["filename"]
    print(f"[PASS] 5. Save Transcript API succeeded (Saved as {filename})")

    # 6. Test Transcripts List API
    res = client.get('/api/transcripts')
    assert res.status_code == 200
    list_data = json.loads(res.data)
    assert list_data["success"] is True
    assert len(list_data["transcripts"]) > 0
    print(f"[PASS] 6. List Transcripts API returned {len(list_data['transcripts'])} items")

    # 7. Test Download Transcript API
    res = client.get(f'/api/download-transcript/{filename}')
    assert res.status_code == 200
    assert b"Unit Test Sample" in res.data
    print("[PASS] 7. Download Transcript API downloaded file successfully")

    # 8. Test Delete Transcript API
    res = client.delete(f'/api/transcripts/{file_id}')
    assert res.status_code == 200
    del_data = json.loads(res.data)
    assert del_data["success"] is True
    print("[PASS] 8. Delete Transcript API deleted item successfully")

    # 9. Test Audio Upload Validation (Missing file)
    res = client.post('/api/transcribe-file', data={})
    assert res.status_code == 400
    print("[PASS] 9. Missing file validation rejected gracefully with 400")

    # 10. Test Audio Upload with a real WAV file
    # Generate 0.5 sec 16kHz PCM WAV in memory
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(16000)
        # 0.5s of silence
        wf.writeframes(struct.pack('<h', 0) * 8000)
    buf.seek(0)

    res = client.post(
        '/api/transcribe-file',
        data={'audio': (buf, 'sample_test.wav'), 'language': 'en-US'},
        content_type='multipart/form-data'
    )
    # Since silence has no intelligible speech or sandbox network might be limited,
    # the endpoint should catch UnknownValueError or return 422 with a clear friendly error message!
    assert res.status_code in (200, 422), f"Expected 200 or 422 for silence audio, got {res.status_code}"
    resp_json = json.loads(res.data)
    print(f"[PASS] 10. Audio file processing endpoint handled WAV file properly (Response: {resp_json.get('error', 'Success')})")

    print("==================================================")
    print(" ALL 10 TESTS PASSED SUCCESSFULLY! ")
    print("==================================================")

if __name__ == '__main__':
    test_voiceai()

