"""
Listing verification via OpenAI-compatible LLM (routed through OpenRouter).

Uses the same provider pattern as the standalone Car-Damage-Assessment-AI:
  LLM_BASE_URL  = https://openrouter.ai/api/v1
  LLM_API_KEY   = your OpenRouter key
  LLM_MODEL     = e.g. google/gemma-4-26b-a4b-it:free

If LLM_API_KEY is not set the call raises RuntimeError — the Node caller
(listingIntelligence.js) already catches that and skips the check rather
than blocking the listing. Fail-open on infra problems; fail-closed on
a real mismatch the model is confident about.

Checks performed (single prompt, structured JSON response):
  1. Does the vehicle in the photos match the claimed brand/model/year?
  2. Do all photos show the same physical vehicle?
  3. Is there enough of the car visible for a meaningful assessment?
     (rejects single tight close-ups with no body/logo visible)
  4. What is the overall damage severity from the photos?
"""

import base64
import json
import os

import requests

SEVERITY_LEVELS = ['No visible damage', 'Minor damage', 'Moderate damage', 'Severe damage']
REQUEST_TIMEOUT = 45  # seconds — vision calls are slower than text-only

SYSTEM_PROMPT = (
    'You are a strict vehicle listing verifier for a used-car marketplace. '
    'You will be shown one or more photos a seller uploaded, plus the brand, '
    'model, and year they claim. Examine the photos carefully and respond with '
    'ONLY a single JSON object — no markdown, no commentary, no extra text — '
    'matching exactly this shape:\n\n'
    '{\n'
    '  "vehicle_matches_claim": boolean,\n'
    '  "match_confidence": "high" | "medium" | "low",\n'
    '  "images_consistent": boolean,\n'
    '  "adequate_coverage": boolean,\n'
    '  "severity_assessment": "No visible damage" | "Minor damage" | "Moderate damage" | "Severe damage",\n'
    '  "damage_description": string,\n'
    '  "reasons": [string]\n'
    '}\n\n'
    'Rules:\n'
    '- "images_consistent" is false if ANY two photos clearly show DIFFERENT physical vehicles '
    '(different body colour, different body shape, different make/model visible). '
    'Even one mismatched photo makes this false. Be strict — this catches sellers who '
    'accidentally or deliberately mix photos of multiple cars.\n'
    '- "adequate_coverage" is false if ALL photos are tight close-ups with no '
    'full body, badge, or logo visible — a buyer cannot assess a car from one '
    'extreme close-up alone.\n'
    '- "vehicle_matches_claim" should be false if the visible badge/logo/shape '
    'clearly does not match the claimed brand/model.\n'
    '- Use "medium" or "low" match_confidence when genuinely uncertain — do not guess "high".\n'
    '- "reasons" lists short, specific, human-readable problems. Empty array if nothing is wrong.\n'
    '- "damage_description" is an empty string if no visible damage.'
)


def _encode(image_file) -> str:
    image_file.seek(0)
    data = base64.b64encode(image_file.read()).decode('ascii')
    mime = getattr(image_file, 'content_type', None) or 'image/jpeg'
    return f'data:{mime};base64,{data}'


def verify(image_files, brand, model, year) -> dict:
    """
    Returns:
      {
        'vehicle_matches_claim': bool,
        'match_confidence':      'high' | 'medium' | 'low',
        'images_consistent':     bool,
        'adequate_coverage':     bool,
        'severity_assessment':   one of SEVERITY_LEVELS,
        'damage_description':    str,
        'reasons':               [str],
      }

    Raises RuntimeError on missing key, or requests.HTTPError on API failure.
    The Node caller treats any exception as "check unavailable" and skips.
    """
    api_key  = os.environ.get('LLM_API_KEY', '').strip()
    base_url = os.environ.get('LLM_BASE_URL', 'https://openrouter.ai/api/v1').rstrip('/')
    model_id = os.environ.get('LLM_MODEL', 'google/gemma-4-26b-a4b-it:free').strip()

    if not api_key:
        raise RuntimeError('LLM_API_KEY is not set — listing verification skipped')

    user_content = [
        {
            'type': 'text',
            'text': (
                f'Claimed vehicle: {brand} {model}, year {year}. '
                f'{len(image_files)} photo(s) attached.'
            ),
        },
    ]
    for f in image_files:
        user_content.append({
            'type':      'image_url',
            'image_url': {'url': _encode(f)},
        })

    response = requests.post(
        f'{base_url}/chat/completions',
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type':  'application/json',
        },
        json={
            'model':       model_id,
            'temperature': 0.2,
            'messages': [
                {'role': 'system', 'content': SYSTEM_PROMPT},
                {'role': 'user',   'content': user_content},
            ],
        },
        timeout=REQUEST_TIMEOUT,
    )
    response.raise_for_status()

    raw = response.json()['choices'][0]['message']['content']

    # Strip markdown fences if the model wraps its JSON anyway
    cleaned = raw.strip()
    if cleaned.startswith('```'):
        cleaned = cleaned.split('```')[1]
        if cleaned.startswith('json'):
            cleaned = cleaned[4:]
    result = json.loads(cleaned.strip())

    # Defensive normalisation — free-tier models occasionally drift from schema
    return {
        'vehicle_matches_claim': bool(result.get('vehicle_matches_claim', True)),
        'match_confidence':      result.get('match_confidence') if result.get('match_confidence') in ('high', 'medium', 'low') else 'low',
        'images_consistent':     bool(result.get('images_consistent', True)),
        'adequate_coverage':     bool(result.get('adequate_coverage', True)),
        'severity_assessment':   result.get('severity_assessment') if result.get('severity_assessment') in SEVERITY_LEVELS else 'No visible damage',
        'damage_description':    str(result.get('damage_description') or ''),
        'reasons':               [str(r) for r in result.get('reasons', []) if r],
    }
