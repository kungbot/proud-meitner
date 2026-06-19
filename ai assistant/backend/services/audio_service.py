import os
import threading
import queue
import time
from backend.config import TTS_RATE, TTS_VOLUME, WAKE_WORDS

# Try importing speech modules
SPEECH_RECOGNITION_AVAILABLE = False
try:
    import speech_recognition as sr
    import pyaudio
    SPEECH_RECOGNITION_AVAILABLE = True
except ImportError:
    print("speech_recognition or pyaudio library not installed. Speech input will be simulated or unavailable.")

PYTTSX3_AVAILABLE = False
try:
    import pyttsx3
    PYTTSX3_AVAILABLE = True
except ImportError:
    print("pyttsx3 library not installed. Text-To-Speech output will be simulated or print-only.")

class AudioService:
    def __init__(self, on_wake_word_detected=None):
        self.on_wake_word_detected = on_wake_word_detected
        self.is_listening = False
        self.listening_thread = None
        self.speech_queue = queue.Queue()
        
        # Start dedicated TTS worker thread
        self.tts_queue = queue.Queue()
        self.tts_thread = threading.Thread(target=self._tts_worker, daemon=True)
        self.tts_thread.start()

    def _tts_worker(self):
        """Dedicated background thread for executing SAPI5 TTS commands sequentially."""
        global PYTTSX3_AVAILABLE
        if not PYTTSX3_AVAILABLE:
            return
            
        import ctypes
        # Initialize COM for this thread
        ctypes.windll.ole32.CoInitialize(None)
        
        try:
            engine = pyttsx3.init('sapi5')
            engine.setProperty('rate', TTS_RATE)
            engine.setProperty('volume', TTS_VOLUME)
            
            # Try setting to a male/futuristic voice if available
            voices = engine.getProperty('voices')
            for voice in voices:
                if "david" in voice.name.lower() or "zira" in voice.name.lower():
                    engine.setProperty('voice', voice.id)
                    break
            self.tts_engine = engine
        except Exception as e:
            print(f"Failed to initialize pyttsx3 in worker thread: {e}")
            PYTTSX3_AVAILABLE = False
            return

        while True:
            try:
                text = self.tts_queue.get()
                if text is None:
                    break
                
                # Check ElevenLabs setting
                import backend.config as config
                if config.ELEVENLABS_API_KEY:
                    try:
                        import requests
                        headers = {
                            "xi-api-key": config.ELEVENLABS_API_KEY,
                            "Content-Type": "application/json"
                        }
                        data = {
                            "text": text,
                            "model_id": "eleven_monolingual_v1",
                            "voice_settings": {
                                "stability": 0.5,
                                "similarity_boost": 0.75
                            }
                        }
                        voice_id = config.ELEVENLABS_VOICE_ID or "21m00Tcm4TlvDq8ikWAM"
                        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
                        
                        response = requests.post(url, json=data, headers=headers, timeout=20)
                        if response.status_code == 200:
                            import tempfile
                            temp_dir = tempfile.gettempdir()
                            temp_file_path = os.path.join(temp_dir, f"jarvis_speak_{int(time.time())}.mp3")
                            with open(temp_file_path, "wb") as f:
                                f.write(response.content)
                                
                            ps_code = f"""
                            $player = New-Object -ComObject WMPlayer.OCX
                            $player.url = '{temp_file_path.replace("'", "''")}'
                            $player.controls.play()
                            $timeout = 250
                            while ($player.playState -ne 1 -and $timeout -gt 0) {{
                                Start-Sleep -Milliseconds 100
                                $timeout--
                            }}
                            """
                            import subprocess
                            subprocess.run(["powershell", "-Command", ps_code], capture_output=True)
                            try:
                                os.remove(temp_file_path)
                            except Exception:
                                pass
                            
                            self.tts_queue.task_done()
                            continue
                        else:
                            print(f"ElevenLabs TTS API error: {response.status_code} - {response.text}")
                    except Exception as e:
                        print(f"Failed to use ElevenLabs TTS: {e}. Falling back to pyttsx3.")

                # Fallback to local pyttsx3
                if PYTTSX3_AVAILABLE:
                    self.tts_engine.say(text)
                    self.tts_engine.runAndWait()
                self.tts_queue.task_done()
            except Exception as e:
                print(f"TTS Worker execution error: {e}")

    def speak(self, text: str):
        """Add text to the TTS queue to be spoken by the dedicated background thread."""
        print(f"JARVIS speaking: {text}")
        if PYTTSX3_AVAILABLE:
            self.tts_queue.put(text)
        else:
            print("[TTS Mode Disabled or Missing Libraries]")


    def listen_for_speech(self, timeout: int = 5) -> str:
        """Capture microphone audio and perform standard recognition."""
        if not SPEECH_RECOGNITION_AVAILABLE:
            return ""
            
        r = sr.Recognizer()
        with sr.Microphone() as source:
            r.adjust_for_ambient_noise(source, duration=0.5)
            print("Listening...")
            try:
                audio = r.listen(source, timeout=timeout, phrase_time_limit=8)
                print("Transcribing audio...")
                # Use standard Google Speech recognition (free and doesn't require setup API keys)
                text = r.recognize_google(audio)
                print(f"Recognized speech: {text}")
                return text
            except sr.WaitTimeoutError:
                print("Speech listening timed out.")
                return ""
            except sr.UnknownValueError:
                print("Could not understand audio.")
                return ""
            except Exception as e:
                print(f"Speech recognition error: {e}")
                return ""

    def start_wake_word_detection(self):
        """Background listener thread waiting for wake word."""
        if not SPEECH_RECOGNITION_AVAILABLE:
            print("Wake word detection unavailable due to missing speech_recognition.")
            return

        self.is_listening = True
        self.listening_thread = threading.Thread(target=self._wake_word_loop, daemon=True)
        self.listening_thread.start()

    def stop_wake_word_detection(self):
        self.is_listening = False

    def _wake_word_loop(self):
        """Loops continuously listening for 'Jarvis', 'hey Jarvis' or 'computer'."""
        global SPEECH_RECOGNITION_AVAILABLE
        try:
            import pyaudio
            p = pyaudio.PyAudio()
            p.get_default_input_device_info()
            p.terminate()
        except Exception as e:
            print(f"Microphone initialization failed: {e}. Disabling speech recognition.")
            SPEECH_RECOGNITION_AVAILABLE = False
            self.is_listening = False
            return

        r = sr.Recognizer()
        # Calibrate dynamically from default threshold to hear normal speech
        r.dynamic_energy_threshold = True

        while self.is_listening:
            try:
                with sr.Microphone() as source:
                    # Quick ambient adjustments
                    r.adjust_for_ambient_noise(source, duration=0.2)
                    print("[WakeWord] Listening in background...")
                    # Listen quickly for keywords
                    audio = r.listen(source, timeout=3, phrase_time_limit=3)
                    
                    try:
                        text = r.recognize_google(audio).lower()
                        print(f"[WakeWord] Spotted sound: '{text}'")
                        
                        # Match wake word
                        if any(wake in text for wake in WAKE_WORDS):
                            print("[WakeWord] MATCH DETECTED!")
                            if self.on_wake_word_detected:
                                self.on_wake_word_detected()
                    except (sr.UnknownValueError, sr.WaitTimeoutError):
                        pass
            except Exception as e:
                # Sleep a bit to prevent tight loops on errors (e.g. no microphone connected)
                time.sleep(1)
