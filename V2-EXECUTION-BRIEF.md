# V2 EXECUTION BRIEF — SAHAB (وثيقة تنفيذ إلزامية)

> **للمنفّذ (Kimi K2.7 Code):** هذه الوثيقة عقد تنفيذ كامل. نفّذها خطوة بخطوة بالترتيب، على branch اسمه `v2`، ولا تخرج عن نصوصها. قائد الفريق سيراجع عملك آليًا وبصريًا على نفس معايير القبول المذكورة هنا.

---

## 0) سياق المشروع (اقرأه أولًا)

- **المشروع:** صفحة هبوط فاخرة لمطعم "SAHAB — سحاب" (شامي مودرن، دبي) — قطعة بورتفوليو.
- **لايف:** `https://opusstudiohq-max.github.io/sahab-dubai/` · الريبو: `https://github.com/opusstudiohq-max/sahab-dubai`
- **البنية الحالية:**
```
index.html            ← النسخة الإنجليزية (lang="en")
css/style.css         ← كل الستايل (+ css/fonts.css للخطوط المحلية)
js/main.js            ← Lenis + GSAP + كل الأنيميشن
vendor/               ← gsap.min.js · ScrollTrigger.min.js · lenis.min.js (محلي)
assets/img/           ← 11 صورة نهائية (hero.jpg, chef.jpg, dish-1..5.jpg, interior-1..4.jpg)
assets/video/hero.mp4 ← فيديو الهيرو (17MB, 1080p, 10s)
assets/fonts/         ← خطوط woff2 محلية (Marcellus, Manrope, Amiri)
assets/pattern.svg    ← باترن خلفية
```
- **التشغيل محليًا:** `python -m http.server 8123` ثم `http://127.0.0.1:8123/`
- **الهوية (لا تتغير):** خلفية `#0C0F14` / نص عاجي `#EFE7D8` / نحاسي `#C6A15B` / خطوط Marcellus (عناوين EN) + Manrope (نص EN) + Amiri (عربي).
- **الأنيميشن (لا تلمسه):** preloader بعدّاد، split-text للهيرو، Lenis smooth scroll، قسم أطباق أفقي مثبّت (GSAP ScrollTrigger pin — ديسكتوب فقط ≥901px)، parallax للجاليري، أزرار magnetic، custom cursor (pointer:fine فقط)، وضع `no-motion` احتياطي.

---

## 1) تشخيص أخطاء الموبايل (المطلوب إصلاحها — بالدليل)

| # | المشكلة | السبب التقني | الخطورة |
|---|---------|--------------|---------|
| 1 | عنوان الهيرو يكسر على 4 أسطر ويأكل شاشة 360px | `.hero__title` أرضية الـ clamp `2.9rem` | عالية |
| 2 | فيديو 17MB يعمل autoplay على الموبايل | `js/main.js` — لا بوابة حجم شاشة | عالية |
| 3 | كابتن الجاليري يسبب سكرول أفقي للصفحة | `.space__fig figcaption` — `nowrap` + `absolute` + tracking عريض ≈450px | عالية |
| 4 | grain animation مستمر = repaints وتهنيج | `.grain` — `animation` infinite على div 200% | متوسطة |
| 5 | زر البرغر ~30×25px (المطلوب ≥44px) | `.nav__burger` — padding قليل | متوسطة |
| 6 | الناف يختفي أثناء السكرول ومنيو الموبايل مفتوحة | `js/main.js` — hide بدون فحص حالة المنيو | متوسطة |
| 7 | سطور التذوّق تتزحم على 360px | `.tasting__note` — `max-width:48%` في flex row | متوسطة |
| 8 | الإحصائيات تلتف 2+1 بشكل غير متوازن | `.story__stats` — flex-wrap على 640px | منخفضة |
| 9 | حقول الفورم < 44px | `.field input/select` — بلا min-height | منخفضة |
| 10 | حقل التاريخ يعرض لغة نظام التشغيل | سلوك متصفح — تُحل بوجود /ar/ الصحيحة | منخفضة |
| 11 | محتوى الهيرو قد يُقصّ على الشاشات القصيرة | `.hero` min-height + محتوى طويل | منخفضة |
| 12 | لا safe-area للنوتش | عناصر سفلية fixed/absolute | منخفضة |

