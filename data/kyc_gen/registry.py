# data/kyc_gen/registry.py
"""Central registry of all 9 KYC document classes and their template splits."""

from typing import Dict, List, Tuple, Callable, Any
from .templates_identity import IDENTITY_TEMPLATES
from .templates_finance import FINANCE_TEMPLATES
from .templates_other import OTHER_TEMPLATES

CLASSES = [
    "aadhaar_card",
    "pan_card",
    "passport",
    "voter_id",
    "driving_licence",
    "bank_statement",
    "salary_slip",
    "income_proof",
    "other_unknown",
]

# Combined dictionary of all classes and their (template_id, split, generator_fn)
TEMPLATE_REGISTRY: Dict[str, List[Tuple[str, str, Callable]]] = {}
TEMPLATE_REGISTRY.update(IDENTITY_TEMPLATES)
TEMPLATE_REGISTRY.update(FINANCE_TEMPLATES)
TEMPLATE_REGISTRY.update(OTHER_TEMPLATES)

def get_templates_for_class(cls_name: str, split: str = None) -> List[Tuple[str, str, Callable]]:
    """Returns templates for a class, optionally filtered by split ('train', 'val', 'test')."""
    templates = TEMPLATE_REGISTRY.get(cls_name, [])
    if split is None:
        return templates
    return [t for t in templates if t[1] == split]
