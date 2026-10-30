# data/kyc_gen/noise.py
"""OCR noise and imperfection injection for synthetic documents."""

import random

SWAPS = {
    'O': '0', '0': 'O',
    'I': '1', '1': 'I',
    'l': '1',
    'S': '5', '5': 'S',
    'B': '8', '8': 'B',
    'Z': '2', '2': 'Z'
}

def inject_noise(text: str, noise_level: int, rng: random.Random) -> str:
    """Injects OCR noise at level 0 (none), 1 (light), or 2 (heavy)."""
    if noise_level <= 0:
        return text

    chars = list(text)
    n = len(chars)
    if n == 0:
        return text

    if noise_level == 1:
        # Light noise: 1-2% character swaps or space deletions
        swap_rate = 0.02
        for i in range(n):
            c = chars[i]
            if c in SWAPS and rng.random() < swap_rate:
                chars[i] = SWAPS[c]
            elif c == ' ' and rng.random() < 0.01:
                chars[i] = ''
        return "".join(chars)

    # Heavy noise (level 2): 4-5% swaps, dropped spaces, stray punctuation
    swap_rate = 0.05
    res = []
    lines = text.split("\n")
    for line in lines:
        # Randomly introduce stray scan artifacts at edge
        if rng.random() < 0.08:
            prefix = rng.choice(["| ", ": ", "— ", "- "])
            line = prefix + line
        line_chars = list(line)
        for i, c in enumerate(line_chars):
            if c in SWAPS and rng.random() < swap_rate:
                line_chars[i] = SWAPS[c]
            elif c == ' ' and rng.random() < 0.02:
                line_chars[i] = ''
            elif rng.random() < 0.005 and c.isalnum():
                line_chars[i] = rng.choice(['.', ':', ',', ';', "'"])
        res.append("".join(line_chars))

    return "\n".join(res)
