import os
import subprocess
import psutil
import pyautogui
from PIL import Image
from backend.config import WORKSPACE_DIR

class SystemAgent:
    def __init__(self):
        self.workspace_dir = WORKSPACE_DIR
        self.current_window = {"title": "Unknown", "process": "Unknown"}
        
        # Start background window tracker thread
        import threading
        self.tracker_thread = threading.Thread(target=self._window_tracker_loop, daemon=True)
        self.tracker_thread.start()

    def lock_screen(self) -> bool:
        """Lock the Windows computer."""
        try:
            subprocess.run("rundll32.exe user32.dll,LockWorkStation", shell=True, check=True)
            return True
        except Exception as e:
            print(f"Error locking screen: {e}")
            return False

    def shutdown(self) -> bool:
        """Shutdown the computer."""
        try:
            subprocess.run("shutdown /s /t 10", shell=True, check=True)  # 10s delay to allow cancel if needed
            return True
        except Exception as e:
            print(f"Error shutting down: {e}")
            return False

    def restart(self) -> bool:
        """Restart the computer."""
        try:
            subprocess.run("shutdown /r /t 10", shell=True, check=True)
            return True
        except Exception as e:
            print(f"Error restarting: {e}")
            return False

    def sleep(self) -> bool:
        """Put the computer to sleep."""
        try:
            subprocess.run("rundll32.exe powrprof.dll,SetSuspendState 0,1,0", shell=True, check=True)
            return True
        except Exception as e:
            print(f"Error sleeping: {e}")
            return False

    def set_volume(self, level: int) -> bool:
        """Set volume level (0-100) using PowerShell code to avoid external C dependencies."""
        try:
            # We can use SndVol or simple PowerShell script to simulate volume keys or use pycaw.
            # To set to a specific level, we can run a quick PowerShell snippet that uses CoreAudio API
            # or a clean native script:
            # Here is a reliable PowerShell volume control method:
            ps_code = f"""
            $w = New-Object -ComObject WScript.Shell
            # Clear volume first (by sending Vol Down 50 times)
            for ($i = 0; $i -lt 50; $i++) {{ $w.SendKeys([char]174) }}
            # Set target volume by sending Vol Up level/2 times
            $clicks = [int]({level} / 2)
            for ($i = 0; $i -lt $clicks; $i++) {{ $w.SendKeys([char]175) }}
            """
            subprocess.run(["powershell", "-Command", ps_code], capture_output=True, check=True)
            return True
        except Exception as e:
            print(f"Error setting volume: {e}")
            return False

    def get_system_stats(self) -> dict:
        """Fetch real-time CPU, RAM, Disk, and top running processes."""
        try:
            cpu_percent = psutil.cpu_percent(interval=0.1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('C:\\')
            
            # Top 5 running processes by memory usage
            processes = []
            for proc in psutil.process_iter(['pid', 'name', 'memory_percent', 'cpu_percent']):
                try:
                    processes.append({
                        "pid": proc.info['pid'],
                        "name": proc.info['name'],
                        "memory": round(proc.info['memory_percent'] or 0, 1),
                        "cpu": round(proc.info['cpu_percent'] or 0, 1)
                    })
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    pass
            
            processes = sorted(processes, key=lambda x: x['memory'], reverse=True)[:5]
            
            return {
                "cpu": cpu_percent,
                "memory_used": round(memory.used / (1024**3), 1),
                "memory_total": round(memory.total / (1024**3), 1),
                "memory_percent": memory.percent,
                "disk_used": round(disk.used / (1024**3), 1),
                "disk_total": round(disk.total / (1024**3), 1),
                "disk_percent": disk.percent,
                "processes": processes
            }
        except Exception as e:
            print(f"Error reading system stats: {e}")
            return {"cpu": 0, "memory_percent": 0, "disk_percent": 0, "processes": []}

    def launch_app(self, app_name: str, path_or_command: str = None) -> bool:
        """Launch common desktop applications, with dynamic Start Menu search fallback."""
        try:
            app_name_clean = app_name.lower().strip()
            if not app_name_clean:
                return False
            if app_name_clean in ["chrome", "google chrome"]:
                subprocess.Popen(["cmd.exe", "/c", "start chrome"], shell=True)
                return True
            elif app_name_clean in ["code", "vs code", "visual studio code"]:
                subprocess.Popen(["cmd.exe", "/c", "code ."], shell=True, cwd=str(self.workspace_dir))
                return True
            elif app_name_clean in ["discord"]:
                subprocess.Popen(["cmd.exe", "/c", "start discord"], shell=True)
                return True
            elif app_name_clean in ["terminal", "cmd", "powershell"]:
                subprocess.Popen(["cmd.exe", "/c", "start cmd.exe"], shell=True, cwd=str(self.workspace_dir))
                return True
            
            if path_or_command:
                subprocess.Popen(path_or_command, shell=True)
                return True
                
            # Search Start Menu for a shortcut
            shortcut_path = self._find_windows_shortcut(app_name)
            if shortcut_path:
                print(f"Launching app via shortcut: {shortcut_path}")
                os.startfile(shortcut_path)
                return True
                
            # Final fallback
            subprocess.Popen(f"start {app_name}", shell=True)
            return True
        except Exception as e:
            print(f"Error launching {app_name}: {e}")
            return False

    def _find_windows_shortcut(self, app_name: str) -> str:
        """Search the Windows Start Menu programs for a shortcut matching the app name."""
        import os
        from pathlib import Path
        
        search_paths = [
            Path(os.environ.get("APPDATA", "")) / "Microsoft" / "Windows" / "Start Menu" / "Programs",
            Path(os.environ.get("ALLUSERSPROFILE", r"C:\ProgramData")) / "Microsoft" / "Windows" / "Start Menu" / "Programs"
        ]
        
        app_name_lower = app_name.lower().strip()
        if not app_name_lower:
            return None
            
        for start_path in search_paths:
            if not start_path.exists():
                continue
            for root, dirs, files in os.walk(start_path):
                for file in files:
                    if file.lower().endswith(".lnk"):
                        name_without_ext = file[:-4].lower()
                        if app_name_lower in name_without_ext or name_without_ext in app_name_lower:
                            return str(Path(root) / file)
        return None


    def close_app(self, process_name: str) -> bool:
        """Close processes by name."""
        closed = False
        try:
            for proc in psutil.process_iter(['pid', 'name']):
                if process_name.lower() in proc.info['name'].lower():
                    proc.terminate()
                    closed = True
            return closed
        except Exception as e:
            print(f"Error closing app {process_name}: {e}")
            return False

    def capture_screenshot(self, save_path: str) -> bool:
        """Capture standard screen snapshot."""
        try:
            os.makedirs(os.path.dirname(save_path), exist_ok=True)
            screenshot = pyautogui.screenshot()
            screenshot.save(save_path)
            return True
        except Exception as e:
            print(f"Error taking screenshot: {e}")
            return False
            
    def execute_terminal_command(self, cmd: str) -> str:
        """Runs custom shell command securely inside the workspace directory."""
        try:
            res = subprocess.run(
                ["powershell", "-Command", cmd],
                cwd=str(self.workspace_dir),
                capture_output=True,
                text=True,
                timeout=15
            )
            out = res.stdout if res.stdout else ""
            err = res.stderr if res.stderr else ""
            return f"Stdout:\n{out}\nStderr:\n{err}"
        except subprocess.TimeoutExpired:
            return "Execution timed out (15 seconds limit)."
        except Exception as e:
            return f"Execution error: {str(e)}"

    def get_active_window_info(self) -> dict:
        """Fetch active foreground window title and process name using Windows Win32 APIs."""
        import ctypes
        from ctypes import wintypes
        
        try:
            # Win32 API functions
            GetForegroundWindow = ctypes.windll.user32.GetForegroundWindow
            GetWindowTextLengthW = ctypes.windll.user32.GetWindowTextLengthW
            GetWindowTextW = ctypes.windll.user32.GetWindowTextW
            GetWindowThreadProcessId = ctypes.windll.user32.GetWindowThreadProcessId
            
            hwnd = GetForegroundWindow()
            if not hwnd:
                return {"title": "Unknown", "process": "Unknown"}
                
            # Get Title
            length = GetWindowTextLengthW(hwnd)
            title_buf = ctypes.create_unicode_buffer(length + 1)
            GetWindowTextW(hwnd, title_buf, length + 1)
            title = title_buf.value
            
            # Get Process Name
            pid = wintypes.DWORD()
            GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
            
            process_name = "Unknown"
            try:
                import psutil
                proc = psutil.Process(pid.value)
                process_name = proc.name()
            except Exception:
                pass
                
            return {"title": title, "process": process_name}
        except Exception:
            return {"title": "Unknown", "process": "Unknown"}

    def _window_tracker_loop(self):
        """Periodically polls the active foreground window state."""
        import time
        while True:
            try:
                self.current_window = self.get_active_window_info()
            except Exception as e:
                print(f"Error in window tracker loop: {e}")
            time.sleep(3)

    def control_media(self, action: str) -> bool:
        """Simulate media key presses on Windows (play, pause, next, prev)."""
        import ctypes
        
        VK_MEDIA_PLAY_PAUSE = 0xB3
        VK_MEDIA_NEXT_TRACK = 0xB0
        VK_MEDIA_PREV_TRACK = 0xB1
        
        mapping = {
            "play": VK_MEDIA_PLAY_PAUSE,
            "pause": VK_MEDIA_PLAY_PAUSE,
            "play_pause": VK_MEDIA_PLAY_PAUSE,
            "next": VK_MEDIA_NEXT_TRACK,
            "skip": VK_MEDIA_NEXT_TRACK,
            "prev": VK_MEDIA_PREV_TRACK,
            "previous": VK_MEDIA_PREV_TRACK
        }
        
        vk = mapping.get(action.lower().strip())
        if vk:
            try:
                # Press key
                ctypes.windll.user32.keybd_event(vk, 0, 0, 0)
                # Release key
                ctypes.windll.user32.keybd_event(vk, 0, 2, 0)
                return True
            except Exception as e:
                print(f"Error executing media control key event: {e}")
        return False

    def get_recent_workspace_changes(self) -> list:
        """Scan workspace recursively for files changed in the last 24 hours."""
        import time
        from pathlib import Path
        
        recent_files = []
        now = time.time()
        one_day = 24 * 60 * 60
        
        # Avoid scanning system files or node_modules / .git
        ignore_dirs = {".git", "node_modules", ".next", "__pycache__", "out", "dist", "build"}
        
        try:
            for root, dirs, files in os.walk(self.workspace_dir):
                # Filter out ignored directories in-place to prevent traversing them
                dirs[:] = [d for d in dirs if d not in ignore_dirs]
                
                for file in files:
                    file_path = Path(root) / file
                    try:
                        mtime = file_path.stat().st_mtime
                        if now - mtime < one_day:
                            rel_path = file_path.relative_to(self.workspace_dir)
                            recent_files.append({
                                "name": file,
                                "path": str(rel_path).replace("\\", "/"),
                                "modified_at": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(mtime))
                            })
                    except Exception:
                        pass
        except Exception as e:
            print(f"Error scanning workspace changes: {e}")
            
        # Sort by mtime descending and return top 5
        recent_files = sorted(recent_files, key=lambda x: x.get("modified_at", ""), reverse=True)
        return recent_files[:5]

    def get_weather(self, location: str = None) -> dict:
        """Fetch weather data for current location (from IP) or a specific city, without any API keys."""
        import requests
        try:
            lat, lon, city = None, None, "your location"
            if not location:
                # Get current location via ip-api
                geo_res = requests.get("http://ip-api.com/json/", timeout=5)
                if geo_res.status_code == 200:
                    geo_data = geo_res.json()
                    if geo_data.get("status") == "success":
                        lat = geo_data.get("lat")
                        lon = geo_data.get("lon")
                        city = geo_data.get("city", "your location")
            else:
                # Geocode specified city using Open-Meteo geocoding api (free, no key)
                geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={location}&count=1&language=en&format=json"
                geo_res = requests.get(geo_url, timeout=5)
                if geo_res.status_code == 200:
                    results = geo_res.json().get("results", [])
                    if results:
                        lat = results[0].get("latitude")
                        lon = results[0].get("longitude")
                        city = results[0].get("name", location)

            if lat is not None and lon is not None:
                # Query Open-Meteo for current weather
                weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true&temperature_unit=celsius"
                weather_res = requests.get(weather_url, timeout=5)
                if weather_res.status_code == 200:
                    data = weather_res.json().get("current_weather", {})
                    temp = data.get("temperature")
                    wind = data.get("windspeed")
                    code = data.get("weathercode", 0)
                    
                    # Simple weather code mapping
                    weather_desc = {
                        0: "clear sky", 1: "mainly clear", 2: "partly cloudy", 3: "overcast",
                        45: "foggy", 48: "depositing rime fog",
                        51: "light drizzle", 53: "moderate drizzle", 55: "dense drizzle",
                        61: "slight rain", 63: "moderate rain", 65: "heavy rain",
                        71: "slight snow fall", 73: "moderate snow fall", 75: "heavy snow fall",
                        77: "snow grains", 80: "slight rain showers", 81: "moderate rain showers",
                        82: "violent rain showers", 85: "slight snow showers", 86: "heavy snow showers",
                        95: "thunderstorm", 96: "thunderstorm with slight hail", 99: "thunderstorm with heavy hail"
                    }
                    condition = weather_desc.get(code, "unknown conditions")
                    
                    return {
                        "success": True,
                        "location": city,
                        "temperature": temp,
                        "wind_speed": wind,
                        "condition": condition,
                        "summary": f"The weather in {city} is currently {temp}°C with {condition}."
                    }
            return {"success": False, "error": "Could not determine location coordinates."}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def execute_git_flow(self, action: str, message: str = None) -> dict:
        """Execute automated Git operations like status, diff, commit, and push."""
        import subprocess
        from backend.utils.llm import query_llm
        cwd = self.workspace_dir
        
        try:
            if action == "status":
                res = subprocess.run("git status", shell=True, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="ignore")
                return {"success": True, "output": res.stdout or res.stderr}
            
            elif action == "diff":
                res = subprocess.run("git diff", shell=True, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="ignore")
                return {"success": True, "output": res.stdout or res.stderr}
                
            elif action in ["commit", "push", "commit_and_push"]:
                # Check status/diff first
                status_res = subprocess.run("git status --porcelain", shell=True, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="ignore")
                if not status_res.stdout.strip():
                    # No changes to commit/push
                    # Check if there are unpushed commits
                    unpushed = subprocess.run("git cherry -v", shell=True, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="ignore")
                    if action in ["push", "commit_and_push"]:
                        if unpushed.stdout.strip():
                            # We have commits to push, let's push
                            push_res = subprocess.run("git push", shell=True, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="ignore")
                            return {"success": push_res.returncode == 0, "output": f"Pushed unpushed commits.\n{push_res.stdout}\n{push_res.stderr}"}
                        else:
                            return {"success": True, "output": "Everything is up-to-date. No changes and no unpushed commits."}
                    return {"success": True, "output": "No changes to commit."}
                
                # We have changes. Let's stage them first so we can diff staged
                subprocess.run("git add -A", shell=True, cwd=cwd)
                
                # Get the staged diff to draft a commit message
                diff_res = subprocess.run("git diff --cached", shell=True, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="ignore")
                diff_text = diff_res.stdout
                
                if not message:
                    # Let's draft an AI commit message based on the diff
                    sys_prompt = "You are JARVIS. Generate a concise, clear, and professional one-line git commit message based on the provided diff. Do not include any markdown quotes, just the message."
                    user_prompt = f"Git diff:\n\n{diff_text[:4000]}"
                    message = query_llm(sys_prompt, user_prompt).strip().strip('"').strip("'")
                    if not message:
                        message = "chore: update workspace files via JARVIS"
                
                # Commit
                commit_res = subprocess.run(f'git commit -m "{message}"', shell=True, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="ignore")
                if commit_res.returncode != 0:
                    return {"success": False, "output": f"Commit failed:\n{commit_res.stdout}\n{commit_res.stderr}"}
                
                output_str = f"Committed changes with message: '{message}'\n{commit_res.stdout}"
                
                if action in ["push", "commit_and_push"]:
                    push_res = subprocess.run("git push", shell=True, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="ignore")
                    output_str += f"\nPush output:\n{push_res.stdout}\n{push_res.stderr}"
                    return {"success": push_res.returncode == 0, "output": output_str}
                
                return {"success": True, "output": output_str}
                
        except Exception as e:
            return {"success": False, "output": f"Error executing git flow: {str(e)}"}
            
        return {"success": False, "output": f"Unknown git action: {action}"}


