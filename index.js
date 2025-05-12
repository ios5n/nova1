const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");

const app = express();
app.use(cors()); // دعم CORS
app.use(express.json());

app.post("/create-trial", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send("Username and password are required.");
  }

  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.goto("https://panelres.novalivetv.com/login", {
      waitUntil: "networkidle2",
    });

    // تسجيل الدخول للوحة
    await page.type('input[name="username"]', "hammadi2024");
    await page.type('input[name="password"]', "mtwajdan700");
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: "networkidle2" }),
    ]);

    // صفحة إنشاء الاشتراك
    await page.goto("https://panelres.novalivetv.com/subscriptions/create", {
      waitUntil: "networkidle2",
    });

    await page.type("#user_name", username);
    await page.type("#user_password", password);
    await page.select("#package_id", "1");
    await page.select("#duration", "1");
    await page.click("#is_trial");

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: "networkidle2" }),
    ]);

    await browser.close();
    res.send(`تم إنشاء الحساب: ${username} / ${password}`);
  } catch (error) {
    console.error("Error creating trial:", error);
    res.status(500).send("حدث خطأ أثناء إنشاء الحساب.");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
