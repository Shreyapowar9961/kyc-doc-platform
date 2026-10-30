# data/kyc_gen/templates_identity.py
"""Identity document templates (Aadhaar, PAN, Passport, Voter ID, Driving Licence)."""

from typing import Tuple, Dict, Any
from .fake import SyntheticDataGenerator

def _aadhaar_t1(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Standard UIDAI Government of India format."""
    name = fake.full_name()
    raw_dob = fake.dob()
    iso_dob = fake.dob_iso(raw_dob)
    gender = fake.rng.choice(["MALE", "FEMALE"])
    addr = fake.address()
    raw_aadhaar, masked_aadhaar = fake.synthetic_aadhaar()
    
    text = (
        "GOVERNMENT OF INDIA\n"
        "UNIQUE IDENTIFICATION AUTHORITY OF INDIA\n"
        f"Name: {name}\n"
        f"DOB: {raw_dob}\n"
        f"Gender: {gender}\n"
        f"Address: {addr['full']}\n\n"
        f"{raw_aadhaar[:4]} {raw_aadhaar[4:8]} {raw_aadhaar[8:]}\n"
        "Mera Aadhaar, Meri Pehchan"
    )
    gt = {"name": name, "dob": iso_dob, "aadhaar_masked": masked_aadhaar, "gender": gender}
    return text, gt

def _aadhaar_t2(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """e-Aadhaar Letter download format."""
    name = fake.full_name()
    raw_dob = fake.dob()
    iso_dob = fake.dob_iso(raw_dob)
    father = fake.father_name(name.split()[-1])
    raw_aadhaar, masked_aadhaar = fake.synthetic_aadhaar()
    addr = fake.address()

    text = (
        "To,\n"
        f"{name}\n"
        f"C/O: {father}\n"
        f"{addr['line1']}\n"
        f"{addr['line2']}\n\n"
        "Enrolment No: 1045/88210/12492\n"
        "Your Aadhaar No. :\n"
        f"{raw_aadhaar[:4]} {raw_aadhaar[4:8]} {raw_aadhaar[8:]}\n"
        f"Date of Birth : {raw_dob}\n"
        "Digitally signed by UIDAI\n"
        "Aadhaar is a proof of identity, not of citizenship."
    )
    gt = {"name": name, "dob": iso_dob, "aadhaar_masked": masked_aadhaar, "father_name": father}
    return text, gt

def _aadhaar_t3(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """PVC Aadhaar Card compact wallet format."""
    name = fake.full_name()
    raw_dob = fake.dob()
    iso_dob = fake.dob_iso(raw_dob)
    gender = fake.rng.choice(["Male", "Female"])
    raw_aadhaar, masked_aadhaar = fake.synthetic_aadhaar()

    text = (
        "Bharat Sarkar - Government of India\n"
        f"Name / Naam: {name}\n"
        f"Janma Tarikh / DOB: {raw_dob}\n"
        f"Ling / Gender: {gender}\n"
        f"{raw_aadhaar[:4]} {raw_aadhaar[4:8]} {raw_aadhaar[8:]}\n"
        "VID: 9182 3819 0192 4819"
    )
    gt = {"name": name, "dob": iso_dob, "aadhaar_masked": masked_aadhaar}
    return text, gt

def _aadhaar_t4(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Masked Aadhaar format."""
    name = fake.full_name()
    raw_dob = fake.dob()
    iso_dob = fake.dob_iso(raw_dob)
    _, masked_aadhaar = fake.synthetic_aadhaar()
    last4 = masked_aadhaar[-4:]

    text = (
        "UNIQUE IDENTIFICATION AUTHORITY OF INDIA\n"
        "Masked Aadhaar Card (Downloaded)\n"
        f"Name: {name}\n"
        f"Date of Birth: {raw_dob}\n"
        f"Aadhaar Number: XXXX XXXX {last4}\n"
        "Identity Proof Document"
    )
    gt = {"name": name, "dob": iso_dob, "aadhaar_masked": masked_aadhaar}
    return text, gt

def _aadhaar_t5(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Held-out Test Template 1 - Bilingual Header Layout."""
    name = fake.full_name()
    raw_dob = fake.dob()
    iso_dob = fake.dob_iso(raw_dob)
    gender = fake.rng.choice(["MALE", "FEMALE"])
    raw_aadhaar, masked_aadhaar = fake.synthetic_aadhaar()
    addr = fake.address()

    text = (
        "UNIQUE IDENTIFICATION AUTHORITY OF INDIA | UIDAI\n"
        "ELECTRONIC AADHAAR VERIFICATION\n"
        f"Holder Name : {name}\n"
        f"DOB (Date of Birth) : {raw_dob}\n"
        f"Sex : {gender}\n"
        f"Residential Address : {addr['line1']}, {addr['city']} {addr['pincode']}\n"
        f"UID: {raw_aadhaar[:4]}-{raw_aadhaar[4:8]}-{raw_aadhaar[8:]}\n"
        "Scan the QR code to verify signature authenticity"
    )
    gt = {"name": name, "dob": iso_dob, "aadhaar_masked": masked_aadhaar}
    return text, gt

def _aadhaar_t6(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Held-out Test Template 2 - Modern Aadhaar card format."""
    name = fake.full_name()
    raw_dob = fake.dob()
    iso_dob = fake.dob_iso(raw_dob)
    raw_aadhaar, masked_aadhaar = fake.synthetic_aadhaar()

    text = (
        "GOVERNMENT OF INDIA\n"
        "OFFICIAL IDENTITY CARD\n"
        f"Full Name: {name}\n"
        f"Birth Date: {raw_dob}\n"
        f"Aadhaar: {raw_aadhaar[:4]} {raw_aadhaar[4:8]} {raw_aadhaar[8:]}\n"
        "Issued by Authority of Unique Identification of India"
    )
    gt = {"name": name, "dob": iso_dob, "aadhaar_masked": masked_aadhaar}
    return text, gt

# ─── PAN Card Templates ───────────────────────────────────────────────────────

def _pan_t1(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Standard Income Tax Department PAN Card."""
    name = fake.full_name()
    father = fake.father_name(name.split()[-1])
    raw_dob = fake.dob()
    iso_dob = fake.dob_iso(raw_dob)
    pan = fake.pan_number()

    text = (
        "INCOME TAX DEPARTMENT\n"
        "GOVT. OF INDIA\n"
        "Permanent Account Number Card\n"
        f"{pan}\n"
        f"Name\n{name}\n"
        f"Father's Name\n{father}\n"
        f"Date of Birth\n{raw_dob}\n"
        "Signature"
    )
    gt = {"name": name, "dob": iso_dob, "pan": pan, "father_name": father}
    return text, gt

def _pan_t2(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """e-PAN verification receipt format."""
    name = fake.full_name()
    father = fake.father_name(name.split()[-1])
    raw_dob = fake.dob()
    iso_dob = fake.dob_iso(raw_dob)
    pan = fake.pan_number()

    text = (
        "National Securities Depository Limited (NSDL)\n"
        "INCOME TAX DEPARTMENT - GOVT OF INDIA\n"
        "ELECTRONIC PERMANENT ACCOUNT NUMBER (e-PAN)\n"
        f"PAN: {pan}\n"
        f"Name: {name}\n"
        f"Father's Name: {father}\n"
        f"DOB: {raw_dob}\n"
        "This is a system generated document valid for all financial transactions."
    )
    gt = {"name": name, "dob": iso_dob, "pan": pan, "father_name": father}
    return text, gt

def _pan_t3(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """UTIITSL Issued PAN format."""
    name = fake.full_name()
    raw_dob = fake.dob()
    iso_dob = fake.dob_iso(raw_dob)
    pan = fake.pan_number()

    text = (
        "UTI Infrastructure Technology And Services Limited\n"
        "Income Tax PAN Card Verification\n"
        f"PERMANENT ACCOUNT NUMBER: {pan}\n"
        f"NAME: {name}\n"
        f"DATE OF BIRTH: {raw_dob}\n"
        "ISSUED BY GOVT OF INDIA"
    )
    gt = {"name": name, "dob": iso_dob, "pan": pan}
    return text, gt

def _pan_t4(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Bilingual PAN Card format."""
    name = fake.full_name()
    father = fake.father_name(name.split()[-1])
    raw_dob = fake.dob()
    iso_dob = fake.dob_iso(raw_dob)
    pan = fake.pan_number()

    text = (
        "Aayakar Vibhag / Income Tax Department\n"
        "Bharat Sarkar / Government of India\n"
        f"Sthayi Lekha Sankhya / PAN: {pan}\n"
        f"Naam / Name: {name}\n"
        f"Pita ka Naam / Father's Name: {father}\n"
        f"Janma Tithi / Date of Birth: {raw_dob}"
    )
    gt = {"name": name, "dob": iso_dob, "pan": pan, "father_name": father}
    return text, gt

def _pan_t5(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Held-out Test Template 1 - Compact QR PAN format."""
    name = fake.full_name()
    raw_dob = fake.dob()
    iso_dob = fake.dob_iso(raw_dob)
    pan = fake.pan_number()

    text = (
        "INCOME TAX DEPARTMENT - REVENUE DIVISION\n"
        "INDIVIDUAL PERMANENT ACCOUNT CARD\n"
        f"PAN NO: {pan}\n"
        f"CARDHOLDER: {name}\n"
        f"BIRTH DATE: {raw_dob}\n"
        "AUTHENTICATED BY CENTRAL BOARD OF DIRECT TAXES"
    )
    gt = {"name": name, "dob": iso_dob, "pan": pan}
    return text, gt

def _pan_t6(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Held-out Test Template 2 - Modern Instant e-PAN format."""
    name = fake.full_name()
    raw_dob = fake.dob()
    iso_dob = fake.dob_iso(raw_dob)
    pan = fake.pan_number()

    text = (
        "Government of India - Ministry of Finance\n"
        "Instant e-PAN Allotment Letter\n"
        f"Allotted PAN : {pan}\n"
        f"Full Name : {name}\n"
        f"DOB : {raw_dob}\n"
        "Valid throughout the territory of India."
    )
    gt = {"name": name, "dob": iso_dob, "pan": pan}
    return text, gt

# ─── Passport Templates ───────────────────────────────────────────────────────

def _passport_t1(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Indian Passport Data Page."""
    name = fake.full_name()
    surname = name.split()[-1]
    given_name = " ".join(name.split()[:-1])
    raw_dob = fake.dob()
    iso_dob = fake.dob_iso(raw_dob)
    gender = fake.rng.choice(["M", "F"])
    p_num = fake.passport_number()

    text = (
        "REPUBLIC OF INDIA\n"
        "PASSPORT\n"
        f"Type: P  Country Code: IND  Passport No: {p_num}\n"
        f"Surname: {surname}\n"
        f"Given Name(s): {given_name}\n"
        f"Nationality: INDIAN  Sex: {gender}\n"
        f"Date of Birth: {raw_dob}\n"
        "Place of Birth: MUMBAI, MAHARASHTRA\n"
        "Date of Issue: 12/05/2021  Date of Expiry: 11/05/2031\n"
        f"P<IND{surname}<<{given_name}<<<<<<<<<<<<<<<<<<\n"
        f"{p_num}2IND{raw_dob.replace('/', '')}8M3105118<<<<<<<<<<<<<<<4"
    )
    gt = {"name": name, "dob": iso_dob, "passport": p_num}
    return text, gt

def _passport_t2(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Passport Renewal Verification Receipt."""
    name = fake.full_name()
    raw_dob = fake.dob()
    iso_dob = fake.dob_iso(raw_dob)
    p_num = fake.passport_number()

    text = (
        "Ministry of External Affairs - Consular Passport & Visa Division\n"
        "Passport Seva Kendra Document Summary\n"
        f"Passport Number: {p_num}\n"
        f"Applicant Full Name: {name}\n"
        f"Date of Birth: {raw_dob}\n"
        "File Reference: BOM1092839129\n"
        "Status: Granted"
    )
    gt = {"name": name, "dob": iso_dob, "passport": p_num}
    return text, gt

def _passport_t3(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Passport Address page."""
    name = fake.full_name()
    father = fake.father_name(name.split()[-1])
    addr = fake.address()
    p_num = fake.passport_number()

    text = (
        "GOVERNMENT OF INDIA - PASSPORT OFFICE\n"
        f"Passport No: {p_num}\n"
        f"Name of Father: {father}\n"
        f"Address: {addr['full']}\n"
        "Old Passport No with Date and Place of Issue: NIL"
    )
    gt = {"name": name, "passport": p_num, "father_name": father}
    return text, gt

def _passport_t4(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Passport Application ARN Slip."""
    name = fake.full_name()
    raw_dob = fake.dob()
    iso_dob = fake.dob_iso(raw_dob)
    p_num = fake.passport_number()

    text = (
        "PASSPORT SEVA - GOVERNMENT OF INDIA\n"
        "APPLICATION RECEIPT ADVICE\n"
        f"Applicant Name: {name}\n"
        f"DOB: {raw_dob}\n"
        f"Target Passport Series: {p_num}\n"
        "Appointment Date: 14-OCT-2024"
    )
    gt = {"name": name, "dob": iso_dob, "passport": p_num}
    return text, gt

def _passport_t5(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Held-out Test Template 1 - Diplomatic/Official Passport Page."""
    name = fake.full_name()
    raw_dob = fake.dob()
    iso_dob = fake.dob_iso(raw_dob)
    p_num = fake.passport_number()

    text = (
        "INDIAN PASSPORT REGISTRATION\n"
        f"PASSPORT NUMBER: {p_num}\n"
        f"NAME OF BEARER: {name}\n"
        f"DATE OF BIRTH: {raw_dob}\n"
        "CITIZENSHIP: INDIAN CITIZEN BY BIRTH\n"
        "ISSUED UNDER THE PASSPORTS ACT 1967"
    )
    gt = {"name": name, "dob": iso_dob, "passport": p_num}
    return text, gt

def _passport_t6(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Held-out Test Template 2 - Modern Machine Readable Indian Passport."""
    name = fake.full_name()
    raw_dob = fake.dob()
    iso_dob = fake.dob_iso(raw_dob)
    p_num = fake.passport_number()

    text = (
        "BHARAT GANARAJYA - REPUBLIC OF INDIA\n"
        "TRAVEL DOCUMENT - PASSPORT\n"
        f"Passport / Paasport Sankhya : {p_num}\n"
        f"Holder / Dhaarak : {name}\n"
        f"DOB / Janma Tithi : {raw_dob}\n"
        "IMMIGRATION DIVISION GOVT OF INDIA"
    )
    gt = {"name": name, "dob": iso_dob, "passport": p_num}
    return text, gt

# ─── Voter ID Templates ───────────────────────────────────────────────────────

def _voter_t1(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Standard Election Commission EPIC Card."""
    name = fake.full_name()
    father = fake.father_name(name.split()[-1])
    raw_dob = fake.dob()
    iso_dob = fake.dob_iso(raw_dob)
    epic = fake.voter_id()

    text = (
        "ELECTION COMMISSION OF INDIA\n"
        "ELECTOR PHOTO IDENTITY CARD\n"
        f"EPIC NO: {epic}\n"
        f"Elector's Name: {name}\n"
        f"Father's Name: {father}\n"
        f"Date of Birth: {raw_dob}\n"
        "Sex: Male/Female\n"
        "Electoral Registration Officer"
    )
    gt = {"name": name, "dob": iso_dob, "epic": epic, "father_name": father}
    return text, gt

def _voter_t2(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """e-EPIC Download PDF."""
    name = fake.full_name()
    raw_dob = fake.dob()
    iso_dob = fake.dob_iso(raw_dob)
    epic = fake.voter_id()
    addr = fake.address()

    text = (
        "VOTER SERVICES PORTAL - NVSP\n"
        "ELECTRONIC ELECTOR PHOTO IDENTITY CARD (e-EPIC)\n"
        f"EPIC: {epic}\n"
        f"Name: {name}\n"
        f"DOB: {raw_dob}\n"
        f"Address: {addr['full']}\n"
        "Constituency: 142 - Assembly Constituency"
    )
    gt = {"name": name, "dob": iso_dob, "epic": epic}
    return text, gt

def _voter_t3(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Bilingual Voter ID layout."""
    name = fake.full_name()
    father = fake.father_name(name.split()[-1])
    raw_dob = fake.dob()
    iso_dob = fake.dob_iso(raw_dob)
    epic = fake.voter_id()

    text = (
        "Bharat Nirvachan Aayog / Election Commission of India\n"
        f"Pehchan Patra Kramank / EPIC No: {epic}\n"
        f"Matdata ka Naam / Elector Name: {name}\n"
        f"Pita ka Naam / Father's Name: {father}\n"
        f"Aayu / DOB: {raw_dob}"
    )
    gt = {"name": name, "dob": iso_dob, "epic": epic}
    return text, gt

def _voter_t4(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Voter Information Slip."""
    name = fake.full_name()
    raw_dob = fake.dob()
    iso_dob = fake.dob_iso(raw_dob)
    epic = fake.voter_id()

    text = (
        "ELECTION COMMISSION OF INDIA\n"
        "VOTER INFORMATION SLIP (FOR GENERAL ELECTIONS)\n"
        f"EPIC Number: {epic}\n"
        f"Name: {name}\n"
        f"Date of Birth: {raw_dob}\n"
        "Polling Station: Government Model School, Room No. 3"
    )
    gt = {"name": name, "dob": iso_dob, "epic": epic}
    return text, gt

def _voter_t5(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Held-out Test Template 1 - New Format PVC Voter Card."""
    name = fake.full_name()
    raw_dob = fake.dob()
    iso_dob = fake.dob_iso(raw_dob)
    epic = fake.voter_id()

    text = (
        "ELECTOR PHOTO IDENTITY CARD - ECI INDIA\n"
        f"VOTER ID: {epic}\n"
        f"ELECTOR FULL NAME: {name}\n"
        f"BIRTH DATE: {raw_dob}\n"
        "VALID FOR ALL VOTING PURPOSES AND IDENTITY VERIFICATION"
    )
    gt = {"name": name, "dob": iso_dob, "epic": epic}
    return text, gt

def _voter_t6(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Held-out Test Template 2 - State Electoral Roll Extract."""
    name = fake.full_name()
    raw_dob = fake.dob()
    iso_dob = fake.dob_iso(raw_dob)
    epic = fake.voter_id()

    text = (
        "CHIEF ELECTORAL OFFICER - ELECTORAL CARD\n"
        f"IDENTITY REF (EPIC) : {epic}\n"
        f"NAME OF VOTER : {name}\n"
        f"DATE OF BIRTH : {raw_dob}\n"
        "CERTIFIED VOTER RECORD"
    )
    gt = {"name": name, "dob": iso_dob, "epic": epic}
    return text, gt

# ─── Driving Licence Templates ────────────────────────────────────────────────

def _dl_t1(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Indian Union Driving Licence standard format."""
    name = fake.full_name()
    raw_dob = fake.dob()
    iso_dob = fake.dob_iso(raw_dob)
    dl_num = fake.driving_licence()
    addr = fake.address()

    text = (
        "UNION OF INDIA - DRIVING LICENCE\n"
        "TRANSPORT DEPARTMENT\n"
        f"Licence No: {dl_num}\n"
        f"Name: {name}\n"
        f"DOB: {raw_dob}\n"
        f"Address: {addr['full']}\n"
        "Authorised to Drive: LMV-NT, MCWG\n"
        "Valid Till: 24/09/2035\n"
        "Licensing Authority"
    )
    gt = {"name": name, "dob": iso_dob, "driving_licence": dl_num}
    return text, gt

def _dl_t2(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Sarathi Parivahan Digital DL format."""
    name = fake.full_name()
    father = fake.father_name(name.split()[-1])
    raw_dob = fake.dob()
    iso_dob = fake.dob_iso(raw_dob)
    dl_num = fake.driving_licence()

    text = (
        "MINISTRY OF ROAD TRANSPORT & HIGHWAYS (MORTH)\n"
        "SARATHI PARIVAHAN SEWA - DIGITAL DRIVING LICENCE\n"
        f"DL Number: {dl_num}\n"
        f"Holder Name: {name}\n"
        f"Father/Husband Name: {father}\n"
        f"Date of Birth: {raw_dob}\n"
        "Vehicle Class: MOTOR CYCLE WITH GEAR, LIGHT MOTOR VEHICLE\n"
        "Issued by: RTO MAHARASHTRA"
    )
    gt = {"name": name, "dob": iso_dob, "driving_licence": dl_num}
    return text, gt

def _dl_t3(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Smart Card Driving Licence."""
    name = fake.full_name()
    raw_dob = fake.dob()
    iso_dob = fake.dob_iso(raw_dob)
    dl_num = fake.driving_licence()

    text = (
        "INDIAN DRIVING LICENCE\n"
        f"DL NO: {dl_num}\n"
        f"NAME: {name}\n"
        f"DATE OF BIRTH: {raw_dob}\n"
        "BLOOD GROUP: B+\n"
        "ISSUING AUTHORITY: REGIONAL TRANSPORT OFFICE"
    )
    gt = {"name": name, "dob": iso_dob, "driving_licence": dl_num}
    return text, gt

def _dl_t4(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Learner's Licence certificate."""
    name = fake.full_name()
    raw_dob = fake.dob()
    iso_dob = fake.dob_iso(raw_dob)
    dl_num = fake.driving_licence()

    text = (
        "GOVERNMENT OF MAHARASHTRA - MOTOR VEHICLES DEPARTMENT\n"
        "FORM 3 - LEARNER'S LICENCE\n"
        f"Licence Number: LL/{dl_num}\n"
        f"This is to certify that: {name}\n"
        f"Date of Birth: {raw_dob}\n"
        "has been granted a Learner's Licence."
    )
    gt = {"name": name, "dob": iso_dob, "driving_licence": dl_num}
    return text, gt

def _dl_t5(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Held-out Test Template 1 - MORTH DigiLocker Verified DL."""
    name = fake.full_name()
    raw_dob = fake.dob()
    iso_dob = fake.dob_iso(raw_dob)
    dl_num = fake.driving_licence()

    text = (
        "DIGILOCKER VERIFIED DRIVING LICENCE DOCUMENT\n"
        "ISSUED BY MINISTRY OF ROAD TRANSPORT AND HIGHWAYS\n"
        f"DRIVING LICENCE NO: {dl_num}\n"
        f"NAME OF DRIVER: {name}\n"
        f"DOB: {raw_dob}\n"
        "DOCUMENT DIGITALLY VERIFIED VIA NATIONAL TRANSPORT REGISTER"
    )
    gt = {"name": name, "dob": iso_dob, "driving_licence": dl_num}
    return text, gt

def _dl_t6(fake: SyntheticDataGenerator) -> Tuple[str, Dict[str, Any]]:
    """Held-out Test Template 2 - State RTO Driving Card layout."""
    name = fake.full_name()
    raw_dob = fake.dob()
    iso_dob = fake.dob_iso(raw_dob)
    dl_num = fake.driving_licence()

    text = (
        "STATE TRANSPORT REGULATORY COMMISSION\n"
        "PERMANENT DRIVING PERMIT\n"
        f"PERMIT / DL: {dl_num}\n"
        f"BEARER: {name}\n"
        f"DATE OF BIRTH: {raw_dob}\n"
        "AUTHORISED MOTOR VEHICLE OPERATOR"
    )
    gt = {"name": name, "dob": iso_dob, "driving_licence": dl_num}
    return text, gt

IDENTITY_TEMPLATES = {
    "aadhaar_card": [
        ("aadhaar_t1", "train", _aadhaar_t1),
        ("aadhaar_t2", "train", _aadhaar_t2),
        ("aadhaar_t3", "train", _aadhaar_t3),
        ("aadhaar_t4", "val", _aadhaar_t4),
        ("aadhaar_t5", "test", _aadhaar_t5),
        ("aadhaar_t6", "test", _aadhaar_t6),
    ],
    "pan_card": [
        ("pan_t1", "train", _pan_t1),
        ("pan_t2", "train", _pan_t2),
        ("pan_t3", "train", _pan_t3),
        ("pan_t4", "val", _pan_t4),
        ("pan_t5", "test", _pan_t5),
        ("pan_t6", "test", _pan_t6),
    ],
    "passport": [
        ("passport_t1", "train", _passport_t1),
        ("passport_t2", "train", _passport_t2),
        ("passport_t3", "train", _passport_t3),
        ("passport_t4", "val", _passport_t4),
        ("passport_t5", "test", _passport_t5),
        ("passport_t6", "test", _passport_t6),
    ],
    "voter_id": [
        ("voter_t1", "train", _voter_t1),
        ("voter_t2", "train", _voter_t2),
        ("voter_t3", "train", _voter_t3),
        ("voter_t4", "val", _voter_t4),
        ("voter_t5", "test", _voter_t5),
        ("voter_t6", "test", _voter_t6),
    ],
    "driving_licence": [
        ("dl_t1", "train", _dl_t1),
        ("dl_t2", "train", _dl_t2),
        ("dl_t3", "train", _dl_t3),
        ("dl_t4", "val", _dl_t4),
        ("dl_t5", "test", _dl_t5),
        ("dl_t6", "test", _dl_t6),
    ],
}
