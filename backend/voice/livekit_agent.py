from livekit.agents import VoiceAgent

agent = VoiceAgent()

@agent.on_message
async def handle(msg):
    text = msg.text.lower()

    if "status" in text:
        await agent.say("All rooms monitored. No critical alerts.")
    elif "alert" in text:
        await agent.say("Latest alert was a possible bed exit in Room 2.")
    else:
        await agent.say("You can ask me for status or alerts.")

agent.run()