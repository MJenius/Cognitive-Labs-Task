from .surya import SuryaAdapter
from .docling import DoclingAdapter
from .mineru import MinerUAdapter

ADAPTERS = {
    "surya": SuryaAdapter(),
    "docling": DoclingAdapter(),
    "mineru": MinerUAdapter(),
}

KNOWN_MODELS = list(ADAPTERS.keys())


def get_adapter(name: str):
    return ADAPTERS.get(name.lower(), SuryaAdapter())
