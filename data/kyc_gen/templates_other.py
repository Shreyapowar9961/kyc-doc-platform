# data/kyc_gen/templates_other.py
"""Other / Hard negative document templates (Utility Bill, Rental Agreement, Invoice, Cheque, Notes, Offer Letter)."""

from typing import Tuple, Dict, Any
from .fake import SyntheticDataGenerator

def _other_t1(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Residential Lease & Rental Agreement (Train Template)."""
    landlord = fake.full_name()
    tenant = fake.full_name()
    addr = fake.address()
    rent = fake.rng.randint(18000, 48000)

    text = (
        "RESIDENTIAL LEASE AND LICENCE AGREEMENT\n"
        "THIS DEED OF TENANCY AGREEMENT entered between:\n"
        f"PROPERTY OWNER: {landlord}\n"
        f"TENANT / OCCUPANT: {tenant}\n"
        f"PREMISES LOCATION: {addr['full']}\n"
        f"LEASE PERIOD: 11 Months commencing 01-Feb-2026\n"
        f"MONTHLY RENT: INR {rent:,} per month\n"
        f"SECURITY DEPOSIT: INR {rent * 3:,}\n"
        "TERMS: Residential occupancy only. Not valid as personal identity proof."
    )
    gt = {"tenant": tenant, "landlord": landlord, "doc_type": "rent_agreement"}
    return text, gt

def _other_t2(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Commercial Retail & Goods Tax Invoice (Train Template)."""
    supplier = "Global Industrial Hardware Solutions Ltd"
    buyer = fake.full_name()
    inv_no = f"INV-RET-{fake.rng.randint(1000, 9999)}"

    text = (
        f"ORIGINAL TAX INVOICE - {supplier}\n"
        f"Invoice Serial: {inv_no}   Date of Supply: 14/01/2026\n"
        f"Customer / Buyer: {buyer}\n"
        "GSTIN: 27AABCT8921M1Z5\n"
        "----------------------------------------------------------\n"
        "Description of Goods     Qty   Rate (INR)   Amount (INR)\n"
        "Heavy Duty Power Drill     2     4,200.00       8,400.00\n"
        "Tool Storage Cabinet       1    12,000.00      12,000.00\n"
        "----------------------------------------------------------\n"
        "Subtotal: INR 20,400.00\n"
        "CGST (9%): INR 1,836.00   SGST (9%): INR 1,836.00\n"
        "INVOICE TOTAL VALUE: INR 24,072.00\n"
        "COMMERCIAL PURCHASE VOUCHER"
    )
    gt = {"buyer": buyer, "doc_type": "invoice"}
    return text, gt

def _other_t3(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Monthly Utility Electricity Bill (Train Template)."""
    name = fake.full_name()
    addr = fake.address()
    ca_no = f"CA{fake.rng.randint(10000000, 99999999)}"
    units = fake.rng.randint(150, 420)
    amount = units * 7.5 + 310

    text = (
        "MAHARASHTRA STATE ELECTRICITY DISTRIBUTION COMPANY (MSEDCL)\n"
        "HT/LT ELECTRICITY CONSUMPTION BILL\n"
        f"Consumer Identification: {ca_no}\n"
        f"Consumer Name: {name}\n"
        f"Service Address: {addr['full']}\n"
        f"Units Billed: {units} kWh   Billing Cycle: JAN-FEB 2026\n"
        f"Total Bill Payable: INR {amount:.2f}\n"
        "Due Date: 28/02/2026\n"
        "Utility payment advice. Non-transferable."
    )
    gt = {"name": name, "doc_type": "utility_bill"}
    return text, gt

def _other_t4(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Bank Cheque Leaf (Validation Template)."""
    bank = fake.bank_name()
    payee = fake.full_name()
    amount = fake.rng.randint(5000, 50000)
    chq_no = f"{fake.rng.randint(100000, 999999)}"

    text = (
        f"{bank}\n"
        f"Date: 18/02/2026\n"
        f"PAY: {payee}  OR BEARER\n"
        f"SUM OF RUPEES: {amount:,} ONLY\n"
        f"INR: [ {amount:,}/- ]\n"
        f"ACCOUNT NO: {fake.account_number()}\n"
        f"|| {chq_no} || 400024012: 001928 || 29\n"
        "NEGOTIABLE INSTRUMENT - CHEQUE LEAF"
    )
    gt = {"payee": payee, "doc_type": "cheque"}
    return text, gt

def _other_t5(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Commercial Office Space Tenancy Deed (Held-out Test Template 1)."""
    landlord = fake.full_name()
    tenant = fake.full_name()
    addr = fake.address()
    rent = fake.rng.randint(25000, 80000)

    text = (
        "COMMERCIAL TENANCY CONTRACT & PREMISES LEASE DEED\n"
        "THIS INDENTURE OF LEASE executed between:\n"
        f"LESSOR / LANDLORD: {landlord}\n"
        f"LESSEE / TENANT: {tenant}\n"
        f"COMMERCIAL PREMISES: {addr['full']}\n"
        f"LEASE TENURE: 24 Months starting 01-March-2026\n"
        f"MONTHLY RENT CONSIDERATION: INR {rent:,} per month\n"
        f"SECURITY DEPOSIT HELD: INR {rent * 6:,}\n"
        "EXCLUSIVE OCCUPATION FOR COMMERCIAL IT OFFICE USE ONLY"
    )
    gt = {"tenant": tenant, "landlord": landlord, "doc_type": "rent_agreement"}
    return text, gt

def _other_t6(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """IT Consulting & Software Services Tax Invoice (Held-out Test Template 2)."""
    supplier = "Apex Cloud & Software Solutions Pvt Ltd"
    client = fake.full_name()
    inv_no = f"INV-SRV-{fake.rng.randint(1000, 9999)}"

    text = (
        f"TAX INVOICE FOR SERVICES - {supplier}\n"
        f"Invoice Ref: {inv_no}   Invoice Date: 20/01/2026\n"
        f"Client / Recipient: {client}\n"
        "GSTIN: 27AABCS4412K1Z9\n"
        "----------------------------------------------------------\n"
        "Service Description      Hours   Hourly Rate (INR)   Amount\n"
        "Cloud Infrastructure Setup  40       2,500.00      100,000.00\n"
        "Database Optimization       15       3,000.00       45,000.00\n"
        "----------------------------------------------------------\n"
        "Subtotal Services Value: INR 145,000.00\n"
        "Integrated GST (IGST 18%): INR 26,100.00\n"
        "NET INVOICE PAYABLE: INR 171,100.00\n"
        "TAX INVOICE UNDER GST ACT"
    )
    gt = {"client": client, "doc_type": "invoice"}
    return text, gt

OTHER_TEMPLATES = {
    "other_unknown": [
        ("other_t1", "train", _other_t1),
        ("other_t2", "train", _other_t2),
        ("other_t3", "train", _other_t3),
        ("other_t4", "val", _other_t4),
        ("other_t5", "test", _other_t5),
        ("other_t6", "test", _other_t6),
    ]
}
