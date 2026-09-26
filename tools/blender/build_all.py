"""
Run all Blender model generation and rendering scripts for Flame Guardian.
Usage:
  D:\\blendr\\blender.exe -b --python tools/blender/build_all.py
"""

import subprocess
import sys
import os

def run_script(script_name):
    blender_exe = sys.executable if "blender" in sys.executable.lower() else r"D:\blendr\blender.exe"
    script_path = os.path.join(os.path.dirname(__file__), script_name)
    print(f"\n========================================================")
    print(f"Running {script_name}...")
    print(f"========================================================")
    # If running inside Blender python, execute the script directly
    import runpy
    runpy.run_path(script_path, run_name="__main__")

if __name__ == "__main__":
    run_script("build_tree.py")
    run_script("build_cottage.py")
    run_script("render_combo.py")
    print("\n[ALL TRIAL MODELS BUILT AND RENDERED SUCCESSFULLY]")
