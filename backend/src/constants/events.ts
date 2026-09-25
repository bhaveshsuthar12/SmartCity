/**
 * WebSocket event name constants for SmartCity 360.
 *
 * Naming convention: <domain>:<action>
 * These are the contracts that the frontend subscribes to.
 *
 * Phase 7+ will implement the actual emitters for most of these.
 */

// ── Connection ────────────────────────────────────────────────
export const WS_EVENTS = {
    // System
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    ERROR: 'error',
    JOIN_CITY_ROOM: 'join:city-room',
    LEAVE_CITY_ROOM: 'leave:city-room',

    // City
    CITY_UPDATED: 'city:updated',

    // Garbage vehicles — Phase 5 Live Tracking
    GARBAGE_TRACKING_STARTED: 'garbage:tracking-started',
    GARBAGE_VEHICLE_LOCATION_UPDATED: 'garbage:vehicle-location-updated',
    GARBAGE_ROUTE_PROGRESS_UPDATED: 'garbage:route-progress-updated',
    GARBAGE_TRACKING_STOPPED: 'garbage:tracking-stopped',
    GARBAGE_VEHICLE_STATUS_UPDATED: 'garbage:vehicle-status-updated',
    GARBAGE_VEHICLE_STATUS_CHANGED: 'garbage:vehicle-status-changed',
    GARBAGE_ROUTE_UPDATED: 'garbage:route-updated',

    // WebSocket inbound from tracking device
    GARBAGE_LOCATION_UPDATE: 'garbage:location-update',
    JOIN_VEHICLE_ROOM: 'join:vehicle-room',
    LEAVE_VEHICLE_ROOM: 'leave:vehicle-room',
    JOIN_ROUTE_ROOM: 'join:route-room',
    LEAVE_ROUTE_ROOM: 'leave:route-room',

    // Electricity Module (Phase 7)
    ELECTRICITY_READING_UPDATED: 'electricity:reading-updated',
    ELECTRICITY_SENSOR_STATUS_UPDATED: 'electricity:sensor-status-updated',
    ELECTRICITY_ASSET_STATUS_UPDATED: 'electricity:asset-status-updated',
    ELECTRICITY_INCIDENT_CREATED: 'electricity:incident-created',
    ELECTRICITY_INCIDENT_UPDATED: 'electricity:incident-updated',
    ELECTRICITY_OUTAGE_CREATED: 'electricity:outage-created',
    ELECTRICITY_OUTAGE_UPDATED: 'electricity:outage-updated',
    ELECTRICITY_MAINTENANCE_UPDATED: 'electricity:maintenance-updated',

    // Traffic (Phase 11)
    TRAFFIC_UPDATED: 'traffic:updated',
    TRAFFIC_READING_UPDATED: 'traffic:reading-updated',
    TRAFFIC_ROAD_STATUS_UPDATED: 'traffic:road-status-updated',
    TRAFFIC_CONGESTION_CREATED: 'traffic:congestion-created',
    TRAFFIC_CONGESTION_UPDATED: 'traffic:congestion-updated',
    TRAFFIC_INCIDENT_CREATED: 'traffic:incident-created',
    TRAFFIC_INCIDENT_UPDATED: 'traffic:incident-updated',
    TRAFFIC_SIGNAL_STATUS_UPDATED: 'traffic:signal-status-updated',
    TRAFFIC_ROAD_CLOSURE_UPDATED: 'traffic:road-closure-updated',
    TRAFFIC_ROADWORK_UPDATED: 'traffic:roadwork-updated',

    // EV Infrastructure (Phase 9)
    EV_STATION_STATUS_UPDATED: 'ev:station-status-updated',
    EV_CONNECTOR_STATUS_UPDATED: 'ev:connector-status-updated',
    EV_READING_UPDATED: 'ev:reading-updated',
    EV_CHARGING_SESSION_STARTED: 'ev:charging-session-started',
    EV_CHARGING_SESSION_UPDATED: 'ev:charging-session-updated',
    EV_CHARGING_SESSION_COMPLETED: 'ev:charging-session-completed',
    EV_RESERVATION_UPDATED: 'ev:reservation-updated',
    EV_INCIDENT_CREATED: 'ev:incident-created',
    EV_INCIDENT_UPDATED: 'ev:incident-updated',
    EV_MAINTENANCE_UPDATED: 'ev:maintenance-updated',

    // Notifications (Phase 12)
    NOTIFICATION_NEW: 'notification:created',
    NOTIFICATION_READ: 'notification:read',
    NOTIFICATION_ARCHIVED: 'notification:archived',
    NOTIFICATION_COUNT_UPDATED: 'notification:count-updated',
    NOTIFICATION_ANNOUNCEMENT_PUBLISHED: 'notification:announcement-published',

    // Citizen Reports (Phase 11)
    CITIZEN_REPORT_CREATED: 'citizen-report-created',
    CITIZEN_REPORT_STATUS_CHANGED: 'citizen-report-status-changed',
    CITIZEN_REPORT_COMMENT_ADDED: 'citizen-report-comment-added',

    // Alerts
    EMERGENCY_ALERT: 'alert:emergency',

    // AI (Phase 17)
    AI_ANOMALY_DETECTED: 'ai:anomaly-detected',
    AI_PREDICTION_READY: 'ai:prediction-ready',

    // Sensors (Phase 18)
    SENSOR_DATA_UPDATED: 'sensor:data-updated',

    // Water Module (Phase 6)
    WATER_SENSOR_READING_UPDATED: 'water:sensor-reading-updated',
    WATER_SENSOR_STATUS_UPDATED: 'water:sensor-status-updated',
    WATER_ASSET_STATUS_UPDATED: 'water:asset-status-updated',
    WATER_INCIDENT_CREATED: 'water:incident-created',
    WATER_INCIDENT_UPDATED: 'water:incident-updated',
    WATER_SUPPLY_SCHEDULE_UPDATED: 'water:supply-schedule-updated',

    // Streetlights (Phase 10)
    STREETLIGHT_ZONE_UPDATED: 'streetlight:zone-updated',
    STREETLIGHT_STATUS_UPDATED: 'streetlight:status-updated',
    STREETLIGHT_READING_UPDATED: 'streetlight:reading-updated',
    STREETLIGHT_INCIDENT_CREATED: 'streetlight:incident-created',
    STREETLIGHT_INCIDENT_UPDATED: 'streetlight:incident-updated',
    STREETLIGHT_CONTROL_UPDATED: 'streetlight:control-updated',

    // Accident Response System (Phase 21)
    ACCIDENT_INCIDENT_CREATED: 'accident:incident-created',
    ACCIDENT_INCIDENT_UPDATED: 'accident:incident-updated',
    ACCIDENT_CAMERA_STATUS_CHANGED: 'accident:camera-status-changed',
} as const;

export type WsEvent = (typeof WS_EVENTS)[keyof typeof WS_EVENTS];

/** Room naming helpers */
export const roomName = {
    city: (cityId: string) => `city:${cityId}`,
    service: (cityId: string, service: string) => `city:${cityId}:${service}`,
    user: (userId: string) => `user:${userId}`,
    vehicle: (vehicleId: string) => `vehicle:${vehicleId}`,
    route: (routeId: string) => `route:${routeId}`,
    waterAsset: (assetId: string) => `water:asset:${assetId}`,
    waterSensor: (sensorId: string) => `water:sensor:${sensorId}`,
    electricityAsset: (assetId: string) => `electricity:asset:${assetId}`,
    electricitySensor: (sensorId: string) => `electricity:sensor:${sensorId}`,
} as const;
