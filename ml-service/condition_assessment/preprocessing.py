"""Image preprocessing shared between train.py and inference.py.

The damage class vocabulary (e.g. 'dent_front_bumper') isn't hardcoded here
— it's derived from whatever labels.csv actually contains (see
prepare_data.py) and persisted alongside the trained model, since it's a
property of the training data, not a fixed constant.
"""

import numpy as np
from PIL import Image

IMAGE_SIZE = (224, 224)  # matches MobileNetV2's expected input


def load_image(path_or_file):
    image = Image.open(path_or_file).convert('RGB').resize(IMAGE_SIZE)
    array = np.asarray(image, dtype='float32') / 255.0
    return array


def batch_from_files(file_objs):
    return np.stack([load_image(f) for f in file_objs])
