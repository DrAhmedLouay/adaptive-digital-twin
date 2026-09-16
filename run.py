#!/usr/bin/env python3
"""
Adaptive Digital Twin Platform Launcher.
Usage:
    python3 run.py [PORT]
Default port is 8080.
"""

import sys
import os

# ضمان وجود مجلد المشروع في مسار الاستيراد
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from backend.server import create_server

def main():
    port = 8080
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print(f"Invalid port: {sys.argv[1]}, using default 8080")

    server = create_server(host="127.0.0.1", port=port)
    print("=" * 60)
    print(f"🏢 منصة التوأم الرقمي التكيفي (Adaptive Digital Twin Platform)")
    print(f"🚀 الخادم يعمل الآن على الرابط: http://127.0.0.1:{port}")
    print(f"📊 واجهة العرض التفاعلية ثلاثية الأبعاد والمحاكاة جاهزة للاستخدام.")
    print("=" * 60)
    print("اضغط Ctrl+C لإيقاف الخادم.")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nتم إيقاف خادم التوأم الرقمي بنجاح.")
        server.server_close()

if __name__ == "__main__":
    main()
