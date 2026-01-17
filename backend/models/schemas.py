from pydantic import BaseModel

class Event(BaseModel):
    room: int
    type: str
    confidence: float