import { useState } from "react";
import axios from "axios";

const API = "https://disaster-response-wj1d.onrender.com";

export default function DisasterForm({ onCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const disaster = {
      title,
      description,
      tags: tags
        .split(",")
        .map(tag => tag.trim())
        .filter(Boolean),
      owner_id: "netrunnerX"
    };

    try {
      await axios.post(`${API}/disasters/auto-create`, disaster);
      setTitle("");
      setDescription("");
      setTags("");
      onCreated(); // Callback to refresh disaster list
    } catch (err) {
      console.error("Failed to create disaster:", err);
      alert("Error submitting disaster. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: "500px", margin: "auto" }}>
      <h3>Create Disaster Report</h3>
      <input
        placeholder="Title"
        value={title}
        onChange={e => setTitle(e.target.value)}
        required
      />
      <textarea
        placeholder="Description (used to extract location)"
        value={description}
        onChange={e => setDescription(e.target.value)}
        required
      />
      <input
        placeholder="Tags (comma separated)"
        value={tags}
        onChange={e => setTags(e.target.value)}
      />
      <button type="submit">Submit</button>
    </form>
  );
}
