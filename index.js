const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
app.use(express.json());

app.post('/create-trial', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send("الرجاء إدخال اسم المستخدم وكلمة المرور.");
  }

  try {
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();

    // تسجيل الدخول للوحة NovaPanel
    await page.goto('https://panelres.novalivetv.com/login');
    await page.type('input[name="username"]', 'hammadi2024');
    await page.type('input[name="password"]', 'mtwajdan700');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    // الانتقال إلى صفحة الاشتراكات التجريبية وإنشاء حساب
    await page.goto('https://panelres.novalivetv.com/subscriptions/create');
    await page.type('input[name="username"]', username);
    await page.type('input[name="password"]', password);
    await page.select('select[name="package_id"]', '1'); // قد تحتاج لتعديل قيمة الباقة
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    await browser.close();
    res.send(`تم إنشاء الحساب بنجاح: ${username}`);
  } catch (error) {
    console.error(error);
    res.status(500).send("حدث خطأ أثناء إنشاء الحساب التجريبي.");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});