require('dotenv').config();
const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// توليد بيانات اعتماد عشوائية
const generateCredentials = () => {
  const random = Math.floor(Math.random() * 9000) + 1000;
  return {
    username: `trial_${random}`,
    password: `pass_${random}`
  };
};

// مسار إنشاء الحساب التجريبي
app.post('/api/create-account', async (req, res) => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath()
  });

  const page = await browser.newPage();
  await page.setDefaultNavigationTimeout(60000);

  try {
    // 1. تسجيل الدخول إلى لوحة التحكم
    console.log('جارٍ تسجيل الدخول...');
    await page.goto('https://panelres.novalivetv.com/login', { 
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await page.type('input[name="username"]', process.env.ADMIN_USERNAME || 'hammadi2024');
    await page.type('input[name="password"]', process.env.ADMIN_PASSWORD || 'mtwajdan700');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    // 2. الانتقال إلى صفحة إنشاء اشتراك
    console.log('جارٍ الانتقال إلى صفحة الاشتراكات...');
    await page.goto('https://panelres.novalivetv.com/subscriptions/add-subscription', {
      waitUntil: 'networkidle2'
    });

    // 3. تعبئة بيانات الحساب
    const { username, password } = generateCredentials();
    console.log(`جارٍ إنشاء حساب: ${username}`);
    
    await page.type('input[formcontrolname="username"]', username);
    await page.type('input[formcontrolname="password"]', password);
    await page.type('input[formcontrolname="mobileNumber"]', '+966500000000');
    await page.type('textarea[formcontrolname="resellerNotes"]', 'تم الإنشاء تلقائيًا');

    // 4. الضغط على Next
    const nextBtn = await page.waitForXPath('//button[contains(., "Next")]', { timeout: 10000 });
    await nextBtn.click();
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    // 5. اختيار الباقة (12 ساعة)
    await page.click('mat-select[formcontrolname="package"]');
    await page.waitForXPath('//span[contains(., "12 ساعة")]/ancestor::mat-option', { timeout: 5000 })
      .then(opt => opt.click());

    // 6. اختيار الدولة
    await page.click('mat-select[formcontrolname="country"]');
    await page.waitForXPath('//span[contains(., "All Countries")]/ancestor::mat-option', { timeout: 5000 })
      .then(opt => opt.click());

    // 7. اختيار القالب
    await page.click('mat-select[formcontrolname="bouquetTemplate"]');
    await page.waitForXPath('//span[contains(., "تحويل المحتوى كامل")]/ancestor::mat-option', { timeout: 5000 })
      .then(opt => opt.click());

    // 8. حفظ البيانات
    console.log('جارٍ حفظ البيانات...');
    const saveBtn = await page.waitForXPath('//button[contains(., "Save")]', { timeout: 10000 });
    await saveBtn.click();

    // 9. التحقق من النجاح
    await page.waitForSelector('.alert-success, .subscription-details', { timeout: 15000 });
    console.log('تم إنشاء الحساب بنجاح!');

    // 10. استخراج بيانات الحساب
    const accountInfo = await page.evaluate(() => {
      const info = {};
      const elements = document.querySelectorAll('.detail-row');
      
      elements.forEach(el => {
        const label = el.querySelector('.label')?.textContent?.trim();
        const value = el.querySelector('.value')?.textContent?.trim();
        if (label && value) info[label] = value;
      });

      return info;
    });

    // 11. إرسال الاستجابة
    res.json({
      success: true,
      account: {
        username,
        password,
        m3u_url: accountInfo['رابط التشغيل'] || accountInfo['M3U URL'] || 'غير متوفر',
        expiry_date: accountInfo['تاريخ الانتهاء'] || accountInfo['Expiry Date'] || '12 ساعة',
        creation_date: new Date().toLocaleString('ar-SA')
      }
    });

  } catch (error) {
    console.error('حدث خطأ:', error);
    
    // التقاط لقطة شاشة للتصحيح
    await page.screenshot({ path: `error-${Date.now()}.png` });
    
    res.status(500).json({
      success: false,
      error: 'فشل في إنشاء الحساب',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    await browser.close();
  }
});

// مسار الصفحة الرئيسية
app.get('/', (req, res) => {
  res.send('مرحبًا بكم في خدمة إنشاء الحسابات التجريبية');
});

// تشغيل الخادم
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ الخادم يعمل على المنفذ ${PORT}`);
  console.log(`📌 عنوان الواجهة: http://localhost:${PORT}`);
});
