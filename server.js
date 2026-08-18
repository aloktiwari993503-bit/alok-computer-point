const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}

const DB_FILE = './database.json';
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([]));
}

// Admin Password Settings File
const ADMIN_FILE = './admin.json';
if (!fs.existsSync(ADMIN_FILE)) {
    // Default password: admin123, Security Question: आपका पहला स्कूल कौन सा था? Answer: school
    const defaultAdmin = {
        password: "admin123",
        question: "আপনার প্রথম পোষা প্রাণীর নাম কী? (या पसंदीदा रंग? - डिफ़ॉल्ट उत्तर: red)",
        answer: "red"
    };
    fs.writeFileSync(ADMIN_FILE, JSON.stringify(defaultAdmin, null, 2));
}

const storage = multer.diskStorage({
    destination: './uploads/',
    filename: function(req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Admin Auth APIs
app.get('/api/admin/get-auth', (req, res) => {
    try {
        const admin = JSON.parse(fs.readFileSync(ADMIN_FILE));
        res.json({ question: admin.question });
    } catch(e) {
        res.status(500).json({ error: "Error reading config" });
    }
});

app.post('/api/admin/verify-login', (req, res) => {
    const { password } = req.body;
    try {
        const admin = JSON.parse(fs.readFileSync(ADMIN_FILE));
        if(admin.password === password) {
            res.json({ success: true });
        } else {
            res.status(401).json({ success: false, error: "गलत पासवर्ड!" });
        }
    } catch(e) {
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/admin/forgot-password', (req, res) => {
    const { answer, newPassword } = req.body;
    try {
        let admin = JSON.parse(fs.readFileSync(ADMIN_FILE));
        if(admin.answer.toLowerCase() === answer.trim().toLowerCase()) {
            admin.password = newPassword;
            fs.writeFileSync(ADMIN_FILE, JSON.stringify(admin, null, 2));
            res.json({ success: true, message: "पासवर्ड सफलतापूर्वक बदल गया है!" });
        } else {
            res.status(400).json({ success: false, error: "सुरक्षा प्रश्न का उत्तर गलत है!" });
        }
    } catch(e) {
        res.status(500).json({ error: "Server error" });
    }
});

app.post('/api/admin/change-password', (req, res) => {
    const { oldPassword, newPassword } = req.body;
    try {
        let admin = JSON.parse(fs.readFileSync(ADMIN_FILE));
        if(admin.password === oldPassword) {
            admin.password = newPassword;
            fs.writeFileSync(ADMIN_FILE, JSON.stringify(admin, null, 2));
            res.json({ success: true, message: "पासवर्ड बदल दिया गया है!" });
        } else {
            res.status(400).json({ success: false, error: "पुराना पासवर्ड गलत है!" });
        }
    } catch(e) {
        res.status(500).json({ error: "Server error" });
    }
});

// Form Submissions
app.post('/api/submit', upload.array('document', 10), (req, res) => {
    const { name, mobile, form_type, query, description } = req.body;
    const files = req.files;
    const doc_paths = files ? files.map(f => f.path).join(',') : null;

    if(!name || !mobile || !form_type || !doc_paths) {
        return res.status(400).json({ error: "सभी ज़रूरी फील्ड और कम से कम एक डॉक्यूमेंट भरें!" });
    }

    let data = [];
    try {
        data = JSON.parse(fs.readFileSync(DB_FILE));
    } catch(e) { data = []; }

    const newApp = {
        id: data.length > 0 ? data[data.length - 1].id + 1 : 1,
        name, mobile, form_type, query, description, doc_path: doc_paths,
        status: 'Pending'
    };

    data.push(newApp);
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

    res.status(200).json({ message: "सफलतापूर्वक जमा हो गया!", id: newApp.id });
});

app.get('/api/status/:mobile', (req, res) => {
    const mobile = req.params.mobile;
    try {
        const data = JSON.parse(fs.readFileSync(DB_FILE));
        const userApp = data.reverse().find(item => item.mobile === mobile);
        if(userApp) {
            res.status(200).json({ name: userApp.name, form_type: userApp.form_type, status: userApp.status });
        } else {
            res.status(404).json({ message: "इस नंबर से कोई फॉर्म नहीं मिला।" });
        }
    } catch(e) {
        res.status(500).json({ message: "एरर!" });
    }
});

app.get('/api/admin/applications', (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(DB_FILE));
        res.json(data.reverse());
    } catch(e) {
        res.json([]);
    }
});

app.post('/api/admin/status', (req, res) => {
    const { id, status } = req.body;
    try {
        let data = JSON.parse(fs.readFileSync(DB_FILE));
        data = data.map(item => {
            if(item.id === Number(id)) item.status = status;
            return item;
        });
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
        res.json({ message: "Status updated successfully" });
    } catch(e) {
        res.status(500).json({ error: "Update failed" });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
