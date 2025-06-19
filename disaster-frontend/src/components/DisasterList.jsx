import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:5001";

export default function DisasterList() {
  const [disasters, setDisasters] = useState([]);
  const [reports, setReports] = useState({});

  const load = async () => {
    const res = await axios.get(`${API}/disasters`);
    setDisasters(res.data);
  };

  const submitReport = async (id) => {
    const content = reports[id]?.content || "";
    const image_url = reports[id]?.image_url || "";
    await axios.post(`${API}/disasters/${id}/reports`, {
      user_id: "citizen42",
      content,
      image_url
    });
    alert("Report submitted!");
    setReports({ ...reports, [id]: { content: "", image_url: "" } });
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <h3>All Disasters</h3>
      {disasters.map((d) => (
        <div key={d.id} style={{ border: "1px solid #ccc", marginBottom: 10, padding: 10 }}>
          <strong>{d.title}</strong>
          <p>{d.description}</p>
          <small>{d.location_name || "No location"}</small>

          <h4>Submit Report</h4>
          <textarea
            placeholder="Report content"
            value={reports[d.id]?.content || ""}
            onChange={e => setReports({ ...reports, [d.id]: { ...reports[d.id], content: e.target.value } })}
          />
          <input
            placeholder="Image URL (optional)"
            value={reports[d.id]?.image_url || ""}
            onChange={e => setReports({ ...reports, [d.id]: { ...reports[d.id], image_url: e.target.value } })}
          />
          <button onClick={() => submitReport(d.id)}>Send Report</button>
        </div>
      ))}
    </div>
  );
}
