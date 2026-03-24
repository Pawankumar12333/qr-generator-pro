require('dotenv').config(); // MUST BE AT THE TOP
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');

const connectDB = require('./database'); 
const QrData = require('./models/QrData'); 
const Gallery = require('./models/Gallery'); 

const app = express();
const PORT = process.env.PORT || 5000; // Use port from .env

// Middleware
app.use(cors()); 
app.use(express.json()); 
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure Uploads folder exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Connect to Database
connectDB();

// Multer Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

// ==========================================
// 🕒 AUTO-DELETE LOGIC (Every 1 Hour)
// ==========================================
cron.schedule('0 * * * *', async () => {
    console.log("🔍 Checking for expired galleries (24hrs limit)...");
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
        const expiredGalleries = await Gallery.find({ createdAt: { $lt: twentyFourHoursAgo } });
        for (const gallery of expiredGalleries) {
            gallery.images.forEach(img => {
                if (fs.existsSync(img.path)) {
                    fs.unlinkSync(img.path);
                }
            });
            await Gallery.findByIdAndDelete(gallery._id);
            console.log(`🗑️ Deleted Expired Gallery: ${gallery.galleryId}`);
        }
    } catch (error) {
        console.error("❌ Cron Job Error:", error);
    }
});

// ==========================================
// ROUTES
// ==========================================
app.get('/', (req, res) => res.send('Backend QR Gallery Server is Active!'));

// Upload Route
app.post('/api/upload-gallery', upload.array('images', 20), async (req, res) => {
    try {
        const { galleryId } = req.body;
        const uploadedImages = req.files.map(file => ({
            id: uuidv4(),
            url: `/uploads/${file.filename}`,
            path: file.path 
        }));

        if (galleryId) {
            const gallery = await Gallery.findOneAndUpdate(
                { galleryId },
                { $push: { images: { $each: uploadedImages } } },
                { new: true }
            );
            if (!gallery) return res.status(404).json({ message: "Gallery not found" });
            return res.status(200).json(gallery);
        } else {
            const newGallery = new Gallery({ galleryId: uuidv4(), images: uploadedImages });
            await newGallery.save();
            return res.status(201).json(newGallery);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Fetch Gallery
app.get('/api/gallery/:id', async (req, res) => {
    try {
        const gallery = await Gallery.findOne({ galleryId: req.params.id });
        if (!gallery) return res.status(404).json({ message: "Expired or not found" });
        res.status(200).json(gallery);
    } catch (error) {
        res.status(500).json({ error: "Fetch error" });
    }
});

app.listen(PORT, () => console.log(`🚀 Server running at: http://localhost:${PORT}`));