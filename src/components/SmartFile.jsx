import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import JSZip from "jszip";

export default function SmartFile() {
  const [loading, setLoading] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState("");

  const backendURL = "https://qr-gallery-backend.onrender.com";

  // ✅ Upload file to backend
  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${backendURL}/api/upload-file`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Upload failed");
    return data;
  };

  // ✅ Handle File Upload (direct — all types)
  const handleFileUpload = async (file) => {
    setLoading(true);
    setQrData(null);
    setProgress("📤 Uploading file...");
    try {
      const data = await uploadFile(file);
      setQrData({ url: data.url, name: file.name, type: "file", size: file.size, mimetype: file.type });
    } catch (err) {
      alert("Upload failed: " + err.message);
    }
    setLoading(false);
    setProgress("");
  };

  // ✅ Handle Folder Upload (zip first)
  const handleFolderUpload = async (files) => {
    setLoading(true);
    setQrData(null);
    try {
      setProgress("📦 Zipping folder...");
      const zip = new JSZip();
      const folderName = files[0].webkitRelativePath.split("/")[0];

      for (const file of files) {
        const relativePath = file.webkitRelativePath;
        const content = await file.arrayBuffer();
        zip.file(relativePath, content);
      }

      const zipBlob = await zip.generateAsync(
        { type: "blob" },
        (metadata) => {
          setProgress(`📦 Zipping... ${Math.round(metadata.percent)}%`);
        }
      );

      const zipFile = new File([zipBlob], `${folderName}.zip`, { type: "application/zip" });

      setProgress("📤 Uploading ZIP...");
      const data = await uploadFile(zipFile);
      setQrData({ url: data.url, name: `${folderName}.zip`, type: "folder", size: zipBlob.size, mimetype: "application/zip" });
    } catch (err) {
      alert("Folder zip failed: " + err.message);
    }
    setLoading(false);
    setProgress("");
  };

  // ✅ Handle input change
  const handleInputChange = (e, isFolder = false) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    if (isFolder) {
      handleFolderUpload(files);
    } else {
      handleFileUpload(files[0]);
    }
    e.target.value = "";
  };

  // ✅ Handle Drag & Drop
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (!files.length) return;
    if (files.length === 1) {
      handleFileUpload(files[0]);
    } else {
      handleFolderUpload(files);
    }
  };

  // ✅ Download QR
  const downloadQR = () => {
    const canvas = document.querySelector(".sf-qr-box canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `QR_${qrData.name}.png`;
    link.click();
  };

  // ✅ Copy Link
  const copyLink = () => {
    navigator.clipboard.writeText(qrData.url);
    alert("Link copied! ✅");
  };

  // ✅ Reset
  const reset = () => setQrData(null);

  // ✅ File size format
  const formatSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ✅ File icon based on type
  const getFileIcon = (mimetype = "") => {
    if (mimetype.includes("pdf")) return "📕";
    if (mimetype.includes("video")) return "🎬";
    if (mimetype.includes("image")) return "🖼️";
    if (mimetype.includes("zip") || mimetype.includes("compressed")) return "📦";
    if (mimetype.includes("word") || mimetype.includes("document")) return "📝";
    if (mimetype.includes("sheet") || mimetype.includes("excel")) return "📊";
    if (mimetype.includes("presentation") || mimetype.includes("powerpoint")) return "📊";
    if (mimetype.includes("audio")) return "🎵";
    return "📄";
  };

  return (
    <div className="dg-container">
      <h1 className="dg-title">Smart File QR 📁</h1>
      <p style={{ textAlign: "center", color: "orange", fontSize: "13px", marginBottom: "20px" }}>
        ⏱️ Files will automatically delete after 24 hours.
      </p>

      {/* ✅ QR Code Section */}
      {qrData && (
        <div style={{ textAlign: "center", marginBottom: "20px", padding: "20px", background: "#f1f8e9", borderRadius: "15px", border: "1px solid #c5e1a5" }}>
          <div className="sf-qr-box" style={{ background: "#fff", padding: "15px", display: "inline-block", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
            <QRCodeCanvas value={qrData.url} size={200} />
            <p style={{ marginTop: "10px", fontWeight: "bold", color: "#333" }}>
              {getFileIcon(qrData.mimetype)} {qrData.name}
            </p>
            {qrData.size && (
              <p style={{ color: "#888", fontSize: "12px", margin: "4px 0 0" }}>
                Size: {formatSize(qrData.size)}
              </p>
            )}
          </div>

          <div style={{ marginTop: "15px", display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
            <button onClick={downloadQR} style={{ padding: "10px 20px", background: "#4CAF50", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>
              ⬇️ Download QR
            </button>
            <button onClick={copyLink} style={{ padding: "10px 20px", background: "#2196F3", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>
              🔗 Copy Link
            </button>
            <button onClick={reset} style={{ padding: "10px 20px", background: "#ff5722", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>
              ➕ New Upload
            </button>
          </div>
        </div>
      )}

      {/* ✅ Upload Section */}
      {!qrData && (
        <>
          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragOver ? "#4CAF50" : "#008CBA"}`,
              padding: "40px",
              borderRadius: "15px",
              marginBottom: "20px",
              backgroundColor: dragOver ? "#f1f8e9" : "#fdfdfd",
              textAlign: "center",
              transition: "0.3s",
            }}
          >
            <p style={{ fontSize: "40px", margin: "0 0 10px" }}>📂</p>
            <p style={{ fontSize: "18px", color: "#555", fontWeight: "500" }}>
              Drag & Drop File or Folder here
            </p>
            <p style={{ color: "#aaa", fontSize: "13px", marginTop: "8px" }}>
              📕 PDF &nbsp;|&nbsp; 🎬 Video &nbsp;|&nbsp; 🖼️ Image &nbsp;|&nbsp; 📦 ZIP &nbsp;|&nbsp; 📝 Word &nbsp;|&nbsp; 📊 Excel &nbsp;|&nbsp; 🎵 Audio &nbsp;|&nbsp; and more
            </p>
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: "15px", justifyContent: "center", flexWrap: "wrap", marginBottom: "20px" }}>
            {/* File Upload — all types */}
            <label style={{ padding: "15px 30px", background: "#1e88e5", color: "white", borderRadius: "10px", cursor: "pointer", fontWeight: "bold", fontSize: "16px" }}>
              📄 Select File
              <input
                type="file"
                accept="*/*"
                style={{ display: "none" }}
                onChange={(e) => handleInputChange(e, false)}
              />
            </label>

            {/* Folder Upload */}
            <label style={{ padding: "15px 30px", background: "#43a047", color: "white", borderRadius: "10px", cursor: "pointer", fontWeight: "bold", fontSize: "16px" }}>
              📁 Select Folder
              <input
                type="file"
                accept="*/*"
                style={{ display: "none" }}
                webkitdirectory="true"
                directory="true"
                multiple
                onChange={(e) => handleInputChange(e, true)}
              />
            </label>
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: "center", padding: "30px" }}>
              <p style={{ fontSize: "18px", color: "#555" }}>⏳ {progress}</p>
              <div style={{ width: "50px", height: "50px", border: "5px solid #eee", borderTop: "5px solid #4CAF50", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "20px auto" }}></div>
              <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
          )}
        </>
      )}
    </div>
  );
}
