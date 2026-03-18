const mongoose = require('mongoose');

// Define kar rahe hain ki database mein gallery ka data kaisa dikhega
const gallerySchema = new mongoose.Schema({
    galleryId: { 
        type: String, 
        required: true 
    },
    images: [{
        id: String,
        url: String,    // Frontend ko image dikhane ke liye link
        path: String    // PC se file delete karne ke liye local path
    }],
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

// Is model ko export kar rahe hain taaki server.js isko use kar sake
module.exports = mongoose.model('Gallery', gallerySchema);