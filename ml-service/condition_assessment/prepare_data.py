"""Pair the LabelMe part+damage annotations with their source images and
build labels.csv for training.

Two Kaggle downloads turned out to be the same 1024x1024 source photos:
"Annotated Dataset of Car Parts with Damage" (LabelMe polygon JSONs, labels
like "dent - front bumper" — no images included in that download) and "Coco
Car Damage Detection Dataset" (has the actual images under img/, numbered
1.jpg, 2.jpg, ...). Confirmed by matching filenames and pixel dimensions:
every one of the 63 annotation JSONs has a same-numbered image in the Coco
dataset's img/ folder.

This is what makes real part-level output possible at all — the CNN was
originally scaffolded to always return "part": "unknown" because no
annotated data existed yet (see condition_assessment/inference.py history).

63 images total across 8 (damage_type, part) classes is a genuinely small
dataset for a CNN — expect overfitting even with augmentation. This is a
proof-of-concept, not production-scale training data.

Usage (from ml-service/, with venv active):
    python -m condition_assessment.prepare_data
"""

import csv
import json
import os
import re
import shutil
from collections import defaultdict

BASE_DIR = os.path.dirname(__file__)
ANNOTATIONS_DIR = os.path.join(BASE_DIR, 'data', 'Annotated Dataset of Car Parts with Damage', 'annotation LABELME')
SOURCE_IMAGES_DIR = os.path.join(BASE_DIR, 'data', 'Coco Car Damage Detection Dataset', 'img')
IMAGES_OUT_DIR = os.path.join(BASE_DIR, 'data', 'images')
LABELS_PATH = os.path.join(BASE_DIR, 'data', 'labels.csv')
TAG_MAP_PATH = os.path.join(BASE_DIR, 'data', 'tag_map.json')


def normalize_label(raw_label):
    """'dent -  rear bumper' -> ('dent', 'rear_bumper'). Source JSONs have
    inconsistent spacing around the ' - ' separator."""
    damage_type, part = re.split(r'\s*-\s*', raw_label.strip(), maxsplit=1)
    part = re.sub(r'\s+', '_', part.strip().lower())
    return damage_type.strip().lower(), part


def combined_tag(damage_type, part):
    return f'{damage_type}_{part}'


def build_dataset():
    per_image_tags = {}
    tag_map = {}  # combined_tag -> {damage_type, part}, unambiguous since
                  # part names can themselves contain underscores

    for fname in sorted(os.listdir(ANNOTATIONS_DIR)):
        if not fname.endswith('.json'):
            continue
        image_num = os.path.splitext(fname)[0]
        source_image = os.path.join(SOURCE_IMAGES_DIR, f'{image_num}.jpg')
        if not os.path.exists(source_image):
            print(f'Skipping {fname}: no matching image {image_num}.jpg')
            continue

        with open(os.path.join(ANNOTATIONS_DIR, fname)) as f:
            annotation = json.load(f)

        tags = set()
        for shape in annotation['shapes']:
            damage_type, part = normalize_label(shape['label'])
            tag = combined_tag(damage_type, part)
            tags.add(tag)
            tag_map[tag] = {'damage_type': damage_type, 'part': part}
        if not tags:
            continue

        out_filename = f'{image_num}.jpg'
        shutil.copyfile(source_image, os.path.join(IMAGES_OUT_DIR, out_filename))
        per_image_tags[out_filename] = tags

    return per_image_tags, tag_map


def write_labels_csv(per_image_tags, tag_columns):
    os.makedirs(os.path.dirname(LABELS_PATH), exist_ok=True)
    with open(LABELS_PATH, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['filename', *tag_columns])
        for filename, tags in per_image_tags.items():
            writer.writerow([filename, *[int(tag in tags) for tag in tag_columns]])


if __name__ == '__main__':
    os.makedirs(IMAGES_OUT_DIR, exist_ok=True)
    per_image_tags, tag_map = build_dataset()
    tag_columns = sorted(tag_map)

    write_labels_csv(per_image_tags, tag_columns)
    with open(TAG_MAP_PATH, 'w') as f:
        json.dump(tag_map, f, indent=2)

    counts = defaultdict(int)
    for tags in per_image_tags.values():
        for tag in tags:
            counts[tag] += 1

    print(f'Paired {len(per_image_tags)} images across {len(tag_columns)} classes:')
    for tag in tag_columns:
        print(f'  {tag}: {counts[tag]}')
    print(f'Wrote {LABELS_PATH} and {TAG_MAP_PATH}')
