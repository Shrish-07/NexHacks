from fastapi import FastAPI, HTTPException
from backend.events.manager import process_event

app = FastAPI()

@app.get("/event")
def get_event(video_url: str = None):
    try:
        event_data = process_event(video_url) 
        if "error" in event_data:
            raise HTTPException(status_code=400, detail=event_data["error"])
        return event_data  
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
