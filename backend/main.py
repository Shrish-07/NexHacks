from fastapi import FastAPI
from backend.events.manager import process_event

app = FastAPI()

@app.get("/event")
def get_event():
    return process_event()
