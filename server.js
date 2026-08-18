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

// अपलोड्स (Uploads) फोल्डर बनाना
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

// डेटाबेस (JSON फाइल)
const dataFile = path.join(__dirname, 'data.json');

function readData() {
    if (!fs.existsSync(dataFile)) {
        fs.writeFileSync(dataFile, JSON.stringify([]));
    }
    const data = fs.readFileSync(dataFile);
    return JSON.parse(data);
}

function writeData(data) {
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

// 1. फॉर्म सबमिट करने का API
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

// 2. स्टेटस चेक करने का API
app.get('/api/status', (req, res) => {
    const mobile = req.query.mobile;
    const applications = readData();
    const userApp = applications.reverse().find(app => app.mobile === mobile);
    
    if (userApp) {
        res.status(200).json(userApp);
    } else {
        res.status(404).json({ message: 'इस नंबर से कोई फॉर्म नहीं मिला!' });
    }
});

// 3. एडमिन के लिए सारा डेटा
app.get('/api/admin/applications', (req, res) => {
    const applications = readData();
    res.status(200).json(applications);
});

// 4. एडमिन द्वारा स्टेटस अपडेट करने का API (कम्प्लीट होने का समय भी नोट करेगा)
app.post('/api/admin/status', (req, res) => {
    const { id, status } = req.body;
    const applications = readData();
    const appIndex = applications.findIndex(a => a.id === id);
    
    if (appIndex !== -1) {
        applications[appIndex].status = status;
        
        // अगर स्टेटस Completed किया गया है, तो आज का समय नोट कर लो
        if (status === 'Completed') {
            applications[appIndex].completedAt = Date.now();
        } else {
            // अगर वापस Pending या Processing कर दिया, तो डिलीट का टाइमर हटा दो
            delete applications[appIndex].completedAt;
        }
        
        writeData(applications);
        res.status(200).json({ message: 'Status updated' });
    } else {
        res.status(404).json({ error: 'Application not found' });
    }
});

// 5. एडमिन पासवर्ड बदलना
app.post('/api/admin/change-password', (req, res) => {
    res.status(200).json({ message: 'पासवर्ड सफलतापूर्वक बदल गया!' });
});

// होमपेज रूट
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ==========================================
// 6. ऑटो-डिलीट सिस्टम (हर 1 घंटे में चेक करेगा)
// ==========================================
function autoDeleteCompletedForms() {
    let applications = readData();
    const now = Date.now();
    // 2 दिन = 48 घंटे = 48 * 60 * 60 * 1000 मिलीसेकंड
    const twoDaysInMs = 48 * 60 * 60 * 1000; 
    
    let hasChanges = false;
    const remainingApps = [];

    applications.forEach(app => {
        // चेक करो कि फॉर्म Completed है और 2 दिन से ज्यादा समय हो गया है
        if (app.status === 'Completed' && app.completedAt && (now - app.completedAt > twoDaysInMs)) {
            // सर्वर से फाइलें (डॉक्यूमेंट/फोटो) डिलीट करो
            if (app.doc_paths && app.doc_paths.length > 0) {
                app.doc_paths.forEach(filename => {
                    const filePath = path.join(__dirname, 'uploads', filename);
                    try {
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath); 
                        }
                    } catch (err) {
                        console.error("File delete error:", err);
                    }
                });
            }
            hasChanges = true; // डेटाबेस अपडेट करने के लिए फ्लैग
        } else {
            // जो फॉर्म 2 दिन पुराने नहीं हैं, उन्हें बचा कर रखो
            remainingApps.push(app);
        }
    });

    // अगर कोई फॉर्म डिलीट हुआ है, तो नई लिस्ट को data.json में सेव कर दो
    if (hasChanges) {
        writeData(remainingApps);
    }
}

// यह टाइमर हर 1 घंटे (3600000 ms) में बैकग्राउंड में ऑटो-डिलीट फंक्शन चलाएगा
setInterval(autoDeleteCompletedForms, 60 * 60 * 1000);

// सर्वर स्टार्ट
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
