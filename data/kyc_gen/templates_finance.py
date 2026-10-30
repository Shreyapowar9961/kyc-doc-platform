# data/kyc_gen/templates_finance.py
"""Financial document templates (Bank Statement, Salary Slip, Income Proof)."""

from typing import Tuple, Dict, Any
from .fake import SyntheticDataGenerator

# ─── Bank Statement Templates ─────────────────────────────────────────────────

def _bank_t1(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Standard Detailed Bank Statement with tabular transactions."""
    bank = fake.bank_name()
    name = fake.full_name()
    acc_no = fake.account_number()
    ifsc = fake.ifsc_code()
    addr = fake.address()

    text = (
        f"{bank}\n"
        "STATEMENT OF ACCOUNT (SAVINGS ACCOUNT)\n"
        f"Customer Name: {name}\n"
        f"Account Number: {acc_no}\n"
        f"IFSC Code: {ifsc}\n"
        f"Branch Address: {addr['city']} Main Branch\n"
        "Statement Period: 01/01/2026 to 31/01/2026\n"
        "----------------------------------------------------------------------\n"
        "Date        Description                  Chq/Ref       Debit     Credit    Balance\n"
        "01/01/2026  OPENING BALANCE                                                45,210.00\n"
        "03/01/2026  UPI/9182910291/Merchant                    1,250.00            43,960.00\n"
        "05/01/2026  NEFT/SALARY/ACME CORP                                78,500.00 122,460.00\n"
        "12/01/2026  ATM CASH WDL                 ATM1029       5,000.00           117,460.00\n"
        "25/01/2026  ELECTRICITY BILL PAYMENT                   2,140.00           115,320.00\n"
        "31/01/2026  CLOSING BALANCE                                               115,320.00\n"
        "----------------------------------------------------------------------\n"
        "This is a system generated statement and does not require a physical signature."
    )
    gt = {"name": name, "account_number": acc_no, "ifsc": ifsc, "bank_name": bank}
    return text, gt

def _bank_t2(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Monthly e-Statement format."""
    bank = fake.bank_name()
    name = fake.full_name()
    acc_no = fake.account_number()
    ifsc = fake.ifsc_code()

    text = (
        f"{bank} - Retail Banking Division\n"
        "ACCOUNT E-STATEMENT SUMMARY\n"
        f"Primary Account Holder: {name}\n"
        f"Account Type: Regular Savings   A/C No: {acc_no}\n"
        f"Branch IFSC: {ifsc}\n"
        "Total Credits: INR 84,200.00   Total Debits: INR 31,500.00\n"
        "Monthly Average Balance: INR 52,100.00\n"
        "Transaction entries recorded for the current tax quarter."
    )
    gt = {"name": name, "account_number": acc_no, "ifsc": ifsc, "bank_name": bank}
    return text, gt

def _bank_t3(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Bank Passbook First Page Scan."""
    bank = fake.bank_name()
    name = fake.full_name()
    acc_no = fake.account_number()
    ifsc = fake.ifsc_code()
    addr = fake.address()

    text = (
        f"{bank} PASSBOOK\n"
        "ACCOUNT PARTICULARS\n"
        f"Account Holder: {name}\n"
        f"Account No: {acc_no}\n"
        f"Customer ID: {fake.rng.randint(10000000, 99999999)}\n"
        f"IFSC: {ifsc}\n"
        f"Address: {addr['full']}\n"
        "Nomination Registered: YES\n"
        "Date of Issue: 10/02/2022"
    )
    gt = {"name": name, "account_number": acc_no, "ifsc": ifsc, "bank_name": bank}
    return text, gt

def _bank_t4(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Current Account Business Statement."""
    bank = fake.bank_name()
    name = fake.full_name()
    acc_no = fake.account_number()
    ifsc = fake.ifsc_code()

    text = (
        f"{bank} - Commercial & SME Banking\n"
        "CURRENT ACCOUNT STATEMENT\n"
        f"Account Title: {name}\n"
        f"Account Number: {acc_no}\n"
        f"RTGS/NEFT IFSC: {ifsc}\n"
        "Period: Last 30 Days\n"
        "Net Operating Balance: INR 312,450.00\n"
        "Statement generated online via Corporate Net Banking."
    )
    gt = {"name": name, "account_number": acc_no, "ifsc": ifsc, "bank_name": bank}
    return text, gt

def _bank_t5(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Held-out Test Template 1 - Mobile Banking App PDF Export."""
    bank = fake.bank_name()
    name = fake.full_name()
    acc_no = fake.account_number()
    ifsc = fake.ifsc_code()

    text = (
        f"{bank} MOBILE BANKING REPORT\n"
        "CONSOLIDATED ACCOUNT LEDGER STATEMENT\n"
        f"NAME: {name}\n"
        f"ACCOUNT IDENTIFIER: {acc_no}\n"
        f"BANK CODE / IFSC: {ifsc}\n"
        "TRANSACTION HISTORY (SUMMARY EXPORT)\n"
        "Salary Credit: +82,000.00 | EMI Outflow: -21,500.00\n"
        "CLOSING AVAILABLE BALANCE: INR 64,800.00\n"
        "SECURE ELECTRONIC DOCUMENT ISSUED BY BANK"
    )
    gt = {"name": name, "account_number": acc_no, "ifsc": ifsc, "bank_name": bank}
    return text, gt

def _bank_t6(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Held-out Test Template 2 - Over-the-counter Branch Ledger Extract."""
    bank = fake.bank_name()
    name = fake.full_name()
    acc_no = fake.account_number()
    ifsc = fake.ifsc_code()

    text = (
        f"{bank} - BRANCH OPERATIONS COUNTER\n"
        "OFFICIAL BANK ACCOUNT STATEMENT EXTRACT\n"
        f"DEPOSITOR NAME: {name}\n"
        f"SAVINGS ACC: {acc_no}\n"
        f"ROUTING IFSC: {ifsc}\n"
        "CLEARED BALANCE AS ON DATE: INR 95,430.00\n"
        "VERIFIED BY BRANCH HEAD"
    )
    gt = {"name": name, "account_number": acc_no, "ifsc": ifsc, "bank_name": bank}
    return text, gt

# ─── Salary Slip Templates ────────────────────────────────────────────────────

def _salary_t1(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Corporate Corporate Monthly Payslip."""
    employer = fake.employer_name()
    name = fake.full_name()
    pan = fake.pan_number()
    emp_id = f"EMP{fake.rng.randint(1000, 9999)}"
    month = fake.rng.choice(["January 2026", "February 2026", "March 2026", "April 2026"])

    basic = fake.rng.randint(35000, 75000)
    hra = int(basic * 0.4)
    special = fake.rng.randint(15000, 30000)
    gross = basic + hra + special
    pf = int(basic * 0.12)
    tax = fake.rng.randint(2000, 8000)
    total_ded = pf + tax
    net = gross - total_ded

    text = (
        f"{employer}\n"
        f"PAYSLIP FOR THE MONTH OF {month.upper()}\n"
        f"Employee Name: {name}      Employee ID: {emp_id}\n"
        f"Designation: Senior Analyst      PAN: {pan}\n"
        f"Bank Account: {fake.account_number()}   Days Worked: 30\n"
        "------------------------------------------------------------------\n"
        "EARNINGS (INR)                     DEDUCTIONS (INR)\n"
        f"Basic Salary:        {basic:>8}     Provident Fund:     {pf:>8}\n"
        f"House Rent Allowance:{hra:>8}     Professional Tax:   {tax:>8}\n"
        f"Special Allowance:   {special:>8}\n"
        "------------------------------------------------------------------\n"
        f"Gross Earnings:      {gross:>8}     Total Deductions:   {total_ded:>8}\n"
        f"NET PAY: INR {net:,}\n"
        "------------------------------------------------------------------\n"
        "This is an electronically generated document."
    )
    gt = {"name": name, "employer": employer, "pan": pan, "net_salary": str(net)}
    return text, gt

def _salary_t2(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Simple Small Enterprise Salary Slip."""
    employer = fake.employer_name()
    name = fake.full_name()
    emp_code = f"SE/{fake.rng.randint(100, 999)}"
    salary = fake.rng.randint(40000, 90000)

    text = (
        f"{employer}\n"
        "SALARY VOUCHER / SLIP\n"
        f"Paid to: {name}   (Code: {emp_code})\n"
        "Department: Technical Services\n"
        f"Monthly Fixed Remuneration: INR {salary:,}\n"
        "Standard Deductions: INR 2,500\n"
        f"Net Disbursed: INR {salary - 2500:,}\n"
        "Authorised Signatory - Accounts"
    )
    gt = {"name": name, "employer": employer, "net_salary": str(salary - 2500)}
    return text, gt

def _salary_t3(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """IT Services Firm Monthly Salary Statement."""
    employer = fake.employer_name()
    name = fake.full_name()
    pan = fake.pan_number()
    raw_dob = fake.dob()
    iso_dob = fake.dob_iso(raw_dob)

    text = (
        f"{employer} Human Capital Division\n"
        "MONTHLY REMUNERATION ADVICE\n"
        f"Staff Member: {name}\n"
        f"PAN Number: {pan}\n"
        f"Date of Birth: {raw_dob}\n"
        "Base Pay: 55,000 | Allowances: 22,000 | Gross: 77,000\n"
        "Income Tax Withholding (TDS): 4,500\n"
        "Take Home Salary: INR 72,500.00"
    )
    gt = {"name": name, "employer": employer, "pan": pan, "dob": iso_dob}
    return text, gt

def _salary_t4(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Detailed Annual / Monthly Salary Certificate."""
    employer = fake.employer_name()
    name = fake.full_name()

    text = (
        f"SALARY CERTIFICATE - {employer}\n"
        f"This is to certify that Mr./Ms. {name} is a permanent employee.\n"
        "Current Monthly Cost to Company: INR 85,000\n"
        "Monthly In-Hand Net Salary: INR 68,000\n"
        "Issued for the purpose of loan evaluation."
    )
    gt = {"name": name, "employer": employer}
    return text, gt

def _salary_t5(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Held-out Test Template 1 - Payroll HRMS Export."""
    employer = fake.employer_name()
    name = fake.full_name()
    pan = fake.pan_number()

    text = (
        f"HRMS ENTERPRISE PAYSLIP - {employer}\n"
        f"EMPLOYEE FULL NAME: {name}\n"
        f"PERMANENT ACCOUNT NUMBER: {pan}\n"
        "PAY PERIOD: MARCH 2026\n"
        "GROSS COMPENSATION: INR 92,000.00\n"
        "STATUTORY DEDUCTIONS: INR 8,400.00\n"
        "NET SALARY CREDITED: INR 83,600.00\n"
        "PAYROLL SYSTEM COMPUTER GENERATED"
    )
    gt = {"name": name, "employer": employer, "pan": pan}
    return text, gt

def _salary_t6(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Held-out Test Template 2 - Consulting Firm Compensation Slip."""
    employer = fake.employer_name()
    name = fake.full_name()

    text = (
        f"MONTHLY COMPENSATION ADVICE SLIP\n"
        f"ORGANISATION: {employer}\n"
        f"CONSULTANT / EMPLOYEE: {name}\n"
        "REMUNERATION PACKAGE SUMMARY\n"
        "FIXED EARNINGS: INR 62,500.00\n"
        "TOTAL DISBURSEMENT: INR 58,200.00"
    )
    gt = {"name": name, "employer": employer}
    return text, gt

# ─── Income Proof Templates ───────────────────────────────────────────────────

def _income_t1(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Income Tax Return (ITR-V) Acknowledgement."""
    name = fake.full_name()
    pan = fake.pan_number()
    ack_no = f"ITR{fake.rng.randint(1000000000, 9999999999)}"
    income = fake.rng.randint(650000, 1800000)

    text = (
        "INCOME TAX DEPARTMENT - GOVERNMENT OF INDIA\n"
        "INDIAN INCOME TAX RETURN ACKNOWLEDGEMENT (ITR-V)\n"
        "Assessment Year: 2025-26\n"
        f"PAN: {pan}\n"
        f"Name: {name}\n"
        f"Acknowledgement Number: {ack_no}\n"
        f"Gross Total Income: INR {income:,}\n"
        f"Total Income: INR {income - 50000:,}\n"
        "Taxes Paid: INR 45,200\n"
        "Filing Status: Verified electronically under Section 139"
    )
    gt = {"name": name, "pan": pan, "gross_income": str(income)}
    return text, gt

def _income_t2(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Form 16 Part A TDS Certificate."""
    name = fake.full_name()
    employer = fake.employer_name()
    pan = fake.pan_number()
    raw_dob = fake.dob()
    iso_dob = fake.dob_iso(raw_dob)

    text = (
        "FORM NO. 16 - PART A\n"
        "Certificate under section 203 of the Income-tax Act, 1961 for tax deducted at source\n"
        f"Name and Address of Employer: {employer}\n"
        f"Name of Employee: {name}\n"
        f"PAN of Deductee (Employee): {pan}\n"
        f"DOB: {raw_dob}\n"
        "Assessment Year: 2025-26\n"
        "Period with the Employer: From 01-Apr-2024 to 31-Mar-2025\n"
        "Total Tax Deducted and Deposited: INR 62,400"
    )
    gt = {"name": name, "pan": pan, "dob": iso_dob, "employer": employer}
    return text, gt

def _income_t3(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Form 16 Part B Salary Breakdown & Taxable Income."""
    name = fake.full_name()
    pan = fake.pan_number()
    income = fake.rng.randint(700000, 1500000)

    text = (
        "FORM NO. 16 - PART B (ANNEXURE)\n"
        "Details of Salary Paid and any other income and tax deducted\n"
        f"Employee Name: {name}\n"
        f"PAN: {pan}\n"
        f"1. Gross Salary under Section 17(1): INR {income:,}\n"
        "2. Standard Deduction u/s 16(ia): INR 50,000\n"
        f"3. Total Taxable Income: INR {income - 50000:,}\n"
        "Certified by Authorised Officer"
    )
    gt = {"name": name, "pan": pan, "gross_income": str(income)}
    return text, gt

def _income_t4(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Tahsildar Issued State Revenue Income Certificate."""
    name = fake.full_name()
    father = fake.father_name(name.split()[-1])
    addr = fake.address()
    annual_income = fake.rng.randint(300000, 800000)

    text = (
        "GOVERNMENT OF MAHARASHTRA - REVENUE DEPARTMENT\n"
        "OFFICE OF THE TAHSILDAR\n"
        "INCOME CERTIFICATE\n"
        f"This is to certify that Shri/Smt {name}\n"
        f"Son/Daughter of {father}\n"
        f"Resident of: {addr['full']}\n"
        f"has an annual family income of INR {annual_income:,}\n"
        "(Rupees in words from all sources)\n"
        "Certificate Reference: REV/INC/2026/8912\n"
        "Issued under Official Seal"
    )
    gt = {"name": name, "father_name": father, "annual_income": str(annual_income)}
    return text, gt

def _income_t5(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Held-out Test Template 1 - Annual Information Statement (AIS) Income Proof."""
    name = fake.full_name()
    pan = fake.pan_number()
    income = fake.rng.randint(800000, 2000000)

    text = (
        "DIRECTORATE OF INCOME TAX (SYSTEMS) - GOVT OF INDIA\n"
        "INCOME PROOF / ANNUAL INFORMATION STATEMENT (AIS) SUMMARY\n"
        f"TAXPAYER NAME: {name}\n"
        f"PERMANENT ACCOUNT NUMBER: {pan}\n"
        "ASSESSMENT YEAR: 2025-26 (FINANCIAL YEAR: 2024-25)\n"
        f"CERTIFIED GROSS TOTAL INCOME: INR {income:,}\n"
        f"NET TAXABLE INCOME ASSESSED: INR {income - 50000:,}\n"
        "OFFICIAL CBDT ANNUAL TAX AND INCOME RECORD\n"
        "VALID PROOF OF ANNUAL INCOME"
    )
    gt = {"name": name, "pan": pan, "gross_income": str(income)}
    return text, gt

def _income_t6(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Held-out Test Template 2 - State Revenue Office Official Annual Income Certificate."""
    name = fake.full_name()
    father = fake.father_name(name.split()[-1])
    addr = fake.address()
    income = fake.rng.randint(450000, 1200000)

    text = (
        "OFFICE OF THE SUB-DIVISIONAL MAGISTRATE & REVENUE COMMISSIONER\n"
        "OFFICIAL CERTIFICATE OF ANNUAL INCOME\n"
        f"This is to certify that: {name}\n"
        f"Father's Name: {father}\n"
        f"Permanent Residence: {addr['full']}\n"
        f"CERTIFIED ANNUAL INCOME: INR {income:,} per annum\n"
        "(Rupees in words from agriculture, business, and employment)\n"
        "CERTIFICATE SERIAL: SDM/REV/INC/2026/4102\n"
        "ISSUED UNDER SEAL AS RECOGNISED PROOF OF INCOME"
    )
    gt = {"name": name, "father_name": father, "annual_income": str(income)}
    return text, gt

FINANCE_TEMPLATES = {
    "bank_statement": [
        ("bank_t1", "train", _bank_t1),
        ("bank_t2", "train", _bank_t2),
        ("bank_t3", "train", _bank_t3),
        ("bank_t4", "val", _bank_t4),
        ("bank_t5", "test", _bank_t5),
        ("bank_t6", "test", _bank_t6),
    ],
    "salary_slip": [
        ("salary_t1", "train", _salary_t1),
        ("salary_t2", "train", _salary_t2),
        ("salary_t3", "train", _salary_t3),
        ("salary_t4", "val", _salary_t4),
        ("salary_t5", "test", _salary_t5),
        ("salary_t6", "test", _salary_t6),
    ],
    "income_proof": [
        ("income_t1", "train", _income_t1),
        ("income_t2", "train", _income_t2),
        ("income_t3", "train", _income_t3),
        ("income_t4", "val", _income_t4),
        ("income_t5", "test", _income_t5),
        ("income_t6", "test", _income_t6),
    ],
}
