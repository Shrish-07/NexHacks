import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchEvent = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:8000/event'); // Your backend API
      setEventData(response.data);
    } catch (error) {
      console.error('Error fetching event:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>IntelliCare AI Dashboard</h1>
      <button onClick={fetchEvent} disabled={loading}>
        {loading ? 'Fetching Event...' : 'Simulate Event'}
      </button>

      {eventData && (
        <div>
          <h2>Room: {eventData.room}</h2>
          <p>Type: {eventData.type}</p>
          <p>Confidence: {eventData.confidence}</p>
          <p>Explanation: {eventData.explanation}</p>
        </div>
      )}
    </div>
  );
}

export default App;
