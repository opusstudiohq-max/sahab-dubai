# SAHAB — ليستة الشوتس المطلوبة (AI Shot List)

كل صورة تحتها: **اسم الملف المطلوب بالظبط** + المقاس + البرومبت الإنجليزي الجاهز.
ولّد الصور وارميها في فولدر `assets/img/` **بنفس الأسماء** — هتستبدل الـ placeholders تلقائيًا من غير ما تلمس سطر كود واحد.

> قاعدة ستايل عامة (موجودة في كل برومبت): إضاءة دافئة نحاسية، خلفية غامقة، إحساس سينمائي فاخر.
> ممنوع: نصوص، لوجوهات، ووترمارك، أشخاص وشوشهم ظاهرة في صور الأطباق.

---

## 1) `hero.jpg` — 1920×1080 (16:9) — أهم صورة في المشروع

```
Ultra-luxury modern Levantine fine-dining restaurant interior at night, floor-to-ceiling windows revealing the glittering Dubai skyline from a high floor, elegant arched niches with mashrabiya lattice casting geometric shadows, brass and walnut details, intimate candlelit tables, warm amber rim lighting, deep shadows, cinematic editorial photography, moody atmosphere, wide 16:9 composition, photorealistic, 8k, no text, no watermark
```

---

## الفيديو — `assets/video/hero.mp4` (10 ثواني) — قرار نهائي: فيديو واحد 16:9

**ليش واحد مش اتنين؟** الـ CSS بيعمل `object-fit: cover` — نفس الفيديو 16:9 بيملى الديسكتوب كامل، وعلى الموبايل بيقتص من الجناب ويبقى مركّز على المنتصف. طالما العنصر الأساسي في نص الفريم، النتيجة مثالية في الاتنين من غير ما نضاعف الحجم والتوليد.

**الموقع مبرمَج وجاهز:** أول ما تحط الملف في `assets/video/` باسم `hero.mp4` هيتركّب تلقائيًا فوق صورة الهيرو (موبايل + ديسكتوب)، ولو الملف مش موجود بيفضل على صورة `hero.jpg` بدون أي كسر — يعني الصفحة شغالة في الحالتين.

**إعدادات التوليد المطلوبة:** 16:9 · 1080p · 10s · seamless loop · العنصر الأساسي في منتصف الفريم.

```
Slow cinematic camera push-in inside an ultra-luxury modern Levantine fine-dining restaurant at night, gliding toward floor-to-ceiling windows revealing the glittering Dubai skyline from a high floor, elegant arched niches with mashrabiya lattice shadows, brass and walnut details, candle flames flickering on intimate candlelit tables, warm amber lighting, city lights twinkling outside, subtle atmospheric haze, main subject centered in frame, photorealistic, seamless loop, 16:9, no people, no text, no watermark
```

> لو الأداة بتدعم negative prompt:
> `people, faces, text, watermark, logo, fast camera movement, shaky footage, cuts`

**مهم:** ولّد `hero.jpg` (الصورة) من نفس الستايل — لأنها بتظهر كـ poster لحظة تحميل الفيديو، وكـ fallback للموبايل الضعيف. كل ما يكونوا أقرب لبعض، الانتقال بينهم يكون أنعم.

---

## 2) `chef.jpg` — 900×1200 (3:4 بورتريه)

```
Portrait of a Levantine executive chef in his 40s with a short beard, wearing a dark modern chef jacket, finishing a dish over open wood fire in a dark moody kitchen, sparks and warm firelight on his face, focused expression, shallow depth of field, cinematic editorial photography, dark background with brass tones, photorealistic, no text, no watermark
```

---

## 3) `dish-1.jpg` — 1000×1250 (4:5)

```
Fine-dining plate of smoked hummus topped with wagyu beef shawarma slices, toasted pine nuts and brown butter drizzle, dark ceramic plate on black stone table, moody dark food photography, warm side lighting, subtle smoke wisps, michelin star plating, shallow depth of field, photorealistic, no text, no watermark
```

## 4) `dish-2.jpg` — 1000×1250

```
Charcoal-grilled jumbo prawns glazed with Aleppo pepper butter, lemon ash and wild garlic, on a dark handmade ceramic plate, black slate background, moody michelin star food photography, warm dramatic side light, glistening butter, photorealistic, no text, no watermark
```

## 5) `dish-3.jpg` — 1000×1250

```
Zaatar-crusted lamb rack sliced pink, over freekeh with smoked labneh quenelle and pomegranate jus drops, dark elegant plate, moody michelin star food photography, warm cinematic lighting, dark stone background, photorealistic, no text, no watermark
```

## 6) `dish-4.jpg` — 1000×1250

```
Wood-fired whole sea bass fillet over golden sayadieh rice, tahini beurre blanc and burnt lemon half, dark ceramic plate, charred crispy skin, moody michelin star food photography, warm dramatic lighting, black background, photorealistic, no text, no watermark
```

## 7) `dish-5.jpg` — 1000×1250

```
Modern deconstructed saffron knafeh with golden crispy kataifi, clotted cream quenelle, crushed pistachio praline and orange blossom syrup, dark plate, moody fine-dining dessert photography, warm side light, steam of syrup, dark background, photorealistic, no text, no watermark
```

---

## 8) `interior-1.jpg` — 1600×1200 (4:3)

```
Luxury restaurant dining room with modern Islamic arches and mashrabiya wooden lattice screens casting intricate geometric shadows on the floor, brass pendant lights, candlelit tables with ivory tablecloths, dark moody ambiance, warm amber lighting, architectural editorial photography, photorealistic, no people, no text, no watermark
```

## 9) `interior-2.jpg` — 1200×1600 (3:4 بورتريه)

```
View through floor-to-ceiling restaurant window at dusk, Dubai downtown skyline with illuminated towers below, silhouette of an elegant set table with brass candle holder in the foreground, high-floor 52nd level perspective, blue hour sky, warm interior glow, cinematic architectural photography, photorealistic, no text, no watermark
```

## 10) `interior-3.jpg` — 1280×1600 (4:5)

```
Intimate chef's counter with eight leather seats around an open wood-fire grill, flames and embers glowing, dark stone and brass details, moody luxurious atmosphere, dramatic firelight, editorial interior photography, photorealistic, no people, no text, no watermark
```

## 11) `interior-4.jpg` — 1600×1200 (4:3)

```
Close-up detail of a luxury restaurant bar: brass rail, walnut wood, amber backlit shelves with arak and wine bottles, coupe glass with orange blossom garnish, warm candlelight bokeh, dark moody editorial photography, shallow depth of field, photorealistic, no text, no watermark
```

---

### ملاحظات
- لو الأداة بتطلع نسب أبعاد مختلفة، الأقرب نسبة تمام — الـ CSS بيعمل crop أنيق (`object-fit: cover`).
- أولوية التوليد لو هتعملهم على دفعات: **hero.jpg** أولًا، بعدين الأطباق الخمسة، بعدين الباقي.
- لما تخلص قول لي «الصور جاهزة» وأنا أراجعها وأظبط أي قصّ أو تباين محتاج.