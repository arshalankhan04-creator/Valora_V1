"""
Car condition assessment using YOLOv8 (best.pt trained on CarDD dataset).

Replaces the previous ViT-based pipeline. Detects up to 10 damage classes:
crack, crash, dent, dislocated_part, glass_shatter, lamp_broken, no_part,
rub, scratch, tire_flat.

Returns:
  {
    'visual_condition_score': int (0–100, 100 = no damage),
    'condition_severity':     str,
    'detected_damages':       list[{part, damage_type, confidence, severity,
                                    location, area_percentage, estimated_cost}],
    'condition_decision':     'AUTO_APPROVE' | 'HUMAN_REVIEW' | 'ESCALATE',
  }
"""

from pathlib import Path

MODEL_PATH = Path(__file__).resolve().parent / 'models' / 'best.pt'
CONFIDENCE_THRESHOLD = 0.25

# Score → severity label (mirrors seed.js conditionSeverityFor tiers)
_SEVERITY_TIERS = [
    (90, 'No visible damage'),
    (65, 'Minor damage'),
    (30, 'Moderate damage'),
]


def _severity_for_score(score: int) -> str:
    for threshold, label in _SEVERITY_TIERS:
        if score >= threshold:
            return label
    return 'Severe damage'


def _area_to_severity(area_pct: float) -> str:
    if area_pct < 5:
        return 'minor'
    if area_pct < 15:
        return 'moderate'
    return 'severe'


def _location(bbox: list, img_h: int, img_w: int) -> str:
    x1, y1, x2, y2 = bbox
    cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
    v = 'upper' if cy < img_h / 3 else ('lower' if cy > 2 * img_h / 3 else 'middle')
    h = 'left'  if cx < img_w / 3 else ('right' if cx > 2 * img_w / 3 else 'center')
    return f'{v} {h}'


# ponytail: rough cost table — no external source, good enough for display
_BASE_COST = {
    'scratch': 200,  'rub': 150,        'dent': 500,
    'crack': 400,    'glass_shatter': 600, 'lamp_broken': 350,
    'tire_flat': 180, 'crash': 2000,    'dislocated_part': 800,
    'no_part': 700,
}

_SEV_MULT = {'minor': 1.0, 'moderate': 1.6, 'severe': 2.8}


def _cost(damage_type: str, sev: str, area_pct: float) -> int:
    base = _BASE_COST.get(damage_type, 300)
    mult = _SEV_MULT.get(sev, 1.0) * max(1.0, area_pct / 10.0)
    return int(base * mult)


def _decision(damages: list) -> str:
    if not damages:
        return 'AUTO_APPROVE'
    sevs = [d['severity'] for d in damages]
    if 'severe' in sevs:
        return 'ESCALATE'
    if sevs.count('moderate') >= 2:
        return 'HUMAN_REVIEW'
    if 'moderate' in sevs:
        return 'HUMAN_REVIEW'
    return 'AUTO_APPROVE'


_model = None


def _load():
    global _model
    if _model is None:
        from ultralytics import YOLO
        _model = YOLO(str(MODEL_PATH))
    return _model


def _assess_single(image_file) -> dict:
    from PIL import Image as PILImage
    import numpy as np

    model = _load()
    img = PILImage.open(image_file).convert('RGB')
    img_np = np.array(img)
    h, w = img_np.shape[:2]

    results = model(img_np, conf=CONFIDENCE_THRESHOLD, verbose=False)

    damages = []
    if results and results[0].boxes is not None:
        boxes = results[0].boxes
        names = model.names  # {0: 'crack', 1: 'crash', ...}
        for i in range(len(boxes)):
            bbox     = boxes.xyxy[i].cpu().numpy().astype(int).tolist()
            conf     = float(boxes.conf[i].cpu().numpy())
            cls_id   = int(boxes.cls[i].cpu().numpy())
            dtype    = names.get(cls_id, f'class_{cls_id}')
            area_pct = round(((bbox[2]-bbox[0])*(bbox[3]-bbox[1])) / (h*w) * 100, 2)
            sev      = _area_to_severity(area_pct)
            damages.append({
                'part':             _location(bbox, h, w),
                'damage_type':      dtype,
                'confidence':       round(conf, 3),
                'severity':         sev,
                'location':         _location(bbox, h, w),
                'area_percentage':  area_pct,
                'estimated_cost':   _cost(dtype, sev, area_pct),
            })

    # Score: no damage → 95; else penalise by average confidence of detections
    if not damages:
        score = 95
    else:
        avg_conf = sum(d['confidence'] for d in damages) / len(damages)
        score = max(0, round(100 * (1 - avg_conf)))

    return {'score': score, 'damages': damages}


def assess(image_files) -> dict:
    """
    Run assessment across all uploaded images; return the worst result.
    Worst = lowest condition score (most damage).
    """
    results = [_assess_single(f) for f in image_files]
    worst = min(results, key=lambda r: r['score'])

    score = worst['score']
    damages = worst['damages']

    return {
        'visual_condition_score': score,
        'condition_severity':     _severity_for_score(score),
        'detected_damages':       damages,
        'condition_decision':     _decision(damages),
    }
