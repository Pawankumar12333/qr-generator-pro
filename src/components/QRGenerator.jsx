import React, { useState, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import "../App.css";

const QRGenerator = () => {
  const qrRef = useRef();

  const [mode, setMode] = useState("text");
  const [dark, setDark] = useState(false);

  // Common
  const [text, setText] = useState("");

  // Contact
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // BIO extra
  const [age, setAge] = useState("");
  const [address, setAddress] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [github, setGithub] = useState("");
  const [facebook, setFacebook] = useState("");

  // WiFi
  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");

  // WhatsApp
  const [waNumber, setWaNumber] = useState("");

  // UPI
  const [upi, setUpi] = useState("");
  const [amount, setAmount] = useState("");

  const [qrData, setQrData] = useState("");
  const [message, setMessage] = useState("");

  // ================= GENERATE =================
  const handleGenerate = () => {
    let data = "";

    if (mode === "text") data = text;

    if (mode === "contact") {
      data = `BEGIN:VCARD
VERSION:3.0
FN:${name}
TEL:${phone}
EMAIL:${email}
END:VCARD`;
    }

    // ⭐ BIO MODE
    if (mode === "bio") {
      data = `BEGIN:VCARD
VERSION:3.0
FN:${name}
TEL:${phone}
EMAIL:${email}
ADR:${address}
NOTE:Age-${age}
LinkedIn-${linkedin}
GitHub-${github}
Facebook-${facebook}
END:VCARD`;
    }

    if (mode === "wifi") {
      data = `WIFI:T:WPA;S:${ssid};P:${password};;`;
    }

    if (mode === "whatsapp") {
      data = `https://wa.me/${waNumber}`;
    }

    if (mode === "upi") {
      data = `upi://pay?pa=${upi}&am=${amount}&cu=INR`;
    }

    if (!data.trim()) {
      setMessage("Please fill required fields");
      return;
    }

    setQrData(data);
    setMessage("QR generated successfully");
  };

  // ================= CLEAR =================
  const handleClear = () => {
    setQrData("");
    setMessage("");
    setText("");
    setName("");
    setPhone("");
    setEmail("");
    setAge("");
    setAddress("");
    setLinkedin("");
    setGithub("");
    setFacebook("");
    setSsid("");
    setPassword("");
    setWaNumber("");
    setUpi("");
    setAmount("");
  };

  // ================= DOWNLOAD =================
  const downloadQR = () => {
    const canvas = qrRef.current.querySelector("canvas");
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = "qr.png";
    link.click();
  };

  // ================= COPY =================
  const copyData = () => {
    navigator.clipboard.writeText(qrData);
    setMessage("QR data copied");
  };

  return (
    <div className={dark ? "qr-card dark" : "qr-card"}>
      <h2> QR Generator 🚀</h2>

      

      {/* MODE SELECT */}
      <select value={mode} onChange={(e) => setMode(e.target.value)}>
        <option value="text">Text / URL</option>
        <option value="contact">Contact</option>
        <option value="bio">Bio Profile ⭐</option>
        <option value="wifi">WiFi</option>
        <option value="whatsapp">WhatsApp</option>
        <option value="upi">UPI Payment</option>

      </select>

      {/* DARK MODE */}
      <button className="btn" onClick={() => setDark(!dark)}>
        {dark ? "Light Mode" : "Dark Mode"}
      </button>


      {/* TEXT */}
      {mode === "text" && (
        <input placeholder="Enter text" value={text} onChange={(e) => setText(e.target.value)} />
      )}

      {/* CONTACT */}
      {mode === "contact" && (
        <>
          <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </>
      )}

      {/* ⭐ BIO */}
      {mode === "bio" && (
        <>
          <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input placeholder="Age" value={age} onChange={(e) => setAge(e.target.value)} />
          <input placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
          <input placeholder="LinkedIn link" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} />
          <input placeholder="GitHub link" value={github} onChange={(e) => setGithub(e.target.value)} />
          <input placeholder="Facebook link" value={facebook} onChange={(e) => setFacebook(e.target.value)} />
        </>
      )}

      {/* WIFI */}
      {mode === "wifi" && (
        <>
          <input placeholder="WiFi Name" value={ssid} onChange={(e) => setSsid(e.target.value)} />
          <input placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </>
      )}

      {/* WHATSAPP */}
      {mode === "whatsapp" && (
        <input placeholder="Number with country code" value={waNumber} onChange={(e) => setWaNumber(e.target.value)} />
      )}

      {/* UPI */}
      {mode === "upi" && (
        <>
          <input placeholder="UPI ID" value={upi} onChange={(e) => setUpi(e.target.value)} />
          <input placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </>
      )}

      <div id="gap">
        <button  className="btn" onClick={handleGenerate}>Generate</button>
        <button className="btn" onClick={handleClear}>Clear</button>
      </div>

      {message && <p>{message}</p>}

      {qrData && (
        <div ref={qrRef}>
          <QRCodeCanvas value={qrData} size={256} bgColor={"#fff"} fgColor={"#000"} level={"H"} includeMargin={true} />
        </div>
      )}

      {qrData && (
        <>
          <button className="btn" onClick={downloadQR}>Download PNG</button>
          <button className="btn" onClick={copyData}>Copy Data</button>
        </>
      )}
    </div>
  );
};

export default QRGenerator;