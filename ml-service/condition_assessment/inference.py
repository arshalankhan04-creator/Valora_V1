import os

from condition_assessment.preprocessing import DAMAGE_CLASSES, batch_from_files
from condition_assessment.train import MODEL_PATH

DETECTION_THRESHOLD = 0.5

_model = None


class ModelNotTrainedError(Exception):
    pass


def _load_model():
    global _model
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            raise ModelNotTrainedError(
                f'No trained model at {MODEL_PATH}. Run `python -m condition_assessment.train` first.'
            )
        import tensorflow as tf  # deferred: importing TF is slow, only pay for it once needed

        _model = tf.keras.models.load_model(MODEL_PATH)
    return _model


def assess(image_files):
    model = _load_model()
    batch = batch_from_files(image_files)
    predictions = model.predict(batch)  # shape: (num_images, len(DAMAGE_CLASSES))

    detected_damages = []
    for probs in predictions:
        for damage_type, confidence in zip(DAMAGE_CLASSES, probs):
            if confidence >= DETECTION_THRESHOLD:
                detected_damages.append({
                    # Per-part localization needs a bounding-box-annotated
                    # dataset and an object-detection model (out of scope for
                    # a single transfer-learning classifier) — this ships as
                    # a known gap, not silently faked.
                    'part': 'unknown',
                    'damage_type': damage_type,
                    'confidence': round(float(confidence), 4),
                })

    if detected_damages:
        severity = sum(d['confidence'] for d in detected_damages) / len(detected_damages)
    else:
        severity = 0.0
    visual_condition_score = round(100 * (1 - severity), 2)

    return {
        'visual_condition_score': visual_condition_score,
        'detected_damages': detected_damages,
    }
