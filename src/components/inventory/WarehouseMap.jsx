import { useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

/**
 * Country centroid fallback. Warehouses in the DB don't have lat/lng,
 * so when a row only has `country`/`city`, we drop its marker on the
 * country centroid (best-effort). Keys are ISO-3166-1 alpha-2 (uppercase).
 */
const COUNTRY_CENTROIDS = {
  ES: [40.4168, -3.7038],
  DE: [52.5200, 13.4050],
  FR: [48.8566, 2.3522],
  IT: [41.9028, 12.4964],
  UK: [51.5074, -0.1278],
  GB: [51.5074, -0.1278],
  US: [39.0458, -76.6413],
  CN: [31.2304, 121.4737],
  PL: [52.2297, 21.0122],
  NL: [52.3676, 4.9041],
  BE: [50.8503, 4.3517],
  PT: [38.7223, -9.1393],
  MX: [19.4326, -99.1332],
  CA: [45.4215, -75.6972],
  IN: [19.0760, 72.8777],
  JP: [35.6762, 139.6503],
  AU: [-33.8688, 151.2093],
  BR: [-23.5505, -46.6333],
  TR: [41.0082, 28.9784],
  AE: [25.2048, 55.2708]
}

/**
 * Hardcoded Amazon FBA hubs per marketplace. Used when a warehouse is
 * tagged `amazon_fba` and its `amazon_fc_code` matches, so we can pin
 * it on its real fulfilment centre rather than the country centroid.
 */
const FBA_HUBS = {
  // ES
  MAD4: [40.2833, -3.7833], // San Fernando de Henares
  BCN1: [41.4469, 2.1820],  // El Prat
  // DE
  FRA3: [50.1109, 8.6821],
  MUC3: [48.3538, 11.7861],
  // FR
  ORY1: [48.7233, 2.3794],
  LYS1: [45.7260, 5.0811],
  // IT
  MXP5: [45.6306, 8.7281],
  FCO1: [41.8003, 12.2389],
  // UK
  LTN1: [51.9048, -0.4543],
  MAN1: [53.3653, -2.2728],
  // US
  ONT8: [33.9425, -117.4011],
  EWR4: [40.7128, -74.0060],
  DFW7: [32.8998, -97.0403]
}

function colorDot(color, label) {
  return L.divIcon({
    className: 'wh-marker',
    html: `<div style="
      width:22px;height:22px;border-radius:50%;
      background:${color};
      border:3px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,.35);
      display:flex;align-items:center;justify-content:center;
      color:#fff;font-size:11px;font-weight:700;
    ">${label || ''}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -10]
  })
}

const iconFba = colorDot('#22c55e', 'A')     // Amazon FBA
const iconOwn = colorDot('#2563eb', 'W')     // 3PL / own warehouse
const iconGeneric = colorDot('#6b7280', '·') // fallback

function resolveCoords(wh) {
  // explicit lat/lng first (even though column doesn't exist today, be defensive)
  const lat = Number(wh.lat ?? wh.latitude)
  const lng = Number(wh.lng ?? wh.longitude)
  if (Number.isFinite(lat) && Number.isFinite(lng)) return [lat, lng]

  // FBA hub code
  const code = (wh.amazon_fc_code || wh.fc_code || '').toUpperCase()
  if (code && FBA_HUBS[code]) return FBA_HUBS[code]

  // country fallback
  const country = (wh.country || '').toUpperCase().trim()
  if (country && COUNTRY_CENTROIDS[country]) return COUNTRY_CENTROIDS[country]

  return null
}

function isFba(wh) {
  if (wh.type === 'amazon_fba' || wh.kind === 'amazon_fba') return true
  const name = (wh.name || '').toLowerCase()
  return name.includes('amazon') || name.includes('fba')
}

export default function WarehouseMap({
  warehouses = [],
  stockByWarehouse = new Map(),
  darkMode = false,
  height = 560
}) {
  const points = useMemo(() => {
    const list = []
    // jitter duplicates on the same centroid so markers don't stack
    const bucket = new Map()
    for (const wh of warehouses) {
      const coords = resolveCoords(wh)
      if (!coords) continue
      const key = `${coords[0].toFixed(3)}:${coords[1].toFixed(3)}`
      const count = bucket.get(key) || 0
      bucket.set(key, count + 1)
      const [lat, lng] = coords
      const offset = count === 0 ? [0, 0] : [
        (Math.cos(count * 1.2) * 0.25) + (count * 0.05),
        (Math.sin(count * 1.2) * 0.25) + (count * 0.05)
      ]
      list.push({
        wh,
        position: [lat + offset[0], lng + offset[1]],
        fba: isFba(wh)
      })
    }
    return list
  }, [warehouses])

  const center = points.length ? points[0].position : [40.4168, -3.7038]

  const tileUrl = darkMode
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

  const attribution = darkMode
    ? '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

  return (
    <div
      style={{
        position: 'relative',
        height,
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid var(--border-1, rgba(148,163,184,.18))',
        boxShadow: 'var(--shadow-soft)'
      }}
    >
      <MapContainer
        center={center}
        zoom={3}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer url={tileUrl} attribution={attribution} />
        {points.map(({ wh, position, fba }) => {
          const stockItems = stockByWarehouse.get(wh.id) || []
          const totalUnits = stockItems.reduce((s, i) => s + (Number(i.units) || 0), 0)
          return (
            <Marker
              key={wh.id}
              position={position}
              icon={fba ? iconFba : (wh.id ? iconOwn : iconGeneric)}
            >
              <Popup>
                <div style={{ minWidth: 220, maxWidth: 280 }}>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>
                    {wh.name || 'Magatzem sense nom'}
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>
                    {fba ? 'Amazon FBA' : '3PL / Propi'}
                    {wh.city ? ` · ${wh.city}` : ''}
                    {wh.country ? ` · ${wh.country}` : ''}
                  </div>
                  {stockItems.length === 0 ? (
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>
                      Sense stock assignat.
                    </div>
                  ) : (
                    <>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 11,
                        color: '#6b7280',
                        borderBottom: '1px solid #e5e7eb',
                        paddingBottom: 4,
                        marginBottom: 4,
                        textTransform: 'uppercase',
                        letterSpacing: '.04em'
                      }}>
                        <span>SKU</span><span>Unitats</span>
                      </div>
                      <div style={{ maxHeight: 140, overflowY: 'auto' }}>
                        {stockItems.map((it, idx) => (
                          <div
                            key={`${wh.id}:${it.sku}:${idx}`}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontSize: 12,
                              padding: '2px 0'
                            }}
                          >
                            <span style={{
                              maxWidth: 170,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>{it.sku}</span>
                            <strong>{Math.round(it.units).toLocaleString()}</strong>
                          </div>
                        ))}
                      </div>
                      <div style={{
                        marginTop: 6,
                        paddingTop: 4,
                        borderTop: '1px solid #e5e7eb',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 12,
                        fontWeight: 700
                      }}>
                        <span>Total</span>
                        <span>{Math.round(totalUnits).toLocaleString()}</span>
                      </div>
                    </>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {/* Legend */}
      <div style={{
        position: 'absolute',
        bottom: 12,
        left: 12,
        zIndex: 500,
        display: 'flex',
        gap: 10,
        padding: '8px 12px',
        borderRadius: 10,
        background: darkMode ? 'rgba(21,21,31,.92)' : 'rgba(255,255,255,.92)',
        boxShadow: '0 2px 10px rgba(0,0,0,.15)',
        fontSize: 12,
        color: darkMode ? '#e5e7eb' : '#374151'
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 12, height: 12, borderRadius: '50%',
            background: '#22c55e', border: '2px solid #fff',
            boxShadow: '0 1px 3px rgba(0,0,0,.3)'
          }} />
          Amazon FBA
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 12, height: 12, borderRadius: '50%',
            background: '#2563eb', border: '2px solid #fff',
            boxShadow: '0 1px 3px rgba(0,0,0,.3)'
          }} />
          3PL / Propi
        </span>
      </div>

      {points.length === 0 && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: darkMode ? 'rgba(21,21,31,.7)' : 'rgba(255,255,255,.7)',
          color: darkMode ? '#e5e7eb' : '#374151',
          fontSize: 14,
          zIndex: 400,
          pointerEvents: 'none'
        }}>
          No hi ha magatzems amb ubicació resolta per mostrar al mapa.
        </div>
      )}
    </div>
  )
}
