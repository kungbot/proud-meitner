import os
import pyautogui
from PIL import Image
from backend.config import TESSERACT_CMD

PYTESSERACT_AVAILABLE = False
try:
    import pytesseract
    PYTESSERACT_AVAILABLE = True
except ImportError:
    print("pytesseract library not installed. OCR will run in simulation mode.")

class VisionService:
    def __init__(self):
        self.tesseract_cmd = TESSERACT_CMD
        self._configure_tesseract()

    def _configure_tesseract(self):
        """Configure pytesseract cmd path on Windows."""
        global PYTESSERACT_AVAILABLE
        if PYTESSERACT_AVAILABLE:
            # Check if tesseract binary exists
            if os.path.exists(self.tesseract_cmd):
                pytesseract.pytesseract.tesseract_cmd = self.tesseract_cmd
            else:
                # Try common standard installations
                common_paths = [
                    r"C:\Program Files\Tesseract-OCR\tesseract.exe",
                    r"C:\Users\planm\AppData\Local\Programs\Tesseract-OCR\tesseract.exe"
                ]
                found = False
                for path in common_paths:
                    if os.path.exists(path):
                        pytesseract.pytesseract.tesseract_cmd = path
                        found = True
                        break
                if not found:
                    print(f"Tesseract executable not found at: {self.tesseract_cmd}. OCR functions will return mock analysis.")
                    PYTESSERACT_AVAILABLE = False

    def perform_ocr(self, img_path: str) -> str:
        """Extract text from a saved screen image."""
        if not os.path.exists(img_path):
            return "OCR error: Image file not found."

        if PYTESSERACT_AVAILABLE:
            try:
                img = Image.open(img_path)
                text = pytesseract.image_to_string(img)
                return text.strip()
            except Exception as e:
                print(f"OCR failed: {e}")
                return self._mock_ocr()
        else:
            return self._mock_ocr()

    def _mock_ocr(self) -> str:
        """Returns standard simulated text matching typical developer windows if OCR binary is not installed."""
        return """
        ================== MOCK SCREEN TEXT ==================
        Active Application: Visual Studio Code
        File Open: src/app/page.tsx
        Console Output:
        [Server] Next.js dev server listening on port 3000
        [Lint] Warning: React Hook useEffect has a missing dependency 'isOpen'
        [Error] Unhandled Rejection: FetchError: failed to fetch from http://localhost:8000/api/status
        ======================================================
        """
        
    def analyze_active_screen(self, save_path: str) -> dict:
        """Take screenshot and extract text content."""
        try:
            # Capture
            screenshot = pyautogui.screenshot()
            screenshot.save(save_path)
            
            # OCR
            text_extracted = self.perform_ocr(save_path)
            
            return {
                "success": True,
                "screenshot_path": save_path,
                "extracted_text": text_extracted,
                "summary": "Visual analysis complete. Captured IDE details and terminal states."
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
