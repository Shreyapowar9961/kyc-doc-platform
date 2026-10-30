# data/kyc_gen/fake.py
"""Synthetic Indian KYC and loan document data provider."""

import random
from datetime import date, timedelta

FIRST_NAMES = [
    "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna",
    "Ishaan", "Shaurya", "Atharv", "Dhruv", "Kabir", "Rudra", "Ramesh", "Suresh", "Rajesh",
    "Amit", "Anand", "Deepak", "Manoj", "Pooja", "Priya", "Ananya", "Diya", "Isha",
    "Riya", "Sneha", "Kavita", "Sunita", "Anita", "Neha", "Shreya", "Aditi", "Meera"
]

LAST_NAMES = [
    "Kumar", "Sharma", "Verma", "Gupta", "Patel", "Shah", "Singh", "Yadav", "Mishra",
    "Joshi", "Kulkarni", "Deshmukh", "Patil", "Pawar", "Shinde", "Reddy", "Nair", "Iyer",
    "Rao", "Chauhan", "Pandey", "Chatterjee", "Mukherjee", "Sen", "Bose", "Mehta"
]

CITIES_STATES = [
    ("Mumbai", "Maharashtra", "400001"),
    ("Pune", "Maharashtra", "411001"),
    ("Nagpur", "Maharashtra", "440001"),
    ("Bengaluru", "Karnataka", "560001"),
    ("Hyderabad", "Telangana", "500001"),
    ("Chennai", "Tamil Nadu", "600001"),
    ("New Delhi", "Delhi", "110001"),
    ("Ahmedabad", "Gujarat", "380001"),
    ("Jaipur", "Rajasthan", "302001"),
    ("Kolkata", "West Bengal", "700001"),
    ("Lucknow", "Uttar Pradesh", "226001"),
    ("Indore", "Madhya Pradesh", "452001"),
]

STREETS = [
    "M.G. Road", "Station Road", "Gandhi Marg", "Tilak Road", "Link Road",
    "Subhash Nagar", "Nehru Street", "Park Avenue", "Shivaji Chowk", "Main Bazar Road"
]

FICTIONAL_BANKS = [
    "Apex National Bank",
    "Fake Mercantile Bank",
    "Horizon Trust Bank",
    "Delta Commerce Bank",
    "Solaria Capital Bank",
    "Zenith Mutual Bank",
    "Nova Union Bank",
]

FICTIONAL_EMPLOYERS = [
    "Acme Technologies Pvt Ltd",
    "Nexus Global Innovations India Ltd",
    "Zenith Info Solutions Corp",
    "Synergy Retail Enterprises Ltd",
    "Quantum Dynamics India Pvt Ltd",
    "Pinnacle Digital Systems LLP",
    "Horizon Logistics India Ltd",
]

# Verhoeff algorithm multiplication table and permutation table
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

_VERHOEFF_INV = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9]

def compute_verhoeff_checksum(number_str: str) -> int:
    """Computes Verhoeff checksum digit for numeric string."""
    c = 0
    reversed_digits = [int(x) for x in reversed(number_str)]
    for i, digit in enumerate(reversed_digits):
        c = _VERHOEFF_D[c][_VERHOEFF_P[(i + 1) % 8][digit]]
    return _VERHOEFF_INV[c]

def validate_verhoeff_checksum(number_str: str) -> bool:
    """Validates complete Verhoeff check (including checksum digit)."""
    c = 0
    reversed_digits = [int(x) for x in reversed(number_str)]
    for i, digit in enumerate(reversed_digits):
        c = _VERHOEFF_D[c][_VERHOEFF_P[i % 8][digit]]
    return c == 0

