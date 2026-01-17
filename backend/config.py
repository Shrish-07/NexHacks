import os
from dotenv import load_dotenv

load_dotenv()

TOKEN_KEY = os.getenv("TOKEN_COMPANY_API_KEY")
OPENAI_KEY = os.getenv("OPENAI_API_KEY")

LIVEKIT_API_KEY = os.getenv("LIVEKIT_API_KEY")
LIVEKIT_API_SECRET = os.getenv("LIVEKIT_API_SECRET")
LIVEKIT_URL = os.getenv("LIVEKIT_URL")