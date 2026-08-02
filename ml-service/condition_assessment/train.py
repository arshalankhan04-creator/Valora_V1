"""Train the visual condition CNN via transfer learning on MobileNetV2.

Usage (from ml-service/, with venv active):
    python -m condition_assessment.prepare_data   # build data/images/ + labels.csv first
    python -m condition_assessment.train

Reads condition_assessment/data/labels.csv (filename + one 0/1 column per
damage_type_part class) and condition_assessment/data/images/. Only ~63
images across 8 classes as of this writing (see prepare_data.py), and some
classes (e.g. broken_windshield) have as few as 1 positive example — treat
this as a proof-of-concept model, not a production-ready one.

binary_accuracy is misleading on this data: a model that always predicts 0
scores ~98% "accuracy" on a class with 1 positive out of 63 images while
being useless. Macro precision/recall/F1 (below) is the honest metric.
A 5-fold CV comparison (see git history / PR description for the numbers)
found frozen-backbone + unweighted BCE — the original setup here — scored
macro-F1 ~0.09. Two changes roughly doubled that to ~0.19: (1) weighting
each class's positive examples inversely to their frequency, so the ~5
rare classes stop being drowned out by the ~30 common ones, and (2)
unfreezing the last 50 of MobileNetV2's 154 layers at a low learning
rate, since a fully frozen backbone (trained on general ImageNet
classes) underfits car-damage-specific texture cues this data-starved.
Full unfreezing overfit worse than partial — see the 40-80 layer range
tested — 50 is a defensible middle, not a precisely tuned optimum (fold
variance on 63 images is large enough that 40 vs 60 vs 80 aren't reliably
distinguishable).
"""

import json
import os
import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.applications import MobileNetV2
from sklearn.metrics import precision_recall_fscore_support
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

FINETUNE_LAYERS = 50
LEARNING_RATE = 0.0001


def build_model(num_classes):
    augmentation = models.Sequential([
        layers.RandomFlip('horizontal'),
        layers.RandomRotation(0.05),
        layers.RandomZoom(0.1),
        layers.RandomBrightness(0.15),
    ])
    base = MobileNetV2(input_shape=(*IMAGE_SIZE, 3), include_top=False, weights='imagenet')
    base.trainable = True
    for layer in base.layers[:-FINETUNE_LAYERS]:
        layer.trainable = False

    return models.Sequential([
        augmentation,
        base,
        layers.GlobalAveragePooling2D(),
        layers.Dropout(0.4),
        layers.Dense(64, activation='relu'),
        layers.Dropout(0.3),
        layers.Dense(num_classes, activation='sigmoid'),  # multi-label
    ])


def class_weighted_bce(pos_weights):
    """Standard weighted binary cross-entropy: multiplies the positive-class
    term by pos_weights[c], so misclassifying a rare damage class costs more
    than misclassifying a common one. Without this, gradient descent's
    easiest win is just predicting 0 for rare classes."""
    pos_weights = tf.constant(pos_weights, dtype=tf.float32)

    def loss_fn(y_true, y_pred):
        eps = 1e-7
        y_pred = tf.clip_by_value(y_pred, eps, 1 - eps)
        loss = -(pos_weights * y_true * tf.math.log(y_pred) + (1 - y_true) * tf.math.log(1 - y_pred))
        return tf.reduce_mean(loss)
    return loss_fn


def train():
    labels_df = pd.read_csv(LABELS_PATH)
    damage_classes = [c for c in labels_df.columns if c != 'filename']

    images = np.stack([
        load_image(os.path.join(IMAGES_DIR, fname))
        for fname in labels_df['filename']
    ])
    targets = labels_df[damage_classes].values.astype('float32')

    X_train, X_val, y_train, y_val = train_test_split(images, targets, test_size=0.2, random_state=42)

    pos_counts = y_train.sum(axis=0)
    neg_counts = len(y_train) - pos_counts
    # Clipped to [1, 20]: without a ceiling, a class with 1 positive example
    # in this small a training split would get an enormous, unstable weight.
    pos_weights = np.clip(neg_counts / np.maximum(pos_counts, 1), 1, 20)

    model = build_model(len(damage_classes))
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=LEARNING_RATE),
        loss=class_weighted_bce(pos_weights),
        metrics=['binary_accuracy'],
    )
    model.fit(X_train, y_train, validation_data=(X_val, y_val), epochs=25, batch_size=8)

    val_preds = (model.predict(X_val) >= 0.5).astype(int)
    precision, recall, f1, _ = precision_recall_fscore_support(
        y_val, val_preds, average='macro', zero_division=0,
    )
    print(f'Validation macro precision: {precision:.4f}  recall: {recall:.4f}  F1: {f1:.4f}')

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
