const express = require('express');
const puppeteer = require('puppeteer');
const bodyParser = require('body-parser');

const app = express();
// Railway automatically sets process.env.PORT
const PORT = process.env.PORT || 3000;

// Allow large HTML payloads (50mb)
app.use(bodyParser.json({ limit: '50mb' }));

let browser;

async function initBrowser() {
  browser = await puppeteer.launch({
    headless: "new",
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', // Critical for Docker/Railway memory
      '--disable-gpu'
    ]
  });
  console.log("Browser Launched Successfully");
}

initBrowser();

app.post('/generate-pdf', async (req, res) => {
  const { html } = req.body;

  if (!html) {
    return res.status(400).send({ error: "Missing 'html' in request body" });
  }

  let page;
  try {
    page = await browser.newPage();
    
    // Load the HTML content
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': pdfBuffer.length,
    });
    
    res.send(pdfBuffer);

  } catch (error) {
    console.error("PDF Gen Error:", error);
    // If browser crashed, try to restart it
    if (!browser || !browser.isConnected()) {
        await initBrowser();
    }
    res.status(500).send({ error: "Generation failed" });
  } finally {
    if (page) await page.close();
  }
});

process.on('SIGINT', async () => {
  if (browser) await browser.close();
  process.exit();
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