فرص أداء: `hero.jpg` هو الـ LCP ولا يُحمّل مسبقًا؛ الصور بلا `decoding="async"`.

---

## 2) المرحلة A — إصلاحات الموبايل (نفّذها كلها)

كل تعديل في `css/style.css` ما لم يُذكر غير ذلك. التزم بنفس أسلوب الكود الموجود.

### A1. الهيرو
- `.hero__title`: اجعلها `font-size: clamp(2.05rem, 11vw, 8rem);` وأضف `text-wrap: balance;`
- `.h2`: أضف `text-wrap: balance;`
- أضف في آخر ملف الـ CSS ضمن قسم الـ media queries:
```css
@media (max-width: 640px) {
  .hero__content { margin-top: 0; }
  .hero__ctas .btn { width: min(100%, 19rem); }
  .hero__sub { font-size: 0.95rem; }
}
@media (max-height: 700px) {
  .hero { min-height: 34rem; }
  .hero__scroll { display: none; }
}
```

### A2. بوابة الفيديو على الموبايل (الأهم أداءً)
- في `index.html`: `<source data-src="assets/video/hero.mp4" type="video/mp4">` (بدون `src`) وغيّر `preload="auto"` إلى `preload="none"`.
- في `js/main.js` — عدّل بلوك `heroVideo` الحالي ليصبح المنطق: إذا `window.innerWidth >= 768 && !saveData` ← انسخ `data-src` إلى `src` على الـ source، استدعِ `heroVideo.load()`، ثم أكمِل منطق `loadeddata`/`error`/`play()` الحالي كما هو. غير ذلك: `heroVideo.remove()` (تبقى `hero.jpg` بوزن 313KB فقط).

### A3. كابتن الجاليري (إصلاح السكرول الأفقي)
```css
@media (max-width: 900px) {
  .space__fig { aspect-ratio: auto; }
  .space__fig .space__frame { position: relative; aspect-ratio: 4 / 3; }
  .space__fig figcaption { position: static; margin-top: 0.8rem; white-space: normal; letter-spacing: 0.12em; }
}
```

### A4. الـ grain
```css
@media (max-width: 900px) { .grain { animation: none; opacity: 0.04; } }
```

### A5. البرغر 44×44
```css
.nav__burger { width: 44px; height: 44px; align-items: center; justify-content: center; gap: 7px; padding: 0; margin-left: auto; }
```
(حافظ على سلوك الخطين و`is-open` كما هو.)

### A6. الناف والمنيو — في `js/main.js`
داخل `lenis.on("scroll", ...)`: غلّف منطق الإخفاء بـ `if (!mmenu.classList.contains("is-open")) { ... }`.

### A7. سطور التذوّق
```css
@media (max-width: 640px) {
  .tasting__list li { flex-wrap: wrap; }
  .tasting__list li::before { width: auto; margin-inline-end: 0.6rem; }
  .tasting__course { flex: 1; }
  .tasting__note { flex-basis: 100%; max-width: none; text-align: start; padding-inline-start: 2.2rem; }
}
```
استخدم الخصائص المنطقية كما هي مكتوبة — تصح تلقائيًا في RTL.

### A8. الإحصائيات
`.story__stats`: بدّل `display:flex; flex-wrap:wrap;` إلى `display:grid; grid-template-columns: repeat(3, minmax(0,1fr));` بنفس الـ gap، واحذف سطر الـ gap داخل media 640 الخاص بها.

### A9. الفورم
`.field input, .field select { min-height: 44px; }`

### A10. safe-area
```css
.hero__loc { left: calc(clamp(1.4rem, 4vw, 3.4rem) + env(safe-area-inset-left)); bottom: calc(2.1rem + env(safe-area-inset-bottom)); }
.footer__bottom { padding-bottom: env(safe-area-inset-bottom); }
```

### A11. أداء
- أضف `decoding="async"` لكل `<img>` عدا صورة الهيرو (لها `fetchpriority="high"`).
- في `<head>` بكل صفحة: `<link rel="preload" as="image" href="assets/img/hero.jpg">` (في /ar/: `../assets/img/hero.jpg`).

