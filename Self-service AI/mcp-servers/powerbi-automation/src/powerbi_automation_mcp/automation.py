"""
Power BI Desktop automation using pywinauto
"""

import os
import time
import subprocess
from pathlib import Path
from typing import Optional, Dict, Any
import psutil
from PIL import Image
import io
import base64

try:
    from pywinauto import Application
    from pywinauto.findwindows import ElementNotFoundError
    import win32gui
    import win32con
    WINDOWS_AVAILABLE = True
except ImportError:
    WINDOWS_AVAILABLE = False


class PowerBIAutomation:
    """Handles Power BI Desktop automation"""

    def __init__(self):
        if not WINDOWS_AVAILABLE:
            raise RuntimeError("Windows automation libraries not available (pywinauto, pywin32)")

        self.app: Optional[Application] = None
        self.process: Optional[psutil.Process] = None
        self.window_handle: Optional[int] = None

    def find_powerbi_executable(self) -> Optional[str]:
        """Find Power BI Desktop executable in common locations"""
        common_paths = [
            r"C:\Program Files\Microsoft Power BI Desktop\bin\PBIDesktop.exe",
            r"C:\Program Files (x86)\Microsoft Power BI Desktop\bin\PBIDesktop.exe",
            os.path.expanduser(r"~\AppData\Local\Microsoft\WindowsApps\PBIDesktop.exe"),
        ]

        for path in common_paths:
            if os.path.exists(path):
                return path

        # Check Microsoft Store installation (WindowsApps)
        windowsapps_base = r"C:\Program Files\WindowsApps"
        if os.path.exists(windowsapps_base):
            try:
                for item in os.listdir(windowsapps_base):
                    if item.startswith("Microsoft.MicrosoftPowerBIDesktop"):
                        pbi_path = os.path.join(windowsapps_base, item, "bin", "pbidesktop.exe")
                        if os.path.exists(pbi_path):
                            return pbi_path
            except (PermissionError, OSError):
                pass

        return None

    def launch_powerbi(self, pbip_path: str, timeout: int = 60) -> Dict[str, Any]:
        """
        Launch Power BI Desktop with a PBIP file

        Args:
            pbip_path: Path to .pbip file
            timeout: Seconds to wait for Power BI to load

        Returns:
            Dict with success status and details
        """
        pbip_path = os.path.abspath(pbip_path)

        if not os.path.exists(pbip_path):
            return {
                "success": False,
                "error": f"PBIP file not found: {pbip_path}"
            }

        # Find Power BI executable
        pbi_exe = self.find_powerbi_executable()
        if not pbi_exe:
            return {
                "success": False,
                "error": "Power BI Desktop executable not found"
            }

        try:
            # Launch Power BI with file
            process = subprocess.Popen([pbi_exe, pbip_path])
            self.process = psutil.Process(process.pid)

            # Wait for window to appear
            time.sleep(5)

            # Find Power BI window
            window_title = os.path.basename(pbip_path).replace('.pbip', '')
            max_attempts = timeout // 2

            for attempt in range(max_attempts):
                try:
                    self.app = Application(backend="uia").connect(process=process.pid, timeout=5)

                    # Try to find main window
                    windows = [w for w in self.app.windows() if window_title in w.window_text()]
                    if windows:
                        self.window_handle = windows[0].handle
                        break

                except Exception:
                    pass

                time.sleep(2)

            if not self.window_handle:
                return {
                    "success": False,
                    "error": "Could not find Power BI window after launch"
                }

            # Wait for ready state (no progress indicators)
            self.wait_for_ready(timeout=timeout)

            return {
                "success": True,
                "pid": process.pid,
                "window_handle": self.window_handle,
                "file": pbip_path
            }

        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to launch Power BI: {str(e)}"
            }

    def is_powerbi_running(self) -> bool:
        """Check if Power BI instance is still running"""
        # First check if we have a tracked process
        if self.process:
            try:
                if self.process.is_running() and self.process.status() != psutil.STATUS_ZOMBIE:
                    return True
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass

        # Check if any Power BI process is running
        for proc in psutil.process_iter(['name']):
            try:
                if proc.info['name'] and proc.info['name'].lower() == 'pbidesktop.exe':
                    return True
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue

        return False

    def wait_for_ready(self, timeout: int = 30) -> bool:
        """
        Wait until Power BI is ready (data loaded, no progress indicators)

        Returns:
            True if ready, False if timeout
        """
        start_time = time.time()

        while time.time() - start_time < timeout:
            # Simple heuristic: wait for window to be responsive
            # TODO: Could check for specific UI elements indicating loading
            time.sleep(2)

            if not self.is_powerbi_running():
                return False

            # If we've waited at least 10 seconds, assume ready
            if time.time() - start_time > 10:
                return True

        return time.time() - start_time < timeout

    def save_current_file(self) -> Dict[str, Any]:
        """
        Save the current Power BI file (Ctrl+S)

        Returns:
            Dict with success status
        """
        if not self.app or not self.window_handle:
            return {
                "success": False,
                "error": "No Power BI instance connected"
            }

        try:
            window = self.app.window(handle=self.window_handle)
            window.set_focus()
            time.sleep(0.5)

            # Send Ctrl+S
            window.type_keys("^s")
            time.sleep(2)

            return {
                "success": True,
                "message": "Save command sent"
            }

        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to save: {str(e)}"
            }

    def close_powerbi(self, save: bool = True) -> Dict[str, Any]:
        """
        Close Power BI Desktop

        Args:
            save: Whether to save before closing

        Returns:
            Dict with success status
        """
        if not self.is_powerbi_running():
            return {
                "success": True,
                "message": "Power BI not running"
            }

        try:
            if save:
                self.save_current_file()
                time.sleep(1)

            # Close window
            if self.window_handle:
                try:
                    win32gui.PostMessage(self.window_handle, win32con.WM_CLOSE, 0, 0)
                except Exception:
                    pass

            # Wait for process to end
            if self.process:
                try:
                    self.process.wait(timeout=10)
                except psutil.TimeoutExpired:
                    # Force kill if needed
                    self.process.kill()

            self.app = None
            self.window_handle = None
            self.process = None

            return {
                "success": True,
                "message": "Power BI closed"
            }

        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to close: {str(e)}"
            }

    def take_screenshot(self, page_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Take a screenshot of Power BI Desktop

        Args:
            page_name: Optional specific page to screenshot

        Returns:
            Dict with success status and base64-encoded image
        """
        if not self.window_handle:
            return {
                "success": False,
                "error": "No Power BI window available"
            }

        try:
            # Get window bounds
            left, top, right, bottom = win32gui.GetWindowRect(self.window_handle)
            width = right - left
            height = bottom - top

            # Capture window
            import win32ui
            import win32gui
            from ctypes import windll

            # Get device contexts
            hwndDC = win32gui.GetWindowDC(self.window_handle)
            mfcDC = win32ui.CreateDCFromHandle(hwndDC)
            saveDC = mfcDC.CreateCompatibleDC()

            # Create bitmap
            saveBitMap = win32ui.CreateBitmap()
            saveBitMap.CreateCompatibleBitmap(mfcDC, width, height)
            saveDC.SelectObject(saveBitMap)

            # Capture
            result = windll.user32.PrintWindow(self.window_handle, saveDC.GetSafeHdc(), 3)

            # Convert to PIL Image
            bmpinfo = saveBitMap.GetInfo()
            bmpstr = saveBitMap.GetBitmapBits(True)
            img = Image.frombuffer(
                'RGB',
                (bmpinfo['bmWidth'], bmpinfo['bmHeight']),
                bmpstr, 'raw', 'BGRX', 0, 1
            )

            # Clean up
            win32gui.DeleteObject(saveBitMap.GetHandle())
            saveDC.DeleteDC()
            mfcDC.DeleteDC()
            win32gui.ReleaseDC(self.window_handle, hwndDC)

            # Convert to base64
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            img_base64 = base64.b64encode(buffer.getvalue()).decode()

            return {
                "success": True,
                "image": img_base64,
                "width": width,
                "height": height,
                "format": "PNG"
            }

        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to take screenshot: {str(e)}"
            }

    def refresh_data(self) -> Dict[str, Any]:
        """
        Refresh all data in the report

        Returns:
            Dict with success status
        """
        if not self.app or not self.window_handle:
            return {
                "success": False,
                "error": "No Power BI instance connected"
            }

        try:
            window = self.app.window(handle=self.window_handle)
            window.set_focus()
            time.sleep(0.5)

            # Send refresh command (Alt+F5 or Home ribbon > Refresh)
            # Using Home ribbon approach
            window.type_keys("%h")  # Alt+H for Home ribbon
            time.sleep(0.5)
            window.type_keys("r")   # R for Refresh

            return {
                "success": True,
                "message": "Refresh initiated"
            }

        except Exception as e:
            return {
                "success": False,
                "error": f"Failed to refresh: {str(e)}"
            }

    def get_current_page(self) -> Dict[str, Any]:
        """
        Get the name of the currently active page

        Returns:
            Dict with page name if available
        """
        # This is challenging without OCR or accessibility APIs
        # For now, return a placeholder
        return {
            "success": False,
            "error": "Page detection not yet implemented - requires OCR or accessibility API access"
        }

    def switch_to_page(self, page_name: str) -> Dict[str, Any]:
        """
        Switch to a specific page by name

        Args:
            page_name: Display name of the page

        Returns:
            Dict with success status
        """
        # Would require finding and clicking page tab
        # Challenging without accessibility tree navigation
        return {
            "success": False,
            "error": "Page switching not yet implemented - requires accessibility API access to find page tabs"
        }
