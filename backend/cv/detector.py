import random

def detect_event():
    # Replace with YOLO pipeline later
    events = [
        ("Fall detected", 0.91),
        ("Bed exit detected", 0.87),
        ("Wandering detected", 0.82),
        ("Prolonged inactivity", 0.78)
    ]

    room = random.randint(1, 6)
    event, confidence = random.choice(events)

    return {
        "room": room,
        "type": event,
        "confidence": confidence
    }