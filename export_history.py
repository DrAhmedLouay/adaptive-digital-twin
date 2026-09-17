import json
import os
import re
import html
from datetime import datetime

transcript_file = '/Users/ahmedlouay/.gemini/antigravity/brain/b0b4f101-0975-4fc6-9916-3657bf27f264/.system_generated/logs/transcript_full.jsonl'
output_md = '/Users/ahmedlouay/.gemini/antigravity/scratch/adaptive_digital_twin/CONVERSATION_HISTORY.md'
output_html = '/Users/ahmedlouay/.gemini/antigravity/scratch/adaptive_digital_twin/public/CONVERSATION_HISTORY.html'
output_root_html = '/Users/ahmedlouay/.gemini/antigravity/scratch/adaptive_digital_twin/CONVERSATION_HISTORY.html'

dialogue_turns = []
current_user = None
current_responses = []

with open(transcript_file, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            entry = json.loads(line)
        except Exception:
            continue
        
        step_type = entry.get('type')
        source = entry.get('source')
        content = entry.get('content', '')
        created_at = entry.get('created_at', '')
        
        if step_type == 'USER_INPUT' and source in ('USER_EXPLICIT', 'USER'):
            if '<SYSTEM_MESSAGE>' in content and '<USER_REQUEST>' not in content:
                continue
            
            if current_user:
                dialogue_turns.append({
                    'user': current_user,
                    'responses': current_responses
                })
            
            user_text = content
            m = re.search(r'<USER_REQUEST>(.*?)</USER_REQUEST>', content, re.DOTALL)
            if m:
                user_text = m.group(1).strip()
            
            current_user = {
                'text': user_text,
                'created_at': created_at,
                'step_index': entry.get('step_index')
            }
            current_responses = []
            
        elif step_type == 'PLANNER_RESPONSE' and content:
            text = content.strip()
            # Exclude internal technical status messages
            technical_prefixes = (
                'Tool is running',
                'Encountered error',
                'Running the automated',
                'Checking the live',
                'Waiting for',
                'Task id',
                'Pushing the',
                'The changes have been committed',
                'I have checked the repository',
            )
            if text and not any(text.startswith(p) for p in technical_prefixes):
                current_responses.append({
                    'text': text,
                    'created_at': created_at,
                    'step_index': entry.get('step_index')
                })

if current_user:
    dialogue_turns.append({
        'user': current_user,
        'responses': current_responses
    })

# Format datetime
def format_time(iso_str):
    try:
        dt = datetime.fromisoformat(iso_str.replace('Z', '+00:00'))
        return dt.strftime('%Y-%m-%d %H:%M:%S UTC')
    except Exception:
        return iso_str

# Generate Markdown
md_lines = [
    "# 📜 سجل المحادثات الكامل لمشروع منصة التوأم الرقمي التكيفي",
    "## Adaptive Digital Twin Platform - Complete Conversation Transcript",
    "",
    "> **الباحث والمطور الرئيسي:** المهندس المعماري الدكتور أحمد لؤي أحمد  ",
    f"> **تاريخ التصدير:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}  ",
    f"> **إجمالي الجلسات الحوارية:** {len(dialogue_turns)} جولة حوارية ومحطة تطويرية  ",
    "",
    "---",
    ""
]

for idx, turn in enumerate(dialogue_turns, 1):
    u = turn['user']
    u_time = format_time(u['created_at'])
    u_text = u['text'].strip()
    if not u_text:
        u_text = "*(موافقة على خطة التنفيذ / متابعة سير العمل)*"
    
    md_lines.append(f"## 💬 الجولة {idx} | Turn #{idx}")
    md_lines.append(f"**⏰ التوقيت:** `{u_time}`  ")
    md_lines.append("")
    md_lines.append("### 👤 طلب / سؤال المعمار (User):")
    md_lines.append("")
    md_lines.append("```text")
    md_lines.append(u_text)
    md_lines.append("```")
    md_lines.append("")
    md_lines.append("### 🤖 إجابة وحلول المساعد (Antigravity Assistant):")
    md_lines.append("")
    
    if turn['responses']:
        # If multiple responses, pick the substantive text responses (last one is usually the complete comprehensive response)
        # Combine unique text blocks
        resp_texts = []
        for r in turn['responses']:
            t = r['text']
            if t not in resp_texts:
                resp_texts.append(t)
        combined_resp = "\n\n---\n\n".join(resp_texts)
        md_lines.append(combined_resp)
    else:
        md_lines.append("*(الجولة قيد المعالجة الحالية)*")
    
    md_lines.append("")
    md_lines.append("---")
    md_lines.append("")

with open(output_md, 'w', encoding='utf-8') as f:
    f.write("\n".join(md_lines))

print(f"Successfully written Markdown to {output_md}")

# Generate HTML with elegant Arabic typography and styling
html_content = f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>سجل المحادثات الكامل | منصة التوأم الرقمي التكيفي</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&family=Fira+Code:wght@400;500&display=swap" rel="stylesheet">
    <style>
        :root {{
            --bg-color: #0f172a;
            --card-bg: #1e293b;
            --user-card-bg: #1e1b4b;
            --model-card-bg: #0f172a;
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --accent-cyan: #00d2ff;
            --accent-purple: #a855f7;
            --accent-emerald: #10b981;
            --border-color: #334155;
        }}
        * {{
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }}
        body {{
            background-color: var(--bg-color);
            color: var(--text-main);
            font-family: 'Cairo', sans-serif;
            line-height: 1.8;
            padding: 24px;
        }}
        .header {{
            max-width: 1000px;
            margin: 0 auto 30px auto;
            background: linear-gradient(135deg, #1e293b, #0f172a);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 30px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.4);
            position: relative;
        }}
        .header h1 {{
            font-size: 26px;
            font-weight: 900;
            color: var(--accent-cyan);
            margin-bottom: 8px;
        }}
        .header h2 {{
            font-size: 16px;
            color: var(--text-muted);
            font-weight: 400;
            margin-bottom: 20px;
        }}
        .badge-bar {{
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            margin-bottom: 16px;
        }}
        .badge {{
            background: rgba(0, 210, 255, 0.12);
            border: 1px solid var(--accent-cyan);
            color: var(--accent-cyan);
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
        }}
        .badge.researcher {{
            background: rgba(16, 185, 129, 0.12);
            border-color: var(--accent-emerald);
            color: var(--accent-emerald);
        }}
        .print-btn {{
            position: absolute;
            left: 30px;
            top: 30px;
            background: var(--accent-cyan);
            color: #0f172a;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            font-family: 'Cairo', sans-serif;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0, 210, 255, 0.3);
            transition: all 0.2s ease;
        }}
        .print-btn:hover {{
            background: #38bdf8;
            transform: translateY(-2px);
        }}
        .container {{
            max-width: 1000px;
            margin: 0 auto;
        }}
        .turn-card {{
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 14px;
            margin-bottom: 24px;
            overflow: hidden;
            box-shadow: 0 6px 16px rgba(0,0,0,0.25);
        }}
        .turn-header {{
            background: rgba(51, 65, 85, 0.5);
            padding: 12px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--border-color);
            font-size: 14px;
            font-weight: 600;
            color: var(--text-muted);
        }}
        .turn-num {{
            color: var(--accent-cyan);
            font-size: 15px;
            font-weight: 700;
        }}
        .user-box {{
            background: var(--user-card-bg);
            border-right: 4px solid var(--accent-purple);
            padding: 18px 20px;
            margin: 16px;
            border-radius: 8px;
        }}
        .user-label {{
            font-weight: 700;
            color: #c084fc;
            font-size: 13px;
            margin-bottom: 6px;
            display: flex;
            align-items: center;
            gap: 6px;
        }}
        .user-text {{
            font-size: 15px;
            white-space: pre-wrap;
            color: #f1f5f9;
        }}
        .model-box {{
            background: var(--model-card-bg);
            border-right: 4px solid var(--accent-cyan);
            padding: 20px;
            margin: 16px;
            border-radius: 8px;
            border: 1px solid rgba(255,255,255,0.05);
        }}
        .model-label {{
            font-weight: 700;
            color: var(--accent-cyan);
            font-size: 13px;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 6px;
        }}
        .model-text {{
            font-size: 14.5px;
            color: #cbd5e1;
            white-space: pre-wrap;
            font-family: 'Cairo', sans-serif;
        }}
        pre, code {{
            font-family: 'Fira Code', monospace;
            background: #090d16;
            border-radius: 6px;
        }}
        @media print {{
            body {{
                background: white;
                color: black;
            }}
            .header, .turn-card, .user-box, .model-box {{
                background: white !important;
                color: black !important;
                border: 1px solid #ccc !important;
                box-shadow: none !important;
            }}
            .print-btn {{
                display: none;
            }}
            .user-text, .model-text {{
                color: black !important;
            }}
        }}
    </style>
</head>
<body>
    <div class="header">
        <button class="print-btn" onclick="window.print()">🖨️ طباعة / حفظ كـ PDF</button>
        <h1>📜 سجل المحادثات الكامل ومراحل التطوير</h1>
        <h2>Adaptive Digital Twin Platform - Full Research & Development Transcript</h2>
        <div class="badge-bar">
            <span class="badge researcher">🏛️ الباحث: م.م.د. أحمد لؤي أحمد</span>
            <span class="badge">📊 إجمالي الجولات: {len(dialogue_turns)} جولة</span>
            <span class="badge">🕒 تم التصدير: {datetime.now().strftime('%Y-%m-%d %H:%M')}</span>
        </div>
        <p style="font-size: 13px; color: var(--text-muted);">
            يوثق هذا الملف التفاعلي كافة الأسئلة، الأوامر، والشروحات المعمارية والهندسية وخطوات بناء وبرمجة منصة التوأم الرقمي التكيفي منذ المحطة الأولى وحتى الآن.
        </p>
    </div>

    <div class="container">
"""

for idx, turn in enumerate(dialogue_turns, 1):
    u = turn['user']
    u_time = format_time(u['created_at'])
    u_text = html.escape(u['text'].strip()) if u['text'].strip() else "<i>(موافقة على خطة التنفيذ / متابعة العمل)</i>"
    
    resp_text = ""
    if turn['responses']:
        resp_list = []
        for r in turn['responses']:
            t = r['text']
            if t not in resp_list:
                resp_list.append(t)
        resp_text = html.escape("\n\n---\n\n".join(resp_list))
    else:
        resp_text = "<i>(الجولة قيد المعالجة الحالية)</i>"

    html_content += f"""
        <div class="turn-card">
            <div class="turn-header">
                <span class="turn-num">💬 الجولة {idx}</span>
                <span>⏰ {u_time}</span>
            </div>
            <div class="user-box">
                <div class="user-label">👤 طلب / سؤال المعمار:</div>
                <div class="user-text">{u_text}</div>
            </div>
            <div class="model-box">
                <div class="model-label">🤖 إجابة وحلول Antigravity:</div>
                <div class="model-text">{resp_text}</div>
            </div>
        </div>
    """

html_content += """
    </div>
</body>
</html>
"""

with open(output_html, 'w', encoding='utf-8') as f:
    f.write(html_content)

with open(output_root_html, 'w', encoding='utf-8') as f:
    f.write(html_content)

print(f"Successfully written HTML to {output_html} and {output_root_html}")
