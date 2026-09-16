#!/bin/bash
# Push Adaptive Digital Twin Platform to GitHub
# مستودع د. أحمد لؤي أحمد

echo "========================================================"
echo "🚀 رفع منصة التوأم الرقمي التكيفي إلى GitHub"
echo "المستودع: https://github.com/DrAhmedLouay/adaptive-digital-twin"
echo "========================================================"

cd "$(dirname "$0")"

# التأكد من التسمية main للفرع
git branch -M main

# الرفع إلى GitHub
echo "جاري الرفع..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo "========================================================"
    echo "✅ تم الرفع بنجاح إلى GitHub!"
    echo "رابط المستودع: https://github.com/DrAhmedLouay/adaptive-digital-twin"
    echo ""
    echo "🌐 رابط الويب المباشر عبر GitHub Pages:"
    echo "👉 ادخل على المستودع -> Settings -> Pages"
    echo "👉 اختر Branch: main والمسار: / (root) واضغط Save"
    echo "👉 سيعمل الرابط فوراً على: https://drahmedlouay.github.io/adaptive-digital-twin/"
    echo "========================================================"
else
    echo "⚠️ في حال طلب GitHub كلمة المرور أو رمز التفويض:"
    echo "استخدم GitHub Personal Access Token (Classic) مع صلاحية 'repo'."
fi
