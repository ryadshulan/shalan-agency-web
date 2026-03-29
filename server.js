const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// ================= 1. إعدادات السيرفر والمنفذ =================
// تعريف المنفذ في البداية لكي يراه الكود بالأسفل
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ================= 2. الاتصال بقاعدة البيانات (MongoDB) =================
// استخدمنا متغير بيئة للرابط ليعمل على Render وجهازك
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shalan-agency';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ تم الاتصال بقاعدة البيانات بنجاح!'))
    .catch(err => console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err));

// ================= 3. بناء هياكل البيانات (Schemas) =================

const Category = mongoose.model('Category', new mongoose.Schema({
    name: String, tag: String, img: String, createdAt: { type: Date, default: Date.now }
}));

const Project = mongoose.model('Project', new mongoose.Schema({
    title: String, client_name: String, tags: [String], thumbnail: String, 
    media_type: String, media_content: String, createdAt: { type: Date, default: Date.now }
}));

const Order = mongoose.model('Order', new mongoose.Schema({
    customer: String, phone: String, city: String, orderType: String,
    service_or_package_name: String, details: String, total_price: String,
    status: { type: String, default: 'جديد' }, createdAt: { type: Date, default: Date.now }
}));

// ================= 4. واجهات التطبيق البرمجية (Routes) =================

app.get('/api/categories', async (req, res) => {
    try { const data = await Category.find().sort({ createdAt: -1 }); res.json({ success: true, data }); }
    catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.post('/api/categories', async (req, res) => {
    try { const newCat = new Category(req.body); await newCat.save(); res.json({ success: true, data: newCat }); }
    catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.get('/api/projects', async (req, res) => {
    try { const data = await Project.find().sort({ createdAt: -1 }); res.json({ success: true, data }); }
    catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.post('/api/projects', async (req, res) => {
    try { const newProj = new Project(req.body); await newProj.save(); res.json({ success: true, data: newProj }); }
    catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.post('/api/orders', async (req, res) => {
    try { const newOrder = new Order(req.body); await newOrder.save(); res.json({ success: true, message: 'تم استلام الطلب' }); }
    catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// ================= 5. تشغيل السيرفر (المهم جداً) =================
app.listen(PORT, () => {
    console.log(`🚀 السيرفر يعمل الآن على المنفذ: ${PORT}`);
});
