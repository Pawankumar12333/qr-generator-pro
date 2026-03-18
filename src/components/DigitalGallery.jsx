import { useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import "../App.css";

export default function DigitalGallery() {
  const [images, setImages] = useState([]); 
  const [pendingFiles, setPendingFiles] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [galleryId, setGalleryId] = useState("");
  const [selected, setSelected] = useState([]);

  // ✅ FIX: Seedha Render Backend ka URL use karein
  const backendURL = "https://qr-backend-pawan.onrender.com";

  // ✅ FIX: Image URL generate karne ka sahi tarika
  const getNetworkUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${backendURL}${url}`;
  };

  useEffect(() => {
    const path = window.location.pathname;
    if (path.includes("/view/")) {
      const id = path.split("/view/")[1];
      setGalleryId(id);
      fetchImages(id);
    }
  }, []);

  const fetchImages = async (id) => {
    try {
      setLoading(true);
      const response = await fetch(`${backendURL}/api/gallery/${id}`);
      
      if (response.status === 404) {
        alert("⚠️ Yeh QR Code expire ho chuka hai (24 Hours Limit Over)");
        window.location.href = "/";
        return;
      }

      const data = await response.json();
      if (response.ok) {
        setImages(data.images);
      }
      setLoading(false);
    } catch (err) {
      console.error("Fetch error:", err);
      setLoading(false);
    }
  };

  const handleSelectFiles = (e, isDrop = false) => {
    e.preventDefault();
    const files = isDrop ? Array.from(e.dataTransfer.files) : Array.from(e.target.files);
    
    if (!files.length) return;

    const newPreviews = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      file: file,
      previewUrl: URL.createObjectURL(file) 
    }));

    setPendingFiles(prev => [...prev, ...newPreviews]);
    
    if (!isDrop && e.target) {
        e.target.value = ''; 
    }
  };

  const removePendingFile = (id) => {
    setPendingFiles(prev => prev.filter(item => item.id !== id));
  };

  const handleGenerateOrAdd = async () => {
    if (!pendingFiles.length) {
      alert("Pehle kuch photos select karein!");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    pendingFiles.forEach((item) => formData.append("images", item.file));
    
    if (galleryId) {
      formData.append("galleryId", galleryId);
    }

    try {
      const response = await fetch(`${backendURL}/api/upload-gallery`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setGalleryId(data.galleryId);
        setImages(data.images); 
        setPendingFiles([]); 
      } else {
        alert("Upload fail: " + data.message);
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Server se connect nahi ho paaya.");
    }

    setLoading(false);
  };

  const deleteImage = async (imageId) => {
    try {
      const response = await fetch(`${backendURL}/api/gallery/${galleryId}/image/${imageId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setImages((prev) => prev.filter((img) => img.id !== imageId));
        setSelected((prev) => prev.filter((id) => id !== imageId));
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const deleteSelected = async () => {
    if (selected.length === 0) return;
    if (!window.confirm("Kya aap sach mein selected photos delete karna chahte hain?")) return;

    setLoading(true);
    for (let imageId of selected) {
      await fetch(`${backendURL}/api/gallery/${galleryId}/image/${imageId}`, {
        method: "DELETE",
      });
    }
    setImages((prev) => prev.filter((img) => !selected.includes(img.id)));
    setSelected([]); 
    setLoading(false);
  };

  const clearAll = () => {
    setImages([]);
    setPendingFiles([]);
    setGalleryId("");
    setSelected([]);
    window.history.pushState({}, "", "/");
  };

  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const forceDownload = async (imgUrl, filename) => {
    try {
      const response = await fetch(getNetworkUrl(imgUrl));
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download error:", err);
    }
  };

  const downloadSelected = () => {
    const selectedImages = images.filter((img) => selected.includes(img.id));
    if (!selectedImages.length) return;
    selectedImages.forEach((img, index) => {
      forceDownload(img.url, `QR_Gallery_${index + 1}.jpg`);
    });
  };

  const downloadAll = () => {
    if (!images.length) return;
    images.forEach((img, index) => {
      forceDownload(img.url, `QR_Gallery_${index + 1}.jpg`);
    });
  };

  const galleryURL = galleryId && images.length > 0 ? `${window.location.origin}/view/${galleryId}` : "";
  const viewMode = window.location.pathname.includes("/view/");

  return (
    <div className="dg-container">
      <h1 className="dg-title">Digital QR Gallery 🚀</h1>
      <p style={{textAlign: 'center', color: 'orange', fontSize: '13px', marginBottom: '20px'}}>
        ⏱️ Note: Photos will automatically delete after 24 hours.
      </p>

      {/* ✅ SUCCESS MODE: QR Code */}
      {!viewMode && galleryId && (
        <div style={{ textAlign: "center", marginBottom: "20px", padding: "15px", background: "#e8f5e9", borderRadius: "10px" }}>
          <div className="dg-qr-box" style={{ background: "#fff", padding: "15px", display: "inline-block", borderRadius: "10px", boxShadow: "0 4px 8px rgba(0,0,0,0.1)" }}>
            <QRCodeCanvas value={galleryURL} size={200} />
            <p style={{ marginTop: "10px", fontWeight: "bold" }}>Live QR Code</p>
          </div>
          <br/>
          <button onClick={clearAll} style={{ marginTop: "15px", padding: "8px 15px", background: "#f44336", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>
            ➕ Create New Gallery
          </button>
        </div>
      )}

      {/* ✅ SELECTION AND PREVIEW MODE */}
      {!viewMode && (
        <>
          <div 
            style={{ 
              border: "2px dashed #008CBA", padding: "20px", borderRadius: "10px", 
              marginBottom: "15px", backgroundColor: "#f9f9f9", textAlign: "center",
              cursor: "pointer"
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleSelectFiles(e, true)}
            onClick={() => document.getElementById('mainFileInput').click()} 
          >
            <p style={{ fontSize: "16px", color: "gray", marginBottom: "10px", pointerEvents: "none" }}>
              📂 <b>Photos ko yahan Drag & Drop karein</b> ya click karke select karein.
            </p>
            <input
              id="mainFileInput"
              type="file" multiple={true} accept="image/*"
              onChange={(e) => handleSelectFiles(e, false)}
              style={{ display: "none" }} 
            />
          </div>

          {pendingFiles.length > 0 && (
            <div style={{ padding: "20px", background: "#fff", borderRadius: "10px", boxShadow: "0 4px 8px rgba(0,0,0,0.1)", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                  <h3 style={{ margin: 0 }}>Ready to Upload ({pendingFiles.length} photos)</h3>
                  <button 
                    onClick={() => document.getElementById('mainFileInput').click()}
                    style={{ padding: "8px 15px", background: "#008CBA", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "14px" }}
                  >
                    ➕ Add More
                  </button>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "10px", margin: "15px 0" }}>
                {pendingFiles.map((item) => (
                  <div key={item.id} style={{ position: "relative" }}>
                    <img src={item.previewUrl} alt="preview" style={{ width: "100%", height: "100px", objectFit: "cover", borderRadius: "8px" }} />
                    <button 
                      onClick={() => removePendingFile(item.id)}
                      style={{ position: "absolute", top: "5px", right: "5px", background: "red", color: "white", border: "none", borderRadius: "50%", width: "25px", height: "25px", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center" }}
                    >X</button>
                  </div>
                ))}
              </div>

              <button 
                onClick={handleGenerateOrAdd}
                disabled={loading}
                style={{ width: "100%", padding: "15px", background: loading ? "gray" : "#4CAF50", color: "white", fontSize: "18px", fontWeight: "bold", border: "none", borderRadius: "8px", cursor: "pointer", marginTop: "10px" }}
              >
                {loading ? "Processing... ⏳" : (galleryId ? "➕ Add Photos to Live QR" : "🚀 Generate QR Code")}
              </button>
            </div>
          )}
        </>
      )}

      {/* ✅ ACTIONS */}
      {images.length > 0 && (
        <div className="dg-actions" style={{ marginTop: "20px", marginBottom: "20px", display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center" }}>
          <button onClick={downloadSelected} style={{ padding: "10px", background: "#4CAF50", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>
            ⬇️ Download Selected ({selected.length})
          </button>
          <button onClick={downloadAll} style={{ padding: "10px", background: "#008CBA", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>
            ⬇️ Download All
          </button>
          {!viewMode && selected.length > 0 && (
            <button onClick={deleteSelected} style={{ padding: "10px", background: "red", color: "white", border: "none", borderRadius: "5px", cursor: "pointer" }}>
              🗑️ Delete Selected ({selected.length})
            </button>
          )}
        </div>
      )}

      {/* ✅ GRID */}
      <div className="dg-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "15px", marginTop: "20px" }}>
        {images.map((img) => (
          <div key={img.id} className="dg-card" style={{ position: "relative", textAlign: "center" }}>
            <img 
              src={getNetworkUrl(img.url)} alt="Gallery item" onClick={() => toggleSelect(img.id)}
              style={{ width: "100%", borderRadius: "8px", cursor: "pointer", border: selected.includes(img.id) ? "4px solid #4CAF50" : "4px solid transparent", opacity: selected.includes(img.id) ? 0.8 : 1, transition: "0.2s" }} 
            />
            <input type="checkbox" checked={selected.includes(img.id)} readOnly style={{ position: "absolute", top: "10px", left: "10px", transform: "scale(1.5)", pointerEvents: "none" }} />
            {!viewMode && (
              <button onClick={() => deleteImage(img.id)} className="dg-delete" style={{ marginTop: "10px", background: "red", color: "white", border: "none", padding: "5px 15px", cursor: "pointer", borderRadius: "5px" }}>
                Delete
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}