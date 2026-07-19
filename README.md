# SAHAB — Modern Levantine Dining · Downtown Dubai

صفحة هبوط فاخرة (Landing Page) لمطعم فاين داينينج شامي مودرن في دبي — قطعة بورتفوليو.

**Live:** https://opusstudiohq-max.github.io/sahab-dubai/
**Repo:** https://github.com/opusstudiohq-max/sahab-dubai

**النسخ:** الموقع يدعم لغتين — الإنجليزية في `/` والعربية في `/ar/`، مع تبديل لغة من الناف.

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

- الصور في `assets/img/` **نهائية** — مولّدة بالذكاء الاصطناعي حسب `MEDIA-SHOTLIST.md`. كل صورة لها نسخ responsive بصيغتَي AVIF وWebP بعروض متعددة متولّدة بجانب الأصل، وتُقدَّم عبر `<picture>` + `srcset` مع `loading="lazy"` لما تحت الطية.
- الفيديو أُعيد ترميزه بـ ffmpeg: `assets/video/hero.mp4` للديسكتوب (≤6MB بلا صوت، faststart) و`assets/video/hero-720.mp4` نسخة الموبايل (≤2MB)، والأصول الأصلية محفوظة في `assets/_originals/`. الفيديو لا يُحمَّل إطلاقًا على الموبايل أو الشبكات البطيئة أو reduced-motion — بوستر الهيرو يبقى البديل الدائم.

## فحص الجودة (QA)

```bash
python -m http.server 8123     # من جذر المشروع أولًا
node tools/qa-audit.mjs        # الفحص الكامل: الصفحتان × 4 مقاسات + موازنات الأوزان + لقطات
node tools/shots-desktop.mjs   # لقطات ديسكتوب إضافية في tools/shots/
```

## الرفع (استضافة مجانية)

المشروع static بالكامل — يترفع كما هو على Netlify / Vercel / GitHub Pages بدون أي إعداد.

## التخصيص السريع

| ماذا | أين |
|---|---|
| الألوان والخطوط | متغيرات `:root` أول `css/style.css` |
| العنوان / التليفون / الساعات | سكشن `#reserve` و `.footer` في `index.html` |
| سطر «Design & build» | `.footer__credit` في `index.html` — احذفه أو غيّره بحرية |
| تعطيل الأنيميشن للمستخدم | يحترم `prefers-reduced-motion` تلقائيًا |
