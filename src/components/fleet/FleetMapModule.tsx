/**
 * Real-Time Logged-In Delivery Staff & Fleet GPS Navigation Module
 * Supports Google Maps JavaScript API (Makeni, Sierra Leone - Lat: 8.8858, Lng: -12.0441)
 * with automatic dynamic script injection & fallback to Leaflet.js / OpenStreetMap.
 * 
 * Features:
 * 1. User Account Filtering:
 *    - Tracks any logged-in or registered user account containing "tricycle", "trc", "van", or "delivery"
 *      in their account name, role, ID, or department (e.g. PM-TRC-001, PM-VAN-001).
 * 2. Real-Time Geolocation & Movement Simulation:
 *    - Browser navigator.geolocation.watchPosition for real-time live GPS broadcast when a sales user is logged in.
 *    - For offline/active accounts without hardware GPS lock, simulates live movement along authentic Makeni routes.
 *    - Dynamic map markers: Custom Tricycle (🛺) and Van (🚚) icons with speed tags and pulsing beacons.
 * 3. Live Map Status & Sidebar:
 *    - Status badges (Active/Selling, Stationary, En Route) and current speed (km/h).
 *    - Dynamically appears and updates markers immediately when a sales account logs in or registers.
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import L from 'leaflet';
import { useApp } from '../../context/AppContext';
import { socketService } from '../../services/socketService';
import { localDateKey } from '../../utils/dateUtils';
import { User } from '../../types';
import {
  MapPin,
  Truck,
  Navigation,
  Phone,
  Search,
  CheckCircle2,
  Gauge,
  Radio,
  Layers,
  Shield,
  Activity,
  Maximize2,
  Minimize2,
  Satellite,
  Globe,
  Crosshair,
  AlertCircle,
  LocateFixed,
  Copy,
  Check,
  Square,
  ShoppingBag,
  Compass,
  Map as MapIcon,
  Zap,
  Play,
  Pause,
  FastForward,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

// ISSUE #7 — map engine default.
// Google Maps is only used when the project actually supplies a key via
// VITE_GOOGLE_MAPS_API_KEY. Previously the module always booted the Google
// engine using a hard-coded third-party key; when that key hit its quota, was
// revoked, or failed billing/auth, the map silently fell back mid-render and
// users saw a blank grey viewport (the "map crash"). Leaflet + OpenStreetMap
// needs no key and no billing, so it is now the safe default.
const GOOGLE_MAPS_API_KEY = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';
const FALLBACK_GOOGLE_MAPS_KEY = 'AIzaSyBrOn-2IOLakiQkoq3cVqO6wGbHVWq67TE';
const MAKENI_CENTER = { lat: 8.8858, lng: -12.0441 };
const MAKENI_LEAFLET: [number, number] = [8.8858, -12.0441];

// ISSUE #7 — hardware geolocation options.
// `timeout: 5000` was far too aggressive: a phone doing a cold GPS lock outdoors
// routinely needs 10-20s, so watchPosition() kept erroring with TIMEOUT before
// any fix arrived, which left the map empty and looked like a crash.
// enableHighAccuracy prefers real GPS over wifi/cell triangulation.
const GPS_WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 20000,
  maximumAge: 0,
};

type MapEngine = 'google' | 'leaflet';
type LeafletTileMode = 'street' | 'humanitarian' | 'satellite' | 'dark';

declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}

// 1. User Account Filtering Helpers
export const isFleetSalesAccount = (user: User | null | undefined): boolean => {
  if (!user) return false;
  const str = `${user.role || ''} ${user.name || ''} ${user.employeeId || ''} ${user.department || ''}`.toLowerCase();
  return (
    str.includes('tricycle') ||
    str.includes('trc') ||
    str.includes('van') ||
    str.includes('delivery') ||
    user.role === 'tricycle_staff' ||
    user.role === 'van_staff'
  );
};

export const getFleetVehicleType = (user: User | null | undefined): 'tricycle_staff' | 'van_staff' => {
  if (!user) return 'tricycle_staff';
  const str = `${user.role || ''} ${user.name || ''} ${user.employeeId || ''} ${user.department || ''}`.toLowerCase();
  if (str.includes('van')) return 'van_staff';
  return 'tricycle_staff';
};

// Authentic Makeni, Sierra Leone Route Waypoints for realistic simulation
const MAKENI_ROUTES = [
  // Route 0: Mabanta Road ➔ Makeni Clock Tower ➔ Campbell St ➔ Rogbaneh Rd
  [
    { lat: 8.8858, lng: -12.0441, name: 'Pure Max Factory Depot (Mabanta Rd)' },
    { lat: 8.8872, lng: -12.0465, name: 'Mabanta Market Junction' },
    { lat: 8.8885, lng: -12.0480, name: 'Makeni Clock Tower Plaza' },
    { lat: 8.8860, lng: -12.0505, name: 'Campbell Street Retail Shops' },
    { lat: 8.8835, lng: -12.0470, name: 'St. Francis Junction' },
    { lat: 8.8820, lng: -12.0435, name: 'Rogbaneh Road Commercial Kiosks' },
    { lat: 8.8845, lng: -12.0425, name: 'Sachet Wholesale Center' },
  ],
  // Route 1: Azzolini Highway ➔ Central Market ➔ Station Road ➔ Magburaka Highway
  [
    { lat: 8.8820, lng: -12.0490, name: 'Azzolini Highway Distribution Hub' },
    { lat: 8.8845, lng: -12.0455, name: 'Government Hospital Junction' },
    { lat: 8.8870, lng: -12.0420, name: 'Makeni Central Market' },
    { lat: 8.8905, lng: -12.0460, name: 'Station Road Depot' },
    { lat: 8.8880, lng: -12.0395, name: 'Magburaka Highway Sachet Point' },
    { lat: 8.8840, lng: -12.0380, name: 'East End Commercial Hub' },
    { lat: 8.8805, lng: -12.0430, name: 'Azzolini South Link' },
  ],
  // Route 2: Teko Barracks Road ➔ Wusum Stadium ➔ Independence Ave ➔ Sachet Depot
  [
    { lat: 8.8890, lng: -12.0390, name: 'Teko Barracks Road Wholesale' },
    { lat: 8.8865, lng: -12.0415, name: 'Teko Junction Retail' },
    { lat: 8.8840, lng: -12.0430, name: 'Wusum Stadium Entrance' },
    { lat: 8.8875, lng: -12.0485, name: 'Independence Avenue Shops' },
    { lat: 8.8920, lng: -12.0510, name: 'Mena Hills Corner' },
    { lat: 8.8895, lng: -12.0450, name: 'Teachers College Road' },
  ],
  // Route 3: Panlap Junction ➔ Lunsar Highway ➔ Mabanta West ➔ Clock Tower
  [
    { lat: 8.8790, lng: -12.0530, name: 'Panlap Junction Commercial Post' },
    { lat: 8.8815, lng: -12.0480, name: 'Lunsar Highway Distribution' },
    { lat: 8.8845, lng: -12.0475, name: 'Mabanta West Grocery Depot' },
    { lat: 8.8885, lng: -12.0480, name: 'Clock Tower Plaza' },
    { lat: 8.8850, lng: -12.0410, name: 'Hospital Road Corner' },
    { lat: 8.8810, lng: -12.0450, name: 'Panlap Link Road' },
  ],
];

export const FleetMapModule: React.FC = () => {
  const {
    currentUser,
    users,
    activeRole,
    staffLiveLocations,
    updateStaffLiveLocation,
    updateMultipleStaffLocations,
    setActiveTab,
    sales,
  } = useApp();

  const isDeliveryStaff = isFleetSalesAccount(currentUser);

  // Map Engine & View States.
  // Default to Leaflet unless a real Google Maps key has been configured.
  const [activeEngine, setActiveEngine] = useState<MapEngine>(
    GOOGLE_MAPS_API_KEY ? 'google' : 'leaflet'
  );
  const [googleLoadFailed, setGoogleLoadFailed] = useState(false);
  const [googleAuthError, setGoogleAuthError] = useState(false);
  const [leafletMode, setLeafletMode] = useState<LeafletTileMode>('street');
  const [googleMapTypeId, setGoogleMapTypeId] = useState<'roadmap' | 'satellite' | 'hybrid' | 'terrain'>('roadmap');

  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'tricycle_staff' | 'van_staff'>('all');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Simulation controls state
  // ISSUE #7: mock/demo vehicle movement is OFF by default. It used to boot with
  // `useState(true)`, so every registered tricycle and van immediately began
  // crawling along a hard-coded Makeni route — fabricated positions that looked
  // identical to real GPS and made the live fleet view untrustworthy. Managers
  // can still switch it on explicitly for demonstrations via the toolbar.
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationSpeedMultiplier, setSimulationSpeedMultiplier] = useState<number>(1);
  const simStepIndicesRef = useRef<Record<string, { routeIdx: number; wayptIdx: number; progress: number; stopTicks: number }>>({});

  // GPS Broadcaster state
  const [isLocatingMe, setIsLocatingMe] = useState(false);
  const [gpsPermissionDenied, setGpsPermissionDenied] = useState(false);
  const [hasAcquiredFirstFix, setHasAcquiredFirstFix] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationSuccessMsg, setLocationSuccessMsg] = useState<string | null>(null);
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);
  const firstFixCenteredRef = useRef(false);

  // References
  const googleMapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapContainerRef = useRef<HTMLDivElement>(null);

  const googleMapInstanceRef = useRef<google.maps.Map | null>(null);
  const googleMarkersRef = useRef<Record<string, google.maps.Marker>>({});
  const googleInfoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const leafletMapInstanceRef = useRef<L.Map | null>(null);
  const leafletTileLayerRef = useRef<L.TileLayer | null>(null);
  const leafletMarkersRef = useRef<Record<string, L.Marker>>({});

  const watchIdRef = useRef<number | null>(null);

  // Today's date string
  // Local-calendar day, not UTC: matches how sales records store their `date`
  // and keeps the GPS sidebar's "bundles delivered today" in step with the
  // dashboard's daily window (Issue #3 / #4).
  const todayStr = useMemo(() => localDateKey(), []);

  // Compute daily water bundle sales count per staff member
  const staffSalesTodayMap = useMemo(() => {
    const map: Record<string, number> = {};
    sales.forEach((s) => {
      if (s.date === todayStr) {
        if (s.recordedById) {
          map[s.recordedById] = (map[s.recordedById] || 0) + (s.bundleQuantity || 0);
        }
        if (s.customerOrDriver) {
          const matchingUser = users.find(
            (u) =>
              u.name.toLowerCase() === s.customerOrDriver?.toLowerCase() ||
              u.employeeId.toLowerCase() === s.customerOrDriver?.toLowerCase()
          );
          if (matchingUser && matchingUser.id !== s.recordedById) {
            map[matchingUser.id] = (map[matchingUser.id] || 0) + (s.bundleQuantity || 0);
          }
        }
      }
    });
    return map;
  }, [sales, todayStr, users]);

  // 1. User Account Filtering:
  // Dynamically include any logged-in or registered user account containing "tricycle", "trc", "van", or "delivery"
  const deliveryStaffUsers = useMemo(() => {
    return users.filter((u) => isFleetSalesAccount(u));
  }, [users]);

  // Refs to decouple interval from render cycles
  const deliveryStaffUsersRef = useRef(deliveryStaffUsers);
  deliveryStaffUsersRef.current = deliveryStaffUsers;

  const staffLiveLocationsRef = useRef(staffLiveLocations);
  staffLiveLocationsRef.current = staffLiveLocations;

  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

  // Merge registered delivery staff with active live GPS data & sales
  const activeDeliveryStaff = useMemo(() => {
    return deliveryStaffUsers
      .map((user) => {
        const liveLoc = staffLiveLocations.find((loc) => loc.userId === user.id);
        const isCurrentLoggedIn = currentUser?.id === user.id;
        const todayBundles = staffSalesTodayMap[user.id] || 0;
        const vehicleType = getFleetVehicleType(user);

        return {
          userId: user.id,
          employeeId: user.employeeId,
          userName: user.name,
          userRole: vehicleType,
          avatarUrl: user.avatarUrl,
          phone: user.phone,
          department: user.department,
          isCurrentLoggedIn,
          hasGps: !!liveLoc && liveLoc.lat !== null && liveLoc.lng !== null,
          lat: liveLoc?.lat ?? null,
          lng: liveLoc?.lng ?? null,
          accuracyMeters: liveLoc?.accuracyMeters ?? null,
          speedKmH: liveLoc?.speedKmH ?? 0,
          heading: liveLoc?.heading ?? 0,
          batteryPct: liveLoc?.batteryPct ?? 90,
          status: liveLoc?.status ?? (isCurrentLoggedIn ? 'Active / Selling' : 'En Route'),
          lastUpdated: liveLoc?.lastUpdated ?? (isCurrentLoggedIn ? 'Logged In Now' : 'Active Tracking'),
          isLiveDeviceGps: liveLoc?.isLiveDeviceGps ?? false,
          todayBundles,
        };
      })
      .filter((staff) => {
        if (filterRole === 'all') return true;
        return staff.userRole === filterRole;
      })
      .filter((staff) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          staff.userName.toLowerCase().includes(q) ||
          staff.employeeId.toLowerCase().includes(q) ||
          staff.phone.includes(q) ||
          staff.department?.toLowerCase().includes(q)
        );
      });
  }, [deliveryStaffUsers, staffLiveLocations, currentUser, filterRole, searchQuery, staffSalesTodayMap]);

  // Filter only those with active coordinates
  const staffWithLocations = useMemo(() => {
    return activeDeliveryStaff.filter((s) => s.lat !== null && s.lng !== null);
  }, [activeDeliveryStaff]);

  const selectedStaff = useMemo(() => {
    if (!selectedStaffId) return staffWithLocations[0] || activeDeliveryStaff[0] || null;
    return activeDeliveryStaff.find((s) => s.userId === selectedStaffId) || null;
  }, [selectedStaffId, staffWithLocations, activeDeliveryStaff]);

  // 2. Real-Time Movement Simulation Engine for Makeni Routes
  useEffect(() => {
    if (!isSimulating) return;

    const intervalMs = Math.max(800, 2400 / simulationSpeedMultiplier);

    const timer = setInterval(() => {
      const currentStaffList = deliveryStaffUsersRef.current;
      if (!currentStaffList || currentStaffList.length === 0) return;

      const currentLiveLocs = staffLiveLocationsRef.current || [];
      const loggedUser = currentUserRef.current;
      const batchUpdates: Array<Parameters<typeof updateStaffLiveLocation>[0]> = [];

      currentStaffList.forEach((user, userIdx) => {
        // CRITICAL: NEVER simulate or mock the logged-in device's location
        if (loggedUser && loggedUser.id === user.id) {
          return;
        }

        const liveLoc = currentLiveLocs.find((l) => l.userId === user.id);

        // Do not simulate if user has active real hardware GPS stream
        if (liveLoc?.isLiveDeviceGps) {
          return;
        }

        const vehicleType = getFleetVehicleType(user);
        const routeIdx = userIdx % MAKENI_ROUTES.length;
        const route = MAKENI_ROUTES[routeIdx];

        // Retrieve or initialize step state from ref
        const current = simStepIndicesRef.current[user.id] || {
          routeIdx,
          wayptIdx: (userIdx * 2) % route.length,
          progress: 0.1,
          stopTicks: 0,
        };

        let { wayptIdx, progress, stopTicks } = current;

        let status: 'Active / Selling' | 'En Route' | 'Stationary' = 'En Route';
        let speedKmH = vehicleType === 'van_staff' ? Math.floor(22 + Math.random() * 14) : Math.floor(14 + Math.random() * 10);

        // If stopped at a retail waypoint to sell water bundles
        if (stopTicks > 0) {
          stopTicks -= 1;
          status = 'Active / Selling';
          speedKmH = 0;
        } else {
          // Step progress
          progress += 0.12 * simulationSpeedMultiplier;

          if (progress >= 1.0) {
            progress = 0;
            wayptIdx = (wayptIdx + 1) % route.length;
            // 40% chance of making a retail sales drop-off stop
            if (Math.random() < 0.45) {
              stopTicks = Math.floor(3 + Math.random() * 3);
              status = 'Active / Selling';
              speedKmH = 0;
            }
          }
        }

        const currentWaypt = route[wayptIdx];
        const nextWaypt = route[(wayptIdx + 1) % route.length];

        // Linear interpolation between waypoints
        const lat = currentWaypt.lat + (nextWaypt.lat - currentWaypt.lat) * progress;
        const lng = currentWaypt.lng + (nextWaypt.lng - currentWaypt.lng) * progress;

        // Calculate heading
        const dLng = nextWaypt.lng - currentWaypt.lng;
        const dLat = nextWaypt.lat - currentWaypt.lat;
        const heading = Math.round(((Math.atan2(dLng, dLat) * 180) / Math.PI + 360) % 360);

        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        // Update ref
        simStepIndicesRef.current[user.id] = {
          routeIdx,
          wayptIdx,
          progress,
          stopTicks,
        };

        batchUpdates.push({
          userId: user.id,
          employeeId: user.employeeId,
          userName: user.name,
          userRole: vehicleType,
          avatarUrl: user.avatarUrl,
          phone: user.phone,
          lat,
          lng,
          accuracyMeters: 6,
          speedKmH,
          heading,
          batteryPct: 88 + (userIdx % 10),
          status: status === 'Active / Selling' ? 'Stationary / Delivering' : 'Online & Moving',
          lastUpdated: timeStr,
          isLiveDeviceGps: false,
        });
      });

      if (batchUpdates.length > 0) {
        updateMultipleStaffLocations(batchUpdates);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [
    isSimulating,
    simulationSpeedMultiplier,
    updateMultipleStaffLocations,
  ]);

  // Generate InfoWindow / Popup HTML
  const generateStaffPopupHTML = useCallback((staff: typeof activeDeliveryStaff[0]) => {
    const isVan = staff.userRole === 'van_staff';
    const accentBg = isVan ? '#2563eb' : '#d97706';
    const badgeBg = isVan ? '#1e3a8a' : '#78350f';
    const iconEmoji = isVan ? '🚚' : '🛺';
    const vehicleLabel = isVan ? 'Distribution Van' : 'Sachet Tricycle';

    const statusBadge =
      staff.speedKmH > 0
        ? `<span style="background: #1e3a8a; color: #93c5fd; padding: 2px 8px; border-radius: 6px; font-weight: bold; font-size: 10px; border: 1px solid #3b82f6;">En Route (${staff.speedKmH} km/h)</span>`
        : staff.status?.includes('Delivering') || staff.status?.includes('Selling')
        ? `<span style="background: #064e3b; color: #6ee7b7; padding: 2px 8px; border-radius: 6px; font-weight: bold; font-size: 10px; border: 1px solid #10b981;">Active / Selling</span>`
        : `<span style="background: #334155; color: #cbd5e1; padding: 2px 8px; border-radius: 6px; font-weight: bold; font-size: 10px; border: 1px solid #475569;">Stationary</span>`;

    return `
      <div style="font-family: system-ui, -apple-system, sans-serif; color: #f8fafc; background: #0b1120; padding: 14px; border-radius: 16px; min-width: 260px; border: 1px solid #334155; box-shadow: 0 15px 35px rgba(0,0,0,0.6);">
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #1e293b; padding-bottom: 10px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 40px; height: 40px; border-radius: 12px; background: ${badgeBg}; border: 2px solid ${accentBg}; display: flex; align-items: center; justify-content: center; font-size: 22px; box-shadow: 0 0 12px ${accentBg}66;">
              ${iconEmoji}
            </div>
            <div>
              <div style="font-weight: 800; font-size: 14px; color: #f8fafc;">${staff.userName}</div>
              <div style="font-size: 10px; color: #94a3b8; font-family: monospace; text-transform: uppercase;">
                ${staff.employeeId} • <span style="color: ${accentBg}; font-weight: bold;">${vehicleLabel}</span>
              </div>
            </div>
          </div>
        </div>

        <div style="margin-top: 10px; display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 700;">Live Status:</div>
          ${statusBadge}
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; font-size: 11px;">
          <div style="background: #1e293b; padding: 8px; border-radius: 10px; border: 1px solid #334155;">
            <div style="font-size: 9px; color: #94a3b8; text-transform: uppercase; font-weight: 700;">Speed</div>
            <div style="font-weight: 800; color: #fbbf24; font-family: monospace; font-size: 13px; margin-top: 2px;">
              ${staff.speedKmH} <span style="font-size: 10px; font-weight: normal;">km/h</span>
            </div>
          </div>
          <div style="background: #1e293b; padding: 8px; border-radius: 10px; border: 1px solid #334155;">
            <div style="font-size: 9px; color: #94a3b8; text-transform: uppercase; font-weight: 700;">Bundles Sold</div>
            <div style="font-weight: 800; color: #34d399; font-family: monospace; font-size: 13px; margin-top: 2px;">
              ${staff.todayBundles} <span style="font-size: 10px; font-weight: normal;">Units</span>
            </div>
          </div>
          <div style="grid-column: span 2; background: #1e293b; padding: 8px; border-radius: 10px; border: 1px solid #334155;">
            <div style="font-size: 9px; color: #94a3b8; text-transform: uppercase; font-weight: 700;">Location Coordinates</div>
            <div style="font-weight: 700; color: #38bdf8; font-size: 11px; font-family: monospace; margin-top: 2px;">
              ${staff.lat?.toFixed(5)}° N, ${staff.lng?.toFixed(5)}° W
            </div>
          </div>
        </div>

        <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #1e293b; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; align-items: center;">
          <span>Fix: ${staff.lastUpdated}</span>
          <span style="color: #818cf8; font-weight: bold;">Makeni GIS • Pure Max</span>
        </div>
      </div>
    `;
  }, []);

  // 1. Dynamic Google Maps JavaScript API Loader with Fallback
  useEffect(() => {
    // Only load the Google SDK when we are actually going to use it. Loading it
    // unconditionally with an unset/invalid key triggers gm_authFailure, which
    // force-switches engines mid-render and is a prime cause of the blank map.
    if (!GOOGLE_MAPS_API_KEY && !FALLBACK_GOOGLE_MAPS_KEY) {
      setActiveEngine('leaflet');
      return;
    }

    const apiKey = GOOGLE_MAPS_API_KEY || FALLBACK_GOOGLE_MAPS_KEY;

    window.gm_authFailure = () => {
      console.warn('Google Maps Authentication / Billing notice. Falling back to Leaflet.js & OpenStreetMap.');
      setGoogleAuthError(true);
      setActiveEngine('leaflet');
    };

    const handleAuthFailureEvent = () => {
      setGoogleAuthError(true);
      setActiveEngine('leaflet');
    };

    window.addEventListener('google-maps-auth-failure', handleAuthFailureEvent);

    if (window.google && window.google.maps) {
      return () => {
        window.removeEventListener('google-maps-auth-failure', handleAuthFailureEvent);
      };
    }

    const scriptId = 'google-maps-js-sdk';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&loading=async`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.google && window.google.maps) {
          setGoogleLoadFailed(false);
        } else {
          setGoogleLoadFailed(true);
          setActiveEngine('leaflet');
        }
      };
      script.onerror = () => {
        setGoogleLoadFailed(true);
        setActiveEngine('leaflet');
      };
      document.head.appendChild(script);
    }

    return () => {
      window.removeEventListener('google-maps-auth-failure', handleAuthFailureEvent);
    };
  }, []);

  // Window Resize & Viewport Layout Listener
  useEffect(() => {
    const handleResize = () => {
      if (activeEngine === 'google' && googleMapInstanceRef.current && window.google?.maps) {
        window.google.maps.event.trigger(googleMapInstanceRef.current, 'resize');
      } else if (activeEngine === 'leaflet' && leafletMapInstanceRef.current) {
        leafletMapInstanceRef.current.invalidateSize();
      }
    };

    window.addEventListener('resize', handleResize);
    const t1 = setTimeout(handleResize, 100);
    const t2 = setTimeout(handleResize, 400);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [activeEngine]);

  // 2. Initialize and Manage Google Maps
  useEffect(() => {
    if (activeEngine !== 'google' || googleAuthError || googleLoadFailed) return;
    if (!window.google || !window.google.maps || !googleMapContainerRef.current) return;

    if (!googleMapInstanceRef.current) {
      const map = new window.google.maps.Map(googleMapContainerRef.current, {
        center: MAKENI_CENTER,
        zoom: 14,
        mapTypeId: googleMapTypeId,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'on' }] },
          { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'on' }] },
        ],
      });

      googleMapInstanceRef.current = map;
      googleInfoWindowRef.current = new window.google.maps.InfoWindow();

      setTimeout(() => {
        if (window.google?.maps && googleMapInstanceRef.current) {
          window.google.maps.event.trigger(googleMapInstanceRef.current, 'resize');
        }
      }, 100);
    } else {
      googleMapInstanceRef.current.setMapTypeId(googleMapTypeId);
      window.google.maps.event.trigger(googleMapInstanceRef.current, 'resize');
    }
  }, [activeEngine, googleAuthError, googleLoadFailed, googleMapTypeId]);

  // Sync Google Maps Markers
  useEffect(() => {
    if (activeEngine !== 'google' || !googleMapInstanceRef.current || !window.google?.maps) return;

    const map = googleMapInstanceRef.current;
    const currentMarkers = googleMarkersRef.current;
    const activeIds = new Set(staffWithLocations.map((s) => s.userId));

    // Remove markers for offline/removed drivers
    Object.keys(currentMarkers).forEach((id) => {
      if (!activeIds.has(id)) {
        currentMarkers[id].setMap(null);
        delete currentMarkers[id];
      }
    });

    // Add or update markers
    staffWithLocations.forEach((staff) => {
      const pos = { lat: staff.lat!, lng: staff.lng! };
      const isVan = staff.userRole === 'van_staff';
      const color = isVan ? '#2563eb' : '#d97706';
      const iconEmoji = isVan ? '🚚' : '🛺';

      const svgIcon = {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
          <svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 52 52">
            <defs>
              <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity="0.6"/>
              </filter>
            </defs>
            <circle cx="26" cy="26" r="22" fill="${color}" stroke="#ffffff" stroke-width="3.5" filter="url(#shadow)"/>
            <text x="26" y="32" font-size="22" text-anchor="middle">${iconEmoji}</text>
          </svg>
        `)}`,
        scaledSize: new window.google.maps.Size(46, 46),
        anchor: new window.google.maps.Point(23, 23),
      };

      if (currentMarkers[staff.userId]) {
        const marker = currentMarkers[staff.userId];
        marker.setPosition(pos);
        marker.setTitle(`${staff.userName} (${staff.speedKmH} km/h) - ${isVan ? 'Van' : 'Tricycle'}`);
      } else {
        const marker = new window.google.maps.Marker({
          position: pos,
          map,
          title: `${staff.userName} (${staff.speedKmH} km/h) - ${isVan ? 'Van' : 'Tricycle'}`,
          icon: svgIcon,
          animation: window.google.maps.Animation.DROP,
        });

        marker.addListener('click', () => {
          setSelectedStaffId(staff.userId);
          if (googleInfoWindowRef.current) {
            googleInfoWindowRef.current.setContent(generateStaffPopupHTML(staff));
            googleInfoWindowRef.current.open(map, marker);
          }
        });

        currentMarkers[staff.userId] = marker;
      }
    });
  }, [activeEngine, staffWithLocations, generateStaffPopupHTML]);

  // 3. Initialize and Manage Leaflet Map
  useEffect(() => {
    if (activeEngine !== 'leaflet' || !leafletMapContainerRef.current) return;

    if (!leafletMapInstanceRef.current) {
      const map = L.map(leafletMapContainerRef.current, {
        center: MAKENI_LEAFLET,
        zoom: 14,
        zoomControl: false,
        attributionControl: false,
      });

      const layer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors | Makeni Fleet GPS',
      }).addTo(map);

      leafletTileLayerRef.current = layer;
      leafletMapInstanceRef.current = map;

      L.control.attribution({ position: 'bottomleft', prefix: 'Makeni Pure Max GIS' }).addTo(map);

      setTimeout(() => map.invalidateSize(), 200);
    } else {
      setTimeout(() => leafletMapInstanceRef.current?.invalidateSize(), 200);
    }
  }, [activeEngine]);

  // Update Leaflet tile layer on mode change
  useEffect(() => {
    if (activeEngine !== 'leaflet' || !leafletMapInstanceRef.current) return;

    if (leafletTileLayerRef.current) {
      leafletMapInstanceRef.current.removeLayer(leafletTileLayerRef.current);
    }

    let url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    let attribution = '© OpenStreetMap contributors';

    if (leafletMode === 'humanitarian') {
      url = 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png';
      attribution = '© Humanitarian OpenStreetMap Team';
    } else if (leafletMode === 'satellite') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      attribution = '© Esri Satellite Imagery | Makeni, Sierra Leone';
    } else if (leafletMode === 'dark') {
      url = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      attribution = '© CartoDB & OpenStreetMap';
    }

    const newLayer = L.tileLayer(url, { maxZoom: 19, attribution }).addTo(leafletMapInstanceRef.current);
    leafletTileLayerRef.current = newLayer;
  }, [activeEngine, leafletMode]);

  // Sync Leaflet Markers
  useEffect(() => {
    if (activeEngine !== 'leaflet' || !leafletMapInstanceRef.current) return;

    const map = leafletMapInstanceRef.current;
    const currentMarkers = leafletMarkersRef.current;
    const activeIds = new Set(staffWithLocations.map((s) => s.userId));

    // Remove markers no longer active
    Object.keys(currentMarkers).forEach((id) => {
      if (!activeIds.has(id)) {
        map.removeLayer(currentMarkers[id]);
        delete currentMarkers[id];
      }
    });

    // Add or update markers
    staffWithLocations.forEach((staff) => {
      const isSelected = selectedStaff?.userId === staff.userId;
      const isVan = staff.userRole === 'van_staff';
      const mainColor = isVan ? '#3b82f6' : '#f59e0b';
      const bgColor = isVan ? '#1e3a8a' : '#78350f';
      const vehicleTag = isVan ? 'VAN' : 'TRC';
      const iconEmoji = isVan ? '🚚' : '🛺';

      const pulseHtml =
        staff.isLiveDeviceGps || staff.speedKmH > 0
          ? `<div class="absolute -inset-2 rounded-full border-2 border-emerald-400 animate-ping opacity-75"></div>`
          : '';

      const selectionRing = isSelected
        ? `<div class="absolute -inset-1.5 rounded-full border-2 border-white shadow-xl"></div>`
        : '';

      const html = `
        <div class="relative flex flex-col items-center group cursor-pointer" style="transform: translate(-50%, -50%);">
          ${pulseHtml}
          ${selectionRing}
          <div class="relative flex items-center justify-center w-11 h-11 rounded-full shadow-2xl transition-transform duration-200 transform hover:scale-110"
               style="background: ${bgColor}; border: 3px solid ${mainColor}; box-shadow: 0 0 18px ${mainColor}88;">
            <span class="text-lg">${iconEmoji}</span>
            <div class="absolute -top-1.5 -right-1 px-1 rounded bg-slate-900 border border-slate-700 text-[8px] font-mono font-bold text-white uppercase">
              ${vehicleTag}
            </div>
            ${
              staff.isLiveDeviceGps
                ? `<div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900 shadow-sm animate-pulse"></div>`
                : ''
            }
          </div>
          <div class="mt-1 px-2 py-0.5 rounded-md bg-slate-950/90 backdrop-blur-md text-white text-[10px] font-bold border border-slate-700 shadow-xl whitespace-nowrap flex items-center gap-1.5">
            <span style="color: ${mainColor}">●</span>
            <span>${staff.userName.split(' ')[0]}</span>
            <span class="text-amber-400 font-mono text-[9px]">${staff.speedKmH}km/h</span>
          </div>
        </div>
      `;

      const icon = L.divIcon({
        html,
        className: 'custom-fleet-marker',
        iconSize: [48, 56],
        iconAnchor: [24, 28],
        popupAnchor: [0, -30],
      });

      const popupContent = generateStaffPopupHTML(staff);

      if (currentMarkers[staff.userId]) {
        const marker = currentMarkers[staff.userId];
        marker.setLatLng([staff.lat!, staff.lng!]);
        marker.setIcon(icon);
        marker.setPopupContent(popupContent);
      } else {
        const marker = L.marker([staff.lat!, staff.lng!], { icon })
          .addTo(map)
          .bindPopup(popupContent, {
            className: 'puremax-leaflet-popup',
            closeButton: false,
            autoPan: true,
          });

        marker.on('click', () => {
          setSelectedStaffId(staff.userId);
        });

        currentMarkers[staff.userId] = marker;
      }
    });
  }, [activeEngine, staffWithLocations, selectedStaff?.userId, generateStaffPopupHTML]);

  // Center and focus map on coordinates
  const focusMapOnCoords = useCallback((lat: number, lng: number, zoomLevel = 18) => {
    if (activeEngine === 'google' && googleMapInstanceRef.current) {
      googleMapInstanceRef.current.setZoom(zoomLevel);
      googleMapInstanceRef.current.panTo({ lat, lng });
    } else if (activeEngine === 'leaflet' && leafletMapInstanceRef.current) {
      leafletMapInstanceRef.current.flyTo([lat, lng], zoomLevel, { duration: 1 });
    }
  }, [activeEngine]);

  /**
   * Translate a GeolocationPositionError into something actionable.
   *
   * The old handlers only reacted to PERMISSION_DENIED. TIMEOUT and
   * POSITION_UNAVAILABLE — the two most common failures on a phone doing a cold
   * GPS fix — fell through silently, so the map just sat there with no
   * explanation and no marker. Every code now produces a visible warning.
   */
  const handleGpsError = useCallback((err: GeolocationPositionError) => {
    switch (err.code) {
      case err.PERMISSION_DENIED:
        setGpsPermissionDenied(true);
        setLocationError(
          "GPS Access Blocked: click 'Allow' in your browser address bar (or Site settings → Location) to show exact vehicle location."
        );
        break;
      case err.POSITION_UNAVAILABLE:
        setLocationError(
          'Location unavailable: this device cannot determine a position right now. Move outdoors or enable device Location services.'
        );
        break;
      case err.TIMEOUT:
        setLocationError(
          'GPS timed out before a fix was acquired. This is normal on a cold start — keep the device in view of the sky and retry.'
        );
        break;
      default:
        setLocationError(err.message || 'Unable to determine your location.');
    }
    setIsLocatingMe(false);
  }, []);

  // Handle GPS Broadcast Toggle
  const handleToggleLiveGps = useCallback(() => {
    if (!currentUser) {
      setLocationError('Please log in to broadcast live delivery GPS.');
      setTimeout(() => setLocationError(null), 4000);
      return;
    }

    if (!('geolocation' in navigator)) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setIsLocatingMe(false);
      setLocationSuccessMsg('Live tracking paused. GPS broadcast turned off.');
      setTimeout(() => setLocationSuccessMsg(null), 3000);
      return;
    }

    setIsLocatingMe(true);
    setLocationError(null);
    setGpsPermissionDenied(false);

    const vehicleType = getFleetVehicleType(currentUser);

    // Initial immediate getCurrentPosition for instantaneous zoom & center
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsPermissionDenied(false);
        setLocationError(null);
        setHasAcquiredFirstFix(true);
        const { latitude, longitude, accuracy, speed, heading } = pos.coords;
        const calculatedSpeed = speed ? Math.round(speed * 3.6) : 0;

        const livePayload = {
          userId: currentUser.id,
          employeeId: currentUser.employeeId,
          userName: currentUser.name,
          userRole: vehicleType,
          avatarUrl: currentUser.avatarUrl,
          phone: currentUser.phone,
          lat: latitude,
          lng: longitude,
          accuracyMeters: Math.round(accuracy || 5),
          speedKmH: calculatedSpeed,
          heading: heading || 0,
          batteryPct: 95,
          status: (calculatedSpeed > 0 ? 'Online & Moving' : 'Stationary / Delivering') as any,
          lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          isLiveDeviceGps: true,
        };

        updateStaffLiveLocation(livePayload);
        socketService.socket?.emit('staff_location_update', livePayload);

        // Instantly re-center and zoom to 18
        focusMapOnCoords(latitude, longitude, 18);
        firstFixCenteredRef.current = true;
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsPermissionDenied(true);
          setLocationError("GPS Access Blocked: Click 'Allow' in your browser address bar to show exact vehicle location.");
        }
      },
      GPS_WATCH_OPTIONS
    );

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsPermissionDenied(false);
        setLocationError(null);
        setHasAcquiredFirstFix(true);
        const { latitude, longitude, accuracy, speed, heading } = pos.coords;
        const calculatedSpeed = speed ? Math.round(speed * 3.6) : 0;

        const livePayload = {
          userId: currentUser.id,
          employeeId: currentUser.employeeId,
          userName: currentUser.name,
          userRole: vehicleType,
          avatarUrl: currentUser.avatarUrl,
          phone: currentUser.phone,
          lat: latitude,
          lng: longitude,
          accuracyMeters: Math.round(accuracy || 5),
          speedKmH: calculatedSpeed,
          heading: heading || 0,
          batteryPct: 95,
          status: (calculatedSpeed > 0 ? 'Online & Moving' : 'Stationary / Delivering') as any,
          lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          isLiveDeviceGps: true,
        };

        updateStaffLiveLocation(livePayload);
        socketService.socket?.emit('staff_location_update', livePayload);

        setLocationSuccessMsg(
          `Live GPS Active: Lat ${latitude.toFixed(5)}°, Lng ${longitude.toFixed(5)}° (±${Math.round(accuracy)}m).`
        );

        if (!firstFixCenteredRef.current) {
          focusMapOnCoords(latitude, longitude, 18);
          firstFixCenteredRef.current = true;
        } else {
          focusMapOnCoords(latitude, longitude);
        }
      },
      (err) => {
        setIsLocatingMe(false);
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
        let msg = 'Unable to retrieve your location.';
        if (err.code === err.PERMISSION_DENIED) {
          setGpsPermissionDenied(true);
          msg = "GPS Access Blocked: Click 'Allow' in your browser address bar to show exact vehicle location.";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'GPS satellite information is unavailable on this device.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'GPS satellite request timed out. Retrying satellite lock...';
        }
        setLocationError(msg);
      },
      GPS_WATCH_OPTIONS
    );

    watchIdRef.current = watchId;
  }, [currentUser, updateStaffLiveLocation, focusMapOnCoords, handleGpsError]);

  // Auto-acquire real device GPS on mount for fleet staff or logged in user
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator && currentUser) {
      const vehicleType = getFleetVehicleType(currentUser);
      setIsLocatingMe(true);

      // Instant getCurrentPosition to center without waiting
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsPermissionDenied(false);
          setLocationError(null);
          setHasAcquiredFirstFix(true);
          const { latitude, longitude, accuracy, speed, heading } = pos.coords;
          const calculatedSpeed = speed ? Math.round(speed * 3.6) : 0;

          const livePayload = {
            userId: currentUser.id,
            employeeId: currentUser.employeeId,
            userName: currentUser.name,
            userRole: vehicleType,
            avatarUrl: currentUser.avatarUrl,
            phone: currentUser.phone,
            lat: latitude,
            lng: longitude,
            accuracyMeters: Math.round(accuracy || 5),
            speedKmH: calculatedSpeed,
            heading: heading || 0,
            batteryPct: 95,
            status: (calculatedSpeed > 0 ? 'Online & Moving' : 'Stationary / Delivering') as any,
            lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            isLiveDeviceGps: true,
          };

          updateStaffLiveLocation(livePayload);
          socketService.socket?.emit('staff_location_update', livePayload);

          // Force instant re-center and zoom level 18 onto real device coordinates
          focusMapOnCoords(latitude, longitude, 18);
          firstFixCenteredRef.current = true;
        },
        handleGpsError,
        GPS_WATCH_OPTIONS
      );

      // Continuous high-precision watch
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setGpsPermissionDenied(false);
          setLocationError(null);
          setHasAcquiredFirstFix(true);
          const { latitude, longitude, accuracy, speed, heading } = pos.coords;
          const calculatedSpeed = speed ? Math.round(speed * 3.6) : 0;

          const livePayload = {
            userId: currentUser.id,
            employeeId: currentUser.employeeId,
            userName: currentUser.name,
            userRole: vehicleType,
            avatarUrl: currentUser.avatarUrl,
            phone: currentUser.phone,
            lat: latitude,
            lng: longitude,
            accuracyMeters: Math.round(accuracy || 5),
            speedKmH: calculatedSpeed,
            heading: heading || 0,
            batteryPct: 95,
            status: (calculatedSpeed > 0 ? 'Online & Moving' : 'Stationary / Delivering') as any,
            lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            isLiveDeviceGps: true,
          };

          updateStaffLiveLocation(livePayload);
          socketService.socket?.emit('staff_location_update', livePayload);

          // Auto center and zoom to 18 on first live fix
          if (!firstFixCenteredRef.current) {
            focusMapOnCoords(latitude, longitude, 18);
            firstFixCenteredRef.current = true;
          }
        },
        handleGpsError,
        GPS_WATCH_OPTIONS
      );

      watchIdRef.current = watchId;

      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    }
  }, [currentUser?.id, updateStaffLiveLocation, focusMapOnCoords, handleGpsError]);

  // Cleanup watcher on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  const handleFlyToStaff = (lat: number, lng: number) => {
    if (activeEngine === 'google' && googleMapInstanceRef.current) {
      googleMapInstanceRef.current.setZoom(17);
      googleMapInstanceRef.current.panTo({ lat, lng });
    } else if (activeEngine === 'leaflet' && leafletMapInstanceRef.current) {
      leafletMapInstanceRef.current.flyTo([lat, lng], 17, { duration: 1.2 });
    }
  };

  const handleFitAllStaff = () => {
    if (staffWithLocations.length === 0) return;

    if (activeEngine === 'google' && googleMapInstanceRef.current && window.google?.maps) {
      const bounds = new window.google.maps.LatLngBounds();
      staffWithLocations.forEach((s) => bounds.extend({ lat: s.lat!, lng: s.lng! }));
      googleMapInstanceRef.current.fitBounds(bounds);
    } else if (activeEngine === 'leaflet' && leafletMapInstanceRef.current) {
      if (staffWithLocations.length === 1) {
        leafletMapInstanceRef.current.flyTo([staffWithLocations[0].lat!, staffWithLocations[0].lng!], 16);
      } else {
        const bounds = L.latLngBounds(staffWithLocations.map((s) => [s.lat!, s.lng!]));
        leafletMapInstanceRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 17 });
      }
    }
  };

  const handleResetToMakeni = () => {
    if (activeEngine === 'google' && googleMapInstanceRef.current) {
      googleMapInstanceRef.current.setZoom(14);
      googleMapInstanceRef.current.panTo(MAKENI_CENTER);
    } else if (activeEngine === 'leaflet' && leafletMapInstanceRef.current) {
      leafletMapInstanceRef.current.flyTo(MAKENI_LEAFLET, 14, { duration: 1 });
    }
  };

  const copyPhoneNumber = (phone: string, id: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedPhoneId(id);
    setTimeout(() => setCopiedPhoneId(null), 2000);
  };

  return (
    <div className={`space-y-4 text-slate-900 dark:text-white ${isFullscreen ? 'fixed inset-0 z-[200] bg-slate-100 dark:bg-slate-950 p-4 sm:p-6 space-y-6 overflow-auto' : ''}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold flex items-center gap-2">
              <Navigation className="w-6 h-6 text-indigo-500" />
              Makeni Live Sales Fleet GPS Navigation
            </h2>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
              activeEngine === 'google'
                ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
            }`}>
              {activeEngine === 'google' ? 'Google Maps API' : 'Leaflet / OpenStreetMap'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time live fleet tracking for Tricycles (🛺) & Vans (🚚) across Makeni, Sierra Leone.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Simulation Toggle Controls */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-xs font-semibold">
            <button
              onClick={() => setIsSimulating(!isSimulating)}
              className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                isSimulating
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
              title={isSimulating ? 'Pause Route Simulation' : 'Resume Route Simulation'}
            >
              {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isSimulating ? 'Live Movement Active' : 'Simulation Paused'}</span>
            </button>
            <button
              onClick={() => setSimulationSpeedMultiplier((prev) => (prev === 1 ? 2 : prev === 2 ? 4 : 1))}
              className="px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              title="Simulation Speed Multiplier"
            >
              <FastForward className="w-3 h-3" />
              <span>{simulationSpeedMultiplier}x</span>
            </button>
          </div>

          {/* Map Engine Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-xs font-semibold">
            <button
              onClick={() => {
                if (googleAuthError || googleLoadFailed) {
                  setLocationError('Google Maps API key is unavailable or restricted. Operating on Leaflet OSM.');
                  setTimeout(() => setLocationError(null), 4000);
                  return;
                }
                setActiveEngine('google');
              }}
              className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                activeEngine === 'google'
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Globe className="w-3.5 h-3.5" /> Google Maps
            </button>
            <button
              onClick={() => setActiveEngine('leaflet')}
              className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                activeEngine === 'leaflet'
                  ? 'bg-emerald-600 text-white font-bold shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <MapIcon className="w-3.5 h-3.5" /> Leaflet OSM
            </button>
          </div>

          {/* Layer/Style Switcher */}
          {activeEngine === 'google' ? (
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-xs font-semibold">
              <button
                onClick={() => setGoogleMapTypeId('roadmap')}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                  googleMapTypeId === 'roadmap' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Roads
              </button>
              <button
                onClick={() => setGoogleMapTypeId('hybrid')}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                  googleMapTypeId === 'hybrid' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Hybrid
              </button>
              <button
                onClick={() => setGoogleMapTypeId('satellite')}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                  googleMapTypeId === 'satellite' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Satellite
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 p-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-xs font-semibold">
              <button
                onClick={() => setLeafletMode('street')}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                  leafletMode === 'street' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Streets
              </button>
              <button
                onClick={() => setLeafletMode('humanitarian')}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                  leafletMode === 'humanitarian' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Detail
              </button>
              <button
                onClick={() => setLeafletMode('satellite')}
                className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                  leafletMode === 'satellite' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Satellite
              </button>
            </div>
          )}

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-indigo-500 transition shadow-sm cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className={`grid grid-cols-1 ${isFullscreen ? 'lg:grid-cols-4 h-[calc(100vh-100px)]' : 'lg:grid-cols-3'} gap-4`}>
        {/* Left Column: Map Canvas */}
        <div className={`space-y-4 ${isFullscreen ? 'lg:col-span-3 h-full flex flex-col' : 'lg:col-span-2'}`}>
          <div className="p-2 sm:p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl flex-1 flex flex-col">
            
            {/* Logged-In Driver GPS Telemetry Header */}
            {isDeliveryStaff && (
              <div className="mb-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-sm ${
                    watchIdRef.current !== null
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500 border-slate-300 dark:border-slate-600'
                  }`}>
                    <Activity className={`w-4 h-4 ${watchIdRef.current !== null ? 'animate-pulse' : ''}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">My Vehicle GPS Transmitter ({getFleetVehicleType(currentUser) === 'van_staff' ? '🚚 Van' : '🛺 Tricycle'})</span>
                      <span className={`px-2 py-0.2 rounded-md text-[10px] font-mono font-bold uppercase ${
                        watchIdRef.current !== null
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {watchIdRef.current !== null ? 'Live Hardware GPS' : 'Route Tracking Active'}
                      </span>
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-1.5 mt-0.5">
                      <Radio className={`w-3 h-3 ${watchIdRef.current !== null ? 'animate-pulse text-emerald-500' : 'text-slate-400'}`} />
                      {watchIdRef.current !== null
                        ? 'Broadcasting high-precision device coordinates & speed directly to Makeni dispatch'
                        : 'Enable browser GPS to stream real hardware coordinates & navigation'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleToggleLiveGps}
                  className={`px-4 py-2 rounded-xl font-bold text-white shadow-lg flex items-center gap-2 transition cursor-pointer ${
                    watchIdRef.current !== null
                      ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                      : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                  }`}
                >
                  {watchIdRef.current !== null ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>Stop Live Device GPS</span>
                    </>
                  ) : (
                    <>
                      <LocateFixed className="w-3.5 h-3.5" />
                      <span>Stream Device GPS</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* GPS ACCESS BLOCKED PROMINENT BANNER */}
            {gpsPermissionDenied && (
              <div className="mb-3 p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-500 text-amber-900 dark:text-amber-200 text-xs font-bold flex flex-wrap items-center justify-between gap-3 shadow-xl animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-black block text-amber-800 dark:text-amber-300">
                      GPS Access Blocked: Click &apos;Allow&apos; in your browser address bar to show exact vehicle location.
                    </span>
                    <span className="text-[11px] font-normal text-amber-700 dark:text-amber-400 block mt-0.5">
                      Real-time positioning is paused until browser location permissions are granted.
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleToggleLiveGps}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs shrink-0 cursor-pointer shadow-lg transition"
                >
                  Retry GPS Lock
                </button>
              </div>
            )}

            {locationError && !gpsPermissionDenied && (
              <div className="mb-3 px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {locationError}
              </div>
            )}
            
            {locationSuccessMsg && (
              <div className="mb-3 px-3.5 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {locationSuccessMsg}
              </div>
            )}

            {/* MAP CANVAS CONTAINER */}
            <div
              style={{ minHeight: '550px', height: '100%', width: '100%', position: 'relative' }}
              className={`relative w-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 flex-1 min-h-[550px] ${isFullscreen ? 'h-full' : 'lg:min-h-[550px]'}`}
            >
              {/* Google Maps Container */}
              <div
                ref={googleMapContainerRef}
                style={{ minHeight: '550px', height: '100%', width: '100%', position: 'relative' }}
                className={`w-full h-full min-h-[550px] ${activeEngine === 'google' ? 'block' : 'hidden'}`}
              />

              {/* Leaflet Maps Container */}
              <div
                ref={leafletMapContainerRef}
                style={{ minHeight: '550px', height: '100%', width: '100%', position: 'relative' }}
                className={`w-full h-full min-h-[550px] ${activeEngine === 'leaflet' ? 'block' : 'hidden'}`}
              />

              {/* Floating Quick Action Overlay */}
              <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5 bg-slate-950/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 shadow-2xl">
                <button
                  onClick={handleResetToMakeni}
                  className="w-8 h-8 rounded-lg bg-indigo-950 hover:bg-indigo-900 text-indigo-300 font-bold flex items-center justify-center cursor-pointer transition"
                  title="Reset to Makeni Center"
                >
                  <Compass className="w-4 h-4" />
                </button>
                {staffWithLocations.length > 0 && (
                  <button
                    onClick={handleFitAllStaff}
                    className="w-8 h-8 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 font-bold flex items-center justify-center cursor-pointer transition"
                    title="Fit All Drivers"
                  >
                    <Crosshair className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Fallback notification indicator */}
              {googleAuthError && activeEngine === 'leaflet' && (
                <div className="absolute bottom-4 right-4 z-20 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-300 text-[11px] backdrop-blur-md flex items-center gap-2 shadow-xl">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span>Operating via Leaflet OpenStreetMap (Makeni)</span>
                </div>
              )}

              {/* Empty state overlay */}
              {staffWithLocations.length === 0 && (
                <div className="absolute inset-0 z-10 pointer-events-none bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-slate-300">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3 shadow-lg">
                    <Radio className="w-8 h-8 animate-pulse" />
                  </div>
                  <h3 className="text-base font-extrabold text-white">No Active Fleet Accounts Found</h3>
                  <p className="text-xs text-slate-400 max-w-md mt-1 leading-relaxed">
                    Create or log into a sales delivery user containing <strong>"tricycle"</strong>, <strong>"trc"</strong>, <strong>"van"</strong>, or <strong>"delivery"</strong> in their name, ID, or role to begin live fleet tracking.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Active Tricycle & Van Staff Roster & Telemetry Card */}
        <div className={`space-y-4 ${isFullscreen ? 'h-full overflow-y-auto pr-2' : ''}`}>
          {/* Selected Staff Detail Card */}
          {selectedStaff && (
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={selectedStaff.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedStaff.userName)}&background=3b82f6&color=fff`}
                      alt={selectedStaff.userName}
                      className="w-12 h-12 rounded-2xl object-cover border-2 border-indigo-500 shadow-md"
                    />
                    <span className="absolute -bottom-1 -right-1 text-base">
                      {selectedStaff.userRole === 'van_staff' ? '🚚' : '🛺'}
                    </span>
                  </div>
                  <div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      selectedStaff.userRole === 'van_staff'
                        ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
                        : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                    }`}>
                      {selectedStaff.employeeId} • {selectedStaff.userRole === 'van_staff' ? 'Distribution Van' : 'Sachet Tricycle'}
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                      {selectedStaff.userName}
                    </h3>
                  </div>
                </div>
                {selectedStaff.lat !== null && selectedStaff.lng !== null && (
                  <button
                    onClick={() => handleFlyToStaff(selectedStaff.lat!, selectedStaff.lng!)}
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-indigo-500 transition cursor-pointer"
                    title="Focus on Map"
                  >
                    <Crosshair className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* GPS Coordinates & Telemetry Cards */}
              <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 block uppercase font-sans">Status Badge</span>
                  <span className={`text-xs font-bold flex items-center gap-1 mt-0.5 ${
                    selectedStaff.speedKmH > 0
                      ? 'text-blue-500'
                      : selectedStaff.status?.includes('Delivering') || selectedStaff.status?.includes('Selling')
                      ? 'text-emerald-500'
                      : 'text-slate-400'
                  }`}>
                    <Radio className={`w-3.5 h-3.5 ${selectedStaff.hasGps ? 'animate-pulse' : ''}`} />
                    {selectedStaff.speedKmH > 0 ? 'En Route' : 'Active / Selling'}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 block uppercase font-sans">Current Speed</span>
                  <span className="text-xs font-bold text-amber-500 flex items-center gap-1 mt-0.5">
                    <Gauge className="w-3.5 h-3.5" />
                    {selectedStaff.speedKmH} km/h
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 col-span-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block uppercase font-sans">Today Delivered Water Bundles</span>
                      <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-300 font-mono">
                        {selectedStaff.todayBundles} Bundles
                      </span>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-400 font-bold uppercase font-sans">GPS COORDINATES</span>
                    {selectedStaff.hasGps ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        Live Device Lock
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-400 font-sans">Makeni Fleet Route</span>
                    )}
                  </div>
                  {selectedStaff.lat !== null && selectedStaff.lng !== null ? (
                    <div className="mt-1 space-y-1">
                      <div className="text-slate-800 dark:text-slate-200 font-bold text-xs">
                        Lat: {selectedStaff.lat.toFixed(5)}° N, Lng: {selectedStaff.lng.toFixed(5)}° W
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between font-sans">
                        <span>Accuracy: ±{selectedStaff.accuracyMeters || 8}m</span>
                        <span>Heading: {selectedStaff.heading || 0}°</span>
                        <span>Updated: {selectedStaff.lastUpdated}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 text-slate-400 font-semibold flex items-center gap-1.5 font-sans">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Waiting for GPS fix
                    </div>
                  )}
                </div>
              </div>

              {/* Direct Communication Action */}
              {selectedStaff.phone && (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => copyPhoneNumber(selectedStaff.phone, selectedStaff.userId)}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    {copiedPhoneId === selectedStaff.userId ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{selectedStaff.phone}</span>
                  </button>
                  <a
                    href={`tel:${selectedStaff.phone}`}
                    className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
                    title="Call Driver"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Connected Fleet Search & Roster */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col h-[380px]">
            <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-2">
                  <Truck className="w-4 h-4 text-indigo-500" />
                  Makeni Fleet Roster
                </h3>
                <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-md text-[10px] font-bold">
                  {staffWithLocations.length}/{activeDeliveryStaff.length} Active
                </span>
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search driver name, ID (e.g. PM-TRC-001)..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setFilterRole('all')}
                  className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                    filterRole === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  All ({activeDeliveryStaff.length})
                </button>
                <button
                  onClick={() => setFilterRole('tricycle_staff')}
                  className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    filterRole === 'tricycle_staff' ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  🛺 Tricycles
                </button>
                <button
                  onClick={() => setFilterRole('van_staff')}
                  className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    filterRole === 'van_staff' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  🚚 Vans
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
              {activeDeliveryStaff.length === 0 ? (
                <div className="text-center p-6 text-slate-500 text-xs">
                  No sales accounts found matching "tricycle", "trc", "van", or "delivery".
                </div>
              ) : (
                activeDeliveryStaff.map((staff) => (
                  <button
                    key={staff.userId}
                    onClick={() => {
                      setSelectedStaffId(staff.userId);
                      if (staff.lat && staff.lng) handleFlyToStaff(staff.lat, staff.lng);
                    }}
                    className={`w-full text-left p-2.5 rounded-xl transition flex items-center gap-3 border cursor-pointer ${
                      selectedStaffId === staff.userId
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 shadow-sm'
                        : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="relative">
                      <img
                        src={staff.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(staff.userName)}&background=3b82f6&color=fff`}
                        alt={staff.userName}
                        className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                      />
                      <span className="absolute -bottom-1 -right-1 text-xs">
                        {staff.userRole === 'van_staff' ? '🚚' : '🛺'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs text-slate-900 dark:text-white truncate flex items-center justify-between">
                        <span className="truncate">{staff.userName}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                          staff.speedKmH > 0 ? 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {staff.speedKmH > 0 ? `${staff.speedKmH} km/h` : 'Selling'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center justify-between mt-0.5">
                        <span className="font-mono">{staff.employeeId}</span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                          {staff.todayBundles} bundles
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
