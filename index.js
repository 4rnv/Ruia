const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const { Document, Packer, Paragraph, TextRun } = require('docx');
const officegen = require('officegen');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3000;

const apiKey = '3a8b762e47324d578446d17cc79d9b89'; // Replace with your actual API key
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

// async function saveToDocx(text, filename) {
//     const doc = new Document({
//         sections: [
//             {
//                 properties: {},
//                 children: [
//                     new Paragraph({
//                         children: [
//                             new TextRun(text),
//                         ],
//                     }),
//                 ],
//             },
//         ],
//     });

//     const packer = new Packer();
//     const buffer = await packer.toBuffer(doc);
//     fs.writeFileSync(filename, buffer);
// }

async function saveToDocx(text, filename) {
    const docx = officegen('docx');

    docx.on('finalize', function(written) {
        console.log('Document created with ' + written + ' bytes');
    });

    docx.on('error', function(err) {
        console.log(err);
    });

    // Create a new paragraph
    const p = docx.createP();
    p.addText(text);

    // Generate the document
    const out = fs.createWriteStream(filename);
    out.on('error', function(err) {
        console.log(err);
    });

    docx.generate(out);
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
        const filename = path.join(__dirname, `${timestamp}.docx`);
        console.log('Saving to docx file...');
        await saveToDocx(translatedText, filename);
        console.log('Sending file download...');
        res.download(filename, `${timestamp}.docx`);
    } catch (error) {
        console.error('Error handling request:', error.message);
        res.status(500).json({ error: 'Failed to translate text.' });
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
