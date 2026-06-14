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
        self.tts_engine = None
        self.is_listening = False
        self.listening_thread = None
        self.speech_queue = queue.Queue()
        
        self.init_tts()

    def init_tts(self):
        """Initialise Windows SAPI5 Speech Engine."""
        global PYTTSX3_AVAILABLE
        if PYTTSX3_AVAILABLE:
            try:
                # SAPI5 is the default on Windows
                self.tts_engine = pyttsx3.init('sapi5')
                self.tts_engine.setProperty('rate', TTS_RATE)
                self.tts_engine.setProperty('volume', TTS_VOLUME)
                
                # Try setting to a male/futuristic voice if available
                voices = self.tts_engine.getProperty('voices')
                for voice in voices:
                    if "david" in voice.name.lower() or "zira" in voice.name.lower():
                        self.tts_engine.setProperty('voice', voice.id)
                        break
            except Exception as e:
                print(f"Failed to load pyttsx3 voice engine: {e}")
                PYTTSX3_AVAILABLE = False

    def speak(self, text: str):
        """Speak text using SAPI5 TTS engine, run in separate thread to avoid blocking FastAPI."""
        print(f"JARVIS speaking: {text}")
        if PYTTSX3_AVAILABLE and self.tts_engine:
            def _speak():
                try:
                    self.tts_engine.say(text)
                    self.tts_engine.runAndWait()
                except Exception as e:
                    print(f"TTS execution error: {e}")
            t = threading.Thread(target=_speak, daemon=True)
            t.start()
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
        # High energy threshold to avoid activating on soft noise
        r.energy_threshold = 4000
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
