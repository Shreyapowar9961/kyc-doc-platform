#!/usr/bin/env python3
"""Synthetic KYC and Loan Document Data Generator CLI.

Adheres strictly to BRD v2.0 Section 18:
- Generates balanced 9-class dataset across 3 splits (train, val, test)
- Strict template-held-out isolation (test templates never appear in train/val)
- 3 OCR noise levels (0=clean, 1=light, 2=heavy)
- Fictional Indian entities only (fictional banks, IFSC starting FAKE000, Aadhaar starting with 0/1)
- Renders sample PNG/PDF files and planted demo mismatch sets
"""

import argparse
import csv
import json
import os
import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from kyc_gen.fake import SyntheticDataGenerator
from kyc_gen.noise import inject_noise
from kyc_gen.registry import CLASSES, TEMPLATE_REGISTRY, get_templates_for_class


def render_text_to_image_and_pdf(text: str, png_path: str, pdf_path: str):
    """Renders raw document text to an image and corresponding PDF for OCR testing."""
    img_width, img_height = 800, 1050
    image = Image.new("RGB", (img_width, img_height), color=(255, 255, 255))
    draw = ImageDraw.Draw(image)

    # Use default bitmap font
    font = ImageFont.load_default()

    margin = 40
    y = margin
    for line in text.split("\n"):
        if y > img_height - 40:
            break
        draw.text((margin, y), line, fill=(10, 10, 10), font=font)
        y += 18

    os.makedirs(os.path.dirname(png_path), exist_ok=True)
    image.save(png_path, "PNG")

    os.makedirs(os.path.dirname(pdf_path), exist_ok=True)
    image.convert("RGB").save(pdf_path, "PDF", resolution=100.0)


