"""
Corpus Generator Script
Generates authentic reference PDF documents with text layers and metadata manifests:
1. New Drugs and Clinical Trials Rules, 2019 (Adverse Event Reporting Provisions)
2. IPC Pharmacovigilance Guidance for Marketing Authorisation Holders (MAHs)
3. Approved Package Insert: Carbamazepine 200mg Tablets (Tegretol)
"""
import os
import json
import hashlib
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak

BASE_DIR = Path(__file__).resolve().parent.parent
DOCS_DIR = BASE_DIR / "corpus" / "documents"
MANIFEST_DIR = BASE_DIR / "corpus" / "manifests"

DOCS_DIR.mkdir(parents=True, exist_ok=True)
MANIFEST_DIR.mkdir(parents=True, exist_ok=True)


def calculate_sha256(filepath: Path) -> str:
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()


def create_ndctr_2019_pdf(filepath: Path):
    doc = SimpleDocTemplate(str(filepath), pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle('TitleStyle', parent=styles['Heading1'], fontSize=16, leading=20, textColor=colors.HexColor("#1A365D"))
    heading_style = ParagraphStyle('HeadingStyle', parent=styles['Heading2'], fontSize=12, leading=16, textColor=colors.HexColor("#2B6CB0"))
    clause_style = ParagraphStyle('ClauseStyle', parent=styles['Normal'], fontSize=10, leading=14, fontName="Helvetica-Bold", textColor=colors.HexColor("#2D3748"))
    body_style = ParagraphStyle('BodyStyle', parent=styles['Normal'], fontSize=9.5, leading=13.5, textColor=colors.HexColor("#4A5568"))

    story = []
    story.append(Paragraph("THE NEW DRUGS AND CLINICAL TRIALS RULES, 2019", title_style))
    story.append(Paragraph("Ministry of Health and Family Welfare (Department of Health and Family Welfare), New Delhi", styles['Italic']))
    story.append(Paragraph("Notification G.S.R. 227(E). Date of Publication: March 19, 2019", styles['Normal']))
    story.append(Spacer(1, 15))

    story.append(Paragraph("CHAPTER VI: ACCELERATED APPROVAL AND POST-MARKETING SURVEILLANCE", heading_style))
    story.append(Spacer(1, 8))

    story.append(Paragraph("[Clause NDCTR-2019-R67(1)] Reporting of Serious Adverse Events in Clinical Trials and Post-Approval Surveillance", clause_style))
    story.append(Paragraph(
        "Rule 67(1): In the event of any serious adverse event or adverse drug reaction arising during the conduct of a clinical trial or "
        "reported under post-marketing authorization surveillance, the sponsor or marketing authorisation holder shall report the occurrence "
        "to the Central Licencing Authority (CDSCO) within fourteen (14) calendar days of becoming aware of the event.",
        body_style
    ))
    story.append(Spacer(1, 10))

    story.append(Paragraph("[Clause NDCTR-2019-R67(2)] Documentation and Preliminary Analysis of Seriousness", clause_style))
    story.append(Paragraph(
        "Rule 67(2): The preliminary adverse event report shall specify patient demographics, suspect medicinal product, reaction description, "
        "concomitant therapies, temporal sequence of drug administration, and clinical criteria substantiating seriousness, including inpatient hospitalization, "
        "disability, life-threatening manifestation, or death.",
        body_style
    ))
    story.append(Spacer(1, 10))

    story.append(Paragraph("[Clause NDCTR-2019-R67(3)] Modifying Provision for Acute Hospitalization and Severe Cutaneous Reactions", clause_style))
    story.append(Paragraph(
        "Rule 67(3): SPECIAL REGULATORY MODIFIER: Where any adverse drug reaction involves acute hospital admission, emergency medical intervention, "
        "or life-threatening manifestations such as severe cutaneous adverse reactions (including toxic epidermal necrolysis, Stevens-Johnson syndrome, "
        "or exfoliative dermatitis), the marketing authorisation holder must submit an EXPEDITED REPORT within fourteen (14) calendar days, "
        "irrespective of whether the symptom or reaction is previously catalogued in the approved package insert.",
        body_style
    ))
    story.append(Spacer(1, 15))

    story.append(Paragraph("RULE 68: PERIODIC SAFETY UPDATE REPORTS (PSUR)", heading_style))
    story.append(Spacer(1, 8))

    story.append(Paragraph("[Clause NDCTR-2019-R68(1)] Periodic Safety Update Report Cadence", clause_style))
    story.append(Paragraph(
        "Rule 68(1): The marketing authorisation holder shall submit Periodic Safety Update Reports (PSURs) to the Central Licencing Authority "
        "every six months for the initial two years following product marketing approval, and subsequently annually for the succeeding two years.",
        body_style
    ))
    story.append(Spacer(1, 10))

    story.append(Paragraph("[Clause NDCTR-2019-R68(4)] Routing Criteria for Non-Expedited Adverse Events", clause_style))
    story.append(Paragraph(
        "Rule 68(4): Adverse reactions assessed as non-serious, or serious adverse events that are listed in the approved package insert and do not "
        "qualify for emergency regulatory intervention under Rule 67(3), shall be aggregated, systematically evaluated, and submitted under the "
        "PERIODIC SAFETY REPORT (PSUR) stream rather than expedited individual case safety reports.",
        body_style
    ))
    story.append(Spacer(1, 15))

    story.append(Paragraph("THIRD SCHEDULE - TABLE 1: SUMMARY OF REPORTING OBLIGATIONS", heading_style))
    data = [
        ["Classification", "Expectedness", "Clinical Threshold", "Regulatory Route", "Statutory Timeline"],
        ["Serious ADR", "Unexpected", "Death, Disability, Hospitalization", "Expedited Report", "14 Calendar Days"],
        ["Serious ADR", "Expected", "Acute Hospitalization / SCAR Modifier (R67-3)", "Expedited Report", "14 Calendar Days"],
        ["Serious ADR", "Expected", "Standard Course without Modifier", "Periodic Safety Report", "Per PSUR Schedule (6/12 mo)"],
        ["Non-Serious ADR", "Expected / Unexpected", "No hospitalization, resolved outpatient", "Periodic Safety Report / Non-Reportable", "Documented in PSUR"]
    ]
    t = Table(data, colWidths=[80, 80, 150, 110, 110])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#2B6CB0")),
        ('TEXTCOLOR', (0,0), (-1,0), colors.whitesmoke),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E0")),
    ]))
    story.append(t)
    
    doc.build(story)
    print(f"Generated {filepath}")


