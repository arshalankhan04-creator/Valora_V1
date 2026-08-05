"""
YOLOv8 vehicle detection — runs entirely locally, no API cost.

YOLOv8n (nano) is used: smallest and fastest variant, ~6MB weights.
It knows 80 COCO classes; we only care about the vehicle ones.
The weights are downloaded automatically by ultralytics on first use
and cached in ~/.cache/ultralytics/. No training needed.

COCO vehicle class IDs:
  2  = car
  3  = motorcycle
  5  = bus
  7  = truck
  (we accept any of these as "a vehicle")
"""

# ultralytics import is deferred to _load() — importing it at module level
# crashes Django startup if the package isn't installed yet, the same reason
# TensorFlow is deferred in condition_assessment/inference.py.

VEHICLE_CLASS_IDS = {2, 3, 5, 7}
CONFIDENCE_THRESHOLD = 0.35

_model = None


def _load():
    global _model
    if _model is None:
        from ultralytics import YOLO  # deferred: only pay import cost on first request
        _model = YOLO('yolov8n.pt')
    return _model


def contains_vehicle(image_file) -> bool:
    """Return True if the image contains at least one vehicle."""
    model = _load()
    results = model(image_file, verbose=False)
    for result in results:
        for box in result.boxes:
            cls_id = int(box.cls[0])
            conf   = float(box.conf[0])
            if cls_id in VEHICLE_CLASS_IDS and conf >= CONFIDENCE_THRESHOLD:
                return True
    return False


def validate_images(image_files) -> dict:
    """
    Check all uploaded images. Returns:
      { valid: True }                 — at least one image contains a vehicle
      { valid: False, reason: str }   — none of the images contain a vehicle
    """
    for img in image_files:
        if contains_vehicle(img):
            return {'valid': True}

    return {
        'valid': False,
        'reason': (
            'None of the uploaded photos appear to contain a vehicle. '
            'Please upload clear photos of the car you are listing.'
        ),
    }
