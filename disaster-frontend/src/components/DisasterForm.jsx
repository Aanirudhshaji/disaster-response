import { useState } from "react";
import axios from "axios";

const API = "http://localhost:5001";

export default function DisasterForm({ onCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const disaster = {
      title,
      description,
      tags: tags.split(",").map(t => t.trim()),
      owner_id: "netrunnerX"
    };
    await axios.post(`${API}/disasters`, disaster);
    setTitle("");
    setDescription("");
    setTags("");
    onCreated();
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3>Create Disaster</h3>
      <input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} required />
      <textarea placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
      <input placeholder="Tags (comma separated)" value={tags} onChange={e => setTags(e.target.value)} />
      <button type="submit">Submit</button>
    </form>
  );
}