### A12. زر حجز ثابت على الموبايل
- HTML قبل `</main>` مباشرة (وفي العربية بنص `احجز طاولتك`):
```html
<a href="#reserve" class="mobile-cta" data-scroll>Reserve a Table</a>
```
- CSS:
```css
.mobile-cta { display: none; }
@media (max-width: 900px) {
  .mobile-cta { display: flex; position: fixed; z-index: 900; inset-inline: 1rem; bottom: calc(0.9rem + env(safe-area-inset-bottom)); align-items: center; justify-content: center; padding: 1rem; background: var(--brass); color: var(--ink); font-size: 0.72rem; font-weight: 600; letter-spacing: 0.3em; text-transform: uppercase; box-shadow: 0 10px 30px rgba(12,15,20,.5); }
}
```
- JS: أخفِه عند ظهور `#reserve` في الشاشة (IntersectionObserver, threshold 0.15) بتبديل كلاس/ستايل.

---

## 3) المرحلة B — النسخة العربية

### B1. الهيكل
- أنشئ `ar/index.html` — نسخة كاملة من `index.html` مع: `<html lang="ar" dir="rtl">` + كل النصوص من §B5 حرفيًا + كل مسارات الأصول بادئة `../` (css, js, vendor, assets, والـ href الداخلي `#reserve` يبقى كما هو).
- لا redirects. التبديل بزرار في الناف.

### B2. خط Tajawal
- حمّل **Tajawal** أوزان 300/400/500 (subsets: arabic + latin) بصيغة woff2 من Google Fonts css2 API (بـ User-Agent متصفح حديث) إلى `assets/fonts/` بأسماء `tajawal-300-normal-arabic.woff2`... إلخ، وأضف بلوكات `@font-face` لها في `css/fonts.css`.
- الاستخدام: نصوص الصفحة العربية فقط (انظر §B3). العناوين العربية تستخدم Amiri الموجود.

### B3. بلوك RTL — يُضاف في آخر `css/style.css`
```css
/* ── RTL (Arabic) ── */
html[dir="rtl"] body { font-family: "Tajawal", var(--font-body); }
html[dir="rtl"] .h2, html[dir="rtl"] .hero__title, html[dir="rtl"] .dish__name,
html[dir="rtl"] .tasting__course, html[dir="rtl"] .reserve__details dd,
html[dir="rtl"] .footer__logo, html[dir="rtl"] .voice p { font-family: var(--font-ar); }
html[dir="rtl"] * { letter-spacing: normal; }
html[dir="rtl"] .eyebrow, html[dir="rtl"] .nav__logo-city, html[dir="rtl"] .btn { letter-spacing: 0.06em; }
html[dir="rtl"] .dishes__track { direction: ltr; }
html[dir="rtl"] .dish, html[dir="rtl"] .dishes__end { direction: rtl; text-align: right; }
html[dir="rtl"] .dish__num { right: auto; left: 1.6rem; }
html[dir="rtl"] .hero__loc { left: auto; right: calc(clamp(1.4rem,4vw,3.4rem) + env(safe-area-inset-right)); }
html[dir="rtl"] .dishes__hint span { transform: scaleX(-1); display: inline-block; }
html[dir="rtl"] .skip-link { left: auto; right: 1.2rem; }
```
ثم افحص بصريًا: الناف، الإحصائيات، التذوّق، الفورم، الفوتر (flex/grid تنعكس تلقائيًا) — أي انحراف أصلحه داخل نفس البلوك فقط. الأسعار والأرقام لاتينية (`145 د.إ`).

### B4. التبديل و SEO
- في ناف الصفحتين قبل زر Reserve: `index.html` ← `<a class="nav__link" href="ar/">عربي</a>` · `ar/index.html` ← `<a class="nav__link" href="../">EN</a>`. وأضف نفس اللينك داخل `.mmenu__nav` في الصفحتين.
- في `<head>` للصفحتين:
```html
<link rel="alternate" hreflang="en" href="https://opusstudiohq-max.github.io/sahab-dubai/">
<link rel="alternate" hreflang="ar" href="https://opusstudiohq-max.github.io/sahab-dubai/ar/">
<link rel="alternate" hreflang="x-default" href="https://opusstudiohq-max.github.io/sahab-dubai/">
```
- JSON-LD في العربية: `"name": "سحاب"` وباقي الحقول كما هي.

