import streamlit as st
import requests

st.title("IntelliCare AI Dashboard")

if st.button("Simulate Event"):
    try:
        r = requests.get("http://localhost:8000/event")
        st.write("Raw response:", r.text)

        data = r.json()

        st.subheader(f"🚨 Room {data['room']}")
        st.write(data["type"])
        st.success(data["explanation"])

    except Exception as e:
        st.error(f"Request failed: {e}")