# Backend Troubleshooting (Windows / PyMuPDF)

This project uses **PyMuPDF (fitz)** for PDF parsing. If the backend falls back to placeholder extraction, the `/health` endpoint will report:

```json
{
  "pdf_engine": "fallback",
  "fitz_available": false,
  "fitz_error": "<dll error>"
}
```

## 1. Fast Status Check
```
GET /health
```
Fields:
- `pdf_engine`: `fitz` (normal) or `fallback` (degraded)
- `fitz_error`: Import / DLL error message if degraded

## 2. Common Causes of DLL Load Failures
| Cause | Symptom | Fix |
|-------|---------|-----|
| Missing VC++ Runtime | ImportError `_extra` | Install VC++ x64 runtime |
| Mixed 32/64-bit | Still fails after reinstall | Ensure 64-bit Python + 64-bit wheel |
| Multiple Python installs | `where python` shows many | Use virtual env / correct interpreter |
| Corrupted cache | Reinstall didn’t help | `pip cache purge` then reinstall |
| Antivirus quarantine | `_extra.pyd` missing | Restore / whitelist folder |

## 3. Repair Steps (Run in Order)
```powershell
# (1) Install / Repair Visual C++ runtime
# Download: https://aka.ms/vs/17/release/vc_redist.x64.exe

# (2) Clean uninstall + purge
pip uninstall -y pymupdf PyMuPDF
pip cache purge

# (3) Reinstall pinned version compatible with other deps
pip install --no-cache-dir PyMuPDF==1.24.9

# (4) Verify
python -c "import fitz; print('FITZ OK', fitz.VersionBind)"
```

If still failing:
```powershell
# (5) Create isolated virtual environment
ython -m venv .venv
.\.venv\Scripts\Activate
pip install --upgrade pip
pip install -r requirements.txt
python -c "import fitz; print('VENV OK', fitz.VersionBind)"
```

## 4. Architecture Check
```powershell
python -c "import platform; print(platform.architecture())"  # Expect ('64bit', ...)
where python
where pip
```
If Python is 32-bit, install 64-bit from python.org and recreate environment.

## 5. Inspect Installed Files
```powershell
$mod = "$env:APPDATA\Python\Python312\site-packages\pymupdf"
dir $mod
```
Must contain `_extra.*.pyd` and `_mupdf.pyd`.

## 6. Antivirus / EDR
If `_extra.pyd` vanished post-install: mark folder safe, reinstall.

## 7. Optional Conda Route
```powershell
conda create -n pdfenv python=3.12 pymupdf=1.24.9 -c conda-forge
conda activate pdfenv
pip install -r requirements.txt
```

## 8. Fallback Mode Behavior
- Placeholder images with warning text.
- Markdown includes "Fallback Mode" label.
- Confidence set to 0.2.
- No real layout or OCR.

## 9. Upgrading PyMuPDF Later
When constraints allow:
```powershell
pip install --upgrade PyMuPDF
```
Always re-run `/health` afterwards.

## 10. Getting Help
Provide:
- Output of `/health`
- `python -V` and architecture
- List of files in pymupdf directory
- Full traceback from import failure

---
Maintained automatically—update if dependency versions change.
