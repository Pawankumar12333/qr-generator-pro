import React, { useRef, useState } from "react";
import jsQR from "jsqr";

const QRScanner = () => {
  const canvasRef = useRef(null);
  const fileRef = useRef(null);
  const [result, setResult] = useState("");

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const img = new Image();
    const reader = new FileReader();

    reader.onload = () => {
      img.src = reader.result;
    };

    img.onload = () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, canvas.width, canvas.height);

      if (code) setResult(code.data);
      else setResult("No QR found");
    };

    reader.readAsDataURL(file);
  };

  // ⭐ CLEAR ALL
  const handleClear = () => {
    setResult("");

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  };

  return (
    <div className="qr-card">
      <h2>QR Scanner</h2>

      <input id="abc"
        type="file"
        accept="image/*"
        ref={fileRef}
        onChange={handleFile}
      />

      <canvas ref={canvasRef} style={{ display: "none" }} />

      {result && (
        <>
          <p>{result}</p>
          <button className="btn" onClick={handleClear}>Clear</button>
        </>
      )}
    </div>
  );
};

export default QRScanner;