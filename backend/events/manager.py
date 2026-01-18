from backend.cv.detector import detect_event_from_video, detect_event_mock

def process_event(video_url: str | None = None, requested_type: str | None = None):
    if video_url:
        result = detect_event_from_video(video_url)
    else:
        result = detect_event_mock(requested_type)

    # You can add here: if confidence > threshold → send notification
    msg = f"Room {result['room']}: {result['type']} ({result['confidence']:.2f}) → {result.get('nurse_message','')}"
    print(f"[EVENT] {msg}")

    return result