"""Shared utility functions."""

import re


def generate_id(name: str) -> str:
    """Generate a slug-style ID from a name.

    Strips all characters except alphanumeric and underscores,
    collapses consecutive underscores.
    """
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9_\s-]", "", slug)
    slug = re.sub(r"[\s-]+", "_", slug)
    slug = re.sub(r"_+", "_", slug)
    return slug.strip("_")
