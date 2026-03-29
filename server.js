const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// ================= 1. إعدادات السيرفر والمنفذ =================
// تعريف المنفذ مرة واحدة فقط في بداية الملف

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ================= 2. الاتصال بقاعدة البيانات (MongoDB) =================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shalan-agency';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ تم الاتصال بقاعدة البيانات بنجاح!'))
    .catch(err => console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err));

// ================= 3. بناء هياكل البيانات (Schemas) =================

const Category = mongoose.model('Category', new mongoose.Schema({
    name: String,
    tag: String,
    img: String, 
    createdAt: { type: Date, default: Date.now }
}));

const Project = mongoose.model('Project', new mongoose.Schema({
    title: String,
    client_name: String,
    tags: [String],
    thumbnail: String, 
    media_type: String, 
    media_content: String, 
    createdAt: { type: Date, default: Date.now }
}));

const Order = mongoose.model('Order', new mongoose.Schema({
    customer: String,
    phone: String,
    city: String,
    orderType: String,
    service_or_package_name: String,
    details: String,
    total_price: String,
    status: { type: String, default: 'جديد' },
    createdAt: { type: Date, default: Date.now }
}));

// ================= 4. واجهات التطبيق البرمجية (Routes) =================

// الأقسام
app.get('/api/categories', async (req, res) => {
    try {
        const categories = await Category.find().sort({ createdAt: -1 });
        res.json({ success: true, data: categories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/categories', async (req, res) => {
    try {
        const newCategory = new Category(req.body);
        await newCategory.save();
        res.json({ success: true, data: newCategory });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// المشاريع
app.get('/api/projects', async (req, res) => {
    try {
        const projects = await Project.find().sort({ createdAt: -1 });
        res.json({ success: true, data: projects });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/projects', async (req, res) => {
    try {
        const newProject = new Project(req.body);
        await newProject.save();
        res.json({ success: true, data: newProject });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// الطلبات
app.post('/api/orders', async (req, res) => {
    try {
        const newOrder = new Order(req.body);
        await newOrder.save();
        res.json({ success: true, message: 'تم استلام الطلب بنجاح' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ================= 5. تشغيل السيرفر =================
app.listen(PORT, () => {
    console.log(`🚀 السيرفر يعمل الآن على المنفذ: ${PORT}`);
});
