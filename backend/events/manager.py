from backend.cv.detector import detect_event
from backend.llm.token_llm import explain

def process_event():
    event = detect_event()
    explanation = explain(event["type"])

    return {
        **event,
        "explanation": explanation
    }