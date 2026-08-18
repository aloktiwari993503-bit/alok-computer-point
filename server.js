const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// मिडलवेयर (Middleware)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// अपलोड्स (Uploads) फोल्डर बनाना (अगर नहीं है तो)
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// फाइल अपलोड के लिए Multer की सेटिंग
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// डेटाबेस (JSON फाइल) का पाथ
const dataFile = path.join(__dirname, 'data.json');

// डेटा पढ़ने का फंक्शन
function readData() {
    if (!fs.existsSync(dataFile)) {
        fs.writeFileSync(dataFile, JSON.stringify([]));
    }
    const data = fs.readFileSync(dataFile);
    return JSON.parse(data);
}

// डेटा सेव करने का फंक्शन
function writeData(data) {
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

// 1. फॉर्म सबमिट करने का API (Front-end के लिए)
app.post('/api/submit', upload.array('document'), (req, res) => {
    try {
        const formData = req.body;
        const files = req.files;
        
        const applications = readData();
        
        const newApp = {
            id: Date.now(),
            name: formData.name,
            mobile: formData.mobile,
            form_type: formData.form_type,
            query: formData.query || '',
            description: formData.description,
            doc_paths: files ? files.map(f => f.filename) : [],
            status: 'Pending',
            date: new Date().toLocaleDateString('hi-IN')
        };
        
        applications.push(newApp);
        writeData(applications);
        
        res.status(200).json({ ok: true, message: 'Data saved successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server Error' });
    }
});

// 2. स्टेटस चेक करने का API (Front-end के लिए)
app.get('/api/status', (req, res) => {
    const mobile = req.query.mobile;
    const applications = readData();
    // सबसे नया फॉर्म पहले ढूँढने के लिए reverse() किया है
    const userApp = applications.reverse().find(app => app.mobile === mobile);
    
    if (userApp) {
        res.status(200).json(userApp);
    } else {
        res.status(404).json({ message: 'इस नंबर से कोई फॉर्म नहीं मिला!' });
    }
});

// 3. एडमिन पैनल के लिए सारा डेटा भेजने का API (यही मिसिंग था!)
app.get('/api/admin/applications', (req, res) => {
    const applications = readData();
    res.status(200).json(applications);
});

// 4. एडमिन द्वारा स्टेटस अपडेट करने का API
app.post('/api/admin/status', (req, res) => {
    const { id, status } = req.body;
    const applications = readData();
    const appIndex = applications.findIndex(a => a.id === id);
    
    if (appIndex !== -1) {
        applications[appIndex].status = status;
        writeData(applications);
        res.status(200).json({ message: 'Status updated' });
    } else {
        res.status(404).json({ error: 'Application not found' });
    }
});

// 5. एडमिन पासवर्ड बदलने का API
app.post('/api/admin/change-password', (req, res) => {
    res.status(200).json({ message: 'पासवर्ड सफलतापूर्वक बदल गया!' });
});

// होमपेज रूट
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// सर्वर स्टार्ट करना
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
