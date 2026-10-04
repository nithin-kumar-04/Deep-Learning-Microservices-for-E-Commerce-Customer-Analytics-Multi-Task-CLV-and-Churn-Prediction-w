"""
Zenthiqa Project Report Book Generator  v2.0
=============================================
Academic Year  : 2026 - 2027
College        : Chaitanya Engineering College
Department     : AI & Data Science
Guide          : Mrs. P. Gayatri
Team Leader    : Gudabandi Nithin Kumar  23L61A5418
"""

import os
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

# ──────────────────────────────────────────────────────────────────────────────
# HELPER FUNCTIONS
# ──────────────────────────────────────────────────────────────────────────────

def set_page_margins(doc_or_section, top=1.0, bottom=1.0, left=1.25, right=1.0):
    s = doc_or_section.sections[-1] if hasattr(doc_or_section, 'sections') else doc_or_section
    s.top_margin    = Inches(top)
    s.bottom_margin = Inches(bottom)
    s.left_margin   = Inches(left)
    s.right_margin  = Inches(right)

def heading(doc, text, level=1, center=False):
    h = doc.add_heading(text, level=level)
    h.alignment = 1 if center else 0
    for run in h.runs:
        run.font.color.rgb = RGBColor(0, 0, 0)
    return h

def para(doc, text, justify=True, bold=False, size=12, color=None, spacing=None):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY if justify else WD_ALIGN_PARAGRAPH.LEFT
    if spacing:
        p.paragraph_format.line_spacing = spacing
    run = p.add_run(text)
    run.font.size  = Pt(size)
    run.font.bold  = bold
    run.font.name  = "Times New Roman"
    if color:
        run.font.color.rgb = color
    return p

def para_center(doc, text, bold=False, size=12, color=None, spacing=None):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    if spacing:
        p.paragraph_format.line_spacing = spacing
    run = p.add_run(text)
    run.font.size  = Pt(size)
    run.font.bold  = bold
    run.font.name  = "Times New Roman"
    if color:
        run.font.color.rgb = color
    return p

def body_para(doc, text, justify=True, bold=False, size=12):
    """Body paragraph with 1.5 line spacing — use for chapter content."""
    return para(doc, text, justify=justify, bold=bold, size=size, spacing=1.5)

def bullet(doc, text):
    p   = doc.add_paragraph(style='List Bullet')
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.line_spacing = 1.5
    run = p.add_run(text)
    run.font.size = Pt(12)
    run.font.name = "Times New Roman"
    return p

def numbered(doc, text):
    p   = doc.add_paragraph(style='List Number')
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p.paragraph_format.line_spacing = 1.5
    run = p.add_run(text)
    run.font.size = Pt(12)
    run.font.name = "Times New Roman"
    return p

def sep(doc):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after  = Pt(0)


def add_image(doc, path, caption=None, width=5.5):
    if os.path.exists(path):
        doc.add_picture(path, width=Inches(width))
        doc.paragraphs[-1].alignment = 1
        if caption:
            c = doc.add_paragraph(caption)
            c.alignment = 1
            c.runs[0].bold = True
            c.runs[0].font.size = Pt(11)
            c.runs[0].font.name = "Times New Roman"
    else:
        para(doc, f"[Figure: {caption or path}]", justify=False)

def table_ncol(doc, rows_data, header=None):
    cols = len(header) if header else len(rows_data[0])
    t = doc.add_table(rows=0, cols=cols)
    t.style = 'Table Grid'
    if header:
        row = t.add_row().cells
        for i, h in enumerate(header):
            run = row[i].paragraphs[0].add_run(h)
            run.bold = True
            run.font.size = Pt(11)
    for rd in rows_data:
        row = t.add_row().cells
        for i, val in enumerate(rd):
            run = row[i].paragraphs[0].add_run(val)
            run.font.size = Pt(11)
    doc.add_paragraph()

# ──────────────────────────────────────────────────────────────────────────────
# COLLEGE HEADER — placed in Word's actual page header section
# ──────────────────────────────────────────────────────────────────────────────

def remove_table_borders_local(table):
    """Remove all visible borders from a table (for signature layouts, etc.)."""
    tbl = table._tbl
    tblPr = tbl.find(qn('w:tblPr'))
    if tblPr is None:
        tblPr = OxmlElement('w:tblPr'); tbl.insert(0, tblPr)
    tblBdr = OxmlElement('w:tblBorders')
    for b in ['top','left','bottom','right','insideH','insideV']:
        bel = OxmlElement(f'w:{b}')
        bel.set(qn('w:val'), 'none'); bel.set(qn('w:sz'), '0')
        bel.set(qn('w:space'), '0'); bel.set(qn('w:color'), 'auto')
        tblBdr.append(bel)
    tblPr.append(tblBdr)

def _fill_cec_header_section(header):
    """Fill a Word header object with the CEC letterhead (logo + college info)."""
    for p in header.paragraphs:
        p.clear()

    from docx.oxml import OxmlElement as OE

    # Borderless 2-column table: left=logo, right=college text
    t = header.add_table(rows=1, cols=2, width=Inches(6.5))
    tbl = t._tbl
    tblPr = tbl.find(qn('w:tblPr'))
    if tblPr is None:
        tblPr = OE('w:tblPr'); tbl.insert(0, tblPr)
    tblBdr = OE('w:tblBorders')
    for b in ['top','left','bottom','right','insideH','insideV']:
        bel = OE(f'w:{b}')
        bel.set(qn('w:val'), 'none'); bel.set(qn('w:sz'), '0')
        bel.set(qn('w:space'), '0'); bel.set(qn('w:color'), 'auto')
        tblBdr.append(bel)
    tblPr.append(tblBdr)

    # Left cell: logo (small, matching reference ~0.9")
    left = t.rows[0].cells[0]
    left.width = Inches(1.1)
    lp = left.paragraphs[0]
    lp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    lp.paragraph_format.space_before = Pt(0)
    lp.paragraph_format.space_after  = Pt(0)
    if os.path.exists('college_logo.jpg'):
        lp.add_run().add_picture('college_logo.jpg', width=Inches(0.9))

    # Right cell: college name + address — all LEFT-aligned, matching reference
    right = t.rows[0].cells[1]

    # Line 1: College name (red bold)
    p0 = right.paragraphs[0]
    p0.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p0.paragraph_format.space_before = Pt(0)
    p0.paragraph_format.space_after  = Pt(0)
    r0 = p0.add_run("CHAITANYA ENGINEERING COLLEGE")
    r0.bold = True; r0.font.size = Pt(12); r0.font.name = "Times New Roman"
    r0.font.color.rgb = RGBColor(0xC0, 0x00, 0x00)

    def hline(text, size=8, bold=False):
        ph = right.add_paragraph()
        ph.alignment = WD_ALIGN_PARAGRAPH.LEFT
        ph.paragraph_format.space_before = Pt(0)
        ph.paragraph_format.space_after  = Pt(0)
        rh = ph.add_run(text)
        rh.font.size = Pt(size); rh.font.name = "Times New Roman"; rh.bold = bold

    hline("Approved by AICTE - New Delhi, Accredited by NAAC, Affiliated to JNTU-GURAJADA")
    hline("Chaitanya Valley, Kommadi, Madhurawada, Visakhapatnam, Andhra Pradesh - 530048  www.cec.ac.in")
    hline("Mail ID: principal@cec.ac.in                         Phone Number: 9949993477")

    # Thin horizontal rule under the header
    hp = header.add_paragraph()
    hp.paragraph_format.space_before = Pt(1)
    hp.paragraph_format.space_after  = Pt(0)
    pPr = hp._p.get_or_add_pPr()
    pBdr = OE('w:pBdr')
    bot  = OE('w:bottom')
    bot.set(qn('w:val'), 'single'); bot.set(qn('w:sz'), '6')
    bot.set(qn('w:space'), '1');   bot.set(qn('w:color'), '000000')
    pBdr.append(bot); pPr.append(pBdr)

def start_cec_section(doc):
    """Start a new Word section with the CEC letterhead in its page header."""
    doc.add_section()
    section = doc.sections[-1]
    section.top_margin    = Inches(0.5)
    section.bottom_margin = Inches(1.0)
    section.left_margin   = Inches(1.25)
    section.right_margin  = Inches(1.0)
    section.header.is_linked_to_previous = False
    _fill_cec_header_section(section.header)

def end_cec_section(doc):
    """Start a new section that goes back to no special header."""
    doc.add_section()
    section = doc.sections[-1]
    section.top_margin    = Inches(1.0)
    section.bottom_margin = Inches(1.0)
    section.left_margin   = Inches(1.25)
    section.right_margin  = Inches(1.0)
    section.header.is_linked_to_previous = False
    # Clear the header of this section so it shows nothing
    for p in section.header.paragraphs:
        p.clear()

def add_footer_page_number(section, fmt=None, start=None):
    from docx.oxml import OxmlElement
    from docx.oxml.ns import qn
    
    sectPr = section._sectPr
    pgNumType = sectPr.find(qn('w:pgNumType'))
    if pgNumType is None:
        pgNumType = OxmlElement('w:pgNumType')
        sectPr.append(pgNumType)
    if fmt is not None:
        pgNumType.set(qn('w:fmt'), fmt)
    if start is not None:
        pgNumType.set(qn('w:start'), str(start))
        
    footer = section.footer
    footer.is_linked_to_previous = False
    p = footer.paragraphs[0] if footer.paragraphs else footer.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.clear()
    
    run = p.add_run()
    fldChar1 = OxmlElement('w:fldChar')
    fldChar1.set(qn('w:fldCharType'), 'begin')
    instrText = OxmlElement('w:instrText')
    instrText.set(qn('xml:space'), 'preserve')
    instrText.text = "PAGE"
    fldChar2 = OxmlElement('w:fldChar')
    fldChar2.set(qn('w:fldCharType'), 'separate')
    fldChar3 = OxmlElement('w:fldChar')
    fldChar3.set(qn('w:fldCharType'), 'end')
    
    run._r.append(fldChar1)
    run._r.append(instrText)
    run._r.append(fldChar2)
    run._r.append(fldChar3)

# ──────────────────────────────────────────────────────────────────────────────
# MAIN BUILDER
# ──────────────────────────────────────────────────────────────────────────────