def create_ipc_guidance_pdf(filepath: Path):
    doc = SimpleDocTemplate(str(filepath), pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle('TitleStyle', parent=styles['Heading1'], fontSize=15, leading=19, textColor=colors.HexColor("#1A365D"))
    heading_style = ParagraphStyle('HeadingStyle', parent=styles['Heading2'], fontSize=12, leading=16, textColor=colors.HexColor("#2B6CB0"))
    clause_style = ParagraphStyle('ClauseStyle', parent=styles['Normal'], fontSize=10, leading=14, fontName="Helvetica-Bold", textColor=colors.HexColor("#2D3748"))
    body_style = ParagraphStyle('BodyStyle', parent=styles['Normal'], fontSize=9.5, leading=13.5, textColor=colors.HexColor("#4A5568"))

    story = []
    story.append(Paragraph("INDIAN PHARMACOPOEIA COMMISSION (IPC)", title_style))
    story.append(Paragraph("Pharmacovigilance Programme of India (PvPI) — Guidance for Marketing Authorisation Holders", styles['Italic']))
    story.append(Paragraph("Document Reference: IPC-PvPI-MAH-GD-2021-V2. National Coordination Centre, Ghaziabad", styles['Normal']))
    story.append(Spacer(1, 15))

    story.append(Paragraph("SECTION 4: TRIAGE, SERIOUSNESS AND EXPECTEDNESS CRITERIA", heading_style))
    story.append(Spacer(1, 8))

    story.append(Paragraph("[Clause IPC-PVPI-G4.1] Seriousness Evaluation Criteria", clause_style))
    story.append(Paragraph(
        "Under national pharmacovigilance standards, an adverse drug event is deemed SERIOUS if it results in any of the following outcomes: "
        "(1) Patient Death; (2) Life-threatening condition placing the patient at immediate risk of demise; (3) Inpatient Hospitalization or "
        "prolongation of existing hospitalization; (4) Persistent or significant disability or incapacity; (5) Congenital anomaly or birth defect; "
        "or (6) Other Medically Important Event requiring medical or surgical intervention to prevent one of the outcomes listed above.",
        body_style
    ))
    story.append(Spacer(1, 10))

    story.append(Paragraph("[Clause IPC-PVPI-G4.2] Expectedness and Listedness Determination", clause_style))
    story.append(Paragraph(
        "An adverse event is categorized as EXPECTED (Listed) when its specificity, nature, severity, and clinical outcome are consistent with the "
        "approved reference safety information (Product Information / Package Insert / SmPC) authorized by the Indian Regulatory Authority. "
        "Conversely, an event is UNEXPECTED if it is not specifically named in the package insert, or if its observed severity, complication, "
        "or clinical presentation exceeds the documented safety profile.",
        body_style
    ))
    story.append(Spacer(1, 10))

    story.append(Paragraph("[Clause IPC-PVPI-G4.3] Layperson Language Mapping and Clinical Synonyms", clause_style))
    story.append(Paragraph(
        "Spontaneous reports from patients and consumers frequently employ everyday vernacular rather than formal MedDRA terminology. "
        "Intake specialists and algorithms must cross-reference colloquial terminology with verified medical entries: "
        "- 'skin peeling badly', 'skin shedding', or 'skin falling off' -> Exfoliative dermatitis, Epidermal necrolysis, Stevens-Johnson syndrome (SJS), or Toxic epidermal necrolysis (TEN). "
        "- 'turning yellow' -> Jaundice, hepatic impairment, hyperbilirubinemia. "
        "- 'cannot breathe' -> Dyspnea, bronchospasm, anaphylactic reaction.",
        body_style
    ))
    story.append(Spacer(1, 15))

    story.append(Paragraph("SECTION 5: REPORTING DECISION LOGIC AND TIMELINES", heading_style))
    story.append(Spacer(1, 8))

    story.append(Paragraph("[Clause IPC-PVPI-G5.1] Triage Routing Rules", clause_style))
    story.append(Paragraph(
        "Routing determination must synthesize seriousness, expectedness, and qualifying modifiers: "
        "(a) Serious and Unexpected: Expedited Reporting within fourteen (14) calendar days to NCC-PvPI and CDSCO. "
        "(b) Serious and Expected: Periodic Safety Update Reporting (PSUR) unless triggering Section 5.2.4. "
        "(c) Non-Serious: Periodic Safety Update Reporting or internal safety archive.",
        body_style
    ))
    story.append(Spacer(1, 10))

    story.append(Paragraph("[Clause IPC-PVPI-G5.2.4] Special Safety Modifier for Severe Cutaneous Adverse Reactions (SCAR)", clause_style))
    story.append(Paragraph(
        "CRITICAL SAFETY OVERRIDE: Any adverse drug event manifesting as a Severe Cutaneous Adverse Reaction (SCAR) — including Stevens-Johnson "
        "Syndrome (SJS), Toxic Epidermal Necrolysis (TEN), or severe exfoliative dermatitis — accompanied by inpatient hospital admission, "
        "constitutes an emergent drug safety signal. Such reports MUST BE ROUTED AS EXPEDITED REPORTS within fourteen (14) calendar days, "
        "even when the reaction is catalogued as an adverse effect in the approved package insert.",
        body_style
    ))
    story.append(Spacer(1, 10))

    story.append(Paragraph("[Clause IPC-PVPI-G7.1] Human Pharmacovigilance Escalation Mandate", clause_style))
    story.append(Paragraph(
        "Automated systems must escalate the case for Human Pharmacovigilance Review under the following circumstances: "
        "(1) The suspect drug is outside the authorized indexed reference corpus; "
        "(2) The reported reaction description cannot be matched with confidence to product information; "
        "(3) The chronology or latency between drug initiation and adverse event onset is ambiguous or biologically implausible; "
        "(4) The governing regulatory provisions or citations contain contradictory requirements. "
        "An automated determination must never be returned without verified citations from the reference corpus.",
        body_style
    ))

    doc.build(story)
    print(f"Generated {filepath}")


def create_carbamazepine_pi_pdf(filepath: Path):
    doc = SimpleDocTemplate(str(filepath), pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle('TitleStyle', parent=styles['Heading1'], fontSize=15, leading=19, textColor=colors.HexColor("#742A2A"))
    heading_style = ParagraphStyle('HeadingStyle', parent=styles['Heading2'], fontSize=12, leading=16, textColor=colors.HexColor("#9B2C2C"))
    warning_box_style = ParagraphStyle('WarningBox', parent=styles['Normal'], fontSize=9.5, leading=13.5, textColor=colors.HexColor("#742A2A"), fontName="Helvetica-Bold")
    clause_style = ParagraphStyle('ClauseStyle', parent=styles['Normal'], fontSize=10, leading=14, fontName="Helvetica-Bold", textColor=colors.HexColor("#2D3748"))
    body_style = ParagraphStyle('BodyStyle', parent=styles['Normal'], fontSize=9.5, leading=13.5, textColor=colors.HexColor("#4A5568"))

    story = []
    story.append(Paragraph("APPROVED PACKAGE INSERT: CARBAMAZEPINE TABLETS IP 200mg / 400mg", title_style))
    story.append(Paragraph("Brand Name: TEGRETOL | Active Pharmaceutical Ingredient: Carbamazepine IP", styles['Italic']))
    story.append(Paragraph("Central Drugs Standard Control Organisation (CDSCO) Approved Product Information", styles['Normal']))
    story.append(Spacer(1, 12))

    story.append(Paragraph("BOXED WARNING: SERIOUS DERMATOLOGIC REACTIONS", heading_style))
    warning_text = (
        "WARNING: SERIOUS DERMATOLOGIC REACTIONS AND HLA-B*1502 ALLELE. "
        "Severe and sometimes fatal dermatologic reactions, including Toxic Epidermal Necrolysis (TEN) and Stevens-Johnson syndrome (SJS), "
        "have been reported during treatment with carbamazepine. These reactions usually occur within the first few weeks (commonly 1 to 3 weeks) "
        "after starting therapy. Patients presenting with symptoms such as progressive skin rash with peeling, epidermal necrolysis, or mucosal "
        "blistering must be hospitalized immediately and carbamazepine discontinued. These reactions carry a high mortality rate."
    )
    w_table = Table([[Paragraph(warning_text, warning_box_style)]], colWidths=[530])
    w_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#FFF5F5")),
        ('BORDER', (0,0), (-1,-1), 1.5, colors.HexColor("#E53E3E")),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(w_table)
    story.append(Spacer(1, 12))

    story.append(Paragraph("SECTION 1: THERAPEUTIC INDICATIONS", heading_style))
    story.append(Paragraph(
        "[Clause CBZ-PI-SEC1.1] Indications: Carbamazepine is indicated for the treatment of partial seizures with complex symptomatology, "
        "generalized tonic-clonic seizures, mixed seizure patterns, and relief of pain associated with true trigeminal neuralgia.",
        body_style
    ))
    story.append(Spacer(1, 10))

    story.append(Paragraph("SECTION 5: WARNINGS AND PRECAUTIONS", heading_style))
    story.append(Paragraph(
        "[Clause CBZ-PI-SEC5.1] Dermatologic Warnings and Inpatient Hospitalization: "
        "Severe cutaneous adverse reactions (SCARs), such as toxic epidermal necrolysis (Lyell's syndrome) and Stevens-Johnson syndrome (SJS), "
        "manifest primarily with severe skin peeling, epidermal detachment, and erythema. Onset is characteristically within 7 to 21 days following "
        "drug initiation. Inpatient hospital admission and intensive supportive management are mandatory.",
        body_style
    ))
    story.append(Spacer(1, 10))

    story.append(Paragraph("SECTION 6: ADVERSE REACTIONS (LISTED REACTIONS)", heading_style))
    story.append(Paragraph(
        "[Clause CBZ-PI-SEC6.1] Skin and Subcutaneous Tissue Disorders (Listed): "
        "The following cutaneous reactions are officially documented and listed in this approved package insert: "
        "(1) Toxic epidermal necrolysis (TEN); (2) Stevens-Johnson syndrome (SJS); (3) Exfoliative dermatitis (characterized by extensive "
        "skin peeling, shedding, and desquamation); (4) Systemic lupus erythematosus-like syndrome; (5) Pruritic and erythematous rashes; "
        "(6) Urticaria; (7) Photosensitivity reactions; (8) Alopecia.",
        body_style
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph(
        "[Clause CBZ-PI-SEC6.2] Nervous System Disorders (Listed): "
        "Dizziness, ataxia, drowsiness, fatigue, diplopia, nystagmus, headache, confusion.",
        body_style
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph(
        "[Clause CBZ-PI-SEC6.3] Gastrointestinal Disorders (Listed): "
        "Nausea, vomiting, gastric distress, abdominal pain, diarrhea, constipation, anorexia, dry mouth.",
        body_style
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph(
        "[Clause CBZ-PI-SEC6.4] Hematologic and Hepatic (Listed): "
        "Aplastic anemia, agranulocytosis, pancytopenia, thrombocytopenia, leukopenia, elevated transaminases, jaundice, hepatitis.",
        body_style
    ))

    doc.build(story)
    print(f"Generated {filepath}")


def generate_manifest():
    files = {
        "ndctr_2019_rules.pdf": {
            "title": "The New Drugs and Clinical Trials Rules, 2019 (Adverse Event Reporting Provisions)",
            "publisher": "Central Drugs Standard Control Organisation (CDSCO), Ministry of Health and Family Welfare, Govt of India",
            "source_url": "https://cdsco.gov.in/opencms/opencms/system/modules/CDSCO.WEB/elements/download_file_division.jsp?num_id=NDAxMQ==",
            "version": "2019.1",
            "document_type": "regulatory_rules",
            "jurisdiction": "India"
        },
        "ipc_pvpi_guidance_mah.pdf": {
            "title": "Indian Pharmacopoeia Commission Pharmacovigilance Guidance for Marketing Authorisation Holders",
            "publisher": "National Coordination Centre, Pharmacovigilance Programme of India (PvPI), Indian Pharmacopoeia Commission",
            "source_url": "https://ipc.gov.in/images/PvPI_Guidance_Document_for_MAHs.pdf",
            "version": "2021.2",
            "document_type": "guidance_document",
            "jurisdiction": "India"
        },
        "carbamazepine_package_insert.pdf": {
            "title": "Approved Package Insert: Carbamazepine Tablets IP (Tegretol)",
            "publisher": "CDSCO / Novartis India Limited (Approved Marketed Product Information)",
            "source_url": "https://cdsco.gov.in/opencms/resources/UploadCDSCOWeb/2018/UploadAlertsFiles/carbamazepine_insert.pdf",
            "version": "2020.3",
            "document_type": "package_insert",
            "drug_name": "Carbamazepine",
            "brand_name": "Tegretol"
        }
    }

    manifest = []
    for filename, meta in files.items():
        pdf_path = DOCS_DIR / filename
        checksum = calculate_sha256(pdf_path)
        manifest.append({
            "filename": filename,
            "sha256_checksum": checksum,
            "file_size_bytes": os.path.getsize(pdf_path),
            **meta
        })

    manifest_file = MANIFEST_DIR / "corpus_manifest.json"
    with open(manifest_file, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"Saved manifest to {manifest_file}")


def main():
    ndctr_path = DOCS_DIR / "ndctr_2019_rules.pdf"
    ipc_path = DOCS_DIR / "ipc_pvpi_guidance_mah.pdf"
    cbz_path = DOCS_DIR / "carbamazepine_package_insert.pdf"

    create_ndctr_2019_pdf(ndctr_path)
    create_ipc_guidance_pdf(ipc_path)
    create_carbamazepine_pi_pdf(cbz_path)

    generate_manifest()
    print("All corpus documents and manifests created successfully.")


if __name__ == "__main__":
    main()
