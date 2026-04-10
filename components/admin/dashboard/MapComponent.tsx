'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Clock, CheckCircle } from 'lucide-react';

// Fix Leaflet marker icon issue in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Accurate GPS Coordinates for Arunachal Pradesh Districts
const AP_COORDS: Record<string, [number, number]> = {
  'tawang': [27.58, 91.86],
  'west kameng': [27.26, 92.42],
  'east kameng': [27.36, 93.03],
  'papum pare': [27.10, 93.62],
  'itanagar': [27.09, 93.60],
  'naharlagun': [27.10, 93.69],
  'lower subansiri': [27.54, 93.83],
  'kurung kumey': [27.91, 93.18],
  'upper subansiri': [27.98, 94.22],
  'west siang': [28.16, 94.80],
  'east siang': [28.06, 95.33],
  'upper siang': [28.61, 95.04],
  'lower dibang valley': [28.14, 95.84],
  'lohit': [27.92, 96.16],
  'namsai': [27.67, 95.88],
  'changlang': [27.12, 95.74],
  'tirap': [27.01, 95.50],
  'longding': [26.83, 95.30],
  'kra daadi': [27.78, 93.01],
  'dibang valley': [28.87, 95.96],
  'anjaw': [27.99, 96.86],
  'lepa rada': [27.79, 94.63],
  'shi yomi': [28.12, 94.33]
};

const getPriorityColor = (priority: string) => {
    if (priority === 'critical') return '#e11d48'; // rose-600
    if (priority === 'high') return '#f97316';    // orange-500
    if (priority === 'medium') return '#fbbf24';  // amber-400
    return '#10b981';                             // emerald-500
};

function MapUpdater({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function InteractiveMap({ incidents, selectedLocation, onLocationSelect }: { incidents: any[], selectedLocation?: string | null, onLocationSelect?: (loc: string) => void }) {
  const groupedByLocation = incidents.reduce((acc, inc) => {
    const loc = (inc.district || inc.location || inc._id.loc || 'Unknown Area').toLowerCase().trim();
    if (!acc[loc]) acc[loc] = [];
    acc[loc].push(inc);
    return acc;
  }, {} as Record<string, any[]>);

  const mapNodes = Object.entries(groupedByLocation).map(([loc, areaIncidentsArray]) => {
    const areaIncidents = areaIncidentsArray as any[];
    const maxPriority = areaIncidents.reduce((prev: string, curr: any) => {
      const priorities = ['low', 'medium', 'high', 'critical'];
      return priorities.indexOf(curr.priority) > priorities.indexOf(prev) ? curr.priority : prev;
    }, 'low');
    const totalInLoc = areaIncidents.reduce((a: number, b: any) => a + (b.complaintCount || 0), 0);
    const resolvedInLoc = areaIncidents.reduce((a: number, b: any) => a + (b.resolvedCount || 0), 0);
    const pendingInLoc = areaIncidents.reduce((a: number, b: any) => a + (b.pendingCount || 0), 0);

    return {
      loc,
      coords: AP_COORDS[loc] || null,
      areaIncidents,
      maxPriority,
      totalInLoc,
      resolvedInLoc,
      pendingInLoc
    };
  });

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-slate-200">
      <MapContainer
        center={[28.21, 94.72]} // Center of Arunachal Pradesh
        zoom={6}
        style={{ width: '100%', height: '100%', zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {mapNodes.map((node) => {
          if (!node.coords) return null; // Skip unknown regions
          const color = getPriorityColor(node.maxPriority);

          return (
            <CircleMarker eventHandlers={{ click: () => onLocationSelect ? onLocationSelect(node.loc) : null }}
              key={node.loc}
              center={node.coords}
              radius={node.pendingInLoc > 10 ? 16 : 12}
              pathOptions={{ fillColor: color, color: color, fillOpacity: 0.6 }}
            >
              <Popup>
                <div className="p-1 min-w-[200px]">
                  <h3 className="font-bold text-slate-900 uppercase tracking-tight text-sm border-b pb-1">{node.loc}</h3>
                  <div className="flex justify-between items-center text-xs mt-2 font-bold mb-3">
                      <span className="text-amber-600 flex items-center gap-1"><Clock size={12}/> {node.pendingInLoc} Pending</span>
                      <span className="text-emerald-600 flex items-center gap-1"><CheckCircle size={12}/> {node.resolvedInLoc} Resolved</span>
                  </div>
                  <div className="space-y-1.5 mt-2 max-h-32 overflow-y-auto pr-1">
                    {node.areaIncidents.map((inc: any, i: number) => (
                       <div key={i} className="flex justify-between items-center text-[10px]">
                         <span className="text-slate-600 font-medium capitalize truncate pr-2" title={inc.category}>
                            {inc.category === 'pending_ai' ? 'Pending Analysis' : inc.category.replace(/_/g, ' ')}
                         </span>
                         <div className="flex gap-1 shrink-0">
                           {inc.pendingCount > 0 && <span className="bg-amber-100 text-amber-700 px-1 rounded">{inc.pendingCount} P</span>}
                           {inc.resolvedCount > 0 && <span className="bg-emerald-100 text-emerald-700 px-1 rounded">{inc.resolvedCount} R</span>}
                         </div>
                       </div>
                    ))}
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}