import json
import os

from condition_assessment.preprocessing import batch_from_files
from condition_assessment.train import MODEL_PATH, CLASSES_PATH

DETECTION_THRESHOLD = 0.5

_model = None
_classes = None


class ModelNotTrainedError(Exception):
    pass


def _load_model():
    global _model, _classes
    if _model is None:
        if not os.path.exists(MODEL_PATH) or not os.path.exists(CLASSES_PATH):
            raise ModelNotTrainedError(
                f'No trained model at {MODEL_PATH}. Run `python -m condition_assessment.prepare_data` '
                'then `python -m condition_assessment.train` first.'
            )
        import tensorflow as tf  # deferred: importing TF is slow, only pay for it once needed

        # compile=False: inference only ever calls predict(), never fit()/
        # evaluate(), and train.py's class-weighted loss is a closure that
        # isn't registered as a serializable Keras object — loading with
        # compile=True tries to deserialize it and fails.
        _model = tf.keras.models.load_model(MODEL_PATH, compile=False)
        with open(CLASSES_PATH) as f:
            _classes = json.load(f)
    return _model, _classes


def assess(image_files):
    model, classes = _load_model()
    batch = batch_from_files(image_files)
    predictions = model.predict(batch)  # shape: (num_images, len(classes))

    detected_damages = []
    for probs in predictions:
        for cls, confidence in zip(classes, probs):
            if confidence >= DETECTION_THRESHOLD:
                detected_damages.append({
                    'part': cls['part'],
                    'damage_type': cls['damage_type'],
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
