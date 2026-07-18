# SAHAB — Modern Levantine Dining · Downtown Dubai

صفحة هبوط فاخرة (Landing Page) لمطعم فاين داينينج شامي مودرن في دبي — قطعة بورتفوليو.

**Live:** https://opusstudiohq-max.github.io/sahab-dubai/
**Repo:** https://github.com/opusstudiohq-max/sahab-dubai

## التشغيل

- **الأسرع:** افتح `index.html` مباشرة في المتصفح.
- **الأفضل (سيرفر محلي):**
  ```bash
  python -m http.server 8000
  ```
  وافتح `http://localhost:8000`

> المشروع **self-hosted بالكامل** — المكتبات في `vendor/` والخطوط في `assets/fonts/`. يشتغل 100% بدون إنترنت.

## التقنية

- HTML / CSS / JS خالص — بدون أي build step
- GSAP 3 + ScrollTrigger (`vendor/`) — الأنيميشن والـ horizontal scroll
- Lenis (`vendor/`) — السكرول الناعم
- الخطوط: Marcellus · Manrope · Amiri — self-hosted في `assets/fonts/` مع `css/fonts.css`

## الصور والفيديو

- الصور الحالية في `assets/img/` هي **placeholders مؤقتة**. الصور النهائية تتولّد بالذكاء الاصطناعي حسب `MEDIA-SHOTLIST.md` وتوضع **بنفس أسماء الملفات** — بدون أي تعديل في الكود.
- الفيديو: حط الملف النهائي في `assets/video/hero.mp4` — هيتركّب تلقائيًا في الهيرو، ولو مش موجود بيرجع لصورة `hero.jpg` بهدوء.

## الرفع (استضافة مجانية)

المشروع static بالكامل — يترفع كما هو على Netlify / Vercel / GitHub Pages بدون أي إعداد.

## التخصيص السريع

| ماذا | أين |
|---|---|
| الألوان والخطوط | متغيرات `:root` أول `css/style.css` |
| العنوان / التليفون / الساعات | سكشن `#reserve` و `.footer` في `index.html` |
| سطر «Design & build» | `.footer__credit` في `index.html` — احذفه أو غيّره بحرية |
| تعطيل الأنيميشن للمستخدم | يحترم `prefers-reduced-motion` تلقائيًا |
