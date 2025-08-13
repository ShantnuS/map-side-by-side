import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet-draw';
import * as turf from '@turf/turf';
// Logo is now text-based, no SVG import needed

type GeoJsonPolygon = GeoJSON.Feature<GeoJSON.Polygon>;

const DEFAULT_LEFT: [number, number] = [37.7749, -122.4194];
const DEFAULT_RIGHT: [number, number] = [40.7128, -74.006];

function rotatePolygon(polygon: GeoJsonPolygon, degrees: number): GeoJsonPolygon {
	if (Math.abs(degrees) < 0.0001) return polygon;
	const c = turf.centroid(polygon);
	const rotated = turf.transformRotate(polygon, degrees, { pivot: c.geometry.coordinates as [number, number] });
	return rotated as GeoJsonPolygon;
}

// Polygon-only drawing (preset shape creators removed)

export const App: React.FC = () => {
	const leftContainerRef = useRef<HTMLDivElement | null>(null);
	const rightContainerRef = useRef<HTMLDivElement | null>(null);
	const leftMapRef = useRef<L.Map | null>(null);
	const rightMapRef = useRef<L.Map | null>(null);
	const leftOverlayRef = useRef<L.GeoJSON | null>(null);
	const rightOverlayRef = useRef<L.GeoJSON | null>(null);

	const [leftPolygon, setLeftPolygon] = useState<GeoJsonPolygon | null>(null);
	const [rotationDeg, setRotationDeg] = useState<number>(0);
	const [satelliteLeft, setSatelliteLeft] = useState(() => {
		const saved = localStorage.getItem('satelliteLeft');
		return saved ? JSON.parse(saved) : false;
	});
	const [satelliteRight, setSatelliteRight] = useState(() => {
		const saved = localStorage.getItem('satelliteRight');
		return saved ? JSON.parse(saved) : false;
	});
	const [rightTargetCenter, setRightTargetCenter] = useState<[number, number]>(DEFAULT_RIGHT);
	const [searchQuery, setSearchQuery] = useState('');
	const [searchOnLeft, setSearchOnLeft] = useState(true);
	const [isSearching, setIsSearching] = useState(false);
    // Rectangle drawer removed (polygon-only)

	const rotatedLeft = useMemo(() => leftPolygon ? rotatePolygon(leftPolygon, rotationDeg) : null, [leftPolygon, rotationDeg]);

	const mirroredRight = useMemo(() => {
		if (!rotatedLeft) return null;
		const sourceCentroid = turf.centroid(rotatedLeft).geometry.coordinates as [number, number];
		const targetCenter: [number, number] = [rightTargetCenter[1], rightTargetCenter[0]];
		const ring = rotatedLeft.geometry.coordinates[0];
		const newRing: [number, number][] = ring.map(([lng, lat]) => {
			const dMeters = turf.distance(sourceCentroid, [lng, lat], { units: 'meters' });
			const brg = turf.bearing(sourceCentroid, [lng, lat]);
			const pt = turf.destination(targetCenter, dMeters, brg, { units: 'meters' });
			return [pt.geometry.coordinates[0], pt.geometry.coordinates[1]];
		});
		return turf.polygon([newRing]) as GeoJsonPolygon;
	}, [rotatedLeft, rightTargetCenter]);

	// Initialize maps and draw controls
	useEffect(() => {
		if (leftContainerRef.current && !leftMapRef.current) {
			const map = L.map(leftContainerRef.current).setView(DEFAULT_LEFT, 13);
			L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(map);
			leftMapRef.current = map;
			const drawControl = new (L as any).Control.Draw({
				draw: { marker: false, circle: false, polyline: false, circlemarker: false, polygon: { allowIntersection: true, showArea: true }, rectangle: false },
				edit: false
			});
			map.addControl(drawControl);
			map.on((L as any).Draw.Event.DRAWSTART, () => {
				if (leftOverlayRef.current) {
					map.removeLayer(leftOverlayRef.current);
					leftOverlayRef.current = null;
				}
			});

            // No rectangle drawer (polygon only)
			map.on((L as any).Draw.Event.CREATED, (e: any) => {
				const layer = e.layer as L.Layer;
				const gj = (layer as any).toGeoJSON() as GeoJsonPolygon;
				if ((layer as any).remove) (layer as any).remove();
				setLeftPolygon(gj);
			});
            // No preset shapes
		}
		if (rightContainerRef.current && !rightMapRef.current) {
			const map = L.map(rightContainerRef.current).setView(DEFAULT_RIGHT, 13);
			L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(map);
			rightMapRef.current = map;
			map.on('moveend', () => {
				const c = map.getCenter();
				setRightTargetCenter([c.lat, c.lng]);
			});
			const c = map.getCenter();
			setRightTargetCenter([c.lat, c.lng]);
		}
    }, []);

	// Update left overlay when shape/rotation changes
	useEffect(() => {
		const map = leftMapRef.current;
		if (!map) return;
		if (leftOverlayRef.current) {
			map.removeLayer(leftOverlayRef.current);
			leftOverlayRef.current = null;
		}
		if (rotatedLeft) {
			leftOverlayRef.current = L.geoJSON(rotatedLeft as any, { style: { color: '#2563eb', interactive: false } as any, interactive: false });
			leftOverlayRef.current.addTo(map);
		}
	}, [rotatedLeft]);

	// Update right overlay when mirrored changes
	useEffect(() => {
		const map = rightMapRef.current;
		if (!map) return;
		if (rightOverlayRef.current) {
			map.removeLayer(rightOverlayRef.current);
			rightOverlayRef.current = null;
		}
		if (mirroredRight) {
			rightOverlayRef.current = L.geoJSON(mirroredRight as any, { style: { color: '#e11d48', interactive: false } as any, interactive: false });
			rightOverlayRef.current.addTo(map);
		}
	}, [mirroredRight]);

    // Toggle satellites (left)
    useEffect(() => {
		const map = leftMapRef.current;
		if (!map) return;
        // Keep reference tiles so we don't remove overlays
        const currentBase = (map as any)._layers ? Object.values((map as any)._layers).find((l: any) => l instanceof L.TileLayer) as L.TileLayer | undefined : undefined;
        if (currentBase) map.removeLayer(currentBase);
        const next = satelliteLeft
            ? L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: '© Esri' })
            : L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' });
        next.addTo(map);
	}, [satelliteLeft]);

    // Toggle satellites (right)
    useEffect(() => {
		const map = rightMapRef.current;
		if (!map) return;
        const currentBase = (map as any)._layers ? Object.values((map as any)._layers).find((l: any) => l instanceof L.TileLayer) as L.TileLayer | undefined : undefined;
        if (currentBase) map.removeLayer(currentBase);
        const next = satelliteRight
            ? L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: '© Esri' })
            : L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' });
        next.addTo(map);
	}, [satelliteRight]);

	// Save satellite preferences to localStorage
	useEffect(() => {
		localStorage.setItem('satelliteLeft', JSON.stringify(satelliteLeft));
	}, [satelliteLeft]);

	useEffect(() => {
		localStorage.setItem('satelliteRight', JSON.stringify(satelliteRight));
	}, [satelliteRight]);

    // Search functionality using Nominatim geocoding
	const handleSearch = useCallback(async (e: React.FormEvent) => {
		e.preventDefault();
		if (!searchQuery.trim()) return;
		
		setIsSearching(true);
		try {
			const response = await fetch(
				`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
			);
			const results = await response.json();
			
			if (results.length > 0) {
				const result = results[0];
				const lat = parseFloat(result.lat);
				const lon = parseFloat(result.lon);
				
				const targetMap = searchOnLeft ? leftMapRef.current : rightMapRef.current;
				if (targetMap) {
					targetMap.setView([lat, lon], 13);
					if (!searchOnLeft) {
						setRightTargetCenter([lat, lon]);
					}
				}
			}
		} catch (error) {
			console.error('Search failed:', error);
		} finally {
			setIsSearching(false);
		}
	}, [searchQuery, searchOnLeft]);

    // Removed preset shapes and rectangle draw actions

	return (
		<div className="app">
			<div className="toolbar">
                <div className="logo">
					<span className="logo-text">
						Map<span className="logo-side-orange">Side</span>By<span className="logo-side-blue">Side</span>
					</span>
				</div>
				<div className="search-section">
					<form onSubmit={handleSearch} className="search-form">
						<input
							type="text"
							placeholder="Search location..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="search-input"
							disabled={isSearching}
						/>
						<div className="search-toggle">
							<span className={searchOnLeft ? 'active' : ''}>Left</span>
							<label className="toggle-switch">
								<input 
									type="checkbox" 
									checked={!searchOnLeft} 
									onChange={(e) => setSearchOnLeft(!e.target.checked)}
								/>
								<span className="slider"></span>
							</label>
							<span className={!searchOnLeft ? 'active' : ''}>Right</span>
						</div>
						<button type="submit" disabled={isSearching || !searchQuery.trim()} className="search-button">
							{isSearching ? '🔍' : '🔍'}
						</button>
					</form>
				</div>
				<div className="rotation-section">
					<label>Rotate: {rotationDeg.toFixed(0)}°</label>
					<input type="range" min={-180} max={180} step={1} value={rotationDeg} onChange={e => setRotationDeg(parseInt(e.target.value, 10))} />
					<button onClick={() => setRotationDeg(0)}>Reset</button>
				</div>
			</div>
			<div className="maps-container">
				<div className="map-pane">
					<div className="corner-badge">Left map (draw here)</div>
					<div ref={leftContainerRef} className="map" />
					<div className="controls">
						<label>
							<input type="checkbox" checked={satelliteLeft} onChange={e => setSatelliteLeft(e.target.checked)} /> Satellite
						</label>
					</div>
				</div>
				<div className="map-pane">
					<div className="corner-badge">Right map (mirrored)</div>
					<div ref={rightContainerRef} className="map" />
					<div className="controls">
						<label>
							<input type="checkbox" checked={satelliteRight} onChange={e => setSatelliteRight(e.target.checked)} /> Satellite
						</label>
					</div>
				</div>
			</div>
		</div>
	);
};


