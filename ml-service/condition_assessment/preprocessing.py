"""Image preprocessing shared between train.py and inference.py."""

import numpy as np
from PIL import Image

IMAGE_SIZE = (224, 224)  # matches MobileNetV2's expected input
# Multi-label, not mutually exclusive — a photo can show a scratch and rust
# at once. Absence of all three at inference time means "no damage detected".
DAMAGE_CLASSES = ['scratch', 'dent', 'rust']


def load_image(file_obj):
    """file_obj: any file-like object DRF/Django gives us for an uploaded image."""
    image = Image.open(file_obj).convert('RGB').resize(IMAGE_SIZE)
    array = np.asarray(image, dtype='float32') / 255.0
    return array


def batch_from_files(file_objs):
    return np.stack([load_image(f) for f in file_objs])