### B5. محتوى العربية (يُنسخ حرفيًا — ممنوع إعادة الصياغة)

**head:** `<title>سحاب — مائدة شامية حديثة · داون تاون دبي</title>` · description: `سحاب — مائدة شامية حديثة على بُعد اثنين وخمسين طابقًا فوق داون تاون دبي. مطبخ بلمسة النار، وقائمة تذوق من سبعة أطباق، وإطلالة فوق السحاب.`

**skip link:** `تخطَّ إلى المحتوى` · **الناف:** `حكايتنا` `القائمة` `المكان` `احجز` · اللوجو لاتيني كما هو (SAHAB + DUBAI). **منيو الموبايل:** نفس الروابط + `سكاي فيو تاور، الطابق 52 — داون تاون دبي`.

**الهيرو:** eyebrow `أهلاً — مرحبًا بكم في سحاب` · H1 سطرين: `مذاق الشام الحديث` / `فوق السحاب.` (مع `<em>السحاب.</em>` للنحاسي) · sub `مطبخ شامي معاصر بلمسة النار، على بُعد اثنين وخمسين طابقًا فوق داون تاون دبي.` · CTAs `احجز طاولتك` / `استكشف القائمة` · الموقع `سكاي فيو تاور · الطابق 52 · داون تاون دبي` · مؤشر `مرّر`

**الشريط:** `سحاب ✦ مائدة شامية حديثة ✦ SAHAB ✦ داون تاون دبي ✦ منذ 2024 ✦`

**الستوري:** eyebrow `حكايتنا` · H2 `من الشام، بالنار.` · أول `سحاب — أي الغيم — رسالة حبٍّ إلى بلاد الشام، تُقدَّم على بُعد اثنين وخمسين طابقًا فوق داون تاون دبي. يحمل الشيف كريم حدّاد نكهات حلب وبيروت إلى العصر الحديث: فحمٌ وزعفران وماء زهرٍ ودخان.` · ثاني `كل طبقٍ يبدأ فوق نارٍ مكشوفة، وكل أمسيةٍ تنتهي فوق السحاب.` · كابتن `الشيف التنفيذي كريم حدّاد — حلب · بيروت · دبي` · إحصائيات: `طابقًا فوق المدينة` / `أطباق في قائمة التذوق` / `نار حطبٍ لا تنطفئ`

**الأطباق:** eyebrow `توقيعنا` · H2 `أطباق تحمل وطنًا.` · تلميح `مرّر` · النهاية `شهية طيبة` + `تذوّقها جميعًا`
1. `حمص مدخّن بالواغيو` — `حمص مدخن، شاورما واغيو، صنوبر، زبدة بنية` — `145 د.إ`
2. `جمبري الفحم بزبدة حلبية` — `رماد ليمون، ثوم بري، خبز محمص` — `195 د.إ`
3. `ريش ضأن بقشرة الزعتر` — `فريكة، لبنة مدخنة، صلصة رمان` — `285 د.إ`
4. `قاروص على نار الحطب` — `أرز صيادية، زبدة طحينة، ليمون محروق` — `260 د.إ`
5. `كنافة بالزعفران` — `قشطة، برالين فستق، ماء زهر` — `95 د.إ`

**التذوّق:** eyebrow `التجربة` · H2 `قائمة تذوق السحاب` · meta `سبعة أطباق · 650 د.إ للضيف · للطاولة كاملة فقط`
1. `حمص مدخّن بالواغيو` — `صنوبر · زبدة بنية`
2. `كبة نية` — `ضأن مُعتّق · برغل · زيت شطة مدخن`
3. `جمبري الفحم` — `زبدة حلبية · رماد ليمون`
4. `فريكة بالفطر البري` — `حلومي معتّق · ثوم أسود`
5. `ريش ضأن بالزعتر` — `لبنة مدخنة · صلصة رمان`
6. `عكاوي بعسل اللافندر` — `تُويل سمسم`
7. `كنافة بالزعفران` — `قشطة · فستق`
pairing: `توليفة مشروبات +300 د.إ · توليفة غير كحولية +180 د.إ` · زر `احجز قائمة التذوق`

