# 🏢 منصة التوأم الرقمي التكيفي للمباني (Adaptive Digital Twin Platform)

> **مشروع بحثي أكاديمي متقدم:**  
> **"التوائم الرقمية التكيفية: تحسين الإشغال المكاني وإدارة المرافق بناءً على السلوك اللحظي للمستخدمين للمباني الإدارية"**  
> **الباحث:** المهندس المعماري الدكتور أحمد لؤي أحمد  
> **الجهة:** قسم هندسة العمارة - الجامعة التكنولوجية  

[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Streamlit](https://img.shields.io/badge/Streamlit-App-FF4B4B?style=for-the-badge&logo=streamlit&logoColor=white)](https://streamlit.io/)
[![Three.js](https://img.shields.io/badge/Three.js-r128-black?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)
[![BIM IFC](https://img.shields.io/badge/BIM-IFC4_STEP-00d2ff?style=for-the-badge)](https://www.buildingsmart.org/)

---

## 🏛️ نظرة عامة على المشروع (Executive Overview)
تُمثل هذه المنصة نظاماً متكاملاً للتوائم الرقمية المكانية التكيفية (Adaptive Spatial Digital Twin) يربط بين:
1. **النموذج الهندسي المعماري (BIM / IFC):** استيراد وتمثيل ثلاثي الأبعاد دقيق لبيانات الـ BIM (الجدران، الفضاءات، الأعمدة، البلاطات، السلالم، والفتحات) عبر بروتوكول ISO 10303-21 STEP وتوسيطها هندسياً في منتصف الشبكة المحورية.
2. **شبكة مستشعرات إنترنت الأشياء اللحظية (IoT Telemetry):** محاكاة شبكة موزعة من مستشعرات الحركة السقفية ($PIR$)، وعدادات تدفق الأبواب البصرية ($Optical Threshold Counters$)، ومستشعرات جودة الهواء ($CO_2$) لحساب متوسط زمن المكوث (Dwell Time).
3. **محرك التحسين التكيفي وإعادة التشكيل (Spatial Optimization Engine):** خوارزميات ذكية تعتمد نظرية الجراف ($Graph Theory$) وتحليل النفاذية الحركية لحساب إجمالي إجهاد الحركة ($W = \sum F_{ij} \times D_{ij}$)، وإطلاق قرارات تكيفية فورية تشمل:
   - **التحريك التكيفي للقواطع المنزلقة (Kinetic Partitions):** لمضاعفة سعة الفضاءات عند ذروة الإشغال.
   - **إعادة التوجيه والتوزيع الوظيفي الذكي (Optimal Layout Swap):** لتقليص مسافات المشي بنسبة تتجاوز $35\%$ ومنع اختناق الممرات.

---

## 🚀 طرق التشغيل (Getting Started)

### الخيار 1: التشغيل عبر Streamlit (محلياً أو على السحابة)
```bash
# 1. تثبيت المتطلبات
pip install -r requirements.txt

# 2. تشغيل تطبيق Streamlit
streamlit run streamlit_app.py
```
ثم افتح الرابط: `http://localhost:8501`

### الخيار 2: التشغيل المباشر عبر الخادم المدمج (Zero-Dependency)
```bash
# تشغيل الخادم مباشرة دون أي مكتبات خارجية
python3 run.py
```
ثم افتح المتصفح على: `http://127.0.0.1:8080`

---

## ☁️ خطوات الرفع والنشر على Streamlit Community Cloud

المنصة مهيأة بنسبة 100% للنشر السحابي المباشر والمجاني عبر **Streamlit Community Cloud**:

1. **ارفع المستودع إلى حسابك على GitHub** (راجع خطوات GitHub أدناه).
2. توجه إلى موقع [Streamlit Community Cloud](https://share.streamlit.io/).
3. سجّل الدخول بحسابك على GitHub.
4. انقر على **"New app"**.
5. حدد المستودع الخاص بك (Repository)، والفرع (`main`)، والملف الرئيسي:
   ```text
   streamlit_app.py
   ```
6. انقر على **"Deploy!"**، وسيصبح تطبيقك متاحاً على رابط عام عالمي مجاني (مثل: `https://your-twin-app.streamlit.app`).

---

## 🐙 خطوات الرفع على GitHub (GitHub Upload Instructions)

المشروع مهيأ ومفهرس كـ Git Repository محلياً. لربطه بحسابك على GitHub، نفّذ الأوامر التالية في Terminal:

```bash
# 1. أنشئ مستودعاً جديداً فارغاً على GitHub باسم: adaptive-digital-twin
# 2. اربط المستودع المحلي بمستودعك على GitHub:
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/adaptive-digital-twin.git

# 3. ارفع الكود إلى GitHub:
git branch -M main
git push -u origin main
```

---

## 🧪 حزمة الاختبارات والتحقق الآلي (Automated Tests)
تتضمن المنصة حزمة اختبارات شاملة تغطي كافة الخوارزميات ونماذج الـ BIM:

```bash
# تشغيل كامل حزمة الاختبارات (29 اختباراً)
python3 -m unittest discover -s tests
```

---

## 📂 بنية المشروع (Repository Structure)
```text
adaptive_digital_twin/
├── streamlit_app.py          # تطبيق Streamlit المتكامل للتحكم والعرض السحابي
├── run.py                    # المشغل المباشر السريع للخادم المحلي (Port 8080)
├── requirements.txt          # متطلبات بيئة التشغيل
├── .streamlit/
│   └── config.toml           # إعدادات المظهر والسمات الداكنة لـ Streamlit
├── backend/                  # النواة البرمجية والتحليل المكاني
│   ├── server.py             # خادم REST API المحلي
│   ├── spatial_graph.py      # تمثيل المبنى كـ Spatial Graph ونموذج البيانات
│   ├── iot_simulator.py      # محاكي دفق حساسات الـ IoT
│   ├── iot_engine.py         # محرك القياسات المتقدم ومصفوفات التدفق
│   ├── adaptive_engine.py    # خوارزميات التكيف وإعادة التشكيل الفراغي
│   └── plan_importer.py      # محلل ملفات BIM (IFC), DXF, PDF
├── presets/                  # دراسات الحالة المعمارية الجاهزة
│   ├── administrative_office.json   # المبنى الإداري النموذجي (Case Study 1)
│   ├── healthcare_clinic.json       # مجمع الرعاية الصحية (Case Study 2)
│   └── public_service_center.json   # دائرة الأحوال والخدمات (Case Study 3)
├── public/                   # واجهة الويب التفاعلية ثلاثية الأبعاد
│   ├── index.html            # صفحة الواجهة الرئيسية
│   ├── css/styles.css        # التنسيقات البصرية الداكنة
│   └── js/
│       ├── viewer3d.js       # محرك العرض ثلاثي الأبعاد (Three.js)
│       ├── plan_manager.js   # إدارة وتعديل واستيراد المخططات
│       ├── analytics.js      # الرسوم البيانية ومؤشرات الـ IoT
│       └── app.js            # منسق الواجهة ودورة التحديث اللحظي
└── tests/                    # حزمة الاختبارات الآلية الموحدة
```

---

## 📜 الملكية الفكرية والأكاديمية
جميع الحقوق محفوظة © 2026. تم تطوير هذه المنصة كجزء من متطلبات البحث الأكاديمي لرسالة الماجستير في قسم هندسة العمارة - الجامعة التكنولوجية، بإشراف وتطوير المهندس المعماري الدكتور **أحمد لؤي أحمد**.
