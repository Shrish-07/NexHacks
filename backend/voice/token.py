from datetime import timedelta
from livekit import api
from backend.config import LIVEKIT_API_KEY, LIVEKIT_API_SECRET


def create_agent_token(
    room_name: str,
    identity: str = "nurse_001",
    name: str = "Nurse Assistant",
    ttl: timedelta = timedelta(hours=24)
) -> str:
    """
    Create a JWT access token for an agent participant.
    Agent gets full publish/subscribe permissions in the specified room.
    """
    token = (
        api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
        .with_identity(identity)
        .with_name(name)
        .with_grants(
            api.VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=True,       # agent speaks → publish audio
                can_publish_data=True,  # optional: send text/data messages
                can_subscribe=True,     # agent hears participants
            )
        )
        .with_ttl(ttl)
    )

    return token.to_jwt()