const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // ✅ Sabse stable link format (Pawan, maine aapka password pehle hi encode kar diya hai)
        const mongoURI = 'mongodb+srv://pawan:9811575711%409219916121@pawan-db.gbceurp.mongodb.net/qr_gallery_db?retryWrites=true&w=majority';
        
        await mongoose.connect(mongoURI);
        
        console.log('✅ MongoDB Atlas Cloud connected successfully!');
    } catch (error) {
        console.error('❌ MongoDB Connection Error:', error.message);
        // Hosting par error aane par server restart karne ke liye
        process.exit(1); 
    }
};

module.exports = connectDB;