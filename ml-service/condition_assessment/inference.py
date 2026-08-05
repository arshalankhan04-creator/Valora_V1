"""
Car condition assessment using beingamit99/car_damage_detection.

A ViT model fine-tuned to detect 6 specific damage TYPES — Crack, Scratch,
Tire Flat, Dent, Glass Shatter, Lamp Broken (confirmed directly from the
model's own id2label at runtime, not just the model card text — the card's
prose description undersold how different this is from a severity
classifier). Each label gets its own independent confidence score (a
multi-label head — the scores don't sum to 1), not a single top-1 choice.
There is no "whole/undamaged" class and no severity-level class built into
the model at all. The 0-100 condition score and severity label below are
derived here from the set of damage types it's confident about, the same
way the original hand-trained CNN this replaced did it — the model itself
only answers "how likely is each damage type", nothing more.

Model: https://huggingface.co/beingamit99/car_damage_detection
Downloaded automatically on first use (~350MB), cached in ~/.cache/huggingface/.

transformers import is deferred to _load() so Django startup doesn't crash
if the package is installed but the model hasn't been downloaded yet.
"""

DETECTION_THRESHOLD = 0.5  # per-damage-type confidence to count as "present"

# Mirrors server/src/scripts/seed.js's conditionSeverityFor tiers exactly,
# so real and seeded listings use the same severity vocabulary.
SEVERITY_TIERS = [
    (90, 'No visible damage'),
    (65, 'Minor damage'),
    (30, 'Moderate damage'),
]


def _severity_for(score):
    for threshold, label in SEVERITY_TIERS:
        if score >= threshold:
            return label
    return 'Severe damage'


_pipe = None


def _load():
    global _pipe
    if _pipe is None:
        # Deferred import — only load transformers when first request arrives
        from transformers import pipeline
        # framework='pt' is required, not optional, in this project: with
        # TensorFlow/Keras also installed (for price_prediction/
        # fraud_detection and the original CNN), transformers' framework
        # auto-detection tries to probe the TF variant of this model first
        # and crashes (Keras 3 isn't supported without the separate
        # tf-keras package) — it never even reaches the working PyTorch
        # weights. Forcing 'pt' skips that probe entirely.
        _pipe = pipeline(
            'image-classification',
            model='beingamit99/car_damage_detection',
            framework='pt',
        )
    return _pipe


def _assess_single(image_file) -> dict:
    """Run the model on one image, return {'score': int, 'severity': str}."""
    pipe = _load()

    # transformers' image loader only accepts a URL, a base64 string, a
    # local path, or a PIL Image — a Django UploadedFile (what views.py
    # actually hands us from request.FILES) is none of those and raises a
    # TypeError. Decode it to a PIL Image ourselves first, same as
    # preprocessing.py already does for the original CNN.
    from PIL import Image
    image = Image.open(image_file).convert('RGB')

    # top_k=None is documented to return every label, but empirically drops
    # one on this model/transformers version — ask for the model's own
    # class count explicitly instead of relying on that.
    num_labels = pipe.model.config.num_labels
    results = pipe(image, top_k=num_labels)  # every damage type's own confidence

    detected = [r for r in results if r['score'] >= DETECTION_THRESHOLD]
    if not detected:
        score = 95
    else:
        avg_confidence = sum(r['score'] for r in detected) / len(detected)
        score = round(100 * (1 - avg_confidence))

    return {'score': score, 'severity': _severity_for(score)}


def assess(image_files) -> dict:
    """
    Assess all uploaded images and return the worst condition found.
    Worst = lowest condition score across all images.

    Returns:
      {
        'visual_condition_score': int (0-100),
        'condition_severity':     str (human-readable label),
      }
    """
    assessments = [_assess_single(img) for img in image_files]

    # Use the worst result across all photos — one bad photo matters
    worst = min(assessments, key=lambda a: a['score'])

    return {
        'visual_condition_score': worst['score'],
        'condition_severity':     worst['severity'],
    }
