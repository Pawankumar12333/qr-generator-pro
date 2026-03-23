import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import QRGenerator from './components/QRGenerator';
import QRScanner from './components/QRExtractor';
import DigitalGallery from './components/DigitalGallery';
import './App.css';

function App() {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef(null);

  // 10 Seconds Auto-Close Logic
  const startTimer = () => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 10000); 
  };

  const toggleDoor = () => {
    setIsOpen(!isOpen);
    if (!isOpen) startTimer();
  };

  // Activity check for reset
  useEffect(() => {
    const resetTimer = () => { if (isOpen) startTimer(); };
    window.addEventListener('touchstart', resetTimer);
    window.addEventListener('mousemove', resetTimer);
    return () => {
      window.removeEventListener('touchstart', resetTimer);
      window.removeEventListener('mousemove', resetTimer);
      clearTimeout(timeoutRef.current);
    };
  }, [isOpen]);

  return (
    <div className="main-wrapper">
      
      {/* --- NAVBAR (Only Hunter Club) --- */}
      {/* --- NAVBAR (Logo Only) --- */}
      <nav className="navbar">
        <div className="nav-logo-container">
         <img src="/logo.jpg" alt="Hunter Club Logo" className="nav-logo-img" />
          </div>
      </nav>

      {/* --- DOORS --- */}
      <motion.div 
        animate={{ x: isOpen ? '-100%' : '0%' }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
        className="door left-door"
      >
        <div className="handle"></div>
      </motion.div>

      <motion.div 
        animate={{ x: isOpen ? '100%' : '0%' }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
        className="door right-door"
      >
        <div className="handle"></div>
      </motion.div>

      {/* --- CONTENT AREA --- */}
      <div className={`app-content ${isOpen ? 'content-visible' : 'content-hidden'}`}>
        <div className="app-container">
          <QRGenerator />
          <QRScanner />
          <DigitalGallery />
        </div>

        {/* --- FOOTER --- */}
       {/* --- UPDATED FOOTER --- */}
<footer className="footer">
  <div className="footer-grid-container">
    
    {/* Card 1 (Original) */}
    <div className="bio-card">
      <img src="/own.jpg" alt="profile" />
      <div className="bio-info">
        <h3>P@_1 Kumar Bhuz</h3>
        <h4>Founder of Hunter Club</h4>
        <p>Data Analysis</p>
        <p>📞 +91 9219916121</p>
        <p>📧 anomymous139@gmail.com</p>
      </div>
    </div>

    {/* Card 2 (Duplicate 1) */}
    <div className="bio-card">
      <img src="/own.jpg" alt="profile" />
      <div className="bio-info">
        <h3>Shiva Mishra</h3>
        <h4>Member of Hunter Club </h4>
        <p>Web Development</p>
        <p>📞 +91 6306165716</p>
        <p>📧 shivapbh72@gmail.com</p>
      </div>
    </div>

    {/* Card 3 (Duplicate 2) */}
    <div className="bio-card">
      <img src="/own.jpg" alt="profile" />
      <div className="bio-info">
        <h3>Nitin Kumar</h3>
        <h4>Member of Hunter Club</h4>
        <p>Security Expert</p>
        <p>📞 +91 7417025098</p>
        <p>📧 NitinKumar342@gmail.com</p>
      </div>
    </div>

    {/* Card 4 (Duplicate 3) */}
    <div className="bio-card">
      <img src="/own.jpg" alt="profile" />
      <div className="bio-info">
        <h3>Himanshu Kumar </h3>
        <h4>Member of Hunter Club</h4>
        <p>UI/UX Design</p>
        <p>📞 +91 7370857623</p>
        <p>📧 kumarHimanshu3@gmail.com</p>
      </div>
    </div>

  </div>
</footer>
      </div>

      {/* --- GET STARTED BUTTON --- */}
      <div className="door-control">
        <button onClick={toggleDoor} className="get-started-btn">
          {isOpen ? "CLOSE" : "GET STARTED"}
        </button>
      </div>

    </div>
  );
}

export default App;