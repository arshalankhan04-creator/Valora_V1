"""Train the visual condition CNN via transfer learning on MobileNetV2.

Usage (from ml-service/, with venv active):
    python -m condition_assessment.prepare_data   # build data/images/ + labels.csv first
    python -m condition_assessment.train

Reads condition_assessment/data/labels.csv (filename + one 0/1 column per
damage_type_part class) and condition_assessment/data/images/. Only ~63
images across 8 classes as of this writing (see prepare_data.py) — heavy
augmentation is used to fight overfitting on a dataset this small, but
treat this as a proof-of-concept model, not a production-ready one.
"""

import json
import os
import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.applications import MobileNetV2
from sklearn.model_selection import train_test_split

from condition_assessment.preprocessing import IMAGE_SIZE, load_image

BASE_DIR = os.path.dirname(__file__)
DATA_DIR = os.path.join(BASE_DIR, 'data')
LABELS_PATH = os.path.join(DATA_DIR, 'labels.csv')
TAG_MAP_PATH = os.path.join(DATA_DIR, 'tag_map.json')
IMAGES_DIR = os.path.join(DATA_DIR, 'images')
MODEL_DIR = os.path.join(BASE_DIR, 'models')
MODEL_PATH = os.path.join(MODEL_DIR, 'condition_model.keras')
CLASSES_PATH = os.path.join(MODEL_DIR, 'condition_model_classes.json')


def build_model(num_classes):
    augmentation = models.Sequential([
        layers.RandomFlip('horizontal'),
        layers.RandomRotation(0.05),
        layers.RandomZoom(0.1),
        layers.RandomBrightness(0.15),
    ])
    base = MobileNetV2(input_shape=(*IMAGE_SIZE, 3), include_top=False, weights='imagenet')
    base.trainable = False  # transfer learning: freeze the pretrained base

    return models.Sequential([
        augmentation,
        base,
        layers.GlobalAveragePooling2D(),
        layers.Dropout(0.4),
        layers.Dense(64, activation='relu'),
        layers.Dropout(0.3),
        layers.Dense(num_classes, activation='sigmoid'),  # multi-label
    ])


def train():
    labels_df = pd.read_csv(LABELS_PATH)
    damage_classes = [c for c in labels_df.columns if c != 'filename']

    images = np.stack([
        load_image(os.path.join(IMAGES_DIR, fname))
        for fname in labels_df['filename']
    ])
    targets = labels_df[damage_classes].values.astype('float32')

    X_train, X_val, y_train, y_val = train_test_split(images, targets, test_size=0.2, random_state=42)

    model = build_model(len(damage_classes))
    model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['binary_accuracy'])
    model.fit(X_train, y_train, validation_data=(X_val, y_val), epochs=25, batch_size=8)

    loss, accuracy = model.evaluate(X_val, y_val)
    print(f'Validation loss: {loss:.4f}  binary_accuracy: {accuracy:.4f}')

    with open(TAG_MAP_PATH) as f:
        tag_map = json.load(f)
    # Order matters: index i in the model's output vector must line up with
    # damage_classes[i], which must line up with this ordered class list.
    ordered_classes = [{'tag': tag, **tag_map[tag]} for tag in damage_classes]

    os.makedirs(MODEL_DIR, exist_ok=True)
    model.save(MODEL_PATH)
    with open(CLASSES_PATH, 'w') as f:
        json.dump(ordered_classes, f, indent=2)
    print(f'Saved model to {MODEL_PATH} ({len(damage_classes)} classes)')


if __name__ == '__main__':
    train()
