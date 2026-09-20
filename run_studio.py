import socket
import threading
import time
import webbrowser

import uvicorn


def get_local_ip() -> str:
    """Detects active local network IP address."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except OSError:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip


def open_browser(url: str):
    time.sleep(1.2)
    try:
        webbrowser.open(url)
    except (OSError, webbrowser.Error) as e:
        print(
            f"Notice: Could not automatically open browser ({e}). Please navigate to {url}"
        )


def main():
    port = 8000
    local_ip = get_local_ip()
    local_url = f"http://localhost:{port}"
    lan_url = f"http://{local_ip}:{port}"

    banner = f"""
======================================================================
     ____ _____ _____ _____ _____ _____ _____ _____ ____  ____ _____ 
    |_   _|  _  |_   _|_   _|  _  |     |   __|     | __ || __ |  _  |
      | | |     | | |   | | | | | | | | |   __| | | | __ || __ | |_| |
      |_| |__|__| |_|   |_| |_____|_|_|_|__|  |_|_|_|____||____|_____|
                        PRO 3D WORKSTATION v2.0
======================================================================
  [+] Workstation URL (Desktop):  {local_url}
  [+] Studio Wi-Fi URL (iPad):    {lan_url}
  [+] Status:                     Active & Serving at 60 FPS PBR
======================================================================
  Ready for tattoo artists & client consultations!
  Press CTRL+C in this terminal to shut down the workstation server.
======================================================================
"""
    print(banner)

    # Launch browser on desktop
    threading.Thread(target=open_browser, args=(local_url,), daemon=True).start()

    # Start FastAPI server via uvicorn
    uvicorn.run(
        "tattooforge.server.app:app",
        host="0.0.0.0",
        port=port,
        log_level="info",
        reload=False,
    )


if __name__ == "__main__":
    main()
