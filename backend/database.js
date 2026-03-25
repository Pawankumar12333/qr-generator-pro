// database.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const connectDB = async () => {
  try {
    const { error } = await supabase.from('galleries').select('id').limit(1);
    if (error && error.code !== 'PGRST116') throw error;
    console.log('✅ Supabase connected successfully!');
  } catch (error) {
    console.error('❌ Supabase Connection Error:', error.message);
    process.exit(1);
  }
};

module.exports = { supabase, connectDB };