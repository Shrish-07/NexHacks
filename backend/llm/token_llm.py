import requests
from backend.config import TOKEN_KEY, OPENAI_KEY

def compress(text: str) -> str:
    try:
        r = requests.post(
            "https://api.thetokencompany.com/compress",
            headers={
                "Authorization": f"Bearer {TOKEN_KEY}",
                "Content-Type": "application/json"
            },
            json={"model": "bear-1", "text": text},
            timeout=10
        )

        data = r.json()
        return data.get("compressed_text", text)

    except Exception as e:
        print("Compression failed:", e)
        return text


def explain(event_text: str) -> str:
    compressed = compress(event_text)

    try:
        r = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENAI_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": "You are a calm clinical AI assistant."},
                    {"role": "user", "content": f"Explain this event clearly for a nurse: {compressed}"}
                ],
                "temperature": 0.4
            },
            timeout=15
        )

        data = r.json()

        if "choices" not in data:
            print("OpenAI error:", data)
            return "LLM unavailable, but event detected successfully."

        return data["choices"][0]["message"]["content"]

    except Exception as e:
        print("LLM call failed:", e)
        return "LLM unavailable, but event detected successfully."