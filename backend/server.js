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

const upload = multer({ storage: multer.memoryStorage() });

// Chunks storage in memory
const tempChunks = {}; 

// ==========================================
// HELPER: Upload to Supabase
// ==========================================
const uploadToStorage = async (fileBuffer, originalName, mimetype, folder = 'galleries') => {
  const filename = `${folder}/${uuidv4()}_${originalName}`;

  const { error } = await supabase.storage
    .from('gallery-images')
    .upload(filename, fileBuffer, {
      contentType: mimetype,
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from('gallery-images')
    .getPublicUrl(filename);

  return { id: uuidv4(), url: data.publicUrl, path: filename };
};

// ==========================================
// 🕒 AUTO-DELETE LOGIC (Same as before)
// ==========================================
cron.schedule('0 * * * *', async () => {
  console.log('🔍 Checking for expired data...');
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  try {
    const { data: expiredGalleries } = await supabase.from('galleries').select('*').lt('created_at', twentyFourHoursAgo);
    for (const gallery of expiredGalleries || []) {
      const paths = (gallery.images || []).map((img) => img.path);
      if (paths.length > 0) await supabase.storage.from('gallery-images').remove(paths);
      await supabase.from('galleries').delete().eq('gallery_id', gallery.gallery_id);
    }
    const { data: expiredFiles } = await supabase.from('files').select('*').lt('created_at', twentyFourHoursAgo);
    for (const file of expiredFiles || []) {
      await supabase.storage.from('gallery-images').remove([file.path]);
      await supabase.from('files').delete().eq('id', file.id);
    }
  } catch (error) { console.error('❌ Cron Job Error:', error); }
});

// ==========================================
// ROUTES
// ==========================================

// ✅ Fix "Cannot GET /"
app.get('/', (req, res) => res.send('🚀 Smart File QR Backend is Active!'));

// ── NEW: Chunk Upload (Pause/Resume support) ──
app.post('/api/upload-chunk', upload.single('chunk'), async (req, res) => {
  try {
    const { chunkIndex, totalChunks, fileName } = req.body;
    const chunkFile = req.file;

    if (!chunkFile) return res.status(400).json({ error: 'No chunk received' });

    if (!tempChunks[fileName]) tempChunks[fileName] = [];
    tempChunks[fileName][chunkIndex] = chunkFile.buffer;

    const receivedChunks = tempChunks[fileName].filter(Boolean).length;
    
    if (receivedChunks === parseInt(totalChunks)) {
      const finalBuffer = Buffer.concat(tempChunks[fileName]);
      const uploaded = await uploadToStorage(finalBuffer, fileName, chunkFile.mimetype, 'files');

      const { data, error } = await supabase.from('files').insert([{
        id: uploaded.id,
        name: fileName,
        url: uploaded.url,
        path: uploaded.path,
        size: finalBuffer.length,
        mimetype: chunkFile.mimetype,
      }]).select().single();

      delete tempChunks[fileName];
      if (error) throw error;
      return res.status(201).json(data);
    } else {
      return res.status(200).json({ message: `Chunk ${chunkIndex} uploaded` });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Standard Gallery Upload ──
app.post('/api/upload-gallery', upload.array('images', 20), async (req, res) => {
  try {
    const uploadedImages = await Promise.all(req.files.map(f => uploadToStorage(f.buffer, f.originalname, f.mimetype, 'galleries')));
    const newGalleryId = uuidv4();
    const { data, error } = await supabase.from('galleries').insert([{ gallery_id: newGalleryId, images: uploadedImages }]).select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ── Fetch Gallery & File ──
app.get('/api/gallery/:id', async (req, res) => {
  const { data, error } = await supabase.from('galleries').select('*').eq('gallery_id', req.params.id).single();
  if (error || !data) return res.status(404).json({ message: 'Not found' });
  res.status(200).json(data);
});

app.get('/api/file/:id', async (req, res) => {
  const { data, error } = await supabase.from('files').select('*').eq('id', req.params.id).single();
  if (error || !data) return res.status(404).json({ message: 'Not found' });
  res.status(200).json(data);
});

app.listen(PORT, () => console.log(`🚀 Server running at: http://localhost:${PORT}`));