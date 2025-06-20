import { useState, useEffect } from "react";
import axios from "axios";
import { io } from "socket.io-client";

const API = "https://disaster-response-wj1d.onrender.com";

export default function DisasterList() {
  const [disasters, setDisasters] = useState([]);
  const [reports, setReports] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [socialPosts, setSocialPosts] = useState({});
  const [resources, setResources] = useState({});
  const [updates, setUpdates] = useState({});
  const [imageUrl, setImageUrl] = useState("");
  const [aiResult, setAiResult] = useState({});

  const load = async () => {
    try {
      const res = await axios.get(`${API}/disasters`);
      setDisasters(res.data);
    } catch (err) {
      alert("Failed to load disasters.");
    }
  };

  const submitReport = async (id) => {
    const content = reports[id]?.content || "";
    const image_url = reports[id]?.image_url || "";
    if (!content.trim()) return alert("Report content is required.");
    try {
      await axios.post(`${API}/disasters/${id}/reports`, {
        user_id: "citizen42",
        content,
        image_url
      });
      alert("Report submitted!");
      setReports({ ...reports, [id]: { content: "", image_url: "" } });
    } catch {
      alert("Failed to submit report.");
    }
  };

  const handleEdit = (d) => {
    setEditingId(d.id);
    setEditData({
      title: d.title,
      description: d.description,
      tags: Array.isArray(d.tags) ? d.tags.join(", ") : d.tags,
      location_name: d.location_name || ""
    });
  };

  const handleEditSubmit = async (e, id) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/disasters/${id}`, {
        ...editData,
        tags: editData.tags.split(",").map(t => t.trim()),
        user_id: "reliefAdmin"
      });
      setEditingId(null);
      load();
    } catch {
      alert("Failed to update disaster");
    }
  };

  const fetchSocialMedia = async (id) => {
    const res = await axios.get(`${API}/disasters/${id}/social-media`);
    setSocialPosts(prev => ({ ...prev, [id]: res.data }));
  };

  const fetchResources = async (d) => {
    const res = await axios.get(`${API}/disasters/${d.id}/resources`, {
      params: { lat: d.latitude, lon: d.longitude }
    });
    setResources(prev => ({ ...prev, [d.id]: res.data }));
  };

  const fetchUpdates = async (id) => {
    const res = await axios.get(`${API}/disasters/${id}/official-updates`);
    setUpdates(prev => ({ ...prev, [id]: res.data.data }));
  };

  const verifyImage = async (id) => {
    try {
      const res = await axios.post(`${API}/disasters/${id}/verify-image`, {
        image_url: imageUrl
      });
      setAiResult(prev => ({ ...prev, [id]: res.data.result }));
    } catch {
      alert("Verification failed");
    }
  };

  useEffect(() => {
    load();

    const socket = io(API);
    socket.on("disaster_updated", () => load());
    socket.on("resources_updated", () => load());
    return () => socket.disconnect();
  }, []);

  return (
    <div>
      <h2>All Disasters</h2>
      {disasters.map((d) => (
        <div key={d.id} style={{ border: "1px solid #ccc", marginBottom: 20, padding: 10 }}>
          <h3>{d.title}</h3>
          <p>{d.description}</p>
          <small>📍 {d.location_name || "Unknown"}</small>

          {editingId === d.id ? (
            <form onSubmit={e => handleEditSubmit(e, d.id)}>
              <input value={editData.title} onChange={e => setEditData({ ...editData, title: e.target.value })} placeholder="Title" />
              <textarea value={editData.description} onChange={e => setEditData({ ...editData, description: e.target.value })} />
              <input value={editData.tags} onChange={e => setEditData({ ...editData, tags: e.target.value })} placeholder="Tags (comma)" />
              <input value={editData.location_name} onChange={e => setEditData({ ...editData, location_name: e.target.value })} placeholder="Location name" />
              <button type="submit">Update</button>
              <button type="button" onClick={() => setEditingId(null)}>Cancel</button>
            </form>
          ) : (
            <button onClick={() => handleEdit(d)}>Edit</button>
          )}

          <h4>📢 Submit Report</h4>
          <textarea
            placeholder="Report content"
            value={reports[d.id]?.content || ""}
            onChange={e =>
              setReports({ ...reports, [d.id]: { ...reports[d.id], content: e.target.value } })
            }
          />
          <input
            placeholder="Image URL (optional)"
            value={reports[d.id]?.image_url || ""}
            onChange={e =>
              setReports({ ...reports, [d.id]: { ...reports[d.id], image_url: e.target.value } })
            }
          />
          <button onClick={() => submitReport(d.id)}>Send Report</button>

          <h4>📸 Image Verification</h4>
          <input placeholder="Image URL" value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
          <button onClick={() => verifyImage(d.id)}>Verify</button>
          {aiResult[d.id] && <p>AI says: {aiResult[d.id]}</p>}

          <div>
            <h4>🌐 Social Media</h4>
            <button onClick={() => fetchSocialMedia(d.id)}>Load Posts</button>
            <ul>
              {(socialPosts[d.id] || []).map((p, i) => (
                <li key={i}><strong>{p.user}</strong>: {p.post}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4>🏥 Nearby Resources</h4>
            <button onClick={() => fetchResources(d)}>Show Resources</button>
            <ul>
              {(resources[d.id] || []).map((r, i) => (
                <li key={i}>{r.type}: {r.name}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4>📢 NDMA Updates</h4>
            <button onClick={() => fetchUpdates(d.id)}>Fetch Official Updates</button>
            <ul>
              {(updates[d.id] || []).map((u, i) => (
                <li key={i}>{u.update}</li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}
