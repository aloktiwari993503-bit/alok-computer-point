const express = require('express');
const path = require('path');
const fs = require('fs');

// Multer (डॉक्यूमेंट/फाइल अपलोड को संभालने के लिए)
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // फाइलें 'uploads' फोल्डर में सेव होंगी

const app = express();

// स्टेटिक फाइलें लोड करने के लिए
app.use(express.static(__dirname));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// वेबसाइट का होमपेज दिखाने के लिए
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 🔴 नया: फॉर्म और फाइल सबमिट करने का API (जो पहले गायब था) 🔴
app.post('/api/submit', upload.array('document'), (req, res) => {
    try {
        console.log("फॉर्म का डेटा:", req.body);
        console.log("अपलोड की गई फाइलें:", req.files);
        
        // सफलतापूर्वक रिसीव होने का मैसेज वापस फ्रंटएंड को भेजना
        res.status(200).json({ ok: true, message: "डेटा और डॉक्यूमेंट सफलतापूर्वक जमा हो गए!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "सर्वर में कोई तकनीकी खराबी आ गई है!" });
    }
});

// 🔴 नया: स्टेटस चेक करने का API (जो पहले गायब था) 🔴
app.get('/api/status', (req, res) => {
    const mobile = req.query.mobile;
    
    // अभी के लिए डमी डेटा भेज रहे हैं ताकि एरर न आए
    res.status(200).json({
        name: "आवेदक",
        form_type: "ऑनलाइन फॉर्म",
        status: "Pending"
    });
});

// Render के लिए पोर्ट सेट करना
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
