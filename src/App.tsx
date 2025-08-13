import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet-draw';
import * as turf from '@turf/turf';
// Logo is now text-based, no SVG import needed

type GeoJsonPolygon = GeoJSON.Feature<GeoJSON.Polygon>;

const DEFAULT_LEFT: [number, number] = [51.5104, -0.3756];
const DEFAULT_RIGHT: [number, number] = [51.4906, 0.1209];

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
	const leftDeleteControlRef = useRef<HTMLElement | null>(null);
    const rightMoveRafRef = useRef<number | null>(null);

	const [leftPolygon, setLeftPolygon] = useState<GeoJsonPolygon | null>(null);
	const [rotationDeg, setRotationDeg] = useState<number>(0);
	const [mapModeLeft, setMapModeLeft] = useState<'street' | 'satellite' | 'hybrid'>(() => {
		const saved = localStorage.getItem('mapModeLeft');
		return saved ? JSON.parse(saved) : 'street';
	});
	const [mapModeRight, setMapModeRight] = useState<'street' | 'satellite' | 'hybrid'>(() => {
		const saved = localStorage.getItem('mapModeRight');
		return saved ? JSON.parse(saved) : 'street';
	});
	const [rightTargetCenter, setRightTargetCenter] = useState<[number, number]>(DEFAULT_RIGHT);
	const [searchQuery, setSearchQuery] = useState('');
	const [searchOnLeft, setSearchOnLeft] = useState(true);
	const [isSearching, setIsSearching] = useState(false);
    const [showLeftLayers, setShowLeftLayers] = useState(false);
    const [showRightLayers, setShowRightLayers] = useState(false);
    const [isAboutOpen, setIsAboutOpen] = useState(false);
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
			// Initial tile layer will be set by the map mode effect
			leftMapRef.current = map;
			const drawControl = new (L as any).Control.Draw({
				draw: {
					marker: false,
					circle: false,
					polyline: false,
					circlemarker: false,
					polygon: {
						allowIntersection: true,
						showArea: true,
						shapeOptions: { color: '#fdba74', fillColor: '#fdba74', fillOpacity: 0.3, opacity: 0.8 }
					},
					rectangle: false
				},
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
			// Initial tile layer will be set by the map mode effect
			rightMapRef.current = map;
			map.on('move', () => {
				if (rightMoveRafRef.current !== null) return;
				rightMoveRafRef.current = requestAnimationFrame(() => {
					rightMoveRafRef.current = null;
					const c = map.getCenter();
					setRightTargetCenter([c.lat, c.lng]);
				});
			});
			const c = map.getCenter();
			setRightTargetCenter([c.lat, c.lng]);
		}
    }, []);

    // Close About modal on Escape
    useEffect(() => {
        if (!isAboutOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsAboutOpen(false);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isAboutOpen]);

    // Add/remove a red X delete button inside the existing draw toolbar when a polygon exists
    useEffect(() => {
        const map = leftMapRef.current;
        if (!map) return;

        // Helper to remove the button if it exists
        const removeButton = () => {
            if (leftDeleteControlRef.current && leftDeleteControlRef.current.parentNode) {
                leftDeleteControlRef.current.parentNode.removeChild(leftDeleteControlRef.current);
                leftDeleteControlRef.current = null;
            }
        };

        if (!leftPolygon) {
            removeButton();
            return;
        }

        if (leftDeleteControlRef.current) return; // already added

        const container = map.getContainer();
        const toolbar = container.querySelector('.leaflet-draw-toolbar') as HTMLElement | null;
        if (!toolbar) return;

        const btn = document.createElement('a');
        btn.className = 'msbs-delete-btn leaflet-bar-part leaflet-bar-part-single';
        btn.setAttribute('role', 'button');
        btn.setAttribute('title', 'Remove polygon');
        btn.href = '#';
        btn.textContent = '✕';

        // Insert directly after the polygon button if present
        const polygonBtn = toolbar.querySelector('a.leaflet-draw-draw-polygon');
        if (polygonBtn && polygonBtn.parentNode) {
            if (polygonBtn.nextSibling) {
                polygonBtn.parentNode.insertBefore(btn, polygonBtn.nextSibling);
            } else {
                polygonBtn.parentNode.appendChild(btn);
            }
        } else {
            toolbar.appendChild(btn);
        }

        const onClick = (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setLeftPolygon(null);
            if (leftOverlayRef.current) {
                map.removeLayer(leftOverlayRef.current);
                leftOverlayRef.current = null;
            }
            removeButton();
        };
        btn.addEventListener('click', onClick);

        leftDeleteControlRef.current = btn;

        return () => {
            btn.removeEventListener('click', onClick);
        };
    }, [leftPolygon]);

	// Update left overlay when shape/rotation changes
	useEffect(() => {
		const map = leftMapRef.current;
		if (!map) return;
		if (leftOverlayRef.current) {
			map.removeLayer(leftOverlayRef.current);
			leftOverlayRef.current = null;
		}
		if (rotatedLeft) {
			leftOverlayRef.current = L.geoJSON(
				rotatedLeft as any,
				{ style: { color: '#f97316', fillColor: '#f97316', interactive: false } as any, interactive: false }
			);
			leftOverlayRef.current.addTo(map);
		}
	}, [rotatedLeft]);

	// Update right overlay when mirrored changes (reuse layer for smooth updates)
	useEffect(() => {
		const map = rightMapRef.current;
		if (!map) return;
		if (!mirroredRight) {
			if (rightOverlayRef.current) {
				map.removeLayer(rightOverlayRef.current);
				rightOverlayRef.current = null;
			}
			return;
		}
		if (!rightOverlayRef.current) {
			rightOverlayRef.current = L.geoJSON(
				mirroredRight as any,
				{ style: { color: '#3b82f6', fillColor: '#3b82f6', interactive: false } as any, interactive: false }
			);
			rightOverlayRef.current.addTo(map);
		} else {
			rightOverlayRef.current.clearLayers();
			rightOverlayRef.current.addData(mirroredRight as any);
		}
	}, [mirroredRight]);

    // Handle left map mode changes
    useEffect(() => {
		const map = leftMapRef.current;
		if (!map) return;
        
        // Remove existing tile layers
        const tileLayers: L.TileLayer[] = [];
        map.eachLayer((layer) => {
            if (layer instanceof L.TileLayer) {
                tileLayers.push(layer);
            }
        });
        tileLayers.forEach(layer => map.removeLayer(layer));

        // Add appropriate layers based on mode
        if (mapModeLeft === 'street') {
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);
        } else if (mapModeLeft === 'satellite') {
            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { 
                attribution: '© Esri'
            }).addTo(map);
        } else if (mapModeLeft === 'hybrid') {
            // Satellite base layer
            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { 
                attribution: '© Esri'
            }).addTo(map);
            // Labels overlay
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
                attribution: '© OpenStreetMap contributors',
                opacity: 0.4
            }).addTo(map);
        }
	}, [mapModeLeft]);

    // Handle right map mode changes
    useEffect(() => {
		const map = rightMapRef.current;
		if (!map) return;
        
        // Remove existing tile layers
        const tileLayers: L.TileLayer[] = [];
        map.eachLayer((layer) => {
            if (layer instanceof L.TileLayer) {
                tileLayers.push(layer);
            }
        });
        tileLayers.forEach(layer => map.removeLayer(layer));

        // Add appropriate layers based on mode
        if (mapModeRight === 'street') {
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);
        } else if (mapModeRight === 'satellite') {
            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { 
                attribution: '© Esri'
            }).addTo(map);
        } else if (mapModeRight === 'hybrid') {
            // Satellite base layer
            L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { 
                attribution: '© Esri'
            }).addTo(map);
            // Labels overlay
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
                attribution: '© OpenStreetMap contributors',
                opacity: 0.4
            }).addTo(map);
        }
	}, [mapModeRight]);

	// Save map mode preferences to localStorage
	useEffect(() => {
		localStorage.setItem('mapModeLeft', JSON.stringify(mapModeLeft));
	}, [mapModeLeft]);

	useEffect(() => {
		localStorage.setItem('mapModeRight', JSON.stringify(mapModeRight));
	}, [mapModeRight]);

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
					<form onSubmit={handleSearch} className={`search-form ${searchOnLeft ? 'left-selected' : 'right-selected'}`}>
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
					<label>Rotate: <span className="rotation-value">{rotationDeg.toFixed(0)}°</span></label>
					<input type="range" min={-180} max={180} step={1} value={rotationDeg} onChange={e => setRotationDeg(parseInt(e.target.value, 10))} />
					<button onClick={() => setRotationDeg(0)}>Reset</button>
					<button
						type="button"
						className="about-button"
						aria-haspopup="dialog"
						aria-controls="about-modal"
						onClick={() => setIsAboutOpen(true)}
					>
						?
					</button>
				</div>
			</div>
			<div className="maps-container">
				<div className="map-pane">
					<div className="corner-badge">Left map (draw here)</div>
					<div ref={leftContainerRef} className="map" />
					<div className="controls">
						<button
							type="button"
							className={`layers-button ${showLeftLayers ? 'open' : ''}`}
							aria-haspopup="menu"
							aria-expanded={showLeftLayers}
							onClick={() => setShowLeftLayers(v => !v)}
						>
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M12 3L2 9l10 6 10-6-10-6Z" fill="currentColor"/>
								<path d="M2 15l10 6 10-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
								<path d="M2 12l10 6 10-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
							</svg>
						</button>
						{showLeftLayers && (
							<div className="map-type-dropdown" role="menu">
								<button className={mapModeLeft === 'street' ? 'active' : ''} onClick={() => { setMapModeLeft('street'); setShowLeftLayers(false); }}>Street</button>
								<button className={mapModeLeft === 'satellite' ? 'active' : ''} onClick={() => { setMapModeLeft('satellite'); setShowLeftLayers(false); }}>Satellite</button>
								<button className={mapModeLeft === 'hybrid' ? 'active' : ''} onClick={() => { setMapModeLeft('hybrid'); setShowLeftLayers(false); }}>Hybrid</button>
							</div>
						)}
					</div>
				</div>
				<div className="map-pane">
					<div className="corner-badge">Right map (mirrored)</div>
					<div ref={rightContainerRef} className="map" />
					<div className="controls">
						<button
							type="button"
							className={`layers-button ${showRightLayers ? 'open' : ''}`}
							aria-haspopup="menu"
							aria-expanded={showRightLayers}
							onClick={() => setShowRightLayers(v => !v)}
						>
							<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
								<path d="M12 3L2 9l10 6 10-6-10-6Z" fill="currentColor"/>
								<path d="M2 15l10 6 10-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
								<path d="M2 12l10 6 10-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
							</svg>
						</button>
						{showRightLayers && (
							<div className="map-type-dropdown" role="menu">
								<button className={mapModeRight === 'street' ? 'active' : ''} onClick={() => { setMapModeRight('street'); setShowRightLayers(false); }}>Street</button>
								<button className={mapModeRight === 'satellite' ? 'active' : ''} onClick={() => { setMapModeRight('satellite'); setShowRightLayers(false); }}>Satellite</button>
								<button className={mapModeRight === 'hybrid' ? 'active' : ''} onClick={() => { setMapModeRight('hybrid'); setShowRightLayers(false); }}>Hybrid</button>
							</div>
						)}
					</div>
				</div>
			</div>
			{isAboutOpen && (
				<div
					id="about-modal"
					className="modal-backdrop"
					role="dialog"
					aria-modal="true"
					onClick={() => setIsAboutOpen(false)}
				>
					<div className="about-modal" onClick={(e) => e.stopPropagation()}>
						<div className="modal-header">
							<h2>About MapSideBySide</h2>
							<button className="close-button" aria-label="Close" onClick={() => setIsAboutOpen(false)}>✕</button>
						</div>
						<div className="modal-content">
							<p>
								This project was created to help compare geographic areas side-by-side. Draw a shape on the left map and see it mirrored on the right to understand true scale and context.
							</p>
							<p>
								Inspired by <a href="https://mapfrappe.com/" target="_blank" rel="noopener noreferrer">MapFrappe</a>.
							</p>
							<p>
								Source code: <a href="https://github.com/ShantnuS/map-side-by-side" target="_blank" rel="noopener noreferrer">github.com/ShantnuS/map-side-by-side</a>
							</p>
						</div>
						<div className="modal-actions">
							<button onClick={() => setIsAboutOpen(false)}>Close</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};


