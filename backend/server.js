// server.js
require('dotenv').config();
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

connectDB();

// Multer — memory storage
const upload = multer({ storage: multer.memoryStorage() });

// ==========================================
// HELPER: Upload file to Supabase Storage
// ==========================================
const uploadToStorage = async (file, folder = 'galleries') => {
  const filename = `${folder}/${uuidv4()}_${file.originalname}`;

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
  console.log('🔍 Checking for expired data (24hrs limit)...');
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  try {
    // Delete expired galleries
    const { data: expiredGalleries } = await supabase
      .from('galleries')
      .select('*')
      .lt('created_at', twentyFourHoursAgo);

    for (const gallery of expiredGalleries || []) {
      const paths = (gallery.images || []).map((img) => img.path);
      if (paths.length > 0) {
        await supabase.storage.from('gallery-images').remove(paths);
      }
      await supabase.from('galleries').delete().eq('gallery_id', gallery.gallery_id);
      console.log(`🗑️ Deleted Gallery: ${gallery.gallery_id}`);
    }

    // Delete expired files
    const { data: expiredFiles } = await supabase
      .from('files')
      .select('*')
      .lt('created_at', twentyFourHoursAgo);

    for (const file of expiredFiles || []) {
      await supabase.storage.from('gallery-images').remove([file.path]);
      await supabase.from('files').delete().eq('id', file.id);
      console.log(`🗑️ Deleted File: ${file.name}`);
    }
  } catch (error) {
    console.error('❌ Cron Job Error:', error);
  }
});

// ==========================================
// ROUTES
// ==========================================
app.get('/', (req, res) => res.send('⚡ Supabase QR Gallery Server is Active!'));

// ── Image Gallery Upload ──────────────────────────
app.post('/api/upload-gallery', upload.array('images', 20), async (req, res) => {
  try {
    const { galleryId } = req.body;
    const uploadedImages = await Promise.all(req.files.map(f => uploadToStorage(f, 'galleries')));

    if (galleryId) {
      const { data: gallery, error } = await supabase
        .from('galleries')
        .select('*')
        .eq('gallery_id', galleryId)
        .single();

      if (error || !gallery) return res.status(404).json({ message: 'Gallery not found' });

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

    if (error || !gallery) return res.status(404).json({ message: 'Expired or not found' });
    res.status(200).json(gallery);
  } catch (error) {
    res.status(500).json({ error: 'Fetch error' });
  }
});

// ── Single File / ZIP Upload ──────────────
app.post('/api/upload-file', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const uploaded = await uploadToStorage(file, 'files');

    // Save to files table in Supabase
    const { data, error } = await supabase
      .from('files')
      .insert([{
        id: uploaded.id,
        name: file.originalname,
        url: uploaded.url,
        path: uploaded.path,
        size: file.size,
        mimetype: file.mimetype,
      }])
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json(data);
  } catch (error) {
    console.error('❌ File Upload Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── Fetch File ────────────────────────────
app.get('/api/file/:id', async (req, res) => {
  try {
    const { data: file, error } = await supabase
      .from('files')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !file) return res.status(404).json({ message: 'Expired or not found' });
    res.status(200).json(file);
  } catch (error) {
    res.status(500).json({ error: 'Fetch error' });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running at: http://localhost:${PORT}`));
