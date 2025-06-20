import { useState, useEffect } from "react";
import io from "socket.io-client";
import axios from "axios";
import DisasterForm from "./components/DisasterForm";
import DisasterList from "./components/DisasterList";
import DisasterMap from "./components/DisasterMap";

const API = "https://disaster-response-wj1d.onrender.com";

function App() {
  const [disasters, setDisasters] = useState([]);

  const loadDisasters = async () => {
    try {
      const res = await axios.get(`${API}/disasters`);
      setDisasters(res.data);
    } catch (err) {
      console.error("Failed to load disasters:", err);
    }
  };

  useEffect(() => {
    loadDisasters();

    const socket = io(API);
    socket.on("disaster_updated", () => loadDisasters());
    socket.on("resources_updated", () => loadDisasters());

    return () => socket.disconnect();
  }, []);

  return (
    <div className="container">
      <h1>🌍 Disaster Response Platform</h1>
      <DisasterForm onCreated={loadDisasters} />
      <DisasterMap disasters={disasters} />
      <DisasterList disasters={disasters} />
    </div>
  );
}

export default App;
