require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');
const { supabase, connectDB } = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

connectDB();

const upload = multer({ storage: multer.memoryStorage() });

// Chunks ko temporary store karne ke liye object (In-memory)
// Note: Production mein agar server restart hoga to progress lose ho jayegi
const tempChunks = {}; 

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
// 🚀 NEW ROUTE: CHUNK UPLOAD (For Pause/Resume)
// ==========================================
app.post('/api/upload-chunk', upload.single('chunk'), async (req, res) => {
  try {
    const { chunkIndex, totalChunks, fileName } = req.body;
    const chunkFile = req.file;

    if (!chunkFile) return res.status(400).json({ error: 'No chunk received' });

    // Chunk ko memory mein store karein
    if (!tempChunks[fileName]) {
      tempChunks[fileName] = [];
    }
    
    tempChunks[fileName][chunkIndex] = chunkFile.buffer;

    // Check karein agar saare chunks mil gaye hain
    const receivedChunks = tempChunks[fileName].filter(Boolean).length;
    
    if (receivedChunks === parseInt(totalChunks)) {
      console.log(`✅ All chunks received for ${fileName}. Merging...`);
      
      // Saare buffers ko ek saath merge karein
      const finalBuffer = Buffer.concat(tempChunks[fileName]);
      
      // Supabase Storage par upload karein
      const uploaded = await uploadToStorage(finalBuffer, fileName, chunkFile.mimetype, 'files');

      // Database mein save karein
      const { data, error } = await supabase
        .from('files')
        .insert([{
          id: uploaded.id,
          name: fileName,
          url: uploaded.url,
          path: uploaded.path,
          size: finalBuffer.length,
          mimetype: chunkFile.mimetype,
        }])
        .select()
        .single();

      // Cleanup memory
      delete tempChunks[fileName];

      if (error) throw error;
      return res.status(201).json(data);
    } else {
      // Agle chunk ke liye green signal dein
      return res.status(200).json({ message: `Chunk ${chunkIndex} uploaded` });
    }
  } catch (error) {
    console.error('❌ Chunk Upload Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// Baki Routes (Gallery, Auto-Delete) Same Rahenge
// ==========================================

// ... (Purana Code: Cron Job, /api/upload-gallery, etc. yahan paste karein)

app.listen(PORT, () => console.log(`🚀 Server running at: http://localhost:${PORT}`));