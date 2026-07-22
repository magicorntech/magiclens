import { useId, useMemo } from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
  Line,
  Marker
} from 'react-simple-maps'
import worldCountries from '../../assets/maps/countries-110m.json'

type LonLat = [number, number]

const HUBS: Array<{ name: string; coordinates: LonLat }> = [
  { name: 'us-west', coordinates: [-122, 37] },
  { name: 'us-east', coordinates: [-74, 41] },
  { name: 'mexico', coordinates: [-99, 19] },
  { name: 'brazil', coordinates: [-47, -15] },
  { name: 'chile', coordinates: [-71, -33] },
  { name: 'uk', coordinates: [-0.1, 51.5] },
  { name: 'germany', coordinates: [13.4, 52.5] },
  { name: 'spain', coordinates: [-3.7, 40.4] },
  { name: 'nigeria', coordinates: [7.5, 9.1] },
  { name: 'safrica', coordinates: [28, -26] },
  { name: 'uae', coordinates: [55.3, 25.2] },
  { name: 'india', coordinates: [77.2, 28.6] },
  { name: 'singapore', coordinates: [103.8, 1.3] },
  { name: 'japan', coordinates: [139.7, 35.7] },
  { name: 'korea', coordinates: [127, 37.5] },
  { name: 'australia', coordinates: [151, -33.9] },
  { name: 'nz', coordinates: [174.8, -36.8] }
]

const ROUTES: Array<{ from: LonLat; to: LonLat }> = [
  { from: [-122, 37], to: [-74, 41] },
  { from: [-74, 41], to: [-0.1, 51.5] },
  { from: [-74, 41], to: [13.4, 52.5] },
  { from: [-122, 37], to: [139.7, 35.7] },
  { from: [-0.1, 51.5], to: [13.4, 52.5] },
  { from: [13.4, 52.5], to: [55.3, 25.2] },
  { from: [13.4, 52.5], to: [77.2, 28.6] },
  { from: [-0.1, 51.5], to: [7.5, 9.1] },
  { from: [-3.7, 40.4], to: [28, -26] },
  { from: [-47, -15], to: [-0.1, 51.5] },
  { from: [-47, -15], to: [-74, 41] },
  { from: [-71, -33], to: [-99, 19] },
  { from: [55.3, 25.2], to: [77.2, 28.6] },
  { from: [77.2, 28.6], to: [103.8, 1.3] },
  { from: [103.8, 1.3], to: [139.7, 35.7] },
  { from: [103.8, 1.3], to: [151, -33.9] },
  { from: [139.7, 35.7], to: [127, 37.5] },
  { from: [139.7, 35.7], to: [151, -33.9] },
  { from: [151, -33.9], to: [174.8, -36.8] },
  { from: [-122, 37], to: [103.8, 1.3] },
  { from: [-74, 41], to: [55.3, 25.2] },
  { from: [7.5, 9.1], to: [28, -26] },
  { from: [-99, 19], to: [-47, -15] },
  { from: [13.4, 52.5], to: [139.7, 35.7] }
]

/**
 * Full-bleed dotted world map (react-simple-maps).
 * Connected state draws animated green tunnel routes between hubs.
 */
export function VpnDottedWorldMap({
  connected = false
}: {
  connected?: boolean
}): React.JSX.Element {
  const uid = useId().replace(/:/g, '')
  const patternId = `ml-vpn-land-dots-${uid}`
  const markerId = `ml-vpn-arrow-${uid}`
  const geography = useMemo(() => worldCountries, [])

  return (
    <div
      className={`ml-vpn-world-map${connected ? ' ml-vpn-world-map--live' : ''}`}
      aria-hidden
    >
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{
          // Framed for the left map column (sidebar/dock excluded via CSS centering)
          scale: 220,
          center: [8, 12]
        }}
        width={1500}
        height={780}
        style={{ width: '100%', height: '100%' }}
      >
        <defs>
          <pattern id={patternId} width="6" height="6" patternUnits="userSpaceOnUse">
            <circle className="ml-vpn-world-map__pattern-dot" cx="1.2" cy="1.2" r="1.45" />
          </pattern>
          <marker
            id={markerId}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="4.5"
            markerHeight="4.5"
            orient="auto-start-reverse"
          >
            <path d="M0 0 L10 5 L0 10 Z" fill="#22c55e" />
          </marker>
        </defs>

        <Geographies geography={geography}>
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill={`url(#${patternId})`}
                stroke="transparent"
                style={{
                  default: { outline: 'none' },
                  hover: { outline: 'none' },
                  pressed: { outline: 'none' }
                }}
              />
            ))
          }
        </Geographies>

        {connected &&
          ROUTES.map((route, i) => (
            <Line
              key={`${route.from.join(',')}-${route.to.join(',')}-${i}`}
              from={route.from}
              to={route.to}
              stroke="#22c55e"
              strokeWidth={1.35}
              strokeLinecap="round"
              className="ml-vpn-world-map__route"
              markerEnd={`url(#${markerId})`}
            />
          ))}

        {HUBS.map((hub) => (
          <Marker key={hub.name} coordinates={hub.coordinates}>
            <circle
              r={connected ? 3.2 : 2.2}
              className={
                connected
                  ? 'ml-vpn-world-map__hub ml-vpn-world-map__hub--live'
                  : 'ml-vpn-world-map__hub'
              }
            />
          </Marker>
        ))}
      </ComposableMap>
    </div>
  )
}
