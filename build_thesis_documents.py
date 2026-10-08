#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script to generate:
1. Master_Thesis_Proposal_Adaptive_Digital_Twin.docx (Word Document)
2. Master_Thesis_Proposal_Adaptive_Digital_Twin.html (Print-ready HTML)
3. Master_Thesis_Proposal_Adaptive_Digital_Twin.pdf (Pixel-perfect PDF via Chrome)
"""

import os
import sys
import subprocess

# Ensure local pylib is accessible
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'pylib')))

import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import qn, nsdecls

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    tcPr.append(parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>'))

def set_cell_margins(cell, top=120, bottom=120, left=180, right=180):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}>'
                      f'<w:top w:w="{top}" w:type="dxa"/>'
                      f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
                      f'<w:left w:w="{left}" w:type="dxa"/>'
                      f'<w:right w:w="{right}" w:type="dxa"/>'
                      f'</w:tcMar>')
    tcPr.append(tcMar)

def set_cell_borders(cell, top="none", bottom="none", left="none", right="none", 
                     color="CBD5E1", sz="4"):
    tcPr = cell._tc.get_or_add_tcPr()
    borders_xml = f'<w:tcBorders {nsdecls("w")}>'
    for side, val in [("top", top), ("bottom", bottom), ("left", left), ("right", right)]:
        if val != "none":
            borders_xml += f'<w:{side} w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        else:
            borders_xml += f'<w:{side} w:val="none"/>'
    borders_xml += '</w:tcBorders>'
    tcPr.append(parse_xml(borders_xml))

def make_para_rtl(para, align=WD_ALIGN_PARAGRAPH.RIGHT):
    para.paragraph_format.bidi = True
    para.paragraph_format.alignment = align
    pPr = para._element.get_or_add_pPr()
    pPr.append(parse_xml(f'<w:bidi {nsdecls("w")}/>'))

def add_rtl_run(para, text, font_name="Cairo", font_size=11, bold=False, italic=False, color_rgb=(15, 23, 42)):
    run = para.add_run(text)
    run.font.name = font_name
    run.font.size = Pt(font_size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = RGBColor(*color_rgb)
    
    rPr = run._element.get_or_add_rPr()
    rPr.append(parse_xml(f'<w:rtl {nsdecls("w")}/>'))
    rFonts = rPr.find(qn('w:rFonts'))
    if rFonts is not None:
        rFonts.set(qn('w:cs'), font_name)
        rFonts.set(qn('w:ascii'), font_name)
        rFonts.set(qn('w:hAnsi'), font_name)
    else:
        rPr.append(parse_xml(f'<w:rFonts {nsdecls("w")} w:ascii="{font_name}" w:hAnsi="{font_name}" w:cs="{font_name}"/>'))
    return run

def create_docx(filename):
    doc = docx.Document()
    
    # Page setup (A4, 0.8 inch margins)
    for section in doc.sections:
        section.page_width = Inches(8.27)
        section.page_height = Inches(11.69)
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)
        
        # Header & Footer setup
        header = section.header
        hp = header.paragraphs[0]
        make_para_rtl(hp, WD_ALIGN_PARAGRAPH.LEFT)
        add_rtl_run(hp, "الجامعة التكنولوجية – قسم هندسة العمارة | مقترح رسالة ماجستير", font_size=8.5, color_rgb=(148, 163, 184))
        
        footer = section.footer
        fp = footer.paragraphs[0]
        make_para_rtl(fp, WD_ALIGN_PARAGRAPH.RIGHT)
        add_rtl_run(fp, "منصة التوأم الرقمي المتكيف لإعادة التشكيل الحركي والمكاني", font_size=8.5, color_rgb=(148, 163, 184))

    # Document Header Banner Table
    banner_tbl = doc.add_table(rows=1, cols=1)
    banner_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    banner_tbl._tbl.tblPr.append(parse_xml(f'<w:bidiVisual {nsdecls("w")}/>'))
    cell = banner_tbl.cell(0, 0)
    set_cell_background(cell, "0F172A")
    set_cell_margins(cell, top=240, bottom=240, left=260, right=260)
    set_cell_borders(cell, right="single", color="0284C7", sz="24") # 3pt cyan border on right
    
    p0 = cell.paragraphs[0]
    make_para_rtl(p0, WD_ALIGN_PARAGRAPH.CENTER)
    add_rtl_run(p0, "الجامعة التكنولوجية – قسم هندسة العمارة", font_size=12, bold=True, color_rgb=(56, 189, 248))
    
    p1 = cell.add_paragraph()
    make_para_rtl(p1, WD_ALIGN_PARAGRAPH.CENTER)
    add_rtl_run(p1, "مقترح رسالة ماجستير في علوم هندسة العمارة 🏛️📋", font_size=18, bold=True, color_rgb=(255, 255, 255))
    
    p2 = cell.add_paragraph()
    make_para_rtl(p2, WD_ALIGN_PARAGRAPH.CENTER)
    add_rtl_run(p2, "التخصص الدقيق: تصميم معماري / العمارة الرقمية والذكية وتكنولوجيا البناء (Smart & Computational Architecture)", font_size=10, bold=False, color_rgb=(203, 213, 225))
    
    doc.add_paragraph() # Spacer

    # Section 0: Info Card Table
    h0 = doc.add_paragraph()
    make_para_rtl(h0)
    add_rtl_run(h0, "📑 بطاقة المعلومات التمهيدية للمقترح", font_size=14, bold=True, color_rgb=(2, 132, 199))
    
    info_tbl = doc.add_table(rows=4, cols=2)
    info_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    info_tbl._tbl.tblPr.append(parse_xml(f'<w:bidiVisual {nsdecls("w")}/>'))
    
    info_data = [
        ("العنوان المقترح باللغة العربية:", "«التوأم الرقمي المتكيف لإعادة التشكيل الحركي والمكاني في الأبنية الإدارية: نمذجة تفاعلية قائمة على بيانات الإشغال اللحظية»"),
        ("العنوان المقترح باللغة الإنجليزية:", "“Adaptive Digital Twin for Kinetic and Spatial Reconfiguration in Office Buildings: An Interactive Modelling Approach Based on Real-Time Occupancy Data”"),
        ("الجهة الأكاديمية المانحة:", "الجامعة التكنولوجية – قسم هندسة العمارة (العراق – بغداد)"),
        ("المجال المعرفي والتطبيقي:", "العمارة السيبرانية-الفيزيائية المتكيفة (Cyber-Physical Architecture) • نمذجة معلومات البناء (BIM/IFC) • إنترنت الأشياء (IoT) • النحو الفضائي (Space Syntax)")
    ]
    
    for row_idx, (label, val) in enumerate(info_data):
        row = info_tbl.rows[row_idx]
        
        c0 = row.cells[0]
        c0.width = Inches(2.2)
        set_cell_background(c0, "F1F5F9")
        set_cell_margins(c0, top=100, bottom=100, left=140, right=140)
        set_cell_borders(c0, top="single", bottom="single", left="single", right="single", color="CBD5E1", sz="4")
        p_c0 = c0.paragraphs[0]
        make_para_rtl(p_c0)
        add_rtl_run(p_c0, label, font_size=10.5, bold=True, color_rgb=(15, 23, 42))
        
        c1 = row.cells[1]
        c1.width = Inches(4.5)
        set_cell_background(c1, "FFFFFF" if row_idx % 2 == 0 else "F8FAFC")
        set_cell_margins(c1, top=100, bottom=100, left=140, right=140)
        set_cell_borders(c1, top="single", bottom="single", left="single", right="single", color="CBD5E1", sz="4")
        p_c1 = c1.paragraphs[0]
        make_para_rtl(p_c1)
        add_rtl_run(p_c1, val, font_size=10.5, bold=False, color_rgb=(30, 41, 59))
        
    doc.add_paragraph() # Spacer

    # Section 1: Concept
    h1 = doc.add_paragraph()
    make_para_rtl(h1)
    add_rtl_run(h1, "1. فكرة الرسالة وفلسفتها المعمارية (Research Concept)", font_size=14, bold=True, color_rgb=(2, 132, 199))
    
    p = doc.add_paragraph()
    make_para_rtl(p)
    add_rtl_run(p, "تطرح الرسالة رؤية معمارية رائدة تتجاوز مفهوم ", font_size=11)
    add_rtl_run(p, "«العمارة الساكنة» (Static Architecture) ", font_size=11, bold=True, color_rgb=(225, 29, 72))
    add_rtl_run(p, "التي يُصمم فيها المبنى ككتلة جامدة ذات جدران وفضاءات ثابتة الحدود، نحو ", font_size=11)
    add_rtl_run(p, "«العمارة السيبرانية-الفيزيائية المتكيفة» (Adaptive Cyber-Physical Architecture) ", font_size=11, bold=True, color_rgb=(13, 148, 136))
    add_rtl_run(p, "من خلال بناء توأم رقمي (Digital Twin) متصل بنظام الفضاء المعماري الحقيقي.", font_size=11)

    p_loop = doc.add_paragraph()
    make_para_rtl(p_loop)
    add_rtl_run(p_loop, "تقوم الفكرة على إنشاء حلقة تفاعلية مغلقة (Closed-Loop System) ثلاثية المراحل:", font_size=11, bold=True)
    
    loop_items = [
        ("الرصد والاستشعار (Sensing):", " التقاط وتحليل تدفقات حركة وإشغال المستخدمين اللحظية (موظفين ومراجعين) عبر حساسات إنترنت الأشياء (IoT) ومحاكاة الوكلاء (Agent-Based Simulation)."),
        ("التحليل الرقمي واتخاذ القرار (Decision Engine):", " معالجة الاختناقات والكثافات الحرجة وحساب معدلات الانتفاع والزمكان لحظياً بالاستناد إلى دالة خفض إجهاد الحركة."),
        ("التكيف المادي الفعلي (Physical Kinetic Reconfiguration):", " تحفيز عناصر معمارية حركية (قواطع جدارية منزلقة عازلة للصوت، مسارات حركة التفافية بديلة، وتوسيع/تقليص سعة القاعات) لإعادة تشكيل الفضاء وتغيير طوبولوجيته في ثوانٍ معدودة استجابةً لحاجة الشاغلين، ثم استعادة الوضع الافتراضي عند انتهاء الذروة.")
    ]
    for title, desc in loop_items:
        p_item = doc.add_paragraph()
        make_para_rtl(p_item)
        add_rtl_run(p_item, " • " + title, font_size=10.5, bold=True, color_rgb=(2, 132, 199))
        add_rtl_run(p_item, desc, font_size=10.5)

    doc.add_paragraph() # Spacer

    # Section 2: Research Problem
    h2 = doc.add_paragraph()
    make_para_rtl(h2)
    add_rtl_run(h2, "2. مشكلة البحث (The Research Problem)", font_size=14, bold=True, color_rgb=(2, 132, 199))
    
    # Problem Quote Box
    box_tbl = doc.add_table(rows=1, cols=1)
    box_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    box_tbl._tbl.tblPr.append(parse_xml(f'<w:bidiVisual {nsdecls("w")}/>'))
    b_cell = box_tbl.cell(0, 0)
    set_cell_background(b_cell, "FFF1F2") # Light rose
    set_cell_margins(b_cell, top=140, bottom=140, left=180, right=180)
    set_cell_borders(b_cell, right="single", color="E11D48", sz="24") # Rose accent border
    
    bp = b_cell.paragraphs[0]
    make_para_rtl(bp)
    add_rtl_run(bp, "نص صياغة الإشكالية المركزية:\n", font_size=10, bold=True, color_rgb=(225, 29, 72))
    add_rtl_run(bp, "«القصور الوظيفي والتشغيلي الناجم عن الجمود الفضائي للأبنية الإدارية في مواجهة التذبذب الزماني-المكاني لإشغال المستخدمين؛ حيث تفشل برامج التصميم المعماري الإستاتيكية السابقة في استيعاب التزاحم الحرج في فضاءات الحركة والانتظار المشتركة خلال ساعات الذروة، بالتزامن مع هدر فراغي وطاقي في فضاءات العمل والتدريب المجاورة غير المستغلة، في ظل غياب منظومة توأم رقمي تكيفية قادرة على إعادة التشكيل الحركي والمكاني المؤتمت في الزمن الحقيقي».", font_size=11, bold=True, italic=True, color_rgb=(159, 18, 57))

    p_dims_intro = doc.add_paragraph()
    make_para_rtl(p_dims_intro)
    add_rtl_run(p_dims_intro, "الأبعاد والظواهر التفصيلية للمشكلة المعمارية:", font_size=11, bold=True)
    
    dims = [
        ("فجوة البرمجة المعمارية (Programming Gap):", " يتم تصميم المباني الإدارية وفق معايير مساحية إحصائية مفترضة وثابتة (Standard Norms)، بينما يثبت الواقع الإشغالي الميداني وجود طفرات كثافة وتزاحم عشوائي غير متوقع للمراجعين يتجاوز الطاقة الاستيعابية بمرات عديدة."),
        ("الجمود المكاني والهدر الفضائي المزدوج (Dual Inefficiency):", " في نفس اللحظة التي تختنق فيها ردهة الاستقبال والممرات وصالات الانتظار بنسب تزاحم مفرطة، تكون قاعات الاجتماعات أو التدريب المجاورة شاغرة ومغلقة بسبب الجدران المصمتة الفاصلة."),
        ("العجز عن التدخل اللحظي (Lagged Response):", " تقتصر الحلول التقليدية على توسيع المبنى أفقياً أو بناء ملحقات باهظة التكلفة، أو وضع حلول تنظيمية متأخرة لا تستجيب للزمن الحقيقي.")
    ]
    for d_title, d_desc in dims:
        p_d = doc.add_paragraph()
        make_para_rtl(p_d)
        add_rtl_run(p_d, " 1. " if "فجوة" in d_title else (" 2. " if "الجمود" in d_title else " 3. "), font_size=10.5, bold=True, color_rgb=(2, 132, 199))
        add_rtl_run(p_d, d_title, font_size=10.5, bold=True)
        add_rtl_run(p_d, d_desc, font_size=10.5)

    doc.add_paragraph() # Spacer

    # Section 3: Objectives
    h3 = doc.add_paragraph()
    make_para_rtl(h3)
    add_rtl_run(h3, "3. أهداف البحث (Research Objectives)", font_size=14, bold=True, color_rgb=(2, 132, 199))
    
    p_main_obj = doc.add_paragraph()
    make_para_rtl(p_main_obj)
    add_rtl_run(p_main_obj, "الهدف الرئيس (Main Objective): ", font_size=11, bold=True, color_rgb=(15, 23, 42))
    add_rtl_run(p_main_obj, "تطوير واختبار نموذج معماري لـ توأم رقمي متكيف (Adaptive Digital Twin) قادر على رصد ديناميكيات الإشغال والحركة في الأبنية الإدارية، وتوليد قرارات إعادة التشكيل المكاني والحركي المؤتمت (Kinetic Spatial Reconfiguration) لتحقيق التوازن بين الكثافة الاجتماعية وسعة الحيز الفيزيائي في الزمن الحقيقي.", font_size=11)

    p_sub_intro = doc.add_paragraph()
    make_para_rtl(p_sub_intro)
    add_rtl_run(p_sub_intro, "الأهداف الثانوية والتفصيلية (Specific Objectives):", font_size=11, bold=True)

    objs = [
        ("تأصيل الإطار النظري:", " بناء قاعدة معرفية تدمج بين نظريات السلوك الاجتماعي-الحيزي (Socio-Spatial Behavior)، ونحو الفضاء (Space Syntax)، وتقنيات التوأم الرقمي (Digital Twin)، والعمارة الحركية (Kinetic Architecture)."),
        ("حوسبة مؤشرات الإشغال والحركة:", " تحويل المفاهيم المعمارية والاجتماعية (الكثافة، التزاحم، مضاعف الزمكان STM، قابلية المشي، انسيابية التدفق) إلى خوارزميات ومعادلات برمجية قابلة للقياس الرقمي اللحظي."),
        ("تطوير المحرك التوليدي للتكيف (Reconfiguration Engine):", " صياغة قواعد برمجية (Rule-based Decision System) تقرر متى وكيف تتحرك القواطع المرنة وتُفتح الممرات البديلة بناءً على تخطي عتبات التكدس الحرجة."),
        ("التكامل مع نماذج الـ BIM:", " تمكين المنظومة من قراءة ومعالجة نماذج البناء ثلاثية الأبعاد المصدرة بصيغ عالمية مفتوحة (IFC / OpenBIM) ومساقط الـ PDF الهندسية عبر الويب."),
        ("التحقق التجريبي والمقارنة (Validation):", " تطبيق المنظومة على دراسات حالة لأبنية إدارية محلية وإجراء مقارنة علمية دقيقة (Before vs. After) لإثبات جدوى وكفاءة الحلول التكيفية.")
    ]
    for o_t, o_d in objs:
        p_o = doc.add_paragraph()
        make_para_rtl(p_o)
        add_rtl_run(p_o, " • " + o_t, font_size=10.5, bold=True, color_rgb=(2, 132, 199))
        add_rtl_run(p_o, o_d, font_size=10.5)

    doc.add_paragraph() # Spacer

    # Section 4: Hypotheses
    h4 = doc.add_paragraph()
    make_para_rtl(h4)
    add_rtl_run(h4, "4. فرضيات البحث (Research Hypotheses)", font_size=14, bold=True, color_rgb=(2, 132, 199))

    hyps = [
        ("الفرضية الأولى:", " «يؤدي توظيف التوأم الرقمي المعتمد على بيانات الإشغال اللحظية إلى خفض معدلات التزاحم وزمن الانتظار في الفضاءات المشتركة بنسبة لا تقل عن 35% مقارنة بالتصميم الإستاتيكي الثابت»."),
        ("الفرضية الثانية:", " «إن إعادة التشكيل المكاني عبر القواطع الحركية المرنة ترفع من مؤشر كفاءة الانتفاع الفضائي ومضاعف الزمكان (STM) للفضاءات نادرة الاستخدام لتصل إلى المعدل المتوازن (STM ≈ 1.0) دون الحاجة لزيادة المساحة البنائية الكلية للمبنى»."),
        ("الفرضية الثالثة:", " «تفعيل مسارات الحركة الالتفافية التكيفية في المنظور ثلاثي الأبعاد يمنع تشكل نقاط الاختناق الحرجة (Bottlenecks) ويحافظ على انسيابية تدفق المشاة عند مستوى الخدمة المريح».")
    ]
    for h_t, h_d in hyps:
        p_h = doc.add_paragraph()
        make_para_rtl(p_h)
        add_rtl_run(p_h, h_t + " ", font_size=11, bold=True, color_rgb=(16, 185, 129))
        add_rtl_run(p_h, h_d, font_size=11, italic=True)

    doc.add_paragraph() # Spacer

    # Section 5: Chapters Outline
    h5 = doc.add_paragraph()
    make_para_rtl(h5)
    add_rtl_run(h5, "5. هيكلية فصول الرسالة (Thesis Structure & Detailed Outline)", font_size=14, bold=True, color_rgb=(2, 132, 199))

    # Chapters Summary Table
    ch_tbl = doc.add_table(rows=6, cols=2)
    ch_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    ch_tbl._tbl.tblPr.append(parse_xml(f'<w:bidiVisual {nsdecls("w")}/>'))
    
    # Table Header
    th0 = ch_tbl.cell(0, 0)
    th0.width = Inches(1.8)
    set_cell_background(th0, "1E293B")
    set_cell_margins(th0, top=120, bottom=120, left=140, right=140)
    p_th0 = th0.paragraphs[0]
    make_para_rtl(p_th0, WD_ALIGN_PARAGRAPH.CENTER)
    add_rtl_run(p_th0, "الفصل", font_size=11, bold=True, color_rgb=(255, 255, 255))
    
    th1 = ch_tbl.cell(0, 1)
    th1.width = Inches(4.9)
    set_cell_background(th1, "1E293B")
    set_cell_margins(th1, top=120, bottom=120, left=140, right=140)
    p_th1 = th1.paragraphs[0]
    make_para_rtl(p_th1, WD_ALIGN_PARAGRAPH.CENTER)
    add_rtl_run(p_th1, "عنوان الفصل وموضوعه الرئيس", font_size=11, bold=True, color_rgb=(255, 255, 255))

    ch_summary = [
        ("الفصل الأول", "الخلفية المفاهيمية: التوأم الرقمي والعمارة الاستجابية الحركية"),
        ("الفصل الثاني", "الإطار النظري: الأبعاد السلوكية-الحيزية وآليات إعادة التشكيل المكاني"),
        ("الفصل الثالث", "الإطار المنهجي: بناء وهندسة منظومة التوأم الرقمي التكيفية"),
        ("الفصل الرابع", "الدراسة التطبيقية والعملية: المحاكاة، الاختبار، ومقارنة السيناريوهات"),
        ("الفصل الخامس", "مناقشة النتائج، الاستنتاجات العامة، والتوصيات التطبيقية")
    ]
    for idx, (c_name, c_title) in enumerate(ch_summary, start=1):
        row = ch_tbl.rows[idx]
        c0 = row.cells[0]
        c0.width = Inches(1.8)
        set_cell_background(c0, "F8FAFC")
        set_cell_margins(c0, top=100, bottom=100, left=120, right=120)
        set_cell_borders(c0, top="single", bottom="single", left="single", right="single", color="E2E8F0")
        p_c0 = c0.paragraphs[0]
        make_para_rtl(p_c0, WD_ALIGN_PARAGRAPH.CENTER)
        add_rtl_run(p_c0, c_name, font_size=10.5, bold=True, color_rgb=(2, 132, 199))
        
        c1 = row.cells[1]
        c1.width = Inches(4.9)
        set_cell_background(c1, "FFFFFF" if idx % 2 == 1 else "F8FAFC")
        set_cell_margins(c1, top=100, bottom=100, left=140, right=140)
        set_cell_borders(c1, top="single", bottom="single", left="single", right="single", color="E2E8F0")
        p_c1 = c1.paragraphs[0]
        make_para_rtl(p_c1)
        add_rtl_run(p_c1, c_title, font_size=10.5, bold=False, color_rgb=(30, 41, 59))

    # Detailed Chapters Content
    chapters_details = [
        ("📖 الفصل الأول: مدخل تعريفي ومفاهيمي (العمارة الاستجابية وتقنيات التوأم الرقمي)", [
            "1-1 تمهيد ومشكلة البحث وأهدافه.",
            "1-2 التحول من العمارة الثابتة إلى العمارة الاستجابية (Responsive Architecture):\n     • نشأة وتطور العمارة التفاعلية والحركية (Kinetic Architecture).\n     • أنماط الحركة المعمارية: الانزلاق، الطي، الدوران، والتمدد.",
            "1-3 ماهية التوأم الرقمي (Digital Twin Concept in Built Environment):\n     • الفرق بين النمذجة ثلاثية الأبعاد الثابتة (3D CAD)، ونمذجة معلومات البناء (BIM)، والتوأم الرقمي الحي (Live Digital Twin).\n     • البنية التحتية للأنظمة السيبرانية-الفيزيائية (Cyber-Physical Systems - CPS).",
            "1-4 إنترنت الأشياء (IoT) والاستشعار البيئي والإشغالي:\n     • تقنيات تتبع الإشغال: حساسات الحركة (PIR)، عدادات الأبواب، وكاميرات الرؤية الحاسوبية، ومستشعرات CO2.",
            "1-5 مراجعة الدراسات السابقة وتحديد الفجوة المعرفية.",
            "1-6 خلاصة الفصل الأول."
        ]),
        ("📖 الفصل الثاني: الإطار النظري (الأبعاد الاجتماعية-الحيزية ونظريات إعادة التشكيل المكاني)", [
            "2-1 تمهيد.",
            "2-2 السلوك الاجتماعي-الحيزي في بيئات العمل الإدارية (Socio-Spatial Behavior):\n     • نظرية التقارب والمجال الشخصي (Proxemics & Personal Space - Edward T. Hall).\n     • التشكيل الحيزي وتفاعلات الجماعات (F-Formations & Spatial Group Dynamics).",
            "2-3 ديناميكيات الكثافة والتزاحم (Density, Overcrowding & Stress):\n     • الكثافة الحيزية مقابل الكثافة الاجتماعية.\n     • نظريات التزاحم وعلم النفس الإيكولوجي (Ecological Psychology & Overload Theory).",
            "2-4 مسارات الحركة وتدفق المشاة (Circulation & Pedestrian Flow):\n     • النحو الفضائي (Space Syntax): مفاهيم التكامل (Integration)، والاختيار (Choice)، وقابلية الرؤية (VGA).\n     • تشكل الاختناقات (Bottlenecks) وديناميكيات الحشود.",
            "2-5 استراتيجيات إعادة التشكيل المكاني (Spatial Reconfiguration Typologies):\n     • الدمج الفضائي (Space Merging)، التقسيم (Subdivision)، والتوجيه البديل (Flow Rerouting).\n     • مؤشرات كفاءة إدارة المكان والزمان: معادلات مضاعف الزمكان (Space-Time Multiplier - STM).",
            "2-6 صياغة مصفوفة الإطار النظري ومؤشرات القياس."
        ]),
        ("📖 الفصل الثالث: الإطار المنهجي (بناء وهندسة منصة التوأم الرقمي التكيفية)", [
            "3-1 تمهيد وخريطة منهجية البحث.",
            "3-2 بنية النظام البرمجي للمنصة (System Architecture):\n     • طبقة استقبال البيانات والنمذجة: معالجة ملفات IFC عبر WebAssembly (web-ifc) ومخططات PDF المتجهية.\n     • طبقة العرض والتصيير ثلاثي الأبعاد: محرك WebGL / Three.js، الخامات المعمارية PBR، وإلغاء الوجوه الخلفية العتادي (Backface Culling) لمنع الـ Lagging.",
            "3-3 محرك محاكاة تدفق المشاة (Agent-Based Pedestrian Circulation Engine):\n     • خوارزمية تمثيل الأفراد كوكلاء رقميين مستقلين (Agents).\n     • تصنيف مسارات الحركة: الشريان المركزي (Spine)، مسارات الموظفين (Staff)، الأدراج (Vertical)، والمسارات الالتفافية (Bypass).",
            "3-4 محرك اتخاذ قرار التكيف وإعادة التشكيل (Adaptive Decision Engine):\n     • شروط تحفيز حركة القواطع المنزلقة (Trigger Thresholds): نسب الإشغال ومعدل التكدس.\n     • ميكانيكا الحركة ثلاثية الأبعاد للقواطع الافتراضية وحساب السعات الجديدة.",
            "3-5 واجهة المستخدم التفاعلية (User Interface & HUD Controls):\n     • أدوات التدوير والاستقامة (Auto-Orientation & Leveling Tools).\n     • بطاقات فحص عناصر الـ BIM بالـ Raycasting ومصفوفة الطبقات.",
            "3-6 خلاصة الفصل الثالث."
        ]),
        ("📖 الفصل الرابع: الدراسة التطبيقية والعملية (المحاكاة، الاختبار، ومقارنة السيناريوهات)", [
            "4-1 تمهيد ومنهجية الدراسة العملية.",
            "4-2 انتخاب وتوصيف عينات الدراسة (Case Studies):\n     • دراسة حالة 1: المبنى الإداري النموذجي متعدد الوظائف (Baseline Benchmark).\n     • دراسة حالة 2: دائرة حكومية محلية ذات تدفق مراجعين كثيف (مثل مبنى هيأة التقاعد الوطنية أو دائرة الضريبة في بغداد).",
            "4-3 إعداد النماذج ثلاثية الأبعاد (IFC/CAD/PDF) ومعايرة المقاييس الهندسية (Calibration).",
            "4-4 تطبيق ومحاكاة السيناريوهات التشغيلية:\n     • السيناريو الأول (الوضع الراهن الثابت - Static Baseline): تشغيل المبنى بكثافات الذروة دون أي تدخل تكيفي وتسجيل الاختناقات.\n     • السيناريو الثاني (التوأم الرقمي المتكيف - Adaptive Reconfiguration): تفعيل المحرك الحركي لفتح القواطع المنزلقة وتشغيل الممرات الالتفافية.",
            "4-5 استخراج وتحليل البيانات المقارنة (Comparative Data Analysis):\n     • مقارنة الكثافة ومؤشر التزاحم.\n     • مقارنة زمن الانتظار وسرعة تفريغ الممرات.\n     • مقارنة مضاعف الزمكان (STM) ومعدل استغلال المساحات قبل وبعد التكيف.",
            "4-6 اختبار الفرضيات البحثية والتحقق الإحصائي."
        ]),
        ("📖 الفصل الخامس: مناقشة النتائج، الاستنتاجات، والتوصيات", [
            "5-1 تمهيد ومناقشة النتائج العامة في ضوء الإطار النظري.",
            "5-2 الاستنتاجات النظرية: (مساهمة التوأم الرقمي في تطوير نظريات البرمجة المعمارية المعاصرة).",
            "5-3 الاستنتاجات التطبيقية: (الأثر الإيجابي لإعادة التشكيل الحركي على مرونة الفضاءات الإدارية).",
            "5-4 المساهمة المعرفية والتطبيقية للأطروحة.",
            "5-5 التوصيات المعمارية والتشغيلية الموجهة للمصممين والمؤسسات الحكومية.",
            "5-6 آفاق البحث المستقبلية (Future Research Horizons)."
        ])
    ]

    for ch_title, ch_sections in chapters_details:
        doc.add_paragraph()
        cp = doc.add_paragraph()
        make_para_rtl(cp)
        add_rtl_run(cp, ch_title, font_size=12, bold=True, color_rgb=(15, 23, 42))
        
        for sec in ch_sections:
            sp = doc.add_paragraph()
            make_para_rtl(sp)
            add_rtl_run(sp, sec, font_size=10.5, color_rgb=(51, 65, 85))

    doc.add_paragraph() # Spacer

    # Section 6: Empirical Study
    h6 = doc.add_paragraph()
    make_para_rtl(h6)
    add_rtl_run(h6, "6. تفاصيل الدراسة العملية والمنهجية التطبيقية (Empirical Study)", font_size=14, bold=True, color_rgb=(2, 132, 199))

    p_emp_intro = doc.add_paragraph()
    make_para_rtl(p_emp_intro)
    add_rtl_run(p_emp_intro, "تعتمد الدراسة العملية على المنهج التجريبي المقارن القائم على المحاكاة الرقمية المتقدمة (Simulation-based Comparative Empirical Method) وفق الخطوات التفصيلية الآتية:", font_size=11)

    emp_sections = [
        ("أ. عينات الدراسة ومجتمع البحث (Case Studies Selection):", [
            "1. عينة معيارية مصممة (Benchmark Administrative Model): مبنى إداري يحتوي على: ردهة استقبال، صالة انتظار مراجعين، قاعات تدريب واجتماعات مرنة متعددة الأغراض، شريان حركي مركزي، ممر التفافي جنوبي، ومكاتب عمل جماعية مفتوحة.",
            "2. عينة واقعية محلية (Local Government Case Study): اختيار أحد المباني الحكومية العراقية التي تعاني من اختناق حاد في حركة المراجعين (مثل فضاءات هيأة التقاعد الوطنية في الكرخ/بغداد أو إحدى دوائر الضريبة)، بالاستفادة من المخططات والمساقط المعمارية المسجلة."
        ]),
        ("ب. متغيرات الدراسة ومؤشرات القياس (Variables & Metrics):", [
            "• المتغيرات المستقلة (Independent Variables):\n   - النمط التكويني للفضاء (Spatial Configuration Mode): نمط أ (إستاتيكي مغلق) مقابل نمط ب (تكيفي ديناميكي بقواطع منزلقة).\n   - شبكة المسارات الحركية: مسار أحادي مركزي مقابل مسار ثنائي ديناميكي بممرات التفافية.\n   - مستوى ضغط الإشغال (Inflow Rate): محاكاة تدفق المراجعين (طبيعي 100%، ذروة 150%، واكتظاظ حرج 200%).",
            "• المتغيرات التابعة ومؤشرات الأداء (Dependent Variables / Metrics):\n   - مؤشر الكثافة الحيزية الفعلية (m²/person) ومقارنتها بمعامل الفارق المحلي (Δ = 0.141).\n   - مضاعف الزمكان (STM = SOR / DOR): تقييم كفاءة إدارة الفضاءات وفق تصنيفات Fawcett.\n   - معدل التكدس ونقاط الاختناق (Bottleneck Severity %).\n   - معدل الانتفاع الفضائي (Utilisation Rate = Frequency × Occupancy)."
        ]),
        ("ج. مراحل إجراء التجربة والمحاكاة عبر المنصة (Experimental Protocol):", [
            "• المرحلة الأولى (تهيئة ومعايرة النموذج المعماري): استيراد ملف IFC وتوليد الكتل ثلاثية الأبعاد، تشغيل خوارزمية الاستقامة التلقائية (Auto-Leveling) لمحاذاة المبنى على شبكة الأرضية، وتحديد مواقع القواطع المنزلقة (p_waiting_multi) والممرات الالتفافية.",
            "• المرحلة الثانية (اختبار السيناريو المرجعي - Static Baseline): ضخ أعداد المراجعين بمعدلات الذروة (>500 مراجع)، إبقاء القواطع مغلقة، ورصد مؤشرات التكدس (اكتظاظ صالة الانتظار 160%، تحول التدفق للون الأحمر، وبقاء قاعة التدريب بنسبة 0%).",
            "• المرحلة الثالثة (اختبار سيناريو التوأم الرقمي المتكيف - Adaptive Twin): عند بلوغ عتبة 85% إشغال، يطلق النظام أمراً مؤتمتاً لفتح القاطع المنزلق لدمج صالة الانتظار بالقاعة المجاورة ومضاعفة السعة من 22 إلى 42 شخصاً، وتفعيل الممر الالتفافي لتفريغ 35% من حشود الذروة.",
            "• المرحلة الرابعة (المقارنة الإحصائية والتحقق العلمي): استخراج تقرير بياني يبرهن: انخفاض مؤشر التكدس بأكثر من 45%، ارتفاع كفاءة استغلال قاعات التدريب من 15% إلى 78%، وعودة تدفق المشاة إلى سرعة السير الطبيعية السلسة."
        ])
    ]

    for sec_t, sec_body in emp_sections:
        doc.add_paragraph()
        p_st = doc.add_paragraph()
        make_para_rtl(p_st)
        add_rtl_run(p_st, sec_t, font_size=11.5, bold=True, color_rgb=(13, 148, 136))
        for item in sec_body:
            p_it = doc.add_paragraph()
            make_para_rtl(p_it)
            add_rtl_run(p_it, item, font_size=10.5, color_rgb=(51, 65, 85))

    doc.add_paragraph() # Spacer

    # Section 7: Impact
    h7 = doc.add_paragraph()
    make_para_rtl(h7)
    add_rtl_run(h7, "7. القيمة المضافة والمخرجات المتوقعة (Expected Contribution & Impact)", font_size=14, bold=True, color_rgb=(2, 132, 199))

    impacts = [
        ("إضافة علمية للمكتبة المعمارية العراقية والعربية:", " يُعد البحث من أوائل الدراسات الأكاديمية التي تنقل مفهوم «التوأم الرقمي» (Digital Twin) من الإطار النظري أو الهندسة الميكانيكية والصناعية إلى صميم التصميم المعماري الداخلي وإدارة الفضاءات الحركية التكيفية."),
        ("برمجية تطبيقية مفتوحة وقابلة للنشر والتطوير:", " المنصة المنفذة بتقنيات الويب الحديثة تتيح للجامعة والباحثين استعراض النتائج في جلسة مناقشة الماجستير بصورة تفاعلية حية، ونشر أوراق بحثية في مجلات عالمية محكمة رصينة (Clarivate / Scopus)."),
        ("حل اقتصادي وطاقي للمؤسسات الحكومية:", " إثبات أن المباني لا تحتاج بالضرورة إلى ميزانيات ضخمة لإنشاء كتل إسمنتية جديدة لاستيعاب الزيادة السكانية، بل يمكن مضاعفة قدرتها الاستيعابية عبر «العمارة الحركية الذكية والتشغيل التكيفي المؤتمت».")
    ]
    for imp_t, imp_d in impacts:
        p_imp = doc.add_paragraph()
        make_para_rtl(p_imp)
        add_rtl_run(p_imp, "🌟 " + imp_t, font_size=11, bold=True, color_rgb=(217, 119, 6))
        add_rtl_run(p_imp, imp_d, font_size=10.5)

    doc.save(filename)
    print(f"Word document saved successfully to: {filename}")

def create_html_for_pdf(html_filename):
    html_content = """<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>مقترح رسالة ماجستير في علوم هندسة العمارة | التوأم الرقمي المتكيف</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;800;900&display=swap');

        @page {
            size: A4;
            margin: 20mm 15mm 20mm 15mm;
            @top-right {
                content: "الجامعة التكنولوجية – قسم هندسة العمارة";
                font-family: 'Cairo', sans-serif;
                font-size: 8pt;
                color: #94a3b8;
            }
            @bottom-center {
                content: "صفحة " counter(page);
                font-family: 'Cairo', sans-serif;
                font-size: 8.5pt;
                color: #64748b;
            }
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: 'Cairo', sans-serif;
            font-size: 10.5pt;
            line-height: 1.7;
            color: #1e293b;
            background: #ffffff;
            direction: rtl;
            text-align: right;
        }

        .header-banner {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            border-right: 6px solid #0284c7;
            border-radius: 10px;
            padding: 22px 25px;
            color: #ffffff;
            margin-bottom: 24px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
            page-break-inside: avoid;
        }

        .header-banner .univ-name {
            font-size: 11pt;
            font-weight: 700;
            color: #38bdf8;
            margin-bottom: 4px;
        }

        .header-banner h1 {
            font-size: 17pt;
            font-weight: 900;
            color: #ffffff;
            margin-bottom: 8px;
            line-height: 1.3;
        }

        .header-banner .sub-track {
            font-size: 9.5pt;
            color: #cbd5e1;
        }

        .section-title {
            font-size: 13pt;
            font-weight: 800;
            color: #0284c7;
            margin: 22px 0 10px 0;
            padding-bottom: 4px;
            border-bottom: 2px solid #e2e8f0;
            page-break-after: avoid;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        p {
            margin-bottom: 10px;
            text-align: justify;
        }

        .quote-box {
            background: #fff1f2;
            border-right: 4px solid #e11d48;
            border-radius: 6px;
            padding: 12px 16px;
            margin: 14px 0;
            color: #9f1239;
            font-size: 10pt;
            line-height: 1.6;
            page-break-inside: avoid;
        }
        .quote-box strong {
            color: #e11d48;
            display: block;
            margin-bottom: 4px;
        }

        .info-table, .chapter-table {
            width: 100%;
            border-collapse: collapse;
            margin: 12px 0;
            font-size: 9.5pt;
            page-break-inside: avoid;
        }

        .info-table td, .chapter-table td, .chapter-table th {
            border: 1px solid #cbd5e1;
            padding: 8px 12px;
            vertical-align: top;
        }

        .info-table td.label-col {
            background: #f1f5f9;
            font-weight: 700;
            width: 28%;
            color: #0f172a;
        }

        .info-table td.val-col {
            background: #ffffff;
            color: #1e293b;
        }

        .chapter-table th {
            background: #0f172a;
            color: #ffffff;
            font-weight: 700;
            text-align: center;
        }

        .chapter-table td.ch-num {
            background: #f8fafc;
            color: #0284c7;
            font-weight: 700;
            text-align: center;
            width: 22%;
        }

        .chapter-block {
            margin-bottom: 12px;
            page-break-inside: avoid;
        }

        .chapter-block h4 {
            font-size: 11pt;
            font-weight: 800;
            color: #0f172a;
            margin-bottom: 4px;
            background: #f8fafc;
            padding: 4px 8px;
            border-right: 3px solid #0284c7;
            border-radius: 4px;
        }

        .chapter-block ul {
            list-style: none;
            padding-right: 12px;
        }

        .chapter-block ul li {
            position: relative;
            margin-bottom: 4px;
            font-size: 9.5pt;
            color: #334155;
            line-height: 1.6;
        }

        .chapter-block ul li::before {
            content: "•";
            color: #0284c7;
            font-weight: bold;
            display: inline-block;
            width: 1em;
            margin-right: -1em;
        }

        .bullet-list {
            margin-right: 18px;
            margin-bottom: 10px;
        }

        .bullet-list li {
            margin-bottom: 6px;
        }

        .highlight-badge {
            background: #e0f2fe;
            color: #0369a1;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 700;
            font-size: 9pt;
        }

        .math-code {
            direction: ltr;
            display: inline-block;
            font-family: 'Fira Code', monospace;
            background: #f1f5f9;
            padding: 2px 6px;
            border-radius: 4px;
            color: #0f766e;
            font-weight: 600;
            font-size: 9.5pt;
        }

        .impact-card {
            background: #fffbeb;
            border-right: 4px solid #f59e0b;
            border-radius: 6px;
            padding: 10px 14px;
            margin-bottom: 8px;
            font-size: 9.5pt;
            page-break-inside: avoid;
        }
        .impact-card strong {
            color: #b45309;
        }
    </style>
</head>
<body>

    <div class="header-banner">
        <div class="univ-name">الجامعة التكنولوجية – قسم هندسة العمارة</div>
        <h1>مقترح رسالة ماجستير في علوم هندسة العمارة 🏛️📋</h1>
        <div class="sub-track">التخصص الدقيق: تصميم معماري / العمارة الرقمية والذكية وتكنولوجيا البناء (Smart & Computational Architecture)</div>
    </div>

    <!-- بطاقة المعلومات -->
    <div class="section-title">📑 بطاقة المعلومات التمهيدية للمقترح</div>
    <table class="info-table">
        <tr>
            <td class="label-col">العنوان باللغة العربية:</td>
            <td class="val-col"><strong>«التوأم الرقمي المتكيف لإعادة التشكيل الحركي والمكاني في الأبنية الإدارية: نمذجة تفاعلية قائمة على بيانات الإشغال اللحظية»</strong></td>
        </tr>
        <tr>
            <td class="label-col">العنوان باللغة الإنجليزية:</td>
            <td class="val-col" style="direction: ltr; text-align: left;"><strong>“Adaptive Digital Twin for Kinetic and Spatial Reconfiguration in Office Buildings: An Interactive Modelling Approach Based on Real-Time Occupancy Data”</strong></td>
        </tr>
        <tr>
            <td class="label-col">الجهة الأكاديمية المانحة:</td>
            <td class="val-col">الجامعة التكنولوجية – قسم هندسة العمارة (العراق – بغداد)</td>
        </tr>
        <tr>
            <td class="label-col">المجال المعرفي والتطبيقي:</td>
            <td class="val-col">العمارة السيبرانية-الفيزيائية المتكيفة • نمذجة معلومات البناء (BIM/IFC) • إنترنت الأشياء (IoT) • النحو الفضائي (Space Syntax)</td>
        </tr>
    </table>

    <!-- 1. فكرة الرسالة -->
    <div class="section-title">1. فكرة الرسالة وفلسفتها المعمارية (Research Concept)</div>
    <p>تطرح الرسالة رؤية معمارية رائدة تتجاوز مفهوم <span class="highlight-badge" style="background:#ffe4e6; color:#be123c;">العمارة الساكنة (Static Architecture)</span> التي يُصمم فيها المبنى ككتلة جامدة ذات جدران وفضاءات ثابتة الحدود، نحو <span class="highlight-badge" style="background:#ccfbf1; color:#0f766e;">العمارة السيبرانية-الفيزيائية المتكيفة (Adaptive Cyber-Physical Architecture)</span> من خلال بناء توأم رقمي (Digital Twin) متصل بنظام الفضاء المعماري الحقيقي.</p>
    <p><strong>تقوم الفكرة على إنشاء حلقة تفاعلية مغلقة (Closed-Loop System) ثلاثية المراحل:</strong></p>
    <ul class="bullet-list">
        <li><strong>الرصد والاستشعار (Sensing):</strong> التقاط وتحليل تدفقات حركة وإشغال المستخدمين اللحظية (موظفين ومراجعين) عبر حساسات إنترنت الأشياء (IoT) ومحاكاة الوكلاء (Agent-Based Simulation).</li>
        <li><strong>التحليل الرقمي واتخاذ القرار (Decision Engine):</strong> معالجة الاختناقات والكثافات الحرجة وحساب معدلات الانتفاع والزمكان لحظياً استناداً إلى دالة خفض إجهاد الحركة التراكمي.</li>
        <li><strong>التكيف المادي الفعلي (Physical Kinetic Reconfiguration):</strong> تحفيز عناصر معمارية حركية (قواطع جدارية منزلقة عازلة للصوت، مسارات حركة التفافية بديلة، وتوسيع/تقليص سعة القاعات) لإعادة تشكيل الفضاء وتغيير طوبولوجيته في ثوانٍ معدودة استجابةً لحاجة الشاغلين، ثم استعادة التشكيل مجدداً عند انتهاء الذروة.</li>
    </ul>

    <!-- 2. مشكلة البحث -->
    <div class="section-title">2. مشكلة البحث (The Research Problem)</div>
    <div class="quote-box">
        <strong>الصياغة المركزية للمشكلة المعمارية:</strong>
        «القصور الوظيفي والتشغيلي الناجم عن الجمود الفضائي للأبنية الإدارية في مواجهة التذبذب الزماني-المكاني لإشغال المستخدمين؛ حيث تفشل برامج التصميم المعماري الإستاتيكية السابقة في استيعاب التزاحم الحرج في فضاءات الحركة والانتظار المشتركة خلال ساعات الذروة، بالتزامن مع هدر فراغي وطاقي في فضاءات العمل والتدريب المجاورة غير المستغلة، في ظل غياب منظومة توأم رقمي تكيفية قادرة على إعادة التشكيل الحركي والمكاني المؤتمت في الزمن الحقيقي».
    </div>
    <p><strong>الأبعاد التفصيلية للمشكلة:</strong></p>
    <ul class="bullet-list">
        <li><strong>1. فجوة البرمجة المعمارية (Programming Gap):</strong> يتم تصميم المباني الإدارية وفق معايير مساحية إحصائية مفترضة وثابتة (Standard Norms)، بينما يثبت الواقع الإشغالي الميداني وجود طفرات كثافة وتزاحم عشوائي غير متوقع للمراجعين يتجاوز الطاقة الاستيعابية بمرات عديدة.</li>
        <li><strong>2. الجمود المكاني والهدر الفضائي المزدوج (Dual Inefficiency):</strong> في نفس اللحظة التي تختنق فيها ردهة الاستقبال والممرات وصالات الانتظار بنسب تزاحم مفرطة، تكون قاعات الاجتماعات أو التدريب المجاورة شاغرة ومغلقة بسبب الجدران المصمتة الفاصلة.</li>
        <li><strong>3. العجز عن التدخل اللحظي (Lagged Response):</strong> تقتصر الحلول التقليدية على توسيع المبنى أفقياً أو بناء ملحقات باهظة التكلفة، أو وضع حلول تنظيمية متأخرة لا تستجيب للزمن الحقيقي.</li>
    </ul>

    <!-- 3. أهداف البحث -->
    <div class="section-title">3. أهداف البحث (Research Objectives)</div>
    <p><strong>الهدف الرئيس (Main Objective):</strong> تطوير واختبار نموذج معماري لـ توأم رقمي متكيف (Adaptive Digital Twin) قادر على رصد ديناميكيات الإشغال والحركة في الأبنية الإدارية، وتوليد قرارات إعادة التشكيل المكاني والحركي المؤتمت (Kinetic Spatial Reconfiguration) لتحقيق التوازن بين الكثافة الاجتماعية وسعة الحيز الفيزيائي في الزمن الحقيقي.</p>
    <p><strong>الأهداف الثانوية والتفصيلية:</strong></p>
    <ul class="bullet-list">
        <li><strong>تأصيل الإطار النظري:</strong> بناء قاعدة معرفية تدمج بين نظريات السلوك الاجتماعي-الحيزي (Socio-Spatial Behavior)، ونحو الفضاء (Space Syntax)، وتقنيات التوأم الرقمي (Digital Twin)، والعمارة الحركية (Kinetic Architecture).</li>
        <li><strong>حوسبة مؤشرات الإشغال والحركة:</strong> تحويل المفاهيم المعمارية والاجتماعية (الكثافة، التزاحم، مضاعف الزمكان STM، قابلية المشي، انسيابية التدفق) إلى خوارزميات ومعادلات برمجية قابلة للقياس الرقمي اللحظي.</li>
        <li><strong>تطوير المحرك التوليدي للتكيف (Reconfiguration Engine):</strong> صياغة قواعد برمجية (Rule-based Decision System) تقرر متى وكيف تتحرك القواطع المرنة وتُفتح الممرات البديلة بناءً على تخطي عتبات التكدس الحرجة.</li>
        <li><strong>التكامل مع نماذج الـ BIM:</strong> تمكين المنظومة من قراءة ومعالجة نماذج البناء ثلاثية الأبعاد المصدرة بصيغ عالمية مفتوحة (IFC / OpenBIM) ومساقط الـ PDF الهندسية عبر الويب.</li>
        <li><strong>التحقق التجريبي والمقارنة (Validation):</strong> تطبيق المنظومة على دراسات حالة لأبنية إدارية محلية وإجراء مقارنة علمية دقيقة (Before vs. After) لإثبات جدوى وكفاءة الحلول التكيفية.</li>
    </ul>

    <!-- 4. فرضيات البحث -->
    <div class="section-title">4. فرضيات البحث (Research Hypotheses)</div>
    <ul class="bullet-list">
        <li><strong>الفرضية الأولى:</strong> «يؤدي توظيف التوأم الرقمي المعتمد على بيانات الإشغال اللحظية إلى خفض معدلات التزاحم وزمن الانتظار في الفضاءات المشتركة بنسبة لا تقل عن 35% مقارنة بالتصميم الإستاتيكي الثابت».</li>
        <li><strong>الفرضية الثانية:</strong> «إن إعادة التشكيل المكاني عبر القواطع الحركية المرنة ترفع من مؤشر كفاءة الانتفاع الفضائي ومضاعف الزمكان (STM) للفضاءات نادرة الاستخدام لتصل إلى المعدل المتوازن (<span class="math-code">STM ≈ 1.0</span>) دون الحاجة لزيادة المساحة البنائية الكلية للمبنى».</li>
        <li><strong>الفرضية الثالثة:</strong> «تفعيل مسارات الحركة الالتفافية التكيفية في المنظور ثلاثي الأبعاد يمنع تشكل نقاط الاختناق الحرجة (Bottlenecks) ويحافظ على انسيابية تدفق المشاة عند مستوى الخدمة المريح».</li>
    </ul>

    <!-- 5. هيكلية فصول الرسالة -->
    <div class="section-title">5. هيكلية فصول الرسالة (Thesis Structure & Outline)</div>
    <table class="chapter-table">
        <tr>
            <th>الفصل</th>
            <th>عنوان وموضوع الفصل</th>
        </tr>
        <tr>
            <td class="ch-num">الفصل الأول</td>
            <td>الخلفية المفاهيمية: التوأم الرقمي والعمارة الاستجابية الحركية</td>
        </tr>
        <tr>
            <td class="ch-num">الفصل الثاني</td>
            <td>الإطار النظري: الأبعاد السلوكية-الحيزية وآليات إعادة التشكيل المكاني</td>
        </tr>
        <tr>
            <td class="ch-num">الفصل الثالث</td>
            <td>الإطار المنهجي: بناء وهندسة منظومة التوأم الرقمي التكيفية</td>
        </tr>
        <tr>
            <td class="ch-num">الفصل الرابع</td>
            <td>الدراسة التطبيقية والعملية: المحاكاة، الاختبار، ومقارنة السيناريوهات</td>
        </tr>
        <tr>
            <td class="ch-num">الفصل الخامس</td>
            <td>مناقشة النتائج، الاستنتاجات العامة، والتوصيات التطبيقية</td>
        </tr>
    </table>

    <!-- تفصيل الفصول -->
    <div class="chapter-block">
        <h4>📖 الفصل الأول: مدخل تعريفي ومفاهيمي (العمارة الاستجابية وتقنيات التوأم الرقمي)</h4>
        <ul>
            <li>1-1 تمهيد ومشكلة البحث وأهدافه.</li>
            <li>1-2 التحول من العمارة الثابتة إلى العمارة الاستجابية: نشأة وتطور العمارة التفاعلية والحركية، وأنماط الحركة المعمارية (الانزلاق، الطي، والدوران).</li>
            <li>1-3 ماهية التوأم الرقمي في البيئة المبنية: الفرق بين 3D CAD و BIM والتوأم الرقمي الحي، والبنية التحتية للأنظمة السيبرانية-الفيزيائية (CPS).</li>
            <li>1-4 إنترنت الأشياء (IoT) والاستشعار الإشغالي والبيئي: حساسات PIR، عدادات الأبواب، وكاميرات الرؤية الحاسوبية، وحساسات CO2.</li>
            <li>1-5 مراجعة الدراسات السابقة وتحديد الفجوة المعرفية.</li>
            <li>1-6 خلاصة الفصل الأول.</li>
        </ul>
    </div>

    <div class="chapter-block">
        <h4>📖 الفصل الثاني: الإطار النظري (الأبعاد الاجتماعية-الحيزية ونظريات إعادة التشكيل المكاني)</h4>
        <ul>
            <li>2-1 تمهيد.</li>
            <li>2-2 السلوك الاجتماعي-الحيزي في بيئات العمل الإدارية: نظرية التقارب والمجال الشخصي (Edward T. Hall)، والتشكيل الحيزي للجماعات (F-Formations).</li>
            <li>2-3 ديناميكيات الكثافة والتزاحم: الكثافة الحيزية مقابل الاجتماعية، ونظريات علم النفس الإيكولوجي (Overload Theory).</li>
            <li>2-4 مسارات الحركة وتدفق المشاة: النحو الفضائي (Space Syntax)، التكامل والاختيار، ونقاط الاختناق (Bottlenecks).</li>
            <li>2-5 استراتيجيات إعادة التشكيل المكاني: الدمج الفضائي، التقسيم، والتوجيه البديل، ومعادلات مضاعف الزمكان (STM).</li>
            <li>2-6 صياغة مصفوفة الإطار النظري ومؤشرات القياس.</li>
        </ul>
    </div>

    <div class="chapter-block">
        <h4>📖 الفصل الثالث: الإطار المنهجي (بناء وهندسة منصة التوأم الرقمي التكيفية)</h4>
        <ul>
            <li>3-1 تمهيد وخريطة منهجية البحث.</li>
            <li>3-2 بنية النظام البرمجي: استقبال ملفات IFC عبر WebAssembly، وطبقة التصيير ثلاثي الأبعاد WebGL/Three.js لمنع الـ Lagging.</li>
            <li>3-3 محرك محاكاة تدفق المشاة القائم على الوكلاء (Agent-Based Simulation) وتصنيف مسارات الحركة.</li>
            <li>3-4 محرك اتخاذ قرار التكيف وإعادة التشكيل: شروط التحفيز (Trigger Thresholds) وميكانيكا حركة القواطع المنزلقة.</li>
            <li>3-5 واجهة المستخدم التفاعلية (HUD): أدوات التدوير والاستقامة (Auto-Orientation)، وفحص عناصر BIM بالـ Raycasting.</li>
            <li>3-6 خلاصة الفصل الثالث.</li>
        </ul>
    </div>

    <div class="chapter-block">
        <h4>📖 الفصل الرابع: الدراسة التطبيقية والعملية (المحاكاة، الاختبار، ومقارنة السيناريوهات)</h4>
        <ul>
            <li>4-1 تمهيد ومنهجية الدراسة العملية.</li>
            <li>4-2 انتخاب عينات الدراسة: عينة معيارية مصممة (Benchmark)، وعينة حكومية محلية (هيأة التقاعد الوطنية أو دائرة الضريبة في بغداد).</li>
            <li>4-3 إعداد النماذج ثلاثية الأبعاد (IFC/CAD/PDF) ومعايرة المقاييس الهندسية (1:1 Calibration).</li>
            <li>4-4 تطبيق ومحاكاة السيناريوهات: الوضع الراهن الثابت (Baseline) مقابل التوأم الرقمي المتكيف (Adaptive Reconfiguration).</li>
            <li>4-5 استخراج وتحليل البيانات المقارنة: الكثافة، زمن الانتظار، وسرعة تفريغ الممرات، ومضاعف الزمكان (STM).</li>
            <li>4-6 اختبار الفرضيات البحثية والتحقق الإحصائي.</li>
        </ul>
    </div>

    <div class="chapter-block">
        <h4>📖 الفصل الخامس: مناقشة النتائج، الاستنتاجات، والتوصيات</h4>
        <ul>
            <li>5-1 تمهيد ومناقشة النتائج العامة في ضوء الإطار النظري.</li>
            <li>5-2 الاستنتاجات النظرية: مساهمة التوأم الرقمي في تطوير نظريات البرمجة المعمارية المعاصرة.</li>
            <li>5-3 الاستنتاجات التطبيقية: الأثر الإيجابي لإعادة التشكيل الحركي على مرونة الفضاءات الإدارية.</li>
            <li>5-4 المساهمة المعرفية والتطبيقية للأطروحة.</li>
            <li>5-5 التوصيات المعمارية والتشغيلية الموجهة للمصممين والمؤسسات الحكومية.</li>
            <li>5-6 آفاق البحث المستقبلية (Future Research Horizons).</li>
        </ul>
    </div>

    <!-- 6. الدراسة العملية -->
    <div class="section-title">6. تفاصيل الدراسة العملية والمنهجية التطبيقية (Empirical Study)</div>
    <p>تعتمد الدراسة العملية على المنهج التجريبي المقارن القائم على المحاكاة الرقمية المتقدمة وفق الخطوات الآتية:</p>

    <p><strong>أ. عينات الدراسة ومجتمع البحث:</strong></p>
    <ul class="bullet-list">
        <li><strong>عينة معيارية مصممة (Benchmark Administrative Model):</strong> مبنى إداري يحتوي على ردهة استقبال، صالة انتظار، قاعات تدريب مرنة متعددة الأغراض، شريان حركي مركزي، ممر التفافي جنوبي، ومكاتب عمل جماعية.</li>
        <li><strong>عينة واقعية محلية (Local Government Case Study):</strong> مبنى حكومي عراقي يعاني من اختناق حاد في حركة المراجعين (مثل فضاءات هيأة التقاعد الوطنية في الكرخ/بغداد أو إحدى دوائر الضريبة).</li>
    </ul>

    <p><strong>ب. متغيرات الدراسة ومؤشرات القياس:</strong></p>
    <ul class="bullet-list">
        <li><strong>المتغيرات المستقلة:</strong> النمط التكويني للفضاء (إستاتيكي مغلق مقابل تكيفي ديناميكي)، شبكة المسارات (أحادي مركزي مقابل ثنائي ديناميكي بممر التفافي)، ومستوى ضغط الإشغال (100%، 150%، و 200%).</li>
        <li><strong>المتغيرات التابعة ومؤشرات الأداء:</strong> الكثافة الحيزية الفعلية (<span class="math-code">m²/person</span>)، مضاعف الزمكان (<span class="math-code">STM = SOR / DOR</span>)، معامل الاختناق (<span class="math-code">Bottleneck Severity %</span>)، ومعدل الانتفاع الفضائي (<span class="math-code">Utilisation Rate = Freq × Occupancy</span>).</li>
    </ul>

    <p><strong>ج. مراحل إجراء التجربة والمحاكاة عبر المنصة:</strong></p>
    <ul class="bullet-list">
        <li><strong>المرحلة 1 (تهيئة النموذج ومعايرته):</strong> استيراد ملف IFC وتوليد الكتل ثلاثية الأبعاد، وتشغيل خوارزمية الاستقامة التلقائية (Auto-Leveling)، وتعيين القواطع المنزلقة (p_waiting_multi) والممرات الالتفافية.</li>
        <li><strong>المرحلة 2 (اختبار السيناريو المرجعي - Static Baseline):</strong> ضخ المراجعين بمعدلات الذروة (>500 مراجع)، إبقاء القواطع مغلقة، ورصد مؤشرات التكدس (اكتظاظ صالة الانتظار 160%، وتلون التدفق بالأحمر).</li>
        <li><strong>المرحلة 3 (اختبار سيناريو التوأم الرقمي المتكيف):</strong> عند بلوغ عتبة 85% إشغال، يطلق النظام أمراً آلياً لفتح القاطع المنزلق لمضاعفة سعة الانتظار من 22 إلى 42 شخصاً، وتفعيل الممر الالتفافي لتشتيت 35% من المشاة.</li>
        <li><strong>المرحلة 4 (المقارنة الإحصائية والتحقق العلمي):</strong> استخراج تقارير وجداول بيانية تثبت انخفاض التكدس بنسبة تفوق 45%، وارتفاع كفاءة استغلال قاعات التدريب من 15% إلى 78%، وعودة انسيابية الحركة.</li>
    </ul>

    <!-- 7. القيمة المضافة -->
    <div class="section-title">7. القيمة المضافة والمخرجات المتوقعة (Expected Contribution & Impact)</div>
    <div class="impact-card">
        <strong>🌟 إضافة علمية للمكتبة المعمارية العراقية والعربية:</strong>
        يُعد البحث من أوائل الدراسات الأكاديمية التي تنقل مفهوم «التوأم الرقمي» (Digital Twin) من الإطار النظري أو الهندسة الميكانيكية والصناعية إلى صميم التصميم المعماري الداخلي وإدارة الفضاءات الحركية التكيفية.
    </div>
    <div class="impact-card">
        <strong>🌟 برمجية تطبيقية مفتوحة وقابلة للنشر والتطوير:</strong>
        المنصة المنفذة بتقنيات الويب الحديثة تتيح للجامعة والباحثين استعراض النتائج في جلسة مناقشة الماجستير بصورة تفاعلية حية، ونشر أوراق بحثية في مجلات عالمية محكمة رصينة (Clarivate / Scopus).
    </div>
    <div class="impact-card">
        <strong>🌟 حل اقتصادي وطاقي للمؤسسات الحكومية:</strong>
        إثبات أن المباني لا تحتاج بالضرورة إلى ميزانيات ضخمة لإنشاء كتل إسمنتية جديدة لاستيعاب الزيادة السكانية، بل يمكن مضاعفة قدرتها الاستيعابية عبر «العمارة الحركية الذكية والتشغيل التكيفي المؤتمت».
    </div>

</body>
</html>
"""
    with open(html_filename, 'w', encoding='utf-8') as f:
        f.write(html_content)
    print(f"HTML print-template saved successfully to: {html_filename}")

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.abspath(__file__))
    docx_path = os.path.join(base_dir, "Master_Thesis_Proposal_Adaptive_Digital_Twin.docx")
    html_path = os.path.join(base_dir, "Master_Thesis_Proposal_Adaptive_Digital_Twin.html")
    pdf_path = os.path.join(base_dir, "Master_Thesis_Proposal_Adaptive_Digital_Twin.pdf")

    print("Step 1: Generating Word Document (.docx)...")
    create_docx(docx_path)

    print("Step 2: Generating HTML Template for PDF...")
    create_html_for_pdf(html_path)

    print("Step 3: Generating PDF Document via Chrome Headless...")
    chrome_bin = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    cmd = [
        chrome_bin,
        "--headless",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={pdf_path}",
        html_path
    ]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, check=True)
        print(f"PDF saved successfully to: {pdf_path}")
    except Exception as e:
        print(f"Error during PDF generation: {e}")