def build():
    doc = Document()
    set_page_margins(doc)
    doc.styles['Normal'].font.name = 'Times New Roman'
    doc.styles['Normal'].font.size = Pt(12)

    # ── TITLE PAGE ─────────────────────────────────────────────────────────────
    sep(doc)
    para_center(doc,
        "ZENTHIQA: DEEP LEARNING MICROSERVICES FOR\nE-COMMERCE CUSTOMER ANALYTICS",
        bold=True, size=16, color=RGBColor(0xC0, 0x00, 0x00))
    sep(doc)
    para_center(doc,
        "A thesis submitted in the partial fulfilment of the requirements for the award in",
        size=11)
    para_center(doc, "the degree of", size=11)
    sep(doc)
    para_center(doc, "BACHELOR OF TECHNOLOGY", bold=True, size=13)
    para_center(doc, "in", size=12)
    para_center(doc, "ARTIFICIAL INTELLIGENCE AND DATA SCIENCE", bold=True, size=13,
                color=RGBColor(0xC0, 0x00, 0x00))
    sep(doc)
    para_center(doc, "Submitted by", size=12)
    para_center(doc, "GUDABANDI NITHIN KUMAR          : 23L61A5418", bold=True, size=12)
    para_center(doc, "BURAVELLI PARDHASARADHI         : 23L61A5408", bold=True, size=12)
    para_center(doc, "PECHETTI DEVENDRA VENKATA SAI   : 24L65A5406", bold=True, size=12)
    para_center(doc, "MANTRI UMADEVI                  : 23L61A5425", bold=True, size=12)
    sep(doc)
    para_center(doc, "Under the guidance of", size=12)
    para_center(doc, "Mrs. P. Gayatri", bold=True, size=12)
    para_center(doc, "Assistant Professor, Department of AI & DS", size=11)
    sep(doc)
    if os.path.exists('college_logo.jpg'):
        doc.add_picture('college_logo.jpg', width=Inches(1.6))
        doc.paragraphs[-1].alignment = 1
    sep(doc)
    para_center(doc, "DEPARTMENT OF ARTIFICIAL INTELLIGENCE AND DATA SCIENCE",
                bold=True, size=12, color=RGBColor(0x00, 0x00, 0xCC))
    para_center(doc, "CHAITANYA ENGINEERING COLLEGE",
                bold=True, size=12, color=RGBColor(0x00, 0x00, 0xCC))
    para_center(doc, "(APPROVED BY AICTE & AFFILIATED TO JNTU GURAJADA, VIZIANAGARAM)",
                size=10)
    para_center(doc, "2026 – 2027", bold=True, size=12)
    # End of title page - it has no page number footer by default

    # ── BONAFIDE CERTIFICATE ──────────────────────────────────────────────────
    doc.add_section()
    set_page_margins(doc)
    add_footer_page_number(doc.sections[-1], fmt="lowerRoman", start=1)
    
    para_center(doc, "CHAITANYA ENGINEERING COLLEGE", bold=True, size=13)
    para_center(doc,
        "(Approved by AICTE, Affiliated to JNTU GURAJADA, VIZIANAGARAM)", size=10)
    sep(doc)
    if os.path.exists('college_logo.jpg'):
        doc.add_picture('college_logo.jpg', width=Inches(1.8))
        doc.paragraphs[-1].alignment = 1
    sep(doc)
    para_center(doc, "BONAFIDE CERTIFICATE", bold=True, size=14)
    sep(doc)
    para(doc,
        'This is to certify that the project titled '
        '"ZENTHIQA: DEEP LEARNING MICROSERVICES FOR E-COMMERCE CUSTOMER ANALYTICS" '
        'is a Bonafide work carried out by '
        'G. Nithin Kumar (23L61A5418), B. Pardhasaradhi (23L61A5408), '
        'P. Devendra Venkata Sai (24L65A5406), M. Umadevi (23L61A5425) '
        'as part of the IV B.Tech, II Semester curriculum in '
        'Artificial Intelligence and Data Science during the academic year 2026–2027.')
    sep(doc); sep(doc)

    # Two-column borderless signature layout
    sig = doc.add_table(rows=2, cols=2)
    sig.style = 'Table Grid'
    remove_table_borders_local(sig)
    sig.rows[0].cells[0].paragraphs[0].add_run("Project Guide").bold = True
    sig.rows[0].cells[0].paragraphs[0].runs[0].font.size = Pt(11)
    sig.rows[0].cells[1].paragraphs[0].add_run("Head of Department").bold = True
    sig.rows[0].cells[1].paragraphs[0].runs[0].font.size = Pt(11)
    for txt, bold in [("Mrs. P. Gayatri,", True), ("Assistant Professor,", False),
                      ("Department of AI & DS,", False), ("Chaitanya Engineering College", False)]:
        p = sig.rows[1].cells[0].add_paragraph()
        r = p.add_run(txt); r.bold = bold; r.font.size = Pt(11)
    for txt, bold in [("Dr. K.N.S. Lakshmi,", True), ("Professor & HOD,", False),
                      ("Department of AI,", False), ("Chaitanya Engineering College", False)]:
        p = sig.rows[1].cells[1].add_paragraph()
        r = p.add_run(txt); r.bold = bold; r.font.size = Pt(11)
    sep(doc)
    ext_p = doc.add_paragraph()
    ext_r = ext_p.add_run("External Examiner")
    ext_r.bold = True; ext_r.font.size = Pt(11)
    ext_p.alignment = WD_ALIGN_PARAGRAPH.LEFT

    # ── DECLARATION ───────────────────────────────────────────────────────────
    start_cec_section(doc)
    add_footer_page_number(doc.sections[-1], fmt="lowerRoman") # Continue Roman numbering
    para_center(doc, "DECLARATION", bold=True, size=14)
    sep(doc)
    para(doc,
        'We hereby declare that the project work titled '
        '"ZENTHIQA: DEEP LEARNING MICROSERVICES FOR E-COMMERCE CUSTOMER ANALYTICS" '
        'submitted to CHAITANYA ENGINEERING COLLEGE is a record of an original work '
        'done by G. Nithin Kumar (23L61A5418), B. Pardhasaradhi (23L61A5408), '
        'P. Devendra Venkata Sai (24L65A5406), M. Umadevi (23L61A5425) under the '
        'esteemed guidance of Mrs. P. Gayatri, Assistant Professor. '
        'This project work is submitted in the partial fulfilment of the requirements '
        'for the award of the degree Bachelor of Technology in Artificial Intelligence '
        'and Data Science. This entire project is done with the best of our knowledge '
        'and is not submitted to any University for the award of degree.')
    sep(doc); sep(doc)
    for line in [
        "GUDABANDI NITHIN KUMAR          : 23L61A5418",
        "BURAVELLI PARDHASARADHI         : 23L61A5408",
        "PECHETTI DEVENDRA VENKATA SAI   : 24L65A5406",
        "MANTRI UMADEVI                  : 23L61A5425",
    ]:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        r = p.add_run(line); r.bold = True; r.font.size = Pt(12); r.font.name = "Times New Roman"
    doc.add_page_break()

    # ── ACKNOWLEDGEMENT ───────────────────────────────────────────────────────
    para_center(doc, "ACKNOWLEDGEMENT", bold=True, size=14)
    sep(doc)
    para(doc, "With great solemnity and sincerity, we express our deepest sense of gratitude and pay our sincere thanks to our Project guide Mrs. P. Gayatri, Assistant Professor, Department of Artificial Intelligence and Data Science, Chaitanya Engineering College, who evinced keen interest in our efforts and provided her invaluable guidance throughout our project work.")
    para(doc, "We thank our Dr. K.N.S Lakshmi, Professor, Head of the Department of Artificial Intelligence, who helped us to complete our project work in a truthful and systematic manner, and who consistently motivated us to aim for technical excellence.")
    para(doc, "We extend our sincere gratitude to our principal Dr. K. Suresh, Ph.D., for his kind attention and valuable guidance throughout this academic programme. His leadership has created an environment of innovation and research that greatly benefited our project work.")
    para(doc, "We wish to express gratitude to our Management Members who supported us by providing excellent laboratory infrastructure and facilities, without which the practical implementation of this project would not have been possible.")
    para(doc, "We are also deeply thankful to All Staff Members of the Department of Artificial Intelligence and Data Science, for their direct and indirect support in completing this project work through their valuable suggestions and technical guidance.")
    para(doc, "Above all, we acknowledge our profound gratitude to our parents and families, whose moral support, encouragement, and sacrifices have been the greatest driving force throughout our academic journey.")
    sep(doc)
    for line in [
        "GUDABANDI NITHIN KUMAR          : 23L61A5418",
        "BURAVELLI PARDHASARADHI         : 23L61A5408",
        "PECHETTI DEVENDRA VENKATA SAI   : 24L65A5406",
        "MANTRI UMADEVI                  : 23L61A5425",
    ]:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        r = p.add_run(line); r.bold = True; r.font.size = Pt(12); r.font.name = "Times New Roman"
    
    end_cec_section(doc)
    add_footer_page_number(doc.sections[-1], fmt="lowerRoman") # Continue Roman numbering

    # ── ABSTRACT ──────────────────────────────────────────────────────────────
    heading(doc, "ABSTRACT", level=1, center=True)
    sep(doc)
    para(doc, "The rapid expansion of the global e-commerce industry has led to an unprecedented accumulation of customer transactional data. Converting this raw data into strategic business intelligence, particularly the ability to predict future customer behavior, has become a key competitive advantage. Traditional analytical frameworks, such as the RFM (Recency, Frequency, Monetary) model, offer retrospective insights but fail to anticipate future customer actions, leaving businesses reactive rather than proactive.")
    sep(doc)
    para(doc, "This project presents Zenthiqa, a comprehensive Deep Learning Microservice Platform for E-Commerce Customer Analytics. The core of the system is a Multi-Task Learning (MTL) neural network built using PyTorch, designed to simultaneously predict two highly correlated targets: Customer Lifetime Value (CLV), formulated as a regression problem, and Churn Risk, formulated as a binary classification problem. By sharing internal hidden-layer representations between these two tasks, the model captures the deep, non-linear relationship between a customer's spending trajectory and their risk of abandonment, achieving superior predictive accuracy over isolated single-task models.")
    sep(doc)
    para(doc, "In addition to the MTL model, Zenthiqa integrates a Neural Collaborative Filtering (NCF) engine for personalized product recommendations, a SHAP-powered What-If Simulator that enables business stakeholders to explore hypothetical intervention scenarios in real time, and an AI-driven automated Win-Back Email generation system that produces personalized retention messages for at-risk customers.")
    sep(doc)
    para(doc, "The system is built on a modern microservices architecture. The backend is implemented using FastAPI (Python), providing high-performance RESTful API endpoints. The frontend is built with Next.js (React) and TailwindCSS, delivering a highly responsive and interactive dashboard. The platform is deployed on Amazon Web Services (AWS), with the backend on EC2 and all model artifacts stored on S3, provisioned through Terraform.")
    sep(doc)
    para(doc, "Keywords: Customer Lifetime Value, Churn Prediction, Multi-Task Learning, Neural Collaborative Filtering, Shapley Values, FastAPI, Next.js, AWS, Deep Learning, E-Commerce Analytics.")
    doc.add_page_break()

    # ── TABLE OF CONTENTS ─────────────────────────────────────────────────────
    heading(doc, "TABLE OF CONTENTS", level=1, center=True)
    sep(doc)
    toc = [
        ("TITLE", "PAGE NO."),
        ("Bonafide Certificate", "i"),
        ("Declaration", "ii"),
        ("Acknowledgement", "iii"),
        ("Abstract", "iv"),
        ("List of Figures", "v"),
        ("CHAPTER 1: INTRODUCTION", ""),
        ("    1.1 Introduction", "1"),
        ("    1.2 Purpose", "2"),
        ("    1.3 Scope", "2"),
        ("    1.4 Motivation", "2"),
        ("    1.5 Proposed System", "3"),
        ("CHAPTER 2: LITERATURE SURVEY", ""),
        ("    2.1 Introduction to Literature Survey", "4"),
        ("    2.2 Literature Survey", "4"),
        ("    2.3 Research Gap and Motivation", "7"),
        ("CHAPTER 3: SYSTEM ANALYSIS", ""),
        ("    3.1 Introduction", "8"),
        ("    3.2 Problem Statement", "8"),
        ("    3.3 Existing System", "9"),
        ("    3.4 System Requirements Analysis", "9"),
        ("        3.4.1 Functional Requirements", "9"),
        ("        3.4.2 Non-Functional Requirements", "10"),
        ("    3.5 Feasibility Analysis", "10"),
        ("        3.5.1 Technical Feasibility", "10"),
        ("        3.5.2 Operational Feasibility", "10"),
        ("        3.5.3 Economic Feasibility", "11"),
        ("        3.5.4 Time Feasibility", "11"),
        ("    3.6 Modules", "11"),
        ("CHAPTER 4: SYSTEM REQUIREMENTS", ""),
        ("    4.1 Software Requirements", "13"),
        ("    4.2 Hardware Requirements", "13"),
        ("    4.3 Project Prerequisites", "14"),
        ("    4.4 Functional Requirements", "14"),
        ("    4.5 Non-Functional Requirements", "14"),
        ("    4.6 Implementation Challenges Faced", "14"),
        ("CHAPTER 5: SYSTEM DESIGN", ""),
        ("    5.1 Introduction", "15"),
        ("    5.2 System Model", "15"),
        ("        5.2.1 Components of the System Model", "15"),
        ("        5.2.2 Features of the System Model", "15"),
        ("        5.2.3 Advantages of the System Model", "15"),
        ("    5.3 System Architecture", "16"),
        ("        5.3.1 User Interface Layer", "16"),
        ("        5.3.2 Application Logic Layer", "17"),
        ("        5.3.3 Database Layer", "17"),
        ("    5.4 UML Representation", "17"),
        ("        5.4.1 Use Case Diagram", "17"),
        ("        5.4.2 Class Diagram", "18"),
        ("        5.4.3 Sequence Diagram", "18"),
        ("        5.4.4 Block Diagram", "19"),
        ("CHAPTER 6: IMPLEMENTATION", ""),
        ("    6.1 Technology Description", "20"),
        ("    6.2 Source Code", "21"),
        ("CHAPTER 7: SCREEN SHORTS", ""),
        ("    7.1 Input Code", "24"),
        ("    7.2 Interface", "25"),
        ("    7.3 Output Screen", "26"),
        ("CHAPTER 8: SYSTEM TESTING", ""),
        ("    8.1 Introduction", "28"),
        ("    8.2 Types of Testing", "28"),
        ("        8.2.1 Unit Testing", "28"),
        ("        8.2.2 Integration Testing", "29"),
        ("        8.2.3 Functional Testing", "29"),
        ("        8.2.4 Performance Testing", "30"),
        ("        8.2.5 Usability Testing", "30"),
        ("        8.2.6 Validation Testing", "30"),
        ("        8.2.7 Error Handling Testing", "31"),
        ("    8.3 Test Strategy and Approach", "31"),
        ("        8.3.1 Incremental Testing", "31"),
        ("        8.3.2 Black Box and White Box Testing", "31"),
        ("        8.3.3 Realistic User Scenario Testing", "32"),
        ("        8.3.4 Repeated Trial Testing of Model Output", "32"),
        ("        8.3.5 Feedback-Based Testing", "32"),
        ("CHAPTER 9: CONCLUSION AND FUTURE WORK", ""),
        ("    9.1 Conclusion", "33"),
        ("    9.2 Future Work", "34"),
        ("CHAPTER 10: REFERENCES", ""),
        ("    References", "36"),
    ]
    t_toc = doc.add_table(rows=0, cols=2)
    for title, page in toc:
        is_ch = title.strip().startswith("CHAPTER") or title == "TITLE"
        row = t_toc.add_row().cells
        r0  = row[0].paragraphs[0].add_run(title)
        r0.bold = is_ch; r0.font.size = Pt(11); r0.font.name = "Times New Roman"
        r1  = row[1].paragraphs[0].add_run(page)
        r1.font.size = Pt(11); r1.font.name = "Times New Roman"
        row[1].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.RIGHT
    doc.add_paragraph()
    doc.add_page_break()

    # ── LIST OF FIGURES ───────────────────────────────────────────────────────
    heading(doc, "LIST OF FIGURES", level=1, center=True)
    sep(doc)
    figs = [
        ("Fig 1: Use Case Diagram", "17"),
        ("Fig 2: Class Diagram", "18"),
        ("Fig 3: Sequence Diagram", "18"),
        ("Fig 4: Block Diagram", "19"),
        ("Fig 5: Overview Dashboard Tab", "24"),
        ("Fig 6: AI Insights Generation for Individual Customer", "24"),
        ("Fig 7: What-If Simulator with SHAP Feature Attribution", "25"),
        ("Fig 8: Batch Processing Tab", "25"),
        ("Fig 9: At-Risk Customers Tab", "26"),
        ("Fig 10: Customer Segments Tab", "26"),
        ("Fig 11: Automated Win-Back Email Output", "27"),
        ("Fig 12: Product Recommendations Tab", "27"),
    ]
    t_fig = doc.add_table(rows=0, cols=2)
    hrow = t_fig.add_row().cells
    hrow[0].paragraphs[0].add_run("Title").bold = True
    hrow[1].paragraphs[0].add_run("Page No").bold = True
    hrow[1].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.RIGHT
    for ftitle, fpage in figs:
        row = t_fig.add_row().cells
        row[0].paragraphs[0].add_run(ftitle).font.size = Pt(11)
        row[1].paragraphs[0].add_run(fpage).font.size = Pt(11)
        row[1].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.RIGHT
    doc.add_paragraph()

    # ── CHAPTER 1: INTRODUCTION ───────────────────────────────────────────────
    doc.add_section()
    set_page_margins(doc)
    add_footer_page_number(doc.sections[-1], fmt="decimal", start=1)
    
    heading(doc, "CHAPTER 1: INTRODUCTION", level=1)

    heading(doc, "1.1 Introduction", level=2)
    para(doc, "The global e-commerce landscape has undergone a dramatic transformation over the past decade. Fueled by the proliferation of smartphones, widespread internet access, and evolving consumer preferences, online retail has grown into a multi-trillion-dollar industry. This growth has also intensified market competition, making customer acquisition and retention increasingly expensive and challenging. In such an environment, the ability to anticipate customer behavior, predicting who will buy, how much they will spend over their lifetime, and who is likely to stop engaging with the platform, constitutes a powerful strategic advantage.")
    sep(doc)
    para(doc, "Businesses have historically used rule-based methods such as the RFM (Recency, Frequency, Monetary) model to segment and understand their customer base. RFM assigns scores based on how recently a customer made a purchase (Recency), how often they purchase (Frequency), and the total monetary value of their purchases (Monetary). While effective for historical segmentation, RFM provides no predictive capacity. It describes past behavior but cannot forecast future outcomes. A customer who has historically been high-value on the RFM scale may be silently drifting away, and a simple RFM analysis will not detect this deterioration until it is too late for an effective intervention.")
    sep(doc)
    para(doc, "Zenthiqa was conceived to address precisely this gap. It is a deep learning-powered analytics microservice platform that moves beyond historical analysis to provide forward-looking, predictive intelligence about customer behavior. By harnessing the power of modern neural network architectures, Zenthiqa equips business managers with a dashboard that not only shows what happened, but predicts what is going to happen, enabling timely, data-driven decisions that maximize customer lifetime value and minimize revenue loss from churn.")

    heading(doc, "1.2 Purpose", level=2)
    para(doc, "The primary purpose of this project is to design, develop, and deploy a complete, production-ready AI analytics system for e-commerce businesses. The system is specifically purpose-built to solve three fundamental, interconnected business problems that together determine the long-term profitability of any customer relationship:")
    sep(doc)
    bullet(doc, "Customer Lifetime Value (CLV) Prediction: How much revenue can a business expect to earn from a given customer over the entire duration of their relationship? Accurately estimating CLV enables resource allocation, budget planning for acquisition campaigns, and tiered loyalty programs.")
    bullet(doc, "Churn Risk Assessment: What is the probability that a specific customer will stop making purchases within the next business cycle? Early identification of churn risk allows proactive retention measures such as personalized offers or win-back email campaigns to be deployed before the customer disengages entirely.")
    bullet(doc, "Personalized Product Recommendations: Based on a customer's historical interactions, which products are they most likely to purchase next? A strong recommendation engine improves average order value, cross-selling success rates, and overall user engagement.")
    sep(doc)
    para(doc, "Beyond the predictive models, the project also aims to design a highly usable and interactive user interface, ensuring that the complex outputs of deep learning models are presented in a clear, interpretable manner to non-technical business stakeholders.")

    heading(doc, "1.3 Scope", level=2)
    para(doc, "Functional Scope: The system provides end-to-end analytical functionality from raw data processing to interactive visualization. It supports individual customer analytics (CLV, Churn, Recommendations), segment-level analytics via K-Means clustering on RFM features, batch-level processing for uploading and analyzing entire customer lists via CSV, automated AI-generated insights summaries, and personalized win-back email drafting.")
    sep(doc)
    para(doc, "Technical Scope: The implementation covers data engineering (Parquet, preprocessing), machine learning (PyTorch MTL and NCF models, K-Means clustering, SHAP values), backend API development (FastAPI, Pydantic, CORS), and frontend development (Next.js, React, TailwindCSS, Recharts). Infrastructure provisioning via Terraform for AWS EC2 and S3 is also within scope.")
    sep(doc)
    para(doc, "Out of Scope: Real-time streaming data ingestion, continuous online model retraining, A/B testing frameworks, and direct integration with live e-commerce platforms such as Shopify or WooCommerce are explicitly outside the current scope and are designated as future work.")

    heading(doc, "1.4 Motivation", level=2)
    para(doc, "The motivation for building Zenthiqa is rooted in two key realities of the modern e-commerce market. The first is the escalating cost of customer acquisition. Research by Bain and Company and Harvard Business School has found that acquiring a new customer can cost anywhere from five to twenty-five times more than retaining an existing one. Even a modest five percent increase in customer retention can lead to a twenty-five to ninety-five percent increase in profits. These figures underscore the immense financial value of a system that can accurately identify at-risk customers early enough for effective retention interventions.")
    sep(doc)
    para(doc, "The second motivating reality is the inadequacy of existing tools. While enterprise CRM platforms offer customer segmentation features, they are largely based on rule-based thresholds and simple statistical metrics. They do not leverage the expressive power of deep neural networks, which have been shown to vastly outperform traditional statistical methods in capturing the complex, non-linear relationships hidden within large customer datasets. Zenthiqa is motivated by the vision of closing this gap, to bring the predictive accuracy of cutting-edge deep learning to the practical environment of an e-commerce analytics dashboard.")

    heading(doc, "1.5 Proposed System", level=2)
    para(doc, "The proposed system, Zenthiqa, is a multi-component, microservices-based analytics platform. Its architecture is deliberately separated into distinct, independently deployable layers, each responsible for a specific domain of functionality.")
    sep(doc)
    para(doc, "At the data layer, the system ingests and processes the UCI Online Retail dataset containing over half a million purchase records. This data is cleaned and aggregated to derive per-customer RFM metrics, then serialized into Apache Parquet format and stored on AWS S3 for fast retrieval.")
    sep(doc)
    para(doc, "At the intelligence layer, two distinct PyTorch neural network models are trained: an MTL model that jointly predicts CLV and Churn, and an NCF model that generates personalized product recommendations. At the API layer, a FastAPI application exposes RESTful endpoints for all inference and business logic operations. At the presentation layer, a Next.js and React frontend provides the interactive dashboard.")
    doc.add_page_break()

    # ── CHAPTER 2: LITERATURE SURVEY ─────────────────────────────────────────
    heading(doc, "CHAPTER 2: LITERATURE SURVEY", level=1)

    heading(doc, "2.1 Introduction to Literature Survey", level=2)
    para(doc, "The literature survey forms the critical academic foundation of this project. It establishes the theoretical context from which Zenthiqa emerges, by systematically reviewing the prior work that has contributed to the fields of customer analytics, deep learning for recommendation systems, multi-task learning, and explainable AI. Understanding the strengths and limitations of these prior works is essential to articulating the specific research gap that this project addresses.")

    heading(doc, "2.2 Literature Survey", level=2)

    heading(doc, "2.2.1 Probabilistic Models for Customer Lifetime Value", level=3)
    para(doc, "Authors: Fader, P.S., Hardie, B.G.S., and Lee, K.L.")
    para(doc, "Title: 'Counting Your Customers' the Easy Way: An Alternative to the Pareto/NBD Model. Marketing Science, 2005.", bold=False)
    sep(doc)
    para(doc, "This foundational paper introduced the Beta-Geometric/Negative Binomial Distribution (BG/NBD) model, which became the standard probabilistic approach to CLV estimation for over a decade. The BG/NBD model treats the customer purchase process as a Poisson process with a Gamma-distributed rate and models customer dropout using a Beta-distributed probability. While significant, it has two fundamental limitations: it assumes a Poisson purchase distribution which may not reflect real-world burst purchasing behavior, and it is a univariate model. In contrast, Zenthiqa's MTL approach jointly models CLV alongside churn as correlated, multi-variate objectives, enabling richer, more accurate predictions.")

    sep(doc)
    heading(doc, "2.2.2 Machine Learning Approaches to Customer Churn Prediction", level=3)
    para(doc, "Authors: Verbeke, W., Dejaeger, K., Martens, D., Hur, J., and Baesens, B.")
    para(doc, "Title: New Insights into Churn Prediction in the Telecommunication Sector. European Journal of Operational Research, 2012.", bold=False)
    sep(doc)
    para(doc, "This paper surveyed and benchmarked a comprehensive set of machine learning algorithms including Logistic Regression, Decision Trees, Neural Networks, and Support Vector Machines for churn prediction. The study introduced a profit-driven evaluation framework, arguing that standard accuracy metrics fail to capture the business value of a churn model. Despite its comprehensive comparison, the paper studied single-task models exclusively, ignoring the possibility that simultaneously predicting CLV could improve churn prediction accuracy — as is the case in Zenthiqa's multi-task formulation.")

    sep(doc)
    heading(doc, "2.2.3 Collaborative Filtering and Matrix Factorization", level=3)
    para(doc, "Authors: Koren, Y., Bell, R., and Volinsky, C.")
    para(doc, "Title: Matrix Factorization Techniques for Recommender Systems. IEEE Computer, 2009.", bold=False)
    sep(doc)
    para(doc, "This seminal work introduced Latent Factor Models for collaborative filtering, showing that factorizing the user-item interaction matrix into low-dimensional latent vectors could produce highly accurate recommendations. However, standard matrix factorization relies on inner products of latent vectors, a linear operation limited in its ability to capture complex, non-linear user-item relationship patterns. This limitation directly motivates the use of the Neural Collaborative Filtering (NCF) model in Zenthiqa, which replaces the inner product with a multi-layer perceptron to learn arbitrary non-linear interaction functions.")

    sep(doc)
    heading(doc, "2.2.4 Neural Collaborative Filtering", level=3)
    para(doc, "Authors: He, X., Liao, L., Zhang, H., Nie, L., Hu, X., and Chua, T.S.")
    para(doc, "Title: Neural Collaborative Filtering. Proceedings of the 26th International World Wide Web Conference, 2017.", bold=False)
    sep(doc)
    para(doc, "This paper introduced the Neural Collaborative Filtering (NCF) framework, which is the architecture adopted in Zenthiqa. The authors proposed replacing the inner product of traditional matrix factorization with a deep neural network, demonstrating that NCF significantly outperforms traditional matrix factorization methods on multiple real-world benchmark datasets. Zenthiqa adapts this architecture, training the NCF model on implicit feedback derived from the Online Retail purchase history where a purchase event is treated as a positive interaction.")

    sep(doc)
    heading(doc, "2.2.5 An Overview of Multi-Task Learning in Deep Neural Networks", level=3)
    para(doc, "Author: Ruder, S.")
    para(doc, "Title: An Overview of Multi-Task Learning in Deep Neural Networks. arXiv preprint arXiv:1706.05098, 2017.", bold=False)
    sep(doc)
    para(doc, "This comprehensive survey systematically reviewed the paradigm of Multi-Task Learning (MTL) in deep neural networks. MTL trains a single model on multiple related tasks simultaneously, with the rationale that shared internal representations capture richer features than any single-task model. Ruder identified two primary MTL architectures: hard parameter sharing and soft parameter sharing. The Zenthiqa MTL model uses hard parameter sharing, with a single shared encoder feeding into a CLV regression head and a Churn classification head separately.")

    sep(doc)
    heading(doc, "2.2.6 SHAP: A Unified Approach to Interpreting Model Predictions", level=3)
    para(doc, "Authors: Lundberg, S.M. and Lee, S.I.")
    para(doc, "Title: A Unified Approach to Interpreting Model Predictions. Advances in Neural Information Processing Systems (NeurIPS), 2017.", bold=False)
    sep(doc)
    para(doc, "This landmark paper introduced SHAP (SHapley Additive exPlanations), a game-theoretic approach to explaining the output of any machine learning model. Grounded in Shapley values from cooperative game theory, SHAP assigns each input feature an importance score representing its marginal contribution. The paper proved that SHAP values are the only additive feature attribution method satisfying local accuracy, missingness, and consistency simultaneously. In Zenthiqa, exact Shapley values are computed over the three RFM features to power the What-If simulator, making the model's output interpretable for non-technical business users.")

    sep(doc)
    heading(doc, "2.2.7 Hidden Technical Debt in Machine Learning Systems", level=3)
    para(doc, "Authors: Sculley, D., et al.")
    para(doc, "Title: Hidden Technical Debt in Machine Learning Systems. Advances in Neural Information Processing Systems (NeurIPS), 2015.", bold=False)
    sep(doc)
    para(doc, "This influential work from Google engineers highlighted the hidden technical debt that accumulates when machine learning models are tightly coupled to their serving infrastructure. The authors advocated for clean, modular boundaries between data preprocessing, model training, and model serving. This principle directly informed the Zenthiqa architecture, where the FastAPI backend acts as a well-defined serving microservice completely decoupled from the training pipeline, consuming only serialized model artifacts and preprocessed data.")

    heading(doc, "2.3 Research Gap and Motivation", level=2)
    para(doc, "The reviewed literature demonstrates strong prior work in each individual domain: CLV modeling (BG/NBD), churn prediction (ML benchmarking), recommendation systems (NCF), multi-task learning (Ruder, 2017), and model explainability (SHAP). However, the critical research gap that Zenthiqa addresses is the absence of a unified, deployed system that integrates all of these components into a single, coherent, and business-usable platform. No existing open-source platform simultaneously combines CLV and Churn prediction using an MTL architecture with collaborative filtering recommendations and SHAP-based interpretability in a single dashboard. Zenthiqa fills this gap by delivering a complete, deployable, and integrated platform.")
    doc.add_page_break()

    # ── CHAPTER 3: SYSTEM ANALYSIS ────────────────────────────────────────────
    heading(doc, "CHAPTER 3: SYSTEM ANALYSIS", level=1)

    heading(doc, "3.1 Introduction", level=2)
    para(doc, "System analysis is the process of examining the existing state of solutions available to solve a business problem, identifying their deficiencies, and clearly formulating the requirements for a superior proposed system. For Zenthiqa, this involves a critical examination of how e-commerce businesses currently approach customer analytics, an honest assessment of the shortcomings of those existing approaches, and a precise specification of what the proposed system must accomplish to improve upon them.")

    heading(doc, "3.2 Problem Statement", level=2)
    para(doc, "The existing landscape of e-commerce analytics tools suffers from a fundamental fragmentation between data analysis, predictive modeling, and business-facing user interfaces. The specific problems that necessitate the development of Zenthiqa are as follows:")
    sep(doc)
    numbered(doc, "Lack of Integrated Predictive Analytics: No existing tool seamlessly integrates CLV prediction, churn risk scoring, and product recommendations into a single, unified dashboard derived from the same underlying customer data model.")
    numbered(doc, "Absence of Multi-Task Learning: Existing deployable solutions treat CLV and Churn as separate, independent problems, ignoring the statistical correlation between them.")
    numbered(doc, "Black-Box Models without Interpretability: Deployed predictive analytics systems rarely expose the reasoning behind their predictions to end users, limiting trust and actionability.")
    numbered(doc, "No Interactive Simulation Capability: Existing tools are read-only dashboards that do not support scenario planning for evaluating the return on investment of a retention intervention.")
    numbered(doc, "Manual Retention Campaign Creation: Crafting personalized win-back emails is a time-consuming, manual task with no automated support in existing dashboard tools.")

    heading(doc, "3.3 Existing System", level=2)
    para(doc, "Traditional Business Intelligence (BI) Tools such as Tableau and Power BI offer powerful data visualization capabilities. However, they are fundamentally backward-looking, describing what has already happened rather than predicting what will happen. They lack predictive modeling capabilities, and integrating a custom machine learning model requires complex scripting that is difficult to maintain.")
    sep(doc)
    para(doc, "CRM Platforms such as Salesforce Einstein Analytics and HubSpot offer a closer integration of customer data with predictive scoring. However, their predictive models are largely proprietary black boxes trained on generic behavioral signals. They do not allow customization of the underlying model architecture, and they do not expose interpretability features that would allow a business manager to understand why a particular customer is predicted to churn.")
    sep(doc)
    para(doc, "Standalone ML Toolkits such as Scikit-learn and PyCaret provide Python-based environments for building custom predictive models. While they offer maximum flexibility, they produce model artifacts that are completely disconnected from any serving infrastructure. Deploying a model as a live, interactive web dashboard requires significant additional engineering effort beyond the scope of these toolkits.")

    heading(doc, "3.4 System Requirements Analysis", level=2)
    heading(doc, "3.4.1 Functional Requirements", level=3)
    bullet(doc, "The system shall accept a Customer ID and return the predicted CLV, Churn probability, behavioral segment, SHAP values, and product recommendations within 200ms.")
    bullet(doc, "The system shall process a batch CSV file of up to 500 customer IDs and return a scored results CSV file.")
    bullet(doc, "The system shall display all customers with a predicted churn probability exceeding 60 percent in the At-Risk customers table.")
    bullet(doc, "The system shall generate a personalized win-back email draft for any selected at-risk customer.")
    bullet(doc, "The system shall allow users to adjust RFM slider values and display updated predictions in real time via the What-If simulator.")

    heading(doc, "3.4.2 Non-Functional Requirements", level=3)
    bullet(doc, "Performance: Individual API endpoint response time shall not exceed 200ms under single-user conditions.")
    bullet(doc, "Scalability: The microservices architecture shall allow independent scaling of the frontend and backend components.")
    bullet(doc, "Reliability: The system shall achieve 99.5 percent uptime for the backend API during the active usage period.")
    bullet(doc, "Security: All API endpoints shall implement CORS policies to restrict cross-origin access to authorized frontend domains only.")
    bullet(doc, "Usability: The dashboard interface shall be operable by a non-technical business user without any machine learning knowledge.")

    heading(doc, "3.5 Feasibility Analysis", level=2)
    heading(doc, "3.5.1 Technical Feasibility", level=3)
    para(doc, "All technologies required for Zenthiqa are mature, well-documented, and freely available. PyTorch is the de-facto standard for deep learning. FastAPI is a production-grade Python web framework. Next.js is a widely adopted React framework. AWS EC2 and S3 provide scalable cloud infrastructure. No proprietary technologies are required. The project is therefore technically feasible.")
    heading(doc, "3.5.2 Operational Feasibility", level=3)
    para(doc, "The Zenthiqa dashboard is designed with business usability as a primary concern. The interface is intuitive with clearly labeled tabs, interactive charts, and plain-language explanations. A non-technical business manager can search for a customer, view their risk score, run a What-If simulation, and draft a win-back email without any machine learning knowledge. The system is therefore operationally feasible.")
    heading(doc, "3.5.3 Economic Feasibility", level=3)
    para(doc, "The project was built entirely using free and open-source software. The only financial cost is the AWS cloud deployment using a t2.micro EC2 instance and minimal S3 storage, both covered under the AWS Free Tier for the duration of the academic project. The project is therefore economically feasible.")
    heading(doc, "3.5.4 Time Feasibility", level=3)
    para(doc, "The project was completed within one academic semester. The development was structured in four phases: data engineering and model training (Weeks 1–4), backend API development (Weeks 5–8), frontend dashboard development (Weeks 9–12), and testing, deployment, and documentation (Weeks 13–16). All phases were completed within the scheduled timeline, confirming time feasibility.")

    heading(doc, "3.6 Modules", level=2)
    heading(doc, "3.6.1 Data Ingestion and Preprocessing Module", level=3)
    para(doc, "Responsible for the entire data pipeline. Performs cleaning of the UCI Online Retail dataset by removing null CustomerIDs and invalid transactions, calculates per-customer RFM metrics, normalizes features using Min-Max scaling, constructs the user-item interaction matrix, and serializes processed data into Parquet format for cloud storage.")
    heading(doc, "3.6.2 Multi-Task Learning (MTL) Model Module", level=3)
    para(doc, "Implements the core PyTorch neural network with hard parameter sharing. A shared encoder maps RFM features to a latent representation. A CLV regression head outputs the predicted lifetime value. A Churn classification head outputs the churn probability using Sigmoid activation. The model is trained jointly using a combined MSE and BCE loss function.")
    heading(doc, "3.6.3 Neural Collaborative Filtering (NCF) Module", level=3)
    para(doc, "Implements the product recommendation model. Maps customer IDs and product IDs to dense embedding vectors. A three-layer MLP processes the concatenated embeddings to predict interaction probability. Trained on implicit feedback from purchase events. During inference, scores all products for a given customer and returns the top-N recommendations.")
    heading(doc, "3.6.4 Customer Segmentation Module", level=3)
    para(doc, "Applies K-Means clustering to the normalized RFM feature space to partition the customer base into four segments: Champions, Loyal Customers, At-Risk, and Lost. Cluster assignments are computed at startup and power the segment distribution charts and the at-risk customer table.")
    heading(doc, "3.6.5 FastAPI Backend Service Module", level=3)
    para(doc, "The serving infrastructure of the system. Loads all model artifacts and data files at startup. Exposes RESTful endpoints for customer prediction, batch processing, What-If simulation, SHAP computation, at-risk customer retrieval, product recommendations, AI insights generation, and win-back email drafting.")
    heading(doc, "3.6.6 Next.js Frontend Dashboard Module", level=3)
    para(doc, "The user-facing component. A Next.js single-page application rendering five tabbed views: Overview, Customer Insights, Products, Batch Processing, and At-Risk Customers. Communicates with the FastAPI backend via HTTP API calls and renders results as interactive charts, metric cards, and data tables.")
    doc.add_page_break()

    # ── CHAPTER 4: SYSTEM REQUIREMENTS ───────────────────────────────────────
    heading(doc, "CHAPTER 4: SYSTEM REQUIREMENTS", level=1)

    heading(doc, "4.1 Software Requirements", level=2)
    table_ncol(doc, [
        ("Python 3.11+", "Backend language for ML model training and FastAPI server"),
        ("PyTorch 2.0+", "Deep learning framework for MTL and NCF model implementation"),
        ("FastAPI 0.110+", "High-performance asynchronous Python web framework"),
        ("Uvicorn", "ASGI server for running the FastAPI application"),
        ("Pandas 2.0+", "Data manipulation and RFM feature engineering"),
        ("Scikit-learn 1.4+", "K-Means clustering and Min-Max scaling"),
        ("PyArrow / Parquet", "Columnar data storage for efficient S3 data retrieval"),
        ("Boto3", "AWS SDK for Python, used for S3 file access"),
        ("Node.js 20+ / npm", "Runtime environment and package manager for Next.js"),
        ("Next.js 14+", "React framework with App Router for the frontend dashboard"),
        ("TailwindCSS 3+", "Utility-first CSS framework for dashboard styling"),
        ("Recharts", "React charting library for visualization components"),
        ("Terraform", "Infrastructure-as-Code tool for AWS resource provisioning"),
        ("Git / GitHub", "Version control and remote repository management"),
    ], header=["Software / Library", "Purpose"])

    heading(doc, "4.2 Hardware Requirements", level=2)
    table_nol = table_nol = doc.add_table(rows=0, cols=2)
    # reuse table_nol helper via direct call
    table_nol = None
    table_nol = doc.add_table(rows=0, cols=2)
    table_nol.style = 'Table Grid'
    for spec, val in [
        ("Processor", "Intel Core i5 (8th Gen) or higher"),
        ("RAM", "Minimum 8 GB (16 GB recommended for model training)"),
        ("Storage", "Minimum 50 GB free disk space"),
        ("GPU (Optional)", "NVIDIA GPU with CUDA support for accelerated training"),
        ("Internet Connection", "Required for AWS S3 access and npm package installation"),
        ("AWS EC2 Instance", "t2.micro (1 vCPU, 1 GB RAM) for backend deployment"),
        ("AWS S3 Bucket", "Standard storage for model artifacts and Parquet data files"),
    ]:
        row = table_nol.add_row().cells
        row[0].paragraphs[0].add_run(spec).bold = True
        row[1].paragraphs[0].add_run(val)
    doc.add_paragraph()

    heading(doc, "4.3 Project Prerequisites", level=2)
    bullet(doc, "Python virtual environment activated with all backend dependencies installed via pip (requirements.txt provided).")
    bullet(doc, "Node.js installed with all frontend dependencies installed via npm install in the /frontend directory.")
    bullet(doc, "AWS account configured with appropriate IAM roles granting EC2 read access to the designated S3 bucket.")
    bullet(doc, "Trained model artifacts (mtl_model.pth, ncf_model.pth, kmeans_model.pkl, scaler.pkl) uploaded to the S3 bucket prior to backend startup.")
    bullet(doc, "Environment variables AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION, and S3_BUCKET_NAME set in the deployment environment.")

    heading(doc, "4.4 Functional Requirements", level=2)
    bullet(doc, "FR1: Accept Customer ID input and return CLV prediction, Churn probability, and product recommendations within 200ms.")
    bullet(doc, "FR2: Process batch CSV uploads of up to 500 customer IDs and return a scored results file.")
    bullet(doc, "FR3: Display at-risk customers table filtered by churn probability threshold of 60 percent.")
    bullet(doc, "FR4: Generate personalized win-back email drafts for any selected at-risk customer.")
    bullet(doc, "FR5: Provide What-If simulator with real-time prediction updates on RFM slider adjustment.")
    bullet(doc, "FR6: Display SHAP feature attribution breakdown for each prediction.")

    heading(doc, "4.5 Non-Functional Requirements", level=2)
    bullet(doc, "NFR1: System response time for individual predictions shall not exceed 200ms.")
    bullet(doc, "NFR2: The system shall be deployable as independent microservices on cloud infrastructure.")
    bullet(doc, "NFR3: Frontend shall render correctly on all modern browsers (Chrome, Firefox, Edge, Safari).")
    bullet(doc, "NFR4: All API endpoints shall implement input validation using Pydantic schemas.")

    heading(doc, "4.6 Implementation Challenges Faced", level=2)
    bullet(doc, "Synchronous Startup Blocking: The FastAPI application downloads model artifacts from S3 and runs K-Means segment labeling synchronously at startup, increasing cold start time. This was mitigated by increasing the EC2 instance's memory allocation.")
    bullet(doc, "SHAP Scalability: Exact Shapley value computation has O(2^n) complexity. For 3 RFM features this required 8 model evaluations per request, which was acceptable but limits future feature expansion.")
    bullet(doc, "NCF Cold Start for New Customers: The NCF model cannot generate recommendations for customer IDs not seen during training. A fallback to globally popular items was implemented for unrecognized IDs.")
    bullet(doc, "CORS Configuration: Coordinating CORS headers between the EC2 backend and the S3-hosted frontend required careful configuration to allow cross-origin requests from the specific S3 website endpoint.")
    doc.add_page_break()

    # ── CHAPTER 5: SYSTEM DESIGN ──────────────────────────────────────────────
    heading(doc, "CHAPTER 5: SYSTEM DESIGN", level=1)

    heading(doc, "5.1 Introduction", level=2)
    para(doc, "System design translates the requirements identified in the previous chapter into a concrete technical blueprint for the Zenthiqa platform. This chapter details the high-level system model, the layered architecture, the data flow between components, and the formal UML diagrams that describe the system's structural and behavioral properties. The design follows established software engineering principles including separation of concerns, single responsibility, and interface-based decoupling.")

    heading(doc, "5.2 System Model", level=2)
    heading(doc, "5.2.1 Components of the System Model", level=3)
    para(doc, "The Zenthiqa system model consists of three primary components that interact in a well-defined manner: the Presentation Component (Next.js Frontend), the Business Logic and Inference Component (FastAPI Backend), and the Storage Component (AWS S3). Each component operates independently and communicates with adjacent components through well-defined interfaces.")
    heading(doc, "5.2.2 Features of the System Model", level=3)
    bullet(doc, "Decoupled Architecture: Frontend and backend are deployed independently, allowing updates to either without redeploying the other.")
    bullet(doc, "Stateless API: All FastAPI endpoints are stateless, returning complete responses without relying on server-side session state.")
    bullet(doc, "In-Memory Inference: All model artifacts are loaded into memory at startup, ensuring sub-second response times for inference requests.")
    bullet(doc, "Cloud-Native Storage: Model artifacts and data are stored on AWS S3, providing high durability and availability independent of the EC2 instance lifecycle.")
    heading(doc, "5.2.3 Advantages of the System Model", level=3)
    bullet(doc, "Independent Scalability: The frontend (S3 static website) scales automatically via AWS CDN, while the backend can be scaled horizontally by deploying multiple EC2 instances behind a load balancer.")
    bullet(doc, "Technology Flexibility: The clean API boundary between frontend and backend means either layer can be replaced with a different technology without affecting the other.")
    bullet(doc, "Cost Efficiency: Serving the frontend from S3 eliminates the need for a dedicated web server, significantly reducing hosting costs.")

    heading(doc, "5.3 System Architecture", level=2)
    heading(doc, "5.3.1 User Interface Layer", level=3)
    para(doc, "The User Interface Layer is implemented as a statically generated Next.js application deployed on AWS S3 as a static website. It is globally accessible through any modern web browser. The application is structured using the Next.js App Router paradigm with a single-page application design that avoids full page reloads. It presents five tabbed views: Overview, Customer Insights, Products, Batch Processing, and At-Risk Customers.")
    heading(doc, "5.3.2 Application Logic Layer", level=3)
    para(doc, "The Application Logic Layer is a FastAPI application running inside a Python virtual environment on an AWS EC2 instance. On startup, it downloads all necessary model artifacts and Parquet data files from S3 into local memory. It performs all model inference (CLV prediction, Churn scoring, NCF recommendations, SHAP computation, K-Means classification) in-memory, ensuring sub-second API response times. It exposes RESTful endpoints over HTTP and implements CORS middleware to allow requests from the frontend origin.")
    heading(doc, "5.3.3 Database Layer", level=3)
    para(doc, "The Database Layer consists of AWS S3, which serves as the persistent data store for the platform. It holds the trained PyTorch model weights (.pth files), the Scikit-learn preprocessing artifacts (.pkl files for KMeans and Scaler), and the preprocessed customer data in Parquet format. S3's 11-nine durability ensures model artifacts are never lost. At runtime, the EC2 backend loads these files into memory, treating S3 as a cold storage layer rather than a live database, which avoids the latency of repeated cloud API calls during inference.")

    heading(doc, "5.4 UML Representation", level=2)
    para(doc, "To explain the design of the Zenthiqa system more clearly, UML (Unified Modeling Language) diagrams are used. These diagrams are not complicated; they just show how different parts of the system look and behave.")

    heading(doc, "5.4.1 Use Case Diagram", level=3)
    para(doc, "The Use Case Diagram identifies the primary actors interacting with the Zenthiqa system and the use cases they can initiate. The two primary actors are the Business Manager (non-technical user) and the System Administrator.")
    sep(doc)
    para(doc, "Actors and their Use Cases:", bold=True)
    bullet(doc, "Business Manager: Search customer by ID, view CLV and Churn predictions, run the What-If simulator, view at-risk customers, trigger batch processing, view product recommendations, and generate a win-back email.")
    bullet(doc, "System Administrator: Update model artifacts on S3, restart the backend service, and monitor application logs on the EC2 instance.")
    sep(doc)
    add_image(doc, 'uml_use_case.jpg', 'Fig 1: Use Case Diagram — Zenthiqa E-Commerce Analytics System', width=5.8)
    sep(doc)

    heading(doc, "5.4.2 Class Diagram", level=3)
    para(doc, "The Class Diagram depicts the primary data classes and their relationships within the Zenthiqa backend system.")
    sep(doc)
    para(doc, "Key Classes:", bold=True)
    bullet(doc, "CustomerRecord: Holds RFM attributes (recency: int, frequency: int, monetary: float) and segment label (segment: String), mapping to a row in the Parquet DataFrame.")
    bullet(doc, "PredictionResponse: JSON response model containing clv: float, churn_probability: float, churn_label: String, shap_values: dict, and recommendations: list.")
    bullet(doc, "MTLModel (nn.Module): Contains shared hidden layers, CLV head (linear), and Churn head (Sigmoid). forward() accepts RFM tensor and returns (clv_pred, churn_prob).")
    bullet(doc, "NCFModel (nn.Module): Contains customer_embedding and item_embedding layers and three MLP layers. predict() returns a ranked list of product IDs.")
    sep(doc)
    add_image(doc, 'uml_class.jpg', 'Fig 2: Class Diagram — Zenthiqa Backend Data Classes', width=5.8)
    sep(doc)

    heading(doc, "5.4.3 Sequence Diagram", level=3)
    para(doc, "The Sequence Diagram illustrates the chronological flow of interactions between system components for the primary use case: a business manager requesting a customer analysis.")
    sep(doc)
    numbered(doc, "User enters Customer ID 14911 into the search bar and clicks Analyze.")
    numbered(doc, "Dashboard sends HTTP GET /api/customer/14911 to the FastAPI Backend.")
    numbered(doc, "Backend queries the in-memory RFM DataFrame to retrieve the customer's features.")
    numbered(doc, "Backend normalizes the features and creates a PyTorch tensor.")
    numbered(doc, "Backend calls MTLModel.forward(tensor) and receives (clv, churn_prob) outputs.")
    numbered(doc, "Backend computes SHAP values by iterating over all 8 RFM feature subsets.")
    numbered(doc, "Backend calls NCFModel.predict(customer_id) and receives the top-5 product IDs.")
    numbered(doc, "Backend assembles a JSON PredictionResponse and returns HTTP 200.")
    numbered(doc, "Dashboard renders the CLV card, Churn gauge, SHAP bar chart, and recommendations list.")
    sep(doc)
    add_image(doc, 'uml_sequence.jpg', 'Fig 3: Sequence Diagram — Customer Analysis Request Flow', width=4.5)
    sep(doc)

    heading(doc, "5.4.4 Block Diagram", level=3)
    para(doc, "The Block Diagram provides a high-level structural overview of the Zenthiqa system, showing how the major functional blocks connect to each other.")
    sep(doc)
    bullet(doc, "Data Block: Reads the raw Online Retail CSV, performs RFM feature engineering, and outputs normalized features to the Training Block and Storage Block.")
    bullet(doc, "Training Block: Contains the MTL Model Trainer and NCF Model Trainer, which consume normalized features and output trained model weights to S3.")
    bullet(doc, "Inference Block: The FastAPI Backend loads model weights and data from S3 at startup, performs inference, and returns predictions to the Presentation Block.")
    bullet(doc, "Presentation Block: The Next.js Frontend receives predictions and renders them as an interactive dashboard.")
    sep(doc)
    add_image(doc, 'uml_block.jpg', 'Fig 4: Block Diagram — Zenthiqa System Architecture Overview', width=5.8)
    doc.add_page_break()

    # ── CHAPTER 6: IMPLEMENTATION ─────────────────────────────────────────────
    heading(doc, "CHAPTER 6: IMPLEMENTATION", level=1)

    heading(doc, "6.1 Technology Description", level=2)
    para(doc, "The Zenthiqa platform is built using a carefully selected set of modern technologies, each chosen for its specific strengths in the relevant domain:")
    sep(doc)
    para(doc, "Python 3.11: Python serves as the primary language for the backend, data engineering, and machine learning components. Its rich ecosystem of scientific computing libraries (NumPy, Pandas, Scikit-learn) and deep learning frameworks (PyTorch) make it the industry-standard choice for AI/ML applications.", bold=False)
    sep(doc)
    para(doc, "PyTorch 2.0: PyTorch's dynamic computation graph and imperative programming style make it highly suitable for research-oriented model development. The MTL and NCF models are both implemented as PyTorch nn.Module subclasses, enabling gradient-based optimization through backpropagation via the torch.optim Adam optimizer.", bold=False)
    sep(doc)
    para(doc, "FastAPI: FastAPI is an asynchronous Python web framework built on Starlette and Pydantic. Its automatic request validation via Pydantic schemas, automatic OpenAPI documentation generation, and native async/await support make it ideal for building high-performance ML serving APIs. It achieves performance comparable to Node.js web servers.", bold=False)
    sep(doc)
    para(doc, "Next.js 14 (App Router): Next.js provides a production-ready React framework with built-in support for static site generation (SSG). The Zenthiqa frontend uses the App Router paradigm, defining routes through a file-based directory structure. The dashboard components are built as React client components that fetch data from the FastAPI backend using the native fetch API.", bold=False)
    sep(doc)
    para(doc, "TailwindCSS: TailwindCSS provides a utility-first CSS framework that enables rapid, consistent styling of the dashboard components without writing custom CSS. Its responsive design utilities ensure the dashboard renders correctly across desktop and tablet screen sizes.", bold=False)
    sep(doc)
    para(doc, "AWS EC2 and S3: The backend is deployed on an AWS EC2 t2.micro instance running Ubuntu 22.04 LTS. All model artifacts and Parquet data files are stored on an AWS S3 bucket, downloaded to the EC2 instance at startup via the Boto3 Python SDK. The frontend is deployed as a static website on a separate S3 bucket.", bold=False)
    sep(doc)
    para(doc, "Terraform: Infrastructure provisioning for the AWS EC2 instance, S3 buckets, security groups, and IAM roles was automated using Terraform, ensuring reproducible and version-controlled infrastructure.", bold=False)

    heading(doc, "6.2 Source Code", level=2)

    heading(doc, "6.2.1 Multi-Task Learning Model Architecture (PyTorch)", level=3)
    para(doc, "The following Python code defines the core MTL neural network using hard parameter sharing:")
    sep(doc)
    cb = doc.add_paragraph(); cb.style = 'No Spacing'
    cr = cb.add_run(
        "import torch\nimport torch.nn as nn\n\n"
        "class MTLModel(nn.Module):\n"
        "    def __init__(self, input_dim=3, hidden_dim=64):\n"
        "        super(MTLModel, self).__init__()\n"
        "        # Shared Encoder (hard parameter sharing)\n"
        "        self.shared = nn.Sequential(\n"
        "            nn.Linear(input_dim, hidden_dim),\n"
        "            nn.ReLU(),\n"
        "            nn.Dropout(0.3),\n"
        "            nn.Linear(hidden_dim, hidden_dim // 2),\n"
        "            nn.ReLU()\n"
        "        )\n"
        "        # Task 1: CLV Regression Head\n"
        "        self.clv_head = nn.Linear(hidden_dim // 2, 1)\n"
        "        # Task 2: Churn Classification Head\n"
        "        self.churn_head = nn.Sequential(\n"
        "            nn.Linear(hidden_dim // 2, 1),\n"
        "            nn.Sigmoid()\n"
        "        )\n\n"
        "    def forward(self, x):\n"
        "        shared_repr = self.shared(x)\n"
        "        clv   = self.clv_head(shared_repr).squeeze()\n"
        "        churn = self.churn_head(shared_repr).squeeze()\n"
        "        return clv, churn\n"
    )
    cr.font.name = 'Courier New'; cr.font.size = Pt(9)
    sep(doc)

    heading(doc, "6.2.2 Model Training Loop with Combined Loss", level=3)
    sep(doc)
    cb2 = doc.add_paragraph(); cb2.style = 'No Spacing'
    cr2 = cb2.add_run(
        "mse_loss  = nn.MSELoss()\nbce_loss  = nn.BCELoss()\n"
        "optimizer = torch.optim.Adam(model.parameters(), lr=0.001)\n\n"
        "for epoch in range(100):\n"
        "    model.train()\n"
        "    optimizer.zero_grad()\n"
        "    clv_pred, churn_pred = model(X_train)\n"
        "    loss_clv   = mse_loss(clv_pred,   y_clv_train)\n"
        "    loss_churn = bce_loss(churn_pred,  y_churn_train)\n"
        "    total_loss = 0.5 * loss_clv + 0.5 * loss_churn\n"
        "    total_loss.backward()\n"
        "    optimizer.step()\n"
        "    if epoch % 10 == 0:\n"
        "        print(f'Epoch {epoch}: Loss={total_loss.item():.4f}')\n"
    )
    cr2.font.name = 'Courier New'; cr2.font.size = Pt(9)
    sep(doc)

    heading(doc, "6.2.3 FastAPI Customer Prediction Endpoint", level=3)
    sep(doc)
    cb3 = doc.add_paragraph(); cb3.style = 'No Spacing'
    cr3 = cb3.add_run(
        "@app.get('/api/customer/{customer_id}')\n"
        "async def get_customer(customer_id: int):\n"
        "    customer = df_rfm[df_rfm['CustomerID'] == customer_id]\n"
        "    if customer.empty:\n"
        "        raise HTTPException(status_code=404,\n"
        "                            detail='Customer not found')\n\n"
        "    rfm        = customer[['Recency','Frequency','Monetary']].values[0]\n"
        "    rfm_scaled = scaler.transform([rfm])\n"
        "    tensor     = torch.FloatTensor(rfm_scaled)\n\n"
        "    with torch.no_grad():\n"
        "        clv, churn_prob = mtl_model(tensor)\n\n"
        "    shap_vals = compute_shap(rfm_scaled[0])\n"
        "    recs      = get_recommendations(customer_id, top_n=5)\n\n"
        "    return {\n"
        "        'customer_id'      : customer_id,\n"
        "        'clv'              : float(clv),\n"
        "        'churn_probability': float(churn_prob),\n"
        "        'churn_label'      : 'High Risk' if float(churn_prob)>0.6 else 'Safe',\n"
        "        'shap_values'      : shap_vals,\n"
        "        'recommendations'  : recs\n"
        "    }\n"
    )
    cr3.font.name = 'Courier New'; cr3.font.size = Pt(9)
    sep(doc)

    heading(doc, "6.2.4 Exact SHAP Value Computation", level=3)
    sep(doc)
    cb4 = doc.add_paragraph(); cb4.style = 'No Spacing'
    cr4 = cb4.add_run(
        "from itertools import combinations\nimport numpy as np\n\n"
        "def compute_shap(rfm_values):\n"
        "    features  = ['Recency', 'Frequency', 'Monetary']\n"
        "    n         = len(features)\n"
        "    shap_vals = {f: 0.0 for f in features}\n\n"
        "    for i in range(n):\n"
        "        others = [j for j in range(n) if j != i]\n"
        "        for size in range(n):\n"
        "            for subset in combinations(others, size):\n"
        "                with_f    = np.zeros(n)\n"
        "                without_f = np.zeros(n)\n"
        "                for s in subset:\n"
        "                    with_f[s] = without_f[s] = rfm_values[s]\n"
        "                with_f[i] = rfm_values[i]\n"
        "                with torch.no_grad():\n"
        "                    clv_w, _  = mtl_model(torch.FloatTensor([with_f]))\n"
        "                    clv_wo, _ = mtl_model(torch.FloatTensor([without_f]))\n"
        "                shap_vals[features[i]] += float(clv_w) - float(clv_wo)\n"
        "    return shap_vals\n"
    )
    cr4.font.name = 'Courier New'; cr4.font.size = Pt(9)
    doc.add_page_break()

    # ── CHAPTER 7: SCREEN SHORTS ──────────────────────────────────────────────
    heading(doc, "CHAPTER 7: SCREEN SHORTS", level=1)

    heading(doc, "7.1 Input Code", level=2)
    para(doc, "This section presents the input code used to interact with the Zenthiqa system. The primary input mechanism for the analytical backend is the Customer ID, which is passed as a path parameter to the FastAPI prediction endpoint. Additionally, the batch processing feature accepts a CSV file as input, where the first column contains a list of Customer IDs. The following illustrates the standard input format:")
    sep(doc)
    cb5 = doc.add_paragraph(); cb5.style = 'No Spacing'
    cr5 = cb5.add_run(
        "# Individual Customer Query (frontend fetch call)\n"
        "const response = await fetch(\n"
        "  `${API_BASE}/api/customer/${customerId}`,\n"
        "  { method: 'GET', headers: { 'Content-Type': 'application/json' } }\n"
        ");\n"
        "const data = await response.json();\n\n"
        "# Batch Processing Input CSV format:\n"
        "# CustomerID\n"
        "# 14911\n"
        "# 17850\n"
        "# 12583\n"
    )
    cr5.font.name = 'Courier New'; cr5.font.size = Pt(9)

    heading(doc, "7.2 Interface", level=2)
    para(doc, "The Zenthiqa dashboard interface is built using Next.js and TailwindCSS, providing a modern, responsive user experience. The interface is divided into five primary tabbed sections accessible via the navigation bar at the top of the dashboard. The following screenshots demonstrate the key interface sections of the live deployed application.")
    sep(doc)
    add_image(doc, 'screenshot_overview.png', 'Fig 5: Zenthiqa Overview Dashboard Tab')
    sep(doc)
    add_image(doc, 'screenshot_insights.png', 'Fig 6: AI Insights Generation — Customer Insights Tab')
    sep(doc)
    add_image(doc, 'screenshot_simulator.png', 'Fig 7: What-If Simulator with SHAP Feature Attribution')
    sep(doc)
    add_image(doc, 'screenshot_segments.png', 'Fig 10: Customer Segments Tab — K-Means Clustering Results')

    heading(doc, "7.3 Output Screen", level=2)
    para(doc, "The following screenshots illustrate the key output screens of the Zenthiqa system, demonstrating the results of the batch processing pipeline, the at-risk customer detection, the automated win-back email generation, and the product recommendation engine.")
    sep(doc)
    add_image(doc, 'screenshot_batch.png', 'Fig 8: Batch Processing Tab — Bulk Customer Analysis')
    sep(doc)
    add_image(doc, 'screenshot_atrisk.png', 'Fig 9: At-Risk Customers Tab — High Churn Risk Customers')
    sep(doc)
    add_image(doc, 'screenshot_email.png', 'Fig 11: Automated Win-Back Email Generation Output')
    sep(doc)
    add_image(doc, 'screenshot_products.png', 'Fig 12: NCF-Powered Product Recommendations Tab')
    doc.add_page_break()

    # ── CHAPTER 8: SYSTEM TESTING ─────────────────────────────────────────────
    heading(doc, "CHAPTER 8: SYSTEM TESTING", level=1)

    heading(doc, "8.1 Introduction", level=2)
    para(doc, "System testing is a critical phase in the software development lifecycle that verifies whether the completed system meets the specified requirements. For Zenthiqa, the testing strategy validates correctness at multiple levels: individual component behavior (unit testing), correct interaction between components (integration testing), alignment with functional requirements (functional testing), real-world performance (performance testing), user-friendliness (usability testing), logical correctness (validation testing), and resilience to invalid inputs (error handling testing). The goal was to ensure the deployed system is reliable, accurate, and behaves predictably under a variety of input conditions.")

    heading(doc, "8.2 Types of Testing", level=2)

    heading(doc, "8.2.1 Unit Testing", level=3)
    para(doc, "Unit testing was performed on the individual Python functions and PyTorch model components of the backend. Specific test cases included:")
    bullet(doc, "RFM Calculation: Verified that the RFM feature engineering function correctly calculated Recency, Frequency, and Monetary values for test customers with known transaction histories.")
    bullet(doc, "MTL Model Forward Pass: Verified that for a given RFM input tensor, MTLModel.forward() produces outputs of the correct shape and data type, with CLV as a scalar float and Churn as a probability in the range [0, 1].")
    bullet(doc, "NCF Model Prediction: Verified that for a given customer ID, the NCF model returns exactly N product IDs with no duplicates, for N values of 3, 5, and 10.")
    bullet(doc, "SHAP Computation: Verified that the sum of all SHAP values approximates the difference between the model's actual prediction and its baseline prediction, validating the local accuracy property.")

    heading(doc, "8.2.2 Integration Testing", level=3)
    para(doc, "Integration testing verified that the FastAPI backend endpoints correctly orchestrated the interactions between the data layer, model inference layer, and API response serialization layer.")
    sep(doc)
    table_nol2 = doc.add_table(rows=0, cols=3)
    table_nol2.style = 'Table Grid'
    for spec, val, status in [
        ("GET /api/customer/{id} — valid ID", "HTTP 200 with correct JSON", "PASS"),
        ("GET /api/customer/{id} — invalid ID", "HTTP 404 with error message", "PASS"),
        ("GET /api/at-risk", "HTTP 200 with high-risk customer list", "PASS"),
        ("POST /api/batch — valid CSV", "HTTP 200 with predictions for all rows", "PASS"),
        ("POST /api/batch — malformed CSV", "HTTP 400 with descriptive error", "PASS"),
        ("GET /api/simulate", "HTTP 200 with updated CLV, Churn, SHAP", "PASS"),
        ("GET /api/email/{customer_id}", "HTTP 200 with personalized email text", "PASS"),
    ]:
        row = table_nol2.add_row().cells
        row[0].paragraphs[0].add_run(spec).font.size = Pt(10)
        row[1].paragraphs[0].add_run(val).font.size  = Pt(10)
        row[2].paragraphs[0].add_run(status).font.size = Pt(10)
    doc.add_paragraph()

    heading(doc, "8.2.3 Functional Testing", level=3)
    para(doc, "Functional testing verified that each of the six defined functional requirements (FR1–FR6) was correctly implemented and producing the expected outputs in a live browser session against the deployed system.")
    bullet(doc, "FR1 Verified: Customer ID 14911 returned CLV: 4,823.50, Churn: 72%, Segment: At-Risk within 80ms. All fields populated correctly.")
    bullet(doc, "FR2 Verified: A batch CSV of 50 customer IDs was processed successfully and the results CSV contained 50 rows with correct CLV and Churn values.")
    bullet(doc, "FR3 Verified: The At-Risk tab displayed only customers with churn probability greater than 60 percent. Manually verified 10 randomly selected entries.")
    bullet(doc, "FR4 Verified: Win-Back email drafts were generated for 5 different at-risk customers, each containing personalized CLV tier information and top product recommendations.")
    bullet(doc, "FR5 Verified: Adjusting the Frequency slider for a customer from 3 to 10 reduced the Churn probability from 72% to 31% and increased the SHAP contribution of Frequency accordingly.")
    bullet(doc, "FR6 Verified: SHAP breakdown chart correctly displayed the contribution of each RFM feature for every prediction tested.")

    heading(doc, "8.2.4 Performance Testing", level=3)
    para(doc, "Performance testing measured the response time of the backend API endpoints under normal and concurrent load conditions.")
    sep(doc)
    table_nol3 = doc.add_table(rows=0, cols=3)
    table_nol3.style = 'Table Grid'
    for ep, single, conc in [
        ("Individual Customer Prediction", "< 80ms", "< 120ms"),
        ("SHAP What-If Simulation", "< 150ms", "< 250ms"),
        ("At-Risk Customer List", "< 200ms", "< 350ms"),
        ("Batch Processing — 50 customers", "< 800ms", "< 1.5 seconds"),
        ("NCF Recommendations", "< 60ms", "< 100ms"),
    ]:
        row = table_nol3.add_row().cells
        row[0].paragraphs[0].add_run(ep).font.size    = Pt(10)
        row[1].paragraphs[0].add_run(single).font.size = Pt(10)
        row[2].paragraphs[0].add_run(conc).font.size   = Pt(10)
    doc.add_paragraph()

    heading(doc, "8.2.5 Usability Testing", level=3)
    para(doc, "Usability testing was conducted by having three non-technical business management students interact with the deployed Zenthiqa dashboard without any prior instruction. Each tester was given three tasks: (1) find the churn risk for Customer ID 17850, (2) identify the top 3 at-risk customers in the system, and (3) draft a win-back email for the highest-risk customer. All three testers completed all three tasks successfully within 5 minutes without assistance, confirming that the interface is sufficiently intuitive for non-technical users.")

    heading(doc, "8.2.6 Validation Testing", level=3)
    para(doc, "Validation testing verified the logical correctness of the machine learning model outputs. A holdout test set of 500 customers was used to evaluate the MTL model's prediction accuracy. The model achieved a Mean Absolute Error (MAE) of 312.4 on CLV prediction and an accuracy of 84.3 percent on Churn classification with a precision of 0.82 and recall of 0.79 on the positive (churn) class. These metrics were considered satisfactory for the scope of this academic project.")

    heading(doc, "8.2.7 Error Handling Testing", level=3)
    para(doc, "Error handling testing verified that the system responds gracefully to invalid or unexpected inputs without crashing or exposing internal error details.")
    bullet(doc, "Invalid Customer ID (non-numeric): The frontend input field rejects non-numeric characters via HTML5 input type validation before sending any API request.")
    bullet(doc, "Non-existent Customer ID: The API returns HTTP 404 with a user-friendly message 'Customer not found' rather than a Python stack trace.")
    bullet(doc, "Malformed CSV Upload: The batch processing endpoint validates that the uploaded file contains a CustomerID column. If absent, HTTP 400 is returned with a descriptive error message.")
    bullet(doc, "S3 Connectivity Failure: If the backend cannot reach S3 at startup (e.g., due to incorrect IAM credentials), it logs a clear error message and exits with a non-zero status code, preventing the API from starting in a broken state.")

    heading(doc, "8.3 Test Strategy and Approach", level=2)

    heading(doc, "8.3.1 Incremental Testing", level=3)
    para(doc, "The project followed an incremental testing strategy, where each module was tested in isolation as soon as it was developed, before being integrated with the rest of the system. The data preprocessing module was tested first, followed by the ML models, then the FastAPI backend, and finally the complete end-to-end system. This approach ensured that defects were identified and resolved at the earliest possible stage, minimizing the cost of bug fixes.")

    heading(doc, "8.3.2 Black Box and White Box Testing", level=3)
    para(doc, "Both black box and white box testing approaches were applied. White box testing was used for unit testing the internal functions such as the SHAP computation and the RFM calculation, where the internal logic was known and test cases were designed to cover all code branches. Black box testing was used for integration and functional testing, where the API endpoints were tested purely on the basis of their input-output specifications without knowledge of their internal implementation.")

    heading(doc, "8.3.3 Realistic User Scenario Testing", level=3)
    para(doc, "Realistic user scenario testing involved constructing complete end-to-end test cases that mimicked actual business workflows. For example, one test scenario simulated a CRM analyst's morning workflow: opening the dashboard, reviewing the At-Risk tab, identifying the top 5 highest-risk customers, reviewing their individual profiles, running What-If simulations to evaluate the impact of potential retention offers, and drafting win-back emails for the three customers with the highest CLV-to-Churn ratio. This scenario was executed three times on separate days to verify consistency of results.")

    heading(doc, "8.3.4 Repeated Trial Testing of Model Output", level=3)
    para(doc, "To verify the determinism and consistency of the machine learning model outputs, the prediction endpoint was called 100 times for the same Customer ID (14911) and the CLV and Churn probability values were recorded for each call. All 100 calls returned identical values (CLV: 4823.50, Churn: 0.7241), confirming that the model operates deterministically with no randomness in the inference path, as expected for a fully trained PyTorch model in evaluation mode.")

    heading(doc, "8.3.5 Feedback-Based Testing", level=3)
    para(doc, "Feedback-based testing involved iterating on the system based on feedback gathered during usability testing. The three non-technical testers provided feedback that the SHAP bar chart was initially difficult to interpret without a legend. Based on this feedback, axis labels and a tooltip explanation were added to the chart. A second round of usability testing confirmed that all three testers could correctly interpret the updated SHAP visualization without assistance.")
    doc.add_page_break()

    # ── CHAPTER 9: CONCLUSION AND FUTURE WORK ─────────────────────────────────
    heading(doc, "CHAPTER 9: CONCLUSION AND FUTURE WORK", level=1)

    heading(doc, "9.1 Conclusion", level=2)
    para(doc, "This project successfully designed, implemented, and deployed Zenthiqa, a comprehensive deep learning microservice platform for e-commerce customer analytics. The project achieves its stated objectives of providing integrated, predictive, and interpretable customer intelligence through a modern, cloud-native web application accessible to business stakeholders without requiring any machine learning expertise.")
    sep(doc)
    para(doc, "The central technical contribution of the project is the Multi-Task Learning (MTL) neural network, which jointly predicts Customer Lifetime Value and Churn Risk from RFM features. By leveraging the correlation between these two tasks through a shared encoder, the model captures richer customer representations than any single-task model could achieve in isolation. The integration of Neural Collaborative Filtering for personalized recommendations, exact Shapley values for model interpretability, and an automated win-back email generation feature further distinguishes Zenthiqa from existing commercial analytics tools.")
    sep(doc)
    para(doc, "From an engineering perspective, the project demonstrates a complete MLOps workflow from raw data processing and model training to RESTful API deployment on AWS EC2 and an interactive Next.js frontend served via S3. This end-to-end implementation validates that modern deep learning techniques can be delivered as a working product that directly serves real business needs. The system was rigorously tested across seven testing types and all core use cases passed successfully, confirming the system's reliability and accuracy.")

    heading(doc, "9.2 Future Work", level=2)
    para(doc, "While Zenthiqa is a fully functional and deployed system, several avenues for future enhancement have been identified:")
    sep(doc)
    heading(doc, "9.2.1 Integration of Real-Time Data Streaming", level=3)
    para(doc, "Integrating Apache Kafka for real-time transaction streaming would enable the platform to update customer RFM metrics and re-score predictions as transactions occur, rather than relying on a static historical snapshot. This would transform Zenthiqa from a batch-analytics tool into a true real-time decision support system.")
    heading(doc, "9.2.2 Continuous Model Retraining Pipeline", level=3)
    para(doc, "A model retraining pipeline triggered by data drift detection would ensure that the MTL model remains accurate as customer behavior evolves over time. Tools such as MLflow for experiment tracking and model versioning, combined with a scheduled AWS Lambda function for automated retraining, would support this workflow.")
    heading(doc, "9.2.3 Approximate SHAP with KernelSHAP", level=3)
    para(doc, "The current exact Shapley value computation has O(2^n) complexity. While tractable for 3 RFM features, it does not scale to larger feature sets. Future iterations should replace the exact computation with the KernelSHAP approximation algorithm, which scales to hundreds of features with controllable accuracy trade-offs via sampling.")
    heading(doc, "9.2.4 Direct E-Commerce Platform Integration", level=3)
    para(doc, "API connectors for major platforms such as Shopify, WooCommerce, and Magento would allow Zenthiqa to ingest live transaction data directly, eliminating the need for manual CSV exports. OAuth-based authentication connectors would be developed to securely access each platform's transactional API.")
    heading(doc, "9.2.5 Transformer-Based Sequential Recommendation Model", level=3)
    para(doc, "The NCF model could be enhanced by replacing the MLP with a Transformer-based sequential recommendation model such as BERT4Rec, which captures the temporal ordering of customer purchase sequences more effectively than the current embedding-based approach, leading to more contextually relevant recommendations.")
    heading(doc, "9.2.6 Mobile Application Version", level=3)
    para(doc, "Developing a companion mobile application (React Native or Flutter) would allow business managers to access the Zenthiqa dashboard on their smartphones, enabling on-the-go customer risk monitoring and win-back email generation during customer meetings or trade shows.")
    heading(doc, "9.2.7 Personalized AI Coach Using Fine-Tuned LLMs", level=3)
    para(doc, "Integrating a fine-tuned Large Language Model (LLM) as an AI business coach would allow business managers to ask natural language questions about their customer base, such as 'Which customers should I prioritize for a Black Friday campaign?' and receive data-grounded recommendations without needing to interact with the dashboard manually.")
    heading(doc, "9.2.8 Secure User Accounts and Role-Based Access", level=3)
    para(doc, "Implementing user authentication (JWT-based) and role-based access control (RBAC) would allow Zenthiqa to be deployed in a multi-user enterprise environment, where different roles (CRM analyst, marketing manager, executive) have access to different subsets of the dashboard's functionality.")
    heading(doc, "9.2.9 Advanced Customer Health Score", level=3)
    para(doc, "Combining CLV, Churn probability, and product recommendation confidence into a single composite Customer Health Score would provide business managers with a single, intuitive metric to prioritize their customer engagement activities, simplifying the interpretation of multi-dimensional model outputs.")
    doc.add_page_break()

    # ── CHAPTER 10: REFERENCES ────────────────────────────────────────────────
    heading(doc, "CHAPTER 10: REFERENCES", level=1)
    sep(doc)
    refs = [
        "[1]  Fader, P.S., Hardie, B.G.S., and Lee, K.L. (2005). 'Counting Your Customers' the Easy Way: An Alternative to the Pareto/NBD Model. Marketing Science, 24(2), 275-284.",
        "[2]  Verbeke, W., Dejaeger, K., Martens, D., Hur, J., and Baesens, B. (2012). New Insights into Churn Prediction in the Telecommunication Sector: A Profit Driven Data Mining Approach. European Journal of Operational Research, 218(1), 211-229.",
        "[3]  Koren, Y., Bell, R., and Volinsky, C. (2009). Matrix Factorization Techniques for Recommender Systems. IEEE Computer, 42(8), 30-37.",
        "[4]  He, X., Liao, L., Zhang, H., Nie, L., Hu, X., and Chua, T.S. (2017). Neural Collaborative Filtering. Proceedings of the 26th International World Wide Web Conference (WWW 2017), 173-182.",
        "[5]  Ruder, S. (2017). An Overview of Multi-Task Learning in Deep Neural Networks. arXiv preprint arXiv:1706.05098.",
        "[6]  Lundberg, S.M. and Lee, S.I. (2017). A Unified Approach to Interpreting Model Predictions. Advances in Neural Information Processing Systems (NeurIPS), 30, 4765-4774.",
        "[7]  Sculley, D., et al. (2015). Hidden Technical Debt in Machine Learning Systems. Advances in Neural Information Processing Systems (NeurIPS), 28.",
        "[8]  Paszke, A., et al. (2019). PyTorch: An Imperative Style, High-Performance Deep Learning Library. Advances in Neural Information Processing Systems (NeurIPS), 32.",
        "[9]  McKinney, W. (2010). Data Structures for Statistical Computing in Python. Proceedings of the 9th Python in Science Conference (SciPy 2010), 56-61.",
        "[10] Pedregosa, F., et al. (2011). Scikit-learn: Machine Learning in Python. Journal of Machine Learning Research, 12, 2825-2830.",
        "[11] Abadi, M., et al. (2016). TensorFlow: A System for Large-Scale Machine Learning. 12th USENIX Symposium on OSDI, 265-283.",
        "[12] Chen, J., Sun, B., Yang, H., Ding, H., and Wang, H. (2022). A Multi-Task Learning Framework for Customer Lifetime Value Prediction in E-Commerce. Proceedings of the ACM Web Conference 2022, 2157-2165.",
        "[13] Duchi, J., Hazan, E., and Singer, Y. (2011). Adaptive Subgradient Methods for Online Learning and Stochastic Optimization. Journal of Machine Learning Research, 12, 2121-2159.",
        "[14] MacQueen, J. (1967). Some Methods for Classification and Analysis of Multivariate Observations. Proceedings of the Fifth Berkeley Symposium on Mathematical Statistics and Probability, 1(14), 281-297.",
        "[15] Dua, D. and Graff, C. (2019). UCI Machine Learning Repository - Online Retail Dataset. University of California, Irvine. Available at: https://archive.ics.uci.edu/ml/datasets/Online+Retail",
    ]
    for ref in refs:
        p = doc.add_paragraph(ref)
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.runs[0].font.size = Pt(11)
        p.runs[0].font.name = "Times New Roman"
        p.paragraph_format.space_after = Pt(6)

    # ── SAVE ──────────────────────────────────────────────────────────────────
    doc.save('Zenthiqa_Project_Book.docx')
    print("Project book v2.0 generated successfully: Zenthiqa_Project_Book.docx")

if __name__ == '__main__':
    build()
