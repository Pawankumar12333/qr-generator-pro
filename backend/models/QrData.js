const mongoose = require('mongoose');

// Define kar rahe hain ki database mein kya-kya save hoga
const qrSchema = new mongoose.Schema({
    originalText: { 
        type: String, 
        required: true // Yeh zaroori field hai
    },
    createdAt: { 
        type: Date, 
        default: Date.now // Yeh automatically aaj ki date/time le lega
    }
});

// Is model ko export kar rahe hain taaki server.js mein use kar sakein
module.exports = mongoose.model('QrData', qrSchema);