import os
import subprocess
import psutil
import pyautogui
from PIL import Image
from backend.config import WORKSPACE_DIR

class SystemAgent:
    def __init__(self):
        self.workspace_dir = WORKSPACE_DIR

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
        """Launch common desktop applications."""
        try:
            app_name = app_name.lower().strip()
            if app_name in ["chrome", "google chrome"]:
                subprocess.Popen(["cmd.exe", "/c", "start chrome"], shell=True)
            elif app_name in ["code", "vs code", "visual studio code"]:
                subprocess.Popen(["cmd.exe", "/c", "code ."], shell=True, cwd=str(self.workspace_dir))
            elif app_name in ["discord"]:
                subprocess.Popen(["cmd.exe", "/c", "start discord"], shell=True)
            elif app_name in ["terminal", "cmd", "powershell"]:
                subprocess.Popen(["cmd.exe", "/c", "start cmd.exe"], shell=True, cwd=str(self.workspace_dir))
            elif path_or_command:
                # Custom app path or command
                subprocess.Popen(path_or_command, shell=True)
            else:
                # Try starting via shell
                subprocess.Popen(f"start {app_name}", shell=True)
            return True
        except Exception as e:
            print(f"Error launching {app_name}: {e}")
            return False

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
