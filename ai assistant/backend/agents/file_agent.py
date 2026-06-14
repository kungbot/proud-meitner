import os
import shutil
import fnmatch
from pathlib import Path
from backend.config import WORKSPACE_DIR

class FileAgent:
    def __init__(self):
        self.workspace_dir = WORKSPACE_DIR

    def search_files(self, query: str, search_path: str = None) -> list:
        """Find files matching query pattern (e.g. *.pdf) in workspace or custom path."""
        target_path = Path(search_path) if search_path else self.workspace_dir
        if not target_path.exists():
            return []
        
        matches = []
        # Support glob patterns or general substring matching
        pattern = f"*{query}*" if not ("*" in query or "?" in query) else query
        
        for root, _, files in os.walk(target_path):
            # Exclude node_modules, .git, etc.
            if any(part in Path(root).parts for part in [".git", "node_modules", ".next", "__pycache__"]):
                continue
            for filename in fnmatch.filter(files, pattern):
                full_path = Path(root) / filename
                matches.append({
                    "name": filename,
                    "path": str(full_path.as_posix()),
                    "size": os.path.getsize(full_path),
                    "modified": os.path.getmtime(full_path)
                })
        return sorted(matches, key=lambda x: x['modified'], reverse=True)[:50]

    def list_directory(self, dir_path: str = None) -> list:
        """List contents of a directory."""
        target_path = Path(dir_path) if dir_path else self.workspace_dir
        if not target_path.exists() or not target_path.is_dir():
            return []
        
        contents = []
        for entry in os.scandir(target_path):
            # Ignore hidden files/folders
            if entry.name.startswith('.'):
                continue
            contents.append({
                "name": entry.name,
                "is_dir": entry.is_dir(),
                "path": str(Path(entry.path).as_posix()),
                "size": entry.stat().st_size if entry.is_file() else None
            })
        return sorted(contents, key=lambda x: (not x['is_dir'], x['name']))

    def create_file(self, file_path: str, content: str) -> bool:
        """Create a new file with text content."""
        try:
            target = Path(file_path)
            if not target.is_absolute():
                target = self.workspace_dir / target
            
            os.makedirs(target.parent, exist_ok=True)
            with open(target, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        except Exception as e:
            print(f"Error creating file {file_path}: {e}")
            return False

    def delete_file(self, file_path: str) -> bool:
        """Delete file after confirming it exists."""
        try:
            target = Path(file_path)
            if not target.is_absolute():
                target = self.workspace_dir / target
            
            if target.exists() and target.is_file():
                os.remove(target)
                return True
            return False
        except Exception as e:
            print(f"Error deleting file {file_path}: {e}")
            return False

    def rename_file(self, old_path: str, new_path: str) -> bool:
        """Rename file or folder."""
        try:
            src = Path(old_path)
            if not src.is_absolute():
                src = self.workspace_dir / src
            
            dest = Path(new_path)
            if not dest.is_absolute():
                dest = self.workspace_dir / dest
                
            if src.exists():
                os.makedirs(dest.parent, exist_ok=True)
                os.rename(src, dest)
                return True
            return False
        except Exception as e:
            print(f"Error renaming {old_path} to {new_path}: {e}")
            return False

    def move_file(self, src_path: str, dest_path: str) -> bool:
        """Move a file or folder."""
        try:
            src = Path(src_path)
            if not src.is_absolute():
                src = self.workspace_dir / src
                
            dest = Path(dest_path)
            if not dest.is_absolute():
                dest = self.workspace_dir / dest
                
            if src.exists():
                os.makedirs(dest.parent, exist_ok=True)
                shutil.move(str(src), str(dest))
                return True
            return False
        except Exception as e:
            print(f"Error moving file: {e}")
            return False

    def read_file(self, file_path: str) -> str:
        """Read text file content."""
        try:
            target = Path(file_path)
            if not target.is_absolute():
                target = self.workspace_dir / target
                
            if target.exists() and target.is_file():
                with open(target, 'r', encoding='utf-8', errors='ignore') as f:
                    return f.read(8000)  # Read up to 8000 characters
            return "File does not exist or is not a file."
        except Exception as e:
            return f"Error reading file: {e}"

    def organize_folder(self, folder_path: str) -> dict:
        """Organize files in a folder by grouping them in subfolders according to extension."""
        try:
            target = Path(folder_path)
            if not target.exists() or not target.is_dir():
                return {"success": False, "error": "Folder path does not exist."}
                
            categories = {
                "Documents": [".pdf", ".docx", ".doc", ".txt", ".xlsx", ".csv", ".pptx"],
                "Images": [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg"],
                "Audio": [".mp3", ".wav", ".m4a", ".flac"],
                "Video": [".mp4", ".mkv", ".avi", ".mov"],
                "Archives": [".zip", ".tar", ".gz", ".rar", ".7z"],
                "Code": [".py", ".js", ".ts", ".html", ".css", ".json", ".cpp", ".c", ".h"]
            }
            
            moved_counts = {}
            for entry in os.scandir(target):
                if entry.is_file():
                    ext = Path(entry.name).suffix.lower()
                    if not ext:
                        continue
                        
                    # Find category
                    matched_category = "Others"
                    for cat, extensions in categories.items():
                        if ext in extensions:
                            matched_category = cat
                            break
                            
                    dest_dir = target / matched_category
                    dest_dir.mkdir(exist_ok=True)
                    
                    shutil.move(entry.path, dest_dir / entry.name)
                    moved_counts[matched_category] = moved_counts.get(matched_category, 0) + 1
                    
            return {"success": True, "organized": moved_counts}
        except Exception as e:
            return {"success": False, "error": str(e)}
