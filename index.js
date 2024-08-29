const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const officegen = require('officegen');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const port = 3000;

const apiKey = process.env.APIKEY; // Replace with your actual API key
const endpoint = 'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0';

app.use(bodyParser.json());
app.use(express.static('public'));

async function translateText(text, targetLanguage) {
    try {
        const response = await axios.post(
            `${endpoint}&to=${targetLanguage}`,
            [{ Text: text }],
            {
                headers: {
                    'Ocp-Apim-Subscription-Key': apiKey,
                    'Ocp-Apim-Subscription-Region': 'southeastasia',
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data[0].translations[0].text;
    } catch (error) {
        console.error('Error translating text:', error.response ? error.response.data : error.message);
        throw error;
    }
}

function saveToDocx(text, filename) {
    return new Promise((resolve, reject) => {
        const docx = officegen('docx');

        docx.on('finalize', function(written) {
            console.log('Document created with ' + written + ' bytes');
            resolve();
        });

        docx.on('error', function(err) {
            console.log(err);
            reject(err);
        });

        // Create a new paragraph
        const p = docx.createP();
        p.addText(text);

        // Generate the document
        const out = fs.createWriteStream(filename);
        out.on('finish', resolve);
        out.on('error', reject);

        docx.generate(out);
    });
}

app.post('/translate', async (req, res) => {
    console.log('Request received:', req.body);
    const { text, targetLanguage } = req.body;

    if (!text || !targetLanguage) {
        return res.status(400).json({ error: 'Text and targetLanguage are required.' });
    }

    try {
        console.log('Translating text...');
        const translatedText = await translateText(text, targetLanguage);
        console.log('Text translated:', translatedText);
        let timestamp = Date.now();
        const filename = `${timestamp}.docx`;
        console.log('Saving to docx file...');
        await saveToDocx(translatedText, filename);

        console.log('Sending file download...');
        res.download(filename, `${timestamp}.docx`, (err) => {
            if (err) {
                console.error('Error sending file:', err);
                res.status(500).json({ error: 'Failed to send the file.' });
            } else {
                fs.unlink(filename, (err) => {
                    if (err) console.error('Failed to delete file:', err);
                });
            }
        });
    } catch (error) {
        console.error('Error handling request:', error.message);
        res.status(500).json({ error: 'Failed to translate text.' });
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