class SyntheticDataGenerator:
    """Provides consistent pseudo-random synthetic Indian KYC entity data."""

    def __init__(self, rng: random.Random):
        self.rng = rng

    def full_name(self) -> str:
        first = self.rng.choice(FIRST_NAMES)
        last = self.rng.choice(LAST_NAMES)
        return f"{first} {last}"

    def father_name(self, child_last_name: str = "") -> str:
        first = self.rng.choice(FIRST_NAMES)
        last = child_last_name or self.rng.choice(LAST_NAMES)
        return f"{first} {last}"

    def dob(self, min_age: int = 21, max_age: int = 60) -> str:
        today = date(2026, 1, 1)
        start_date = today - timedelta(days=max_age * 365)
        end_date = today - timedelta(days=min_age * 365)
        delta_days = (end_date - start_date).days
        random_day = start_date + timedelta(days=self.rng.randint(0, delta_days))
        return random_day.strftime("%d/%m/%Y")

    def dob_iso(self, dob_str: str) -> str:
        parts = dob_str.split("/")
        if len(parts) == 3:
            return f"{parts[2]}-{parts[1]}-{parts[0]}"
        return dob_str

    def address(self) -> dict:
        city, state, pin_prefix = self.rng.choice(CITIES_STATES)
        flat_no = self.rng.randint(101, 999)
        bldg = f"Building No. {self.rng.randint(1, 40)}"
        street = self.rng.choice(STREETS)
        pincode = f"{pin_prefix[:4]}{self.rng.randint(10, 99)}"
        line1 = f"Flat {flat_no}, {bldg}, {street}"
        line2 = f"{city}, {state} - {pincode}"
        return {
            "line1": line1,
            "line2": line2,
            "city": city,
            "state": state,
            "pincode": pincode,
            "full": f"{line1}, {line2}"
        }

    def synthetic_aadhaar(self) -> tuple[str, str]:
        """Generates synthetic Aadhaar (starts with 0 or 1, with Verhoeff checksum).
        Returns (raw_12_digit, masked_format)."""
        first_digit = self.rng.choice([0, 1])
        middle_10 = "".join(str(self.rng.randint(0, 9)) for _ in range(10))
        prefix = f"{first_digit}{middle_10}"
        checksum = compute_verhoeff_checksum(prefix)
        raw = f"{prefix}{checksum}"
        masked = f"XXXX-XXXX-{raw[-4:]}"
        return raw, masked

    def pan_number(self) -> str:
        """Synthetic PAN number matching regex [A-Z]{5}[0-9]{4}[A-Z]."""
        p1 = "".join(self.rng.choices("ABCDEFGHJKLMNPQRSTUVWXYZ", k=3))
        entity_char = "P"  # Individual
        p2 = self.rng.choice("ABCDEFGHJKLMNPQRSTUVWXYZ")
        digits = "".join(str(self.rng.randint(0, 9)) for _ in range(4))
        last_char = self.rng.choice("ABCDEFGHJKLMNPQRSTUVWXYZ")
        return f"{p1}{entity_char}{p2}{digits}{last_char}"

    def ifsc_code(self) -> str:
        """Strictly fictional IFSC code starting with FAKE000."""
        num = self.rng.randint(1000, 9999)
        return f"FAKE000{num}"

    def bank_name(self) -> str:
        return self.rng.choice(FICTIONAL_BANKS)

    def employer_name(self) -> str:
        return self.rng.choice(FICTIONAL_EMPLOYERS)

    def account_number(self) -> str:
        return "".join(str(self.rng.randint(0, 9)) for _ in range(14))

    def voter_id(self) -> str:
        letters = "".join(self.rng.choices("ABCDEFGHJKLMNPQRSTUVWXYZ", k=3))
        digits = "".join(str(self.rng.randint(0, 9)) for _ in range(7))
        return f"{letters}{digits}"

    def passport_number(self) -> str:
        letter = self.rng.choice("ABCDEFGHJKLMNPRSTUVWXYZ")
        digits = "".join(str(self.rng.randint(0, 9)) for _ in range(7))
        return f"{letter}{digits}"

    def driving_licence(self) -> str:
        state = self.rng.choice(["MH", "DL", "KA", "TN", "GJ", "UP"])
        rto = f"{self.rng.randint(1, 50):02d}"
        year = self.rng.randint(2010, 2024)
        num = f"{self.rng.randint(1000000, 9999999)}"
        return f"{state}{rto}{year}{num}"
