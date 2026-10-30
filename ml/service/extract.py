# ml/service/extract.py
"""Information Extraction module for KYC documents (R2).

Implements regex extraction per BRD v2.0 Section 17:
- PAN: [A-Z]{5}[0-9]{4}[A-Z]
- Aadhaar: 12 digits with Verhoeff check, returns masked XXXX-XXXX-1234
- Name: Labelled line patterns (Name:, Holder Name:, Name\n, Naam:)
- DOB: Labelled line patterns (DOB:, Date of Birth:, Janma Tithi:) normalized to ISO YYYY-MM-DD
"""

import re
from datetime import datetime
from typing import Dict, Any, Optional

# Verhoeff tables
_VERHOEFF_D = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
]

_VERHOEFF_P = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
]

def validate_verhoeff(num_str: str) -> bool:
    c = 0
    reversed_digits = [int(x) for x in reversed(num_str)]
    for i, digit in enumerate(reversed_digits):
        c = _VERHOEFF_D[c][_VERHOEFF_P[i % 8][digit]]
    return c == 0

def normalize_dob(dob_str: str) -> Optional[str]:
    """Converts DD/MM/YYYY or DD-MM-YYYY or YYYY-MM-DD to ISO YYYY-MM-DD."""
    clean_str = dob_str.strip().replace(".", "/").replace("-", "/")
    # Try parsing DD/MM/YYYY
    parts = clean_str.split("/")
    if len(parts) == 3:
        if len(parts[0]) == 4:  # YYYY/MM/DD
            return f"{parts[0]}-{int(parts[1]):02d}-{int(parts[2]):02d}"
        if len(parts[2]) == 4:  # DD/MM/YYYY
            return f"{parts[2]}-{int(parts[1]):02d}-{int(parts[0]):02d}"
    return None

def extract_pan(text: str) -> Optional[str]:
    """Extracts 10-character alphanumeric PAN."""
    match = re.search(r"\b([A-Z]{5}[0-9]{4}[A-Z])\b", text)
    if match:
        return match.group(1)
    return None

def extract_aadhaar(text: str, synthetic_mode: bool = True) -> Optional[str]:
    """Extracts 12-digit Aadhaar number and returns ONLY masked XXXX-XXXX-1234."""
    # Look for 4 digits + space/dash + 4 digits + space/dash + 4 digits (horizontal space/dash only)
    matches = re.finditer(r"\b(\d{4})[ -](\d{4})[ -](\d{4})\b", text)
    for m in matches:
        raw_num = f"{m.group(1)}{m.group(2)}{m.group(3)}"
        if len(raw_num) == 12:
            if not synthetic_mode and raw_num[0] in ('0', '1'):
                continue
            if validate_verhoeff(raw_num):
                last4 = raw_num[-4:]
                return f"XXXX-XXXX-{last4}"

    # Also check continuous 12 digits
    continuous = re.finditer(r"\b(\d{12})\b", text)
    for m in continuous:
        raw_num = m.group(1)
        if validate_verhoeff(raw_num):
            last4 = raw_num[-4:]
            return f"XXXX-XXXX-{last4}"

    # Also check for already masked format
    masked_match = re.search(r"\b(?:[xX]{4}[ -]){2}(\d{4})\b", text)
    if masked_match:
        return f"XXXX-XXXX-{masked_match.group(1)}"

    return None

def extract_name(text: str) -> Optional[str]:
    """Extracts candidate person name from labelled lines."""
    # Check surname + given name (passport style)
    m_pass = re.search(r"Surname:\s*([A-Za-z]+)\s*[\r\n]+Given Name(?:\(s\))?:\s*([A-Za-z\s]+)", text, re.IGNORECASE)
    if m_pass:
        surname = m_pass.group(1).strip()
        given = m_pass.group(2).strip().splitlines()[0]
        return f"{given} {surname}".upper()

    patterns = [
        r"(?:Customer Name|Account Holder|Primary Account Holder|Holder Name|Elector'?s Name|Elector Name|Employee Name|Staff Member|Applicant Full Name|Applicant Name|Bearer|Cardholder|Taxpayer Name|Paid to|This is to certify that Mr\./Ms\.|This is to certify that Shri/Smt|This is to certify that)\s*[:/]?\s*([A-Za-z ]{2,35})(?:[\r\n]|$)",
        r"(?:Name / Naam|Naam / Name|Full Name|Name|Naam)\s*[:/]?\s*([A-Za-z ]{2,35})(?:[\r\n]|$)",
        r"(?:Name / Naam|Naam / Name|Full Name|Name|Naam)\s*[\r\n]+\s*([A-Za-z ]{2,35})(?:[\r\n]|$)",
        r"(?:To,)\s*[\r\n]+\s*([A-Za-z ]{2,35})(?:[\r\n]|$)",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            candidate = m.group(1).strip()
            candidate = re.sub(r"\s+", " ", candidate)
            words = candidate.split()
            # Remove title prefixes and non-names
            clean_words = []
            for w in words:
                up = w.upper()
                if up in ('MR', 'MS', 'MRS', 'SHRI', 'SMT', 'DR', 'SH', 'IS', 'A', 'PERMANENT', 'EMPLOYEE'):
                    continue
                if up in ('DOB', 'DATE', 'OF', 'BIRTH', 'FATHER', 'C/O', 'GENDER', 'SEX', 'MALE', 'FEMALE'):
                    break
                clean_words.append(w)
            if 1 <= len(clean_words) <= 4 and all(w.isalpha() for w in clean_words):
                return " ".join(clean_words).upper()
    return None

def extract_dob(text: str) -> Optional[str]:
    """Extracts Date of Birth and returns ISO string (YYYY-MM-DD)."""
    patterns = [
        r"(?:DOB|Date of Birth|Birth Date|Janma Tarikh|Janma Tithi|Aayu / DOB|Janma Tarikh / DOB)\s*(?:\([^\)]*\))?\s*[:/]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4})",
        r"(?:DOB|Date of Birth)\s*[\r\n]+\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4})",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            raw_dob = m.group(1)
            iso = normalize_dob(raw_dob)
            if iso:
                return iso
    return None

def extract_fields(text: str, doc_class: str = None) -> Dict[str, Any]:
    """Extracts all recognized KYC fields from document text."""
    fields = {}

    pan = extract_pan(text)
    if pan:
        fields["pan"] = pan

    aadhaar = extract_aadhaar(text, synthetic_mode=True)
    if aadhaar:
        fields["aadhaar_masked"] = aadhaar

    name = extract_name(text)
    if name:
        fields["name"] = name

    dob = extract_dob(text)
    if dob:
        fields["dob"] = dob

    return fields
