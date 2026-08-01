"""Train the visual condition CNN via transfer learning on MobileNetV2.

Usage (from ml-service/, with venv active):
    python -m condition_assessment.train

Expects condition_assessment/data/ to contain training images plus a
labels.csv with columns: filename, scratch, dent, rust (each 0/1) — a
photo can have more than one damage type. Not committed to git.
"""

import os
import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.applications import MobileNetV2
from sklearn.model_selection import train_test_split

from condition_assessment.preprocessing import IMAGE_SIZE, DAMAGE_CLASSES, load_image

BASE_DIR = os.path.dirname(__file__)
DATA_DIR = os.path.join(BASE_DIR, 'data')
LABELS_PATH = os.path.join(DATA_DIR, 'labels.csv')
MODEL_DIR = os.path.join(BASE_DIR, 'models')
MODEL_PATH = os.path.join(MODEL_DIR, 'condition_model.keras')


def build_model():
    base = MobileNetV2(input_shape=(*IMAGE_SIZE, 3), include_top=False, weights='imagenet')
    base.trainable = False  # transfer learning: freeze the pretrained base

    return models.Sequential([
        base,
        layers.GlobalAveragePooling2D(),
        layers.Dropout(0.3),
        layers.Dense(64, activation='relu'),
        layers.Dropout(0.2),
        layers.Dense(len(DAMAGE_CLASSES), activation='sigmoid'),  # multi-label
    ])


def train():
    labels_df = pd.read_csv(LABELS_PATH)
    images = np.stack([
        load_image(os.path.join(DATA_DIR, 'images', fname))
        for fname in labels_df['filename']
    ])
    targets = labels_df[DAMAGE_CLASSES].values.astype('float32')

    X_train, X_val, y_train, y_val = train_test_split(images, targets, test_size=0.2, random_state=42)

    model = build_model()
    model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
    model.fit(X_train, y_train, validation_data=(X_val, y_val), epochs=10, batch_size=16)

    loss, accuracy = model.evaluate(X_val, y_val)
    print(f'Validation loss: {loss:.4f}  accuracy: {accuracy:.4f}')

    os.makedirs(MODEL_DIR, exist_ok=True)
    model.save(MODEL_PATH)
    print(f'Saved model to {MODEL_PATH}')


if __name__ == '__main__':
    train()
