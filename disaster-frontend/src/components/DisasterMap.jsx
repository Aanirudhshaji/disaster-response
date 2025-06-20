import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export default function DisasterMap({ disasters }) {
  return (
    <MapContainer center={[10.5, 76.5]} zoom={6} style={{ height: "400px", marginTop: 20 }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {disasters.map(d => (
        d.latitude && d.longitude && (
          <Marker key={d.id} position={[d.latitude, d.longitude]}>
            <Popup>
              <b>{d.title}</b><br />
              {d.description}
            </Popup>
          </Marker>
        )
      ))}
    </MapContainer>
  );
}
