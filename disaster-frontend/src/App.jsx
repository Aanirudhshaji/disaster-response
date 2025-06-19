import DisasterForm from "./components/DisasterForm";
import DisasterList from "./components/DisasterList";

function App() {
  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}>
      <h1>🌍 Disaster Response Platform</h1>
      <DisasterForm onCreated={() => window.location.reload()} />
      <hr />
      <DisasterList />
    </div>
  );
}

export default App;
