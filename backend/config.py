import os
from dotenv import load_dotenv

load_dotenv()

LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
LIVEKIT_URL = os.getenv("LIVEKIT_URL")

TOKEN_KEY = os.getenv("TOKEN_KEY")
OVERSHOOT_API_KEY = os.getenv("OVERSHOOT_API_KEY")

print("DEBUG: OVERSHOOT_API_KEY loaded as:", OVERSHOOT_API_KEY if OVERSHOOT_API_KEY else "MISSING")