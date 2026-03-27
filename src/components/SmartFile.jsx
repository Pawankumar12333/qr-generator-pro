import { useState, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import JSZip from "jszip";

export default function SmartFile() {
  const [loading, setLoading] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState("");
  const [isPaused, setIsPaused] = useState(false);

  const abortControllerRef = useRef(null);
  const currentFileRef = useRef(null);
  const currentChunkRef = useRef(0);

  const backendURL = "https://qr-gallery-backend.onrender.com";
  const CHUNK_SIZE = 1024 * 1024; // 1MB chunks

  // ✅ Stop/Reset Function
  const stopProcess = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setLoading(false);
    setIsPaused(false);
    setProgress("");
    currentChunkRef.current = 0;
    alert("❌ Process stopped.");
  };

  // ✅ Resumable Upload Logic
  const uploadInChunks = async (file) => {
    currentFileRef.current = file;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    setLoading(true);
    setIsPaused(false);

    for (let i = currentChunkRef.current; i < totalChunks; i++) {
      if (abortControllerRef.current?.signal.aborted) return;

      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      const formData = new FormData();
      formData.append("chunk", chunk);
      formData.append("chunkIndex", i);
      formData.append("totalChunks", totalChunks);
      formData.append("fileName", file.name);

      try {
        setProgress(`📤 Uploading... ${Math.round((i / totalChunks) * 100)}%`);
        
        abortControllerRef.current = new AbortController();
        const response = await fetch(`${backendURL}/api/upload-chunk`, {
          method: "POST",
          body: formData,
          signal: abortControllerRef.current.signal,
        });

        const data = await response.json();
        currentChunkRef.current = i + 1;

        if (data.url) {
          setQrData({ url: data.url, name: file.name, size: file.size, mimetype: file.type });
          setLoading(false);
          currentChunkRef.current = 0;
          return;
        }
      } catch (err) {
        if (err.name === "AbortError") {
          setIsPaused(true);
          return;
        }
        alert("Upload failed: " + err.message);
        setLoading(false);
        return;
      }
    }
  };

  // ✅ Pause/Resume Trigger
  const handleTogglePause = () => {
    if (!isPaused) {
      abortControllerRef.current.abort(); // Pause by aborting
      setProgress("⏸️ Paused");
    } else {
      uploadInChunks(currentFileRef.current); // Resume
    }
  };

  const handleFileUpload = (file) => uploadInChunks(file);

  const handleFolderUpload = async (files) => {
    setLoading(true);
    try {
      setProgress("📦 Zipping folder...");
      const zip = new JSZip();
      const folderName = files[0].webkitRelativePath.split("/")[0];
      for (const file of files) {
        zip.file(file.webkitRelativePath, await file.arrayBuffer());
      }
      const zipBlob = await zip.generateAsync({ type: "blob" }, (m) => setProgress(`📦 Zipping... ${Math.round(m.percent)}%`));
      uploadInChunks(new File([zipBlob], `${folderName}.zip`, { type: "application/zip" }));
    } catch (err) {
      alert("Zip failed: " + err.message);
      setLoading(false);
    }
  };

  const handleInputChange = (e, isFolder = false) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    isFolder ? handleFolderUpload(files) : handleFileUpload(files[0]);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;
    files.length === 1 && !files[0].webkitRelativePath ? handleFileUpload(files[0]) : handleFolderUpload(files);
  };

  const downloadQR = () => {
    const canvas = document.querySelector(".sf-qr-box canvas");
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `QR_${qrData.name}.png`;
    link.click();
  };

  const formatSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (m) => m.includes("pdf") ? "📕" : m.includes("video") ? "🎬" : m.includes("image") ? "🖼️" : m.includes("zip") ? "📦" : "📄";

  return (
    <div className="dg-container" style={{ maxWidth: "600px", margin: "auto", fontFamily: "sans-serif" }}>
      <h1 style={{ textAlign: "center", color: "#333" }}>Smart File QR 📁</h1>
      <p style={{ textAlign: "center", color: "orange", fontSize: "13px" }}>⏱️ Files delete after 24 hours.</p>

      {qrData && (
        <div style={{ textAlign: "center", padding: "20px", background: "#f9f9f9", borderRadius: "15px", border: "1px solid #ddd" }}>
          <div className="sf-qr-box" style={{ background: "white", padding: "15px", borderRadius: "10px", display: "inline-block" }}>
            <QRCodeCanvas value={qrData.url} size={200} includeMargin />
            <p style={{ margin: "10px 0 5px", fontWeight: "bold" }}>{getFileIcon(qrData.mimetype)} {qrData.name}</p>
            <p style={{ fontSize: "12px", color: "#666" }}>Size: {formatSize(qrData.size)}</p>
          </div>
          <div style={{ marginTop: "20px", display: "flex", gap: "10px", justifyContent: "center" }}>
            <button onClick={downloadQR} style={{ background: "#4CAF50", color: "white", padding: "10px 15px", border: "none", borderRadius: "8px", cursor: "pointer" }}>⬇️ Download QR</button>
            <button onClick={() => { navigator.clipboard.writeText(qrData.url); alert("Link Copied!"); }} style={{ background: "#2196F3", color: "white", padding: "10px 15px", border: "none", borderRadius: "8px", cursor: "pointer" }}>🔗 Copy Link</button>
            <button onClick={() => setQrData(null)} style={{ background: "#f44336", color: "white", padding: "10px 15px", border: "none", borderRadius: "8px", cursor: "pointer" }}>➕ New Upload</button>
          </div>
        </div>
      )}

      {!qrData && !loading && (
        <>
          <div onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop} onClick={() => document.getElementById('dropZoneInput').click()} style={{ border: `2px dashed ${dragOver ? "#4CAF50" : "#ccc"}`, padding: "40px", borderRadius: "15px", textAlign: "center", cursor: "pointer", background: dragOver ? "#f0fdf4" : "#fafafa" }}>
            <p style={{ fontSize: "40px" }}>📤</p>
            <p>Click or Drag & Drop File/Folder</p>
            <input id="dropZoneInput" type="file" style={{ display: "none" }} onChange={(e) => handleInputChange(e, false)} />
          </div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "20px" }}>
            <label style={{ background: "#333", color: "white", padding: "12px 20px", borderRadius: "8px", cursor: "pointer" }}>📄 File <input type="file" style={{ display: "none" }} onChange={(e) => handleInputChange(e, false)} /></label>
            <label style={{ background: "#333", color: "white", padding: "12px 20px", borderRadius: "8px", cursor: "pointer" }}>📁 Folder <input type="file" webkitdirectory="true" directory="true" multiple style={{ display: "none" }} onChange={(e) => handleInputChange(e, true)} /></label>
          </div>
        </>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <div className="spinner" style={{ border: "4px solid #f3f3f3", borderTop: "4px solid #3498db", borderRadius: "50%", width: "40px", height: "40px", animation: "spin 1s linear infinite", margin: "auto" }}></div>
          <p style={{ marginTop: "15px", fontWeight: "bold" }}>{progress}</p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "20px" }}>
            <button onClick={handleTogglePause} style={{ background: isPaused ? "#2196F3" : "#FF9800", color: "#fff", padding: "10px 25px", border: "none", borderRadius: "5px", cursor: "pointer" }}>
              {isPaused ? "▶️ Resume" : "⏸️ Pause"}
            </button>
            <button onClick={stopProcess} style={{ background: "#000", color: "#fff", padding: "10px 25px", border: "none", borderRadius: "5px", cursor: "pointer" }}>🛑 Kill Process</button>
          </div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  );
}