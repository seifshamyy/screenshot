const express = require('express');
const puppeteer = require('puppeteer');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: '50mb' }));

let browser;

async function initBrowser() {
  browser = await puppeteer.launch({
    headless: "new",
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--lang=ar-EG'
    ]
  });
  console.log("Browser Ready (PDF + Images)");
}

initBrowser();

// --- PDF ENDPOINT ---
app.post('/generate-pdf', async (req, res) => {
  let { html } = req.body;
  if (!html) return res.status(400).send({ error: "Missing html" });
  if (!html.includes('<meta charset="UTF-8">')) html = `<meta charset="UTF-8">\n` + html;

  let page;
  try {
    page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    });
    res.set({ 'Content-Type': 'application/pdf', 'Content-Length': pdfBuffer.length });
    res.send(pdfBuffer);
  } catch (error) {
    console.error("PDF Error:", error);
    if (!browser || !browser.isConnected()) await initBrowser();
    res.status(500).send({ error: "Failed" });
  } finally {
    if (page) await page.close();
  }
});

// --- NEW: SCREENSHOT ENDPOINT ---
app.post('/screenshot', async (req, res) => {
  let { html, type = 'png', quality = 80, fullPage = true } = req.body;
  
  if (!html) return res.status(400).send({ error: "Missing html" });
  if (!html.includes('<meta charset="UTF-8">')) html = `<meta charset="UTF-8">\n` + html;

  let page;
  try {
    page = await browser.newPage();
    
    // Set a default viewport (width is important for responsiveness)
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 }); // Scale 2 = Retina quality

    await page.setContent(html, { waitUntil: 'networkidle0' });

    const options = {
      fullPage: fullPage,
      type: type // 'png' or 'jpeg'
    };

    // Quality is only valid for jpeg
    if (type === 'jpeg') {
      options.quality = quality;
    }

    const imgBuffer = await page.screenshot(options);

    res.set({
      'Content-Type': `image/${type}`,
      'Content-Length': imgBuffer.length,
    });
    
    res.send(imgBuffer);

  } catch (error) {
    console.error("Screenshot Error:", error);
    if (!browser || !browser.isConnected()) await initBrowser();
    res.status(500).send({ error: "Failed" });
  } finally {
    if (page) await page.close();
  }
});

process.on('SIGINT', async () => {
  if (browser) await browser.close();
  process.exit();
});

app.listen(PORT, () => {
  console.log(`Listening on ${PORT}`);
});
