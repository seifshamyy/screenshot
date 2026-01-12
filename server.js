const express = require('express');
const puppeteer = require('puppeteer');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Increase payload limit to 50mb in case your HTML strings are huge
app.use(bodyParser.json({ limit: '50mb' }));

let browser;

// Initialize the browser once on startup to save time
async function initBrowser() {
  browser = await puppeteer.launch({
    headless: "new",
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage' // Helps with memory in Docker/VPS envs
    ]
  });
  console.log("Create Browser Instance: OK");
}

initBrowser();

app.post('/generate-pdf', async (req, res) => {
  const { html } = req.body;

  if (!html) {
    return res.status(400).send({ error: "Missing 'html' in request body" });
  }

  let page;
  try {
    // Open a new tab
    page = await browser.newPage();

    // Set the content directly from your POST body
    await page.setContent(html, { 
        waitUntil: 'networkidle0' // Wait for any internal assets/fonts to load
    });

    // Generate PDF
    // 'printBackground' ensures CSS colors/images render accurately
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true, 
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
    });

    // Send the PDF back as a binary response
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': pdfBuffer.length,
    });
    
    res.send(pdfBuffer);

  } catch (error) {
    console.error("PDF Generation Error:", error);
    res.status(500).send({ error: "Failed to generate PDF" });
  } finally {
    // Always close the tab to prevent memory leaks
    if (page) await page.close();
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  if (browser) await browser.close();
  process.exit();
});

app.listen(PORT, () => {
  console.log(`PDF API listening on http://localhost:${PORT}`);
});