**المكان:** eyebrow `المكان` · H2 `مصمَّم لساعة الغسق.` · كابتنز: `قاعة الطعام — ظلال المشربية` / `الإطلالة — داون تاون من الطابق 52` / `كاونتر النار — ثمانية مقاعد وشعلة واحدة` / `نحاسٌ وجوز وضوء نار`

**الآراء:** eyebrow `قالوا عنا` · H2 `ماذا تقول دبي؟`
1. «رسالة حبٍّ إلى الشام، كُتبت على بُعد اثنين وخمسين طابقًا فوق المدينة.» — `تايم آوت دبي`
2. «الافتتاح الأكثر إثارةً هذا الموسم. احجزوا قبل الجميع.» — `واتس أون دبي`
3. «كنافة تستحق مشوار المصعد وحدها.» — `جورميه ترافلر`

**الحجز:** eyebrow `الحجز` · H2 `احجز أمسيتك.` · `العنوان: سكاي فيو تاور، الطابق 52، داون تاون دبي، الإمارات` · `الهاتف: +971 4 321 7890` · `البريد: reserve@sahabdubai.ae` · `الساعات: الثلاثاء – الأحد، 6:30 مساءً – 12:00 منتصف الليل` · `الزي: أنيق رسمي`
فورم: `الاسم` (`اسمك الكامل`) · `الهاتف` (`+971 5x xxx xxxx`) · `التاريخ` · `الوقت` · `عدد الضيوف` (`ضيفان`، `3 ضيوف`، `4 ضيوف`، `5 ضيوف`، `6 ضيوف`، `+7 — قاعة خاصة`) · زر `اطلب طاولة` · نجاح `شكرًا — استلمنا طلبك، وسنؤكد برسالة نصية خلال ساعة.`

**الفوتر:** براند `مائدة شامية حديثة فوق السحاب.` · `زورونا` / `تواصل` / `تابعنا` (`إنستغرام` `تيك توك` `تريب أدفايزر`) · `© 2025 سحاب · داون تاون دبي` + `Design & build — KingWare Studio` (لاتيني كما هو).

**الـ alts:** ترجم كلها (مثال: `قاعة طعام سحاب ليلًا — نحاس وأقواس وضوء نار فوق أفق دبي`).

---

## 4) المرحلة C — QA إلزامي قبل التسليم

1. شغّل سكريبت القبول الجاهز:
```bash
python -m http.server 8123 &
cd tools && npm i playwright-core && cd ..
node tools/qa-audit.mjs
```
(السكريبت يفحص الصفحتين على 360×740 و390×844 و768×1024 و1440×900 ويحفظ لقطات في `tools/shots/`.)
2. **معايير القبول الآلية (كلها PASS إلزامي):**
   - لا سكرول أفقي: `scrollWidth === clientWidth` على كل مقاس وكل صفحة
   - لا `pageerror` ولا طلبات خارج `127.0.0.1`
   - موبايل (<768px): `#hero-video` غير موجود في DOM
   - `/ar/`: `dir="rtl" lang="ar"` + لا letter-spacing غير `normal`/`0.06em` على النصوص
   - كل أهداف اللمس ≥ 40px
3. راجع اللقطات بصريًا (كل الأقسام + المنيو المفتوحة + الهيرو بعد الـ preloader).
4. حدّث `README.md`: سطر عن النسختين `/` و `/ar/` — ولا تلمس `MEDIA-SHOTLIST.md`.

---

## 5) قواعد صارمة

1. branch: `v2` — commits: (أ) إصلاحات الموبايل A1–A12، (ب) RTL + خط Tajawal، (ج) الصفحة العربية، (د) QA وREADME.
2. **لا تعدّل:** الأنيميشن الأساسي (preloader/hero intro/horizontal pin/parallax)، `vendor/`، ألوان `:root`، أسماء الأصول، ترتيب الأقسام.
3. لا مكتبات ولا frameworks ولا خطوط غير Tajawal.
4. CSS الجديد في `css/style.css` فقط (بلوك RTL في آخره) — ممنوع ملفات CSS جديدة.
5. النصوص العربية من §B5 حرفيًا.
6. عند استحالة تنفيذ بند: وثّقه في التقرير — ممنوع الارتجال.
7. **تقرير التسليم:** الملفات المعدلة + نتائج السكريبت (PASS/FAIL لكل بند) + لقطات قبل/بعد لأقسام الموبايل.
