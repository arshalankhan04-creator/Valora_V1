"""
Step 4 — AI listing verification via OpenRouter (vision-capable LLM).

This is the last-line-of-defense check: given the photos a seller uploaded
plus the brand/model/year they typed into the form, ask a vision model
whether the photos actually show that vehicle, whether all photos show the
*same* vehicle, and to independently describe any visible damage. This runs
after Step 2's vehicle_check (which only confirms "a vehicle is present",
not "the right vehicle").

Independent from Step 3's condition_assessment CNN by design — this model
is never shown Step 3's output, so its own severity_assessment is a real
second opinion, not an echo of the first one. listingController.js on the
Node side compares the two afterwards.

No local model, no training — this is a live API call. Network/parsing
failures are allowed to propagate (not caught here); the Node caller treats
an unreachable check the same way it treats vehicle_check being down: skip
rather than block, since a seller shouldn't be locked out of listing a car
because a free-tier third-party API had a bad moment. A response that
successfully comes back and reports a problem is a different thing
entirely and is NOT swallowed anywhere in this chain.
"""

import base64
import json
import os

import requests

OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
REQUEST_TIMEOUT = 45  # seconds — vision calls are slower than text-only

# Mirrors condition_assessment/inference.py's LABEL_MAP severity strings
# exactly, so Node can compare Step 3's and Step 4's severity readings as
# plain string equality, not fuzzy matching.
SEVERITY_LEVELS = ['No visible damage', 'Minor damage', 'Moderate damage', 'Severe damage']

SYSTEM_PROMPT = (
    'You are a strict vehicle listing verifier for a used-car marketplace. '
    'You will be shown one or more photos a seller uploaded, plus the brand, '
    'model, and year they claim the vehicle is. Examine the photos carefully '
    'and respond with ONLY a single JSON object — no markdown, no commentary, '
    'no text before or after it — matching exactly this shape:\n\n'
    '{\n'
    '  "vehicle_matches_claim": boolean,   // does the vehicle in the photos look like the claimed brand/model?\n'
    '  "match_confidence": "high" | "medium" | "low",   // your confidence in the vehicle_matches_claim judgment\n'
    '  "images_consistent": boolean,   // if multiple photos were given, do they all show the SAME physical vehicle?\n'
    '  "severity_assessment": "No visible damage" | "Minor damage" | "Moderate damage" | "Severe damage",\n'
    '  "damage_description": string,   // plain-language, e.g. "small dent on the front bumper, scratch on the rear-left door". Empty string if no visible damage.\n'
    '  "reasons": [string]   // short, specific, human-readable reasons for any problem found. Empty array if nothing is wrong.\n'
    '}\n\n'
    'Be honest about uncertainty — use "medium" or "low" confidence rather than guessing "high". '
    'Judge severity_assessment purely from what you see; you have not been told what any other system concluded.'
)


def _encode_image(image_file):
    image_file.seek(0)
    data = base64.b64encode(image_file.read()).decode('ascii')
    mime = getattr(image_file, 'content_type', None) or 'image/jpeg'
    return f'data:{mime};base64,{data}'


def _build_messages(image_files, brand, model, year):
    user_content = [
        {
            'type': 'text',
            'text': (
                f'Claimed vehicle: {brand} {model}, {year}. '
                f'{len(image_files)} photo(s) attached below.'
            ),
        },
    ]
    for image_file in image_files:
        user_content.append({
            'type': 'image_url',
            'image_url': {'url': _encode_image(image_file)},
        })

    return [
        {'role': 'system', 'content': SYSTEM_PROMPT},
        {'role': 'user', 'content': user_content},
    ]


def verify(image_files, brand, model, year):
    """
    Returns:
      {
        'vehicle_matches_claim': bool,
        'match_confidence': 'high' | 'medium' | 'low',
        'images_consistent': bool,
        'severity_assessment': one of SEVERITY_LEVELS,
        'damage_description': str,
        'reasons': [str],
      }

    Raises on network failure or an unparseable response — the caller
    (Node's mlService.js via the view below) is responsible for treating
    that as "check unavailable", not "listing rejected".
    """
    api_key = os.environ.get('OPENROUTER_API_KEY')
    model_id = os.environ.get('OPENROUTER_MODEL', 'google/gemma-4-26b-a4b-it:free')
    if not api_key:
        raise RuntimeError('OPENROUTER_API_KEY is not set')

    response = requests.post(
        OPENROUTER_URL,
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json',
        },
        json={
            'model': model_id,
            'messages': _build_messages(image_files, brand, model, year),
            'response_format': {'type': 'json_object'},
            'temperature': 0.2,  # low — this is a judgment call, not creative writing
        },
        timeout=REQUEST_TIMEOUT,
    )
    response.raise_for_status()

    content = response.json()['choices'][0]['message']['content']
    result = json.loads(content)

    # Defensive normalization — a free-tier model can still drift from the
    # requested schema occasionally; fall back to safe defaults per-field
    # rather than letting one malformed field take down the whole response.
    return {
        'vehicle_matches_claim': bool(result.get('vehicle_matches_claim', True)),
        'match_confidence': result.get('match_confidence') if result.get('match_confidence') in ('high', 'medium', 'low') else 'low',
        'images_consistent': bool(result.get('images_consistent', True)),
        'severity_assessment': result.get('severity_assessment') if result.get('severity_assessment') in SEVERITY_LEVELS else 'No visible damage',
        'damage_description': str(result.get('damage_description') or ''),
        'reasons': [str(r) for r in result.get('reasons', []) if r],
    }
