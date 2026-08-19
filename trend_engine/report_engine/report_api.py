import sys
import json

from report_builder import build_report
from pdf_generator import generate_pdf


def main():
    if len(sys.argv) < 3:
        print(json.dumps({
            "success": False,
            "error": "Domain and year are required"
        }))
        sys.exit(1)

    domain = sys.argv[1]
    year = int(sys.argv[2])

    try:
        # Build report data
        report = build_report(domain, year)

        # Generate PDF
        pdf_path = generate_pdf(report)

        print(json.dumps({
            "success": True,
            "domain": domain,
            "year": year,
            "pdfPath": pdf_path
        }))

    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()