import { useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import "../App.css";

export default function DigitalGallery() {
  const [images, setImages] = useState([]); 
  const [pendingFiles, setPendingFiles] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [galleryId, setGalleryId] = useState("");
  const [selected, setSelected] = useState([]);

  // ✅ Backend URL
  const backendURL = "https://qr-gallery-backend.onrender.com";

  // ✅ Image URL Fix
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
        alert("⚠️ Your  QR Code expired Over  (24 Hours Limit Over)");
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

  // ✅ QR Code Download Function
  const downloadGalleryQR = () => {
    const canvas = document.querySelector(".dg-qr-box canvas");
    if (!canvas) {
      alert("QR Code Not Founded!");
      return;
    }
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `Gallery_QR_${galleryId}.png`;
    link.click();
  };

  // ✅ Copy Link Function
  const copyGalleryLink = () => {
    navigator.clipboard.writeText(galleryURL);
    alert("Link copied ! You can share Anybody. ✅");
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
    if (!isDrop && e.target) { e.target.value = ''; }
  };

  const removePendingFile = (id) => {
    setPendingFiles(prev => prev.filter(item => item.id !== id));
  };

  const handleGenerateOrAdd = async () => {
    if (!pendingFiles.length) {
      alert(" Please select Some photo !");
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
      alert("Server Faield Please Cheack .");
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
    if (!window.confirm("Sure you want to delete ?")) return;

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

      {/* ✅ QR Code Section with Download & Share */}
      {!viewMode && galleryId && (
        <div style={{ textAlign: "center", marginBottom: "20px", padding: "20px", background: "#f1f8e9", borderRadius: "15px", border: "1px solid #c5e1a5" }}>
          <div className="dg-qr-box" style={{ background: "#fff", padding: "15px", display: "inline-block", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
            <QRCodeCanvas value={galleryURL} size={200} />
            <p style={{ marginTop: "10px", fontWeight: "bold", color: "#333" }}>Aapka Live QR Code</p>
          </div>
          
          <div style={{ marginTop: "15px", display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
            <button onClick={downloadGalleryQR} style={{ padding: "10px 20px", background: "#4CAF50", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>
              ⬇️ Download QR
            </button>
            <button onClick={copyGalleryLink} style={{ padding: "10px 20px", background: "#2196F3", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>
              🔗 Copy Link
            </button>
            <button onClick={clearAll} style={{ padding: "10px 20px", background: "#ff5722", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>
              ➕ New Gallery
            </button>
          </div>
        </div>
      )}

      {/* ✅ Selection Mode */}
      {!viewMode && (
        <>
          <div 
            style={{ 
              border: "2px dashed #008CBA", padding: "30px", borderRadius: "15px", 
              marginBottom: "20px", backgroundColor: "#fdfdfd", textAlign: "center",
              cursor: "pointer", transition: "0.3s"
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleSelectFiles(e, true)}
            onClick={() => document.getElementById('mainFileInput').click()} 
          >
            <p style={{ fontSize: "18px", color: "#555", fontWeight: "500" }}>
              📸 Click here or Drag Photos to Upload
            </p>
            <input
              id="mainFileInput"
              type="file" multiple={true} accept="image/*"
              onChange={(e) => handleSelectFiles(e, false)}
              style={{ display: "none" }} 
            />
          </div>

          {pendingFiles.length > 0 && (
            <div style={{ padding: "20px", background: "#fff", borderRadius: "12px", boxShadow: "0 4px 10px rgba(0,0,0,0.05)", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                  <h3 style={{ margin: 0 }}>Selected ({pendingFiles.length} photos)</h3>
                  <button 
                    onClick={() => document.getElementById('mainFileInput').click()}
                    style={{ padding: "6px 12px", background: "#eee", border: "1px solid #ddd", borderRadius: "5px", cursor: "pointer" }}
                  >
                    + Add More
                  </button>
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: "10px" }}>
                {pendingFiles.map((item) => (
                  <div key={item.id} style={{ position: "relative" }}>
                    <img src={item.previewUrl} alt="preview" style={{ width: "100%", height: "90px", objectFit: "cover", borderRadius: "8px" }} />
                    <button 
                      onClick={() => removePendingFile(item.id)}
                      style={{ position: "absolute", top: "-5px", right: "-5px", background: "#ff1744", color: "white", border: "none", borderRadius: "50%", width: "22px", height: "22px", cursor: "pointer", fontSize: "12px" }}
                    >✕</button>
                  </div>
                ))}
              </div>

              <button 
                onClick={handleGenerateOrAdd}
                disabled={loading}
                style={{ width: "100%", padding: "15px", background: loading ? "#ccc" : "#4CAF50", color: "white", fontSize: "18px", fontWeight: "bold", border: "none", borderRadius: "10px", cursor: "pointer", marginTop: "20px" }}
              >
                {loading ? "Uploading... ⏳" : (galleryId ? "Update Live Gallery" : "🚀 Create QR Gallery")}
              </button>
            </div>
          )}
        </>
      )}

      {/* ✅ Gallery Actions */}
      {images.length > 0 && (
        <div className="dg-actions" style={{ marginBottom: "20px", display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center" }}>
          <button onClick={downloadSelected} style={{ padding: "10px 15px", background: "#43a047", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>
            Download Selected ({selected.length})
          </button>
          <button onClick={downloadAll} style={{ padding: "10px 15px", background: "#1e88e5", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>
            Download All Images
          </button>
          {!viewMode && selected.length > 0 && (
            <button onClick={deleteSelected} style={{ padding: "10px 15px", background: "#e53935", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>
              Delete Selected
            </button>
          )}
        </div>
      )}

      {/* ✅ Image Grid */}
      <div className="dg-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "15px" }}>
        {images.map((img) => (
          <div key={img.id} className="dg-card" style={{ position: "relative", borderRadius: "10px", overflow: "hidden", border: selected.includes(img.id) ? "4px solid #4CAF50" : "1px solid #eee" }}>
            <img 
              src={getNetworkUrl(img.url)} alt="Gallery" onClick={() => toggleSelect(img.id)}
              style={{ width: "100%", height: "200px", objectFit: "cover", cursor: "pointer" }} 
            />
            <input type="checkbox" checked={selected.includes(img.id)} readOnly style={{ position: "absolute", top: "10px", left: "10px", width: "20px", height: "20px" }} />
          </div>
        ))}
      </div>
    </div>
  );
}