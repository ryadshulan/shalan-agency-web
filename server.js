const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// ================= 1. إعدادات السيرفر =================
app.use(cors());
// رفع حد حجم البيانات المستقبلة إلى 50 ميجا لكي يستوعب الصور المضغوطة (Base64)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// تشغيل ملفات الواجهة (الموقع ولوحة التحكم) من مجلد public
app.use(express.static(path.join(__dirname, 'public')));

// ================= 2. الاتصال بقاعدة البيانات (MongoDB) =================
mongoose.connect('mongodb://127.0.0.1:27017/shalan-agency')
.then(() => {
    console.log('✅ تم الاتصال بقاعدة بيانات وكالة شعلان بنجاح!');
})
.catch((err) => {
    console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err);
});

// ================= 3. بناء هياكل البيانات (Database Schemas) =================

// هيكل أقسام التصميم
const CategorySchema = new mongoose.Schema({
    name: String,
    tag: String,
    img: String, // صورة Base64
    createdAt: { type: Date, default: Date.now }
});
const Category = mongoose.model('Category', CategorySchema);

// هيكل أعمال التصميم
const ProjectSchema = new mongoose.Schema({
    title: String,
    client_name: String,
    tags: [String],
    thumbnail: String, // صورة الغلاف Base64
    media_type: String, // 'image' أو 'youtube'
    media_content: String, // رابط أو صورة Base64
    createdAt: { type: Date, default: Date.now }
});
const Project = mongoose.model('Project', ProjectSchema);

// هيكل الطلبات (طلبات الخدمات والباقات)
const OrderSchema = new mongoose.Schema({
    customer: String,
    phone: String,
    city: String,
    orderType: String, // 'service' أو 'package'
    service_or_package_name: String,
    details: String,
    total_price: String,
    status: { type: String, default: 'جديد' }, // جديد، قيد التنفيذ، مكتمل
    createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', OrderSchema);

// ================= 4. برمجة واجهات التطبيق البرمجية (API Routes) =================

// ----- واجهة (API) أقسام التصميم -----
// جلب كل الأقسام
app.get('/api/categories', async (req, res) => {
    try {
        const categories = await Category.find().sort({ createdAt: -1 });
        res.json({ success: true, data: categories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// إضافة قسم جديد
app.post('/api/categories', async (req, res) => {
    try {
        const newCategory = new Category(req.body);
        const savedCategory = await newCategory.save();
        res.json({ success: true, data: savedCategory });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ----- واجهة (API) أعمال التصميم -----
// جلب كل المشاريع
app.get('/api/projects', async (req, res) => {
    try {
        const projects = await Project.find().sort({ createdAt: -1 });
        res.json({ success: true, data: projects });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// إضافة مشروع جديد
app.post('/api/projects', async (req, res) => {
    try {
        const newProject = new Project(req.body);
        const savedProject = await newProject.save();
        res.json({ success: true, data: savedProject });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ----- واجهة (API) الطلبات الواردة -----
// إضافة طلب جديد (من الصفحة الرئيسية أو الباقات)
app.post('/api/orders', async (req, res) => {
    try {
        const newOrder = new Order(req.body);
        await newOrder.save();
        res.json({ success: true, message: 'تم استلام الطلب بنجاح' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ================= تشغيل السيرفر =================
// 1. تعديل المنفذ (PORT)
const PORT = process.env.PORT || 3000;

// 2. تعديل رابط الاتصال بقاعدة البيانات
// إذا كان في استضافة سيأخذ الرابط السحابي، وإذا كان في جهازك سيأخذ المحلي
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shalan_agency';

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ تم الاتصال بقاعدة البيانات بنجاح!'))
    .catch(err => console.error('❌ خطأ في الاتصال:', err));