// server.js
require('dotenv').config(); // MUST BE AT THE TOP
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');
const { supabase, connectDB } = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

// ==========================================
// MIDDLEWARE
// ==========================================
app.use(cors());
app.use(express.json());

// Connect to Supabase
connectDB();

// Multer — memory storage (files go to Supabase Storage)
const upload = multer({ storage: multer.memoryStorage() });

// ==========================================
// HELPER: Upload file to Supabase Storage
// ==========================================
const uploadToStorage = async (file) => {
  const filename = `galleries/${uuidv4()}_${file.originalname}`;

  const { error } = await supabase.storage
    .from('gallery-images')
    .upload(filename, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from('gallery-images')
    .getPublicUrl(filename);

  return { id: uuidv4(), url: data.publicUrl, path: filename };
};

// ==========================================
// 🕒 AUTO-DELETE LOGIC (Every 1 Hour)
// ==========================================
cron.schedule('0 * * * *', async () => {
  console.log('🔍 Checking for expired galleries (24hrs limit)...');
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  try {
    // Find expired galleries
    const { data: expiredGalleries, error } = await supabase
      .from('galleries')
      .select('*')
      .lt('created_at', twentyFourHoursAgo);

    if (error) throw error;

    for (const gallery of expiredGalleries) {
      // Delete images from Supabase Storage
      const paths = (gallery.images || []).map((img) => img.path);
      if (paths.length > 0) {
        await supabase.storage.from('gallery-images').remove(paths);
      }

      // Delete gallery row from DB
      await supabase.from('galleries').delete().eq('gallery_id', gallery.gallery_id);
      console.log(`🗑️ Deleted Expired Gallery: ${gallery.gallery_id}`);
    }
  } catch (error) {
    console.error('❌ Cron Job Error:', error);
  }
});

// ==========================================
// ROUTES
// ==========================================
app.get('/', (req, res) => res.send('⚡ Supabase QR Gallery Server is Active!'));

// ── Upload Route ──────────────────────────
app.post('/api/upload-gallery', upload.array('images', 20), async (req, res) => {
  try {
    const { galleryId } = req.body;

    // Upload all files to Supabase Storage
    const uploadedImages = await Promise.all(req.files.map(uploadToStorage));

    if (galleryId) {
      // Fetch existing gallery
      const { data: gallery, error } = await supabase
        .from('galleries')
        .select('*')
        .eq('gallery_id', galleryId)
        .single();

      if (error || !gallery) {
        return res.status(404).json({ message: 'Gallery not found' });
      }

      const updatedImages = [...(gallery.images || []), ...uploadedImages];

      const { data: updated, error: updateError } = await supabase
        .from('galleries')
        .update({ images: updatedImages })
        .eq('gallery_id', galleryId)
        .select()
        .single();

      if (updateError) throw updateError;
      return res.status(200).json(updated);
    } else {
      // Create new gallery
      const newGalleryId = uuidv4();

      const { data: newGallery, error: insertError } = await supabase
        .from('galleries')
        .insert([{ gallery_id: newGalleryId, images: uploadedImages }])
        .select()
        .single();

      if (insertError) throw insertError;
      return res.status(201).json(newGallery);
    }
  } catch (error) {
    console.error('❌ Upload Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── Fetch Gallery ─────────────────────────
app.get('/api/gallery/:id', async (req, res) => {
  try {
    const { data: gallery, error } = await supabase
      .from('galleries')
      .select('*')
      .eq('gallery_id', req.params.id)
      .single();

    if (error || !gallery) {
      return res.status(404).json({ message: 'Expired or not found' });
    }

    res.status(200).json(gallery);
  } catch (error) {
    res.status(500).json({ error: 'Fetch error' });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running at: http://localhost:${PORT}`));