def generate_dataset(
    output_dir: str,
    samples_per_class: int = 40,
    seed: int = 42,
    force: bool = False,
    render_count: int = 5,
):
    out_path = Path(output_dir)
    proc_csv = out_path / "processed" / "kyc_classification.csv"

    if proc_csv.exists() and not force:
        print(f"Error: Output file '{proc_csv}' already exists. Use --force to overwrite.")
        sys.exit(1)

    # Prepare directories
    (out_path / "processed").mkdir(parents=True, exist_ok=True)
    (out_path / "ground_truth").mkdir(parents=True, exist_ok=True)
    (out_path / "rendered").mkdir(parents=True, exist_ok=True)
    (out_path / "demo_set").mkdir(parents=True, exist_ok=True)

    for cls in CLASSES:
        (out_path / "samples" / cls).mkdir(parents=True, exist_ok=True)

    rng = random.Random(seed)
    fake = SyntheticDataGenerator(rng)

    all_records = []
    manifest = {
        "seed": seed,
        "classes": CLASSES,
        "samples_per_class": samples_per_class,
        "splits": {"train": 0, "val": 0, "test": 0},
        "templates": {},
    }

    sample_counter = 1

    print(f"Starting generation for {len(CLASSES)} classes ({samples_per_class} per class)...")

    for cls in CLASSES:
        templates = TEMPLATE_REGISTRY[cls]
        # Split templates: train (3), val (1), test (2)
        train_tmpl = [t for t in templates if t[1] == "train"]
        val_tmpl = [t for t in templates if t[1] == "val"]
        test_tmpl = [t for t in templates if t[1] == "test"]

        # Allocate counts per split (roughly 60% train, 15% val, 25% test)
        n_train = int(samples_per_class * 0.60)
        n_val = int(samples_per_class * 0.15)
        n_test = samples_per_class - n_train - n_val

        split_allocations = [
            ("train", train_tmpl, n_train),
            ("val", val_tmpl, n_val),
            ("test", test_tmpl, n_test),
        ]

        rendered_for_class = 0

        for split_name, tmpl_pool, count in split_allocations:
            for i in range(count):
                sample_id = f"kyc_{sample_counter:05d}"
                sample_counter += 1

                # Select template from allowable pool for this split
                tmpl_id, _, tmpl_fn = rng.choice(tmpl_pool)

                # Generate raw content and ground truth
                raw_text, gt_data = tmpl_fn(fake)

                # Assign noise level: level 0 (clean), 1 (light OCR), 2 (heavy OCR)
                noise_lvl = rng.choice([0, 1, 2])
                final_text = inject_noise(raw_text, noise_lvl, rng)

                # Save sample text
                text_path = out_path / "samples" / cls / f"{sample_id}.txt"
                with open(text_path, "w", encoding="utf-8") as f:
                    f.write(final_text)

                # Save ground truth
                gt_path = out_path / "ground_truth" / f"{sample_id}.json"
                gt_payload = {
                    "sample_id": sample_id,
                    "label": cls,
                    "template_id": tmpl_id,
                    "split": split_name,
                    "noise_level": noise_lvl,
                    "fields": gt_data,
                }
                with open(gt_path, "w", encoding="utf-8") as f:
                    json.dump(gt_payload, f, indent=2)

                # Optionally render sample to image/PDF for OCR testing
                if rendered_for_class < render_count:
                    png_p = str(out_path / "rendered" / f"{cls}_{sample_id}.png")
                    pdf_p = str(out_path / "rendered" / f"{cls}_{sample_id}.pdf")
                    render_text_to_image_and_pdf(final_text, png_p, pdf_p)
                    rendered_for_class += 1

                record = {
                    "sample_id": sample_id,
                    "text": final_text.replace("\r", " ").replace("\n", " "),
                    "label": cls,
                    "template_id": tmpl_id,
                    "noise_level": noise_lvl,
                    "split": split_name,
                }
                all_records.append(record)
                manifest["splits"][split_name] += 1
                manifest["templates"][tmpl_id] = manifest["templates"].get(tmpl_id, 0) + 1

    # Write processed CSV
    with open(proc_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f, fieldnames=["sample_id", "text", "label", "template_id", "noise_level", "split"]
        )
        writer.writeheader()
        writer.writerows(all_records)

    # ─── Render Demo Application Sets ─────────────────────────────────────────
    print("Rendering Demo Application Sets (clean, name-mismatch, DOB-mismatch)...")
    demo_dir = out_path / "demo_set"

    # 1. Clean Set: Consistent identity across PAN, Aadhaar, Salary slip
    clean_name = "ARJUN VERMA"
    clean_dob = "15/07/1988"
    pan_clean = fake.pan_number()
    raw_aadh_clean, masked_aadh_clean = fake.synthetic_aadhaar()

    clean_pan_text = (
        "INCOME TAX DEPARTMENT\nGOVT. OF INDIA\n"
        f"Permanent Account Number Card\n{pan_clean}\n"
        f"Name\n{clean_name}\nFather's Name\nSURESH VERMA\n"
        f"Date of Birth\n{clean_dob}\nSignature"
    )
    clean_aadh_text = (
        "GOVERNMENT OF INDIA\nUNIQUE IDENTIFICATION AUTHORITY OF INDIA\n"
        f"Name: {clean_name}\nDOB: {clean_dob}\nGender: MALE\n"
        f"Address: Flat 204, Park Avenue, Pune, Maharashtra - 411001\n\n"
        f"{raw_aadh_clean[:4]} {raw_aadh_clean[4:8]} {raw_aadh_clean[8:]}\n"
        "Mera Aadhaar, Meri Pehchan"
    )
    clean_salary_text = (
        f"{fake.employer_name()}\nPAYSLIP FOR MARCH 2026\n"
        f"Employee Name: {clean_name}\nPAN: {pan_clean}\n"
        f"Designation: Lead Architect\nBasic: 65,000 | HRA: 26,000 | Gross: 91,000\n"
        "NET PAY: INR 82,500\nElectronically verified"
    )
    render_text_to_image_and_pdf(
        clean_pan_text,
        str(demo_dir / "clean_pan.png"),
        str(demo_dir / "clean_pan.pdf"),
    )
    render_text_to_image_and_pdf(
        clean_aadh_text,
        str(demo_dir / "clean_aadhaar.png"),
        str(demo_dir / "clean_aadhaar.pdf"),
    )
    render_text_to_image_and_pdf(
        clean_salary_text,
        str(demo_dir / "clean_salary.png"),
        str(demo_dir / "clean_salary.pdf"),
    )

    # 2. Name Mismatch Set: PAN has RAMESH KUMAR, Salary slip has RAJESH KUMAR
    pan_mismatch_text = (
        "INCOME TAX DEPARTMENT\nGOVT. OF INDIA\n"
        f"Permanent Account Number Card\n{fake.pan_number()}\n"
        "Name\nRAMESH KUMAR\nFather's Name\nANAND KUMAR\n"
        "Date of Birth\n12/04/1985\nSignature"
    )
    salary_mismatch_text = (
        f"{fake.employer_name()}\nPAYSLIP FOR MARCH 2026\n"
        "Employee Name: RAJESH KUMAR\n"
        "Designation: Operations Executive\nGross: 55,000 | NET PAY: INR 48,000"
    )
    render_text_to_image_and_pdf(
        pan_mismatch_text,
        str(demo_dir / "mismatch_name_pan.png"),
        str(demo_dir / "mismatch_name_pan.pdf"),
    )
    render_text_to_image_and_pdf(
        salary_mismatch_text,
        str(demo_dir / "mismatch_name_salary.png"),
        str(demo_dir / "mismatch_name_salary.pdf"),
    )

    # 3. DOB Mismatch Set: PAN has 14/05/1990, Aadhaar has 20/08/1992
    raw_aadh_dob, _ = fake.synthetic_aadhaar()
    pan_dob_text = (
        "INCOME TAX DEPARTMENT\nGOVT. OF INDIA\n"
        f"Permanent Account Number Card\n{fake.pan_number()}\n"
        "Name\nPRIYA PATIL\nDate of Birth\n14/05/1990\nSignature"
    )
    aadh_dob_text = (
        "UNIQUE IDENTIFICATION AUTHORITY OF INDIA\n"
        "Name: PRIYA PATIL\nDOB: 20/08/1992\n"
        f"UID: {raw_aadh_dob[:4]} {raw_aadh_dob[4:8]} {raw_aadh_dob[8:]}"
    )
    render_text_to_image_and_pdf(
        pan_dob_text,
        str(demo_dir / "mismatch_dob_pan.png"),
        str(demo_dir / "mismatch_dob_pan.pdf"),
    )
    render_text_to_image_and_pdf(
        aadh_dob_text,
        str(demo_dir / "mismatch_dob_aadhaar.png"),
        str(demo_dir / "mismatch_dob_aadhaar.pdf"),
    )

    # Save manifest
    manifest["total_samples"] = len(all_records)
    manifest["demo_files"] = [
        "clean_pan.pdf",
        "clean_aadhaar.pdf",
        "clean_salary.pdf",
        "mismatch_name_pan.pdf",
        "mismatch_name_salary.pdf",
        "mismatch_dob_pan.pdf",
        "mismatch_dob_aadhaar.pdf",
    ]
    with open(out_path / "manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print(
        f"Done! Generated {len(all_records)} samples in '{output_dir}'. Manifest saved to manifest.json"
    )


def main():
    parser = argparse.ArgumentParser(description="Synthetic KYC Data Generator CLI")
    parser.add_argument(
        "--output-dir", default="data/kyc", help="Target output directory (default: data/kyc)"
    )
    parser.add_argument(
        "--samples-per-class",
        type=int,
        default=40,
        help="Number of samples to generate per class (default: 40)",
    )
    parser.add_argument("--seed", type=int, default=42, help="Random seed for determinism (default: 42)")
    parser.add_argument(
        "--force", action="store_true", help="Force overwrite of existing processed dataset"
    )
    parser.add_argument(
        "--render-count",
        type=int,
        default=5,
        help="Number of sample images and PDFs to render per class",
    )
    args = parser.parse_args()

    generate_dataset(
        output_dir=args.output_dir,
        samples_per_class=args.samples_per_class,
        seed=args.seed,
        force=args.force,
        render_count=args.render_count,
    )


if __name__ == "__main__":
    main()
