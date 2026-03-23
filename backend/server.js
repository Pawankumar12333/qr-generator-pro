const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cron = require('node-cron'); // ✅ Naya package timer ke liye
const { v4: uuidv4 } = require('uuid');

const connectDB = require('./database'); 
const QrData = require('./models/QrData'); 
const Gallery = require('./models/Gallery'); 

const app = express();
const PORT = 5000;

app.use(cors()); 
app.use(express.json()); 
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}

connectDB();

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, './uploads'),
    filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname))
});
const upload = multer({ storage: storage });

// ==========================================
// 🕒 AUTO-DELETE LOGIC (Every 1 Hour)
// ==========================================
// Yeh function har ghante check karega aur 24 hrs purani photos delete karega
cron.schedule('0 * * * *', async () => {
    console.log("🔍 Checking for expired galleries (24hrs limit)...");
    
    // 24 ghante pehle ka time calculate karna
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
        // Unn galleries ko dhoondho jo 24 ghante se purani hain
        const expiredGalleries = await Gallery.find({ createdAt: { $lt: twentyFourHoursAgo } });

        if (expiredGalleries.length > 0) {
            for (const gallery of expiredGalleries) {
                // 1. Pehle server ke 'uploads' folder se saari photos delete karo
                gallery.images.forEach(img => {
                    if (fs.existsSync(img.path)) {
                        fs.unlinkSync(img.path);
                        console.log(`🗑️ Deleted File: ${img.path}`);
                    }
                });

                // 2. Phir Database se record delete karo
                await Gallery.findByIdAndDelete(gallery._id);
                console.log(`✅ Deleted Expired Gallery ID: ${gallery.galleryId}`);
            }
        }
    } catch (error) {
        console.error("❌ Cron Job Error:", error);
    }
});

// ==========================================
// ROUTES
// ==========================================

app.get('/', (req, res) => res.send('Backend Timer Server is ongoing  best !'));

// Images Upload Route (Live Add Feature ke saath)
app.post('/api/upload-gallery', upload.array('images', 20), async (req, res) => {
    try {
        const { galleryId } = req.body;
        const targetGalleryId = galleryId || uuidv4();
        
        const uploadedImages = req.files.map(file => ({
            id: uuidv4(),
            url: `/uploads/${file.filename}`,
            path: file.path 
        }));

        if (galleryId) {
            const existingGallery = await Gallery.findOne({ galleryId: galleryId });
            if (!existingGallery) return res.status(404).json({ message: "Gallery nahi mili." });
            
            existingGallery.images.push(...uploadedImages);
            await existingGallery.save();
            res.status(200).json({ galleryId: existingGallery.galleryId, images: existingGallery.images });
        } else {
            const newGallery = new Gallery({ galleryId: targetGalleryId, images: uploadedImages });
            await newGallery.save();
            res.status(201).json({ galleryId: targetGalleryId, images: newGallery.images });
        }
    } catch (error) {
        res.status(500).json({ message: "Upload fail ho gayi." });
    }
});

// Fetch Gallery
app.get('/api/gallery/:id', async (req, res) => {
    try {
        const gallery = await Gallery.findOne({ galleryId: req.params.id });
        if (!gallery) return res.status(404).json({ message: "Gallery expired ya delete ho chuki hai." });
        res.status(200).json({ images: gallery.images });
    } catch (error) {
        res.status(500).json({ message: "Fetch error." });
    }
});

// Delete Single Image
app.delete('/api/gallery/:galleryId/image/:imageId', async (req, res) => {
    try {
        const gallery = await Gallery.findOne({ galleryId: req.params.galleryId });
        if (!gallery) return res.status(404).json({ message: "Gallery nahi mili." });

        const imageToDelete = gallery.images.find(img => img.id === req.params.imageId);
        if (imageToDelete && fs.existsSync(imageToDelete.path)) {
            fs.unlinkSync(imageToDelete.path);
        }

        gallery.images = gallery.images.filter(img => img.id !== req.params.imageId);
        await gallery.save();
        res.status(200).json({ message: "Deleted" });
    } catch (error) {
        res.status(500).json({ message: "Error" });
    }
});

app.listen(PORT, () => console.log(`🚀 Server: http://localhost:${PORT}`));