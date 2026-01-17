from backend.cv.detector import detect_event_from_video, detect_event

def process_event(video_url=None):
    if video_url:
        return detect_event_from_video(video_url)
    else:
        
        return detect_event()

def get_error_response(error_message):
    return {"error": error_message}