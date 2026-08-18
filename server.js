const express = require('express');
const path = require('path');
const app = express();

// स्टैटिक फाइलें लोड करने के लिए
app.use(express.static(__dirname));

// वेबसाइट का होमपेज दिखाने के लिए
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Render के लिए पोर्ट सेट करना
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
