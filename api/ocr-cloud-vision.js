// api/ocr-cloud-vision.js
//
// Vercel serverless function — the backend half of the "cloudVision" OCR
// provider in App.jsx. Holds the Google Cloud Vision API key server-side
// (set as a Vercel environment variable, never committed to the repo or
// shipped to the browser).
//
// SETUP (one-time, in the Google Cloud Console):
//   1. Create a Google Cloud project (or use an existing one).
//   2. Enable billing on that project — Cloud Vision needs a billing
//      account attached, even though the first 1,000 units/month of
//      DOCUMENT_TEXT_DETECTION are free; after that it's billed per call.
//   3. Enable the "Cloud Vision API" for the project (APIs & Services ->
//      Library -> search "Cloud Vision API" -> Enable).
//   4. Create an API key (APIs & Services -> Credentials -> Create
//      Credentials -> API key). Click "Restrict key" and limit it to the
//      Cloud Vision API only, so it can't be reused for other Google APIs
//      if it ever leaks.
//
// SETUP (in Vercel, for this project):
//   1. Project Settings -> Environment Variables.
//   2. Add GOOGLE_CLOUD_VISION_API_KEY = <the key from step 4 above>.
//   3. Redeploy (env var changes need a redeploy to take effect).
//
// After that, flip OCR_ACTIVE_PROVIDER to "cloudVision" in App.jsx.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed — POST only." });
  }

  const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "GOOGLE_CLOUD_VISION_API_KEY is not set on the server. Add it in Vercel Project Settings -> Environment Variables, then redeploy.",
    });
  }

  const { imageBase64, languageHints } = req.body || {};
  if (!imageBase64) {
    return res.status(400).json({ error: "imageBase64 is required in the request body." });
  }

  try {
    const visionRes = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: imageBase64 },
            features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
            imageContext: { languageHints: Array.isArray(languageHints) && languageHints.length ? languageHints : ["te", "en"] },
          },
        ],
      }),
    });

    const data = await visionRes.json();
    const apiError = data?.responses?.[0]?.error;
    if (apiError) {
      return res.status(502).json({ error: apiError.message || "Google Cloud Vision returned an error." });
    }

    const annotation = data?.responses?.[0]?.fullTextAnnotation;
    const text = annotation?.text || "";

    // Flatten Vision's page -> block -> paragraph -> word -> symbol tree
    // into flat words with bounding boxes, then group words into "lines"
    // by Y-center proximity. This matches the { text, confidence,
    // lines: [{ text, y, words: [{ text, x, confidence }] }] } shape every
    // OCR provider in the app returns, so nothing downstream (row/column
    // detection, header matching) needs to know which engine ran.
    const words = [];
    for (const page of annotation?.pages || []) {
      for (const block of page.blocks || []) {
        for (const para of block.paragraphs || []) {
          for (const word of para.words || []) {
            const wordText = (word.symbols || []).map((s) => s.text).join("");
            const verts = word.boundingBox?.vertices || [];
            const xs = verts.map((v) => v.x || 0);
            const ys = verts.map((v) => v.y || 0);
            words.push({
              text: wordText,
              x: xs.length ? Math.min(...xs) : 0,
              y: ys.length ? (Math.min(...ys) + Math.max(...ys)) / 2 : 0,
              confidence: Math.round((word.confidence || 0) * 100),
            });
          }
        }
      }
    }
    words.sort((a, b) => a.y - b.y || a.x - b.x);

    const lines = [];
    const Y_TOLERANCE = 14; // px — words within this band are the same line
    for (const w of words) {
      let line = lines.find((l) => Math.abs(l.y - w.y) < Y_TOLERANCE);
      if (!line) { line = { y: w.y, words: [] }; lines.push(line); }
      line.words.push(w);
    }
    for (const l of lines) {
      l.words.sort((a, b) => a.x - b.x);
      l.text = l.words.map((w) => w.text).join(" ");
    }

    const confidence = words.length
      ? Math.round(words.reduce((sum, w) => sum + w.confidence, 0) / words.length)
      : 0;

    return res.status(200).json({ text, confidence, lines });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Cloud Vision request failed." });
  }
}

