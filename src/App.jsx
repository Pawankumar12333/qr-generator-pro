import React from 'react';
import QRGenerator from './components/QRGenerator';
import QRScanner from './components/QRExtractor';
import DigitalGallery from './components/DigitalGallery';
import './App.css';

function App() {
  return (
    <>
      <div className="app-container">
        <QRGenerator />
        <QRScanner />
        <DigitalGallery />
      </div>

      {/* FOOTER BIO CARD */}
      <footer className="footer">
        <div className="bio-card">
          <img src="/own.jpg" alt="profile" />

          <div className="bio-info">
            <h3>P@_1 Kumar Bhuz</h3>
            <h4>Founder of Hunter Club</h4>
            <p>Data Analysis</p>
            <p>📞 +91 9219916121</p>
            <p>📞 +977 9219916121</p>
            <p>📧 anomymous139@gmail.com</p>
          </div>
        </div>
      </footer>
    </>
  );
}

export default App;