app.post('/create-trial', async (req, res) => {
  const { username, password } = req.body;

  // التحقق من البيانات المدخلة
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: "يجب تقديم اسم مستخدم وكلمة سر صالحة"
    });
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--single-process'
    ],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath()
  });

  try {
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(120000); // 120 ثانية

    // 1. تسجيل الدخول
    console.log("محاولة تسجيل الدخول...");
    await page.goto('https://panelres.novalivetv.com/login', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await page.waitForSelector('input[name="username"]', { visible: true, timeout: 10000 });
    await page.type('input[name="username"]', 'hammadi2024');
    await page.type('input[name="password"]', 'mtwajdan700');
    
    const loginButton = await page.waitForSelector('button[type="submit"]', { visible: true });
    await loginButton.click();

    // الانتظار للتحقق من نجاح التسجيل
    try {
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });
      console.log("تم التسجيل بنجاح");
    } catch (navError) {
      throw new Error("فشل في تسجيل الدخول: لم يتم التوجيه إلى الصفحة المطلوبة");
    }

    // 2. إنشاء الاشتراك
    console.log("الانتقال إلى صفحة الإنشاء...");
    await page.goto('https://panelres.novalivetv.com/subscriptions/add-subscription', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    // تعبئة البيانات الأساسية
    await page.waitForSelector('input[formcontrolname="username"]', { visible: true });
    await page.type('input[formcontrolname="username"]', username);
    await page.type('input[formcontrolname="password"]', password);
    await page.type('input[formcontrolname="mobileNumber"]', '+966500000000');

    // الضغط على Next مع معالجة خاصة
    const nextButton = await page.waitForXPath(
      '//button[contains(., "Next") or contains(., "التالي")]',
      { visible: true, timeout: 10000 }
    );
    await nextButton.click();

    // معالجة خطوة اختيار الباقة
    await page.waitForTimeout(2000); // انتظار تحميل العناصر
    const packageSelect = await page.waitForSelector('mat-select[formcontrolname="package"]', { timeout: 10000 });
    await packageSelect.click();
    
    const trialPackage = await page.waitForXPath(
      '//mat-option//span[contains(., "12 ساعة") or contains(., "تجربة")]',
      { timeout: 10000 }
    );
    await trialPackage.click();

    // الخطوات النهائية
    const saveButton = await page.waitForXPath(
      '//button[contains(., "Save") or contains(., "حفظ")]',
      { visible: true, timeout: 10000 }
    );
    await saveButton.click();

    // التحقق النهائي من النجاح
    await page.waitForSelector('.alert-success, .toast-success', { timeout: 15000 });
    console.log("تم إنشاء الحساب بنجاح");

    res.json({
      success: true,
      data: {
        username: username,
        password: password,
        expires_in: "12 ساعة",
        instructions: "استخدم هذه البيانات في تطبيق IPTV المفضل لديك"
      }
    });

  } catch (error) {
    console.error("تفاصيل الخطأ:", error);
    
    // تصنيف الأخطاء
    const errorMessage = error.message.includes('navigation timeout') 
      ? "تم تجاوز وقت الانتظار - الخادم غير مستجيب"
      : error.message.includes('waitForSelector') 
        ? "تغيرت واجهة المستخدم - الرجاء تحديث السكربت"
        : "حدث خطأ فني - الرجاء المحاولة لاحقا";

    res.status(500).json({
      success: false,
      error: errorMessage,
      technical_details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    await browser.close();
  }
});
