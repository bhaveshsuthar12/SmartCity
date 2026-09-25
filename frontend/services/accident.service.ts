import api from './api';

// ── Types ─────────────────────────────────────────────────────────────────────

export type CameraSourceType = 'RTSP' | 'VIDEO_FILE' | 'WEBCAM' | 'SIMULATION';
export type CameraStatus = 'ONLINE' | 'OFFLINE' | 'ERROR' | 'DISABLED';

export interface AccidentCamera {
    _id: string;
    cameraId: string;
    name: string;
    location: {
        type: 'Point';
        coordinates: [number, number];
        address?: string;
        description?: string;
    };
    sourceType: CameraSourceType;
    city: string;
    status: CameraStatus;
    lastFrameAt?: string;
    lastHeartbeat?: string;
    fps?: number;
    resolution?: string;
    enabled: boolean;
    errorMessage?: string;
    createdAt: string;
    updatedAt: string;
}

export interface AccidentHospital {
    _id: string;
    hospitalId: string;
    name: string;
    address: string;
    city: string;
    location: { type: 'Point'; coordinates: [number, number] };
    email?: string;
    phone?: string;
    emergencyAvailable: boolean;
    traumaFacility: boolean;
    ambulanceAvailable: boolean;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

export type AccidentType =
    | 'VEHICLE_COLLISION' | 'MOTORCYCLE_COLLISION' | 'CAR_COLLISION'
    | 'VEHICLE_ROLLOVER' | 'PERSON_VEHICLE_COLLISION' | 'MULTIPLE_VEHICLE_COLLISION'
    | 'ABNORMAL_VEHICLE_STOP' | 'PERSON_ON_ROAD' | 'SMOKE_FIRE_AFTER_COLLISION' | 'UNKNOWN';

export type AccidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AccidentStatus =
    | 'DETECTED' | 'VERIFYING' | 'CONFIRMED'
    | 'HOSPITAL_NOTIFIED' | 'RESPONSE_IN_PROGRESS' | 'HOSPITAL_RECEIVED'
    | 'RESOLVED' | 'FALSE_POSITIVE' | 'CANCELLED';

export interface AccidentIncident {
    _id: string;
    incidentId: string;
    cameraId: string;
    city: string;
    location: { type: 'Point'; coordinates: [number, number]; address?: string };
    detectedAt: string;
    accidentType: AccidentType;
    severity: AccidentSeverity;
    aiConfidence: number;
    vehiclesInvolved?: number;
    possiblePersons?: number;
    description?: string;
    hospital?: {
        hospitalId?: string;
        name?: string;
        distanceMeters?: number;
        selectionReason?: string;
        selectedAt?: string;
    };
    notification: { status: string; notifiedAt?: string; attempts: unknown[] };
    status: AccidentStatus;
    verification?: { verifiedBy?: string; verifiedAt?: string; notes?: string };
    resolution?: { resolvedBy?: string; resolvedAt?: string; notes?: string };
    auditLog: Array<{ action: string; actor: string; timestamp: string; metadata?: Record<string, unknown> }>;
    report?: string;
    createdAt: string;
    updatedAt: string;
}

export interface AccidentAnalytics {
    summary: {
        total: number; active: number; critical: number; high: number;
        medium: number; low: number; resolved: number; falsePositives: number;
        needsVerification: number; falsePositiveRate: string;
    };
    byStatus: Record<string, number>;
    bySeverity: Array<{ _id: string; count: number }>;
    byType: Array<{ _id: string; count: number }>;
    byDay: Array<{ _id: string; count: number }>;
    byHour: Array<{ _id: number; count: number }>;
    hotspots: Array<{ lat: number; lon: number; count: number }>;
}

// ── Camera API ───────────────────────────────────────────────────────────────

export const accidentService = {
    // Cameras
    cameras: {
        list: (params?: Record<string, string>) =>
            api.get<AccidentCamera[]>('/admin/cameras', { params }).then(r => r.data),
        get: (id: string) =>
            api.get<AccidentCamera>(`/admin/cameras/${id}`).then(r => r.data),
        create: (data: Partial<AccidentCamera> & { streamUrl?: string }) =>
            api.post<AccidentCamera>('/admin/cameras', data).then(r => r.data),
        update: (id: string, data: Partial<AccidentCamera>) =>
            api.patch<AccidentCamera>(`/admin/cameras/${id}`, data).then(r => r.data),
        delete: (id: string) =>
            api.delete(`/admin/cameras/${id}`).then(r => r.data),
        test: (id: string) =>
            api.post(`/admin/cameras/${id}/test`).then(r => r.data),
    },

    // Incidents
    incidents: {
        list: (params?: Record<string, string | number>) =>
            api.get<AccidentIncident[]>('/admin/accidents', { params }).then(r => r.data),
        get: (id: string) =>
            api.get<AccidentIncident>(`/admin/accidents/${id}`).then(r => r.data),
        create: (data: Record<string, unknown>) =>
            api.post<AccidentIncident>('/admin/accidents', data).then(r => r.data),
        update: (id: string, data: Record<string, unknown>) =>
            api.patch<AccidentIncident>(`/admin/accidents/${id}`, data).then(r => r.data),
        // Status transitions
        verify: (id: string, notes?: string) =>
            api.post(`/admin/accidents/${id}/verify`, { notes }).then(r => r.data),
        confirm: (id: string, notes?: string) =>
            api.post(`/admin/accidents/${id}/confirm`, { notes }).then(r => r.data),
        markFalsePositive: (id: string, notes?: string) =>
            api.post(`/admin/accidents/${id}/false-positive`, { notes }).then(r => r.data),
        notifyHospital: (id: string, hospitalEmail?: string, hospitalName?: string) =>
            api.post(`/admin/accidents/${id}/notify-hospital`, { hospitalEmail, hospitalName }).then(r => r.data),
        resolve: (id: string, notes?: string) =>
            api.post(`/admin/accidents/${id}/resolve`, { notes }).then(r => r.data),
        analytics: (params?: Record<string, string>) =>
            api.get<AccidentAnalytics>('/admin/accidents/analytics', { params }).then(r => r.data),
        hotspots: (params?: Record<string, string>) =>
            api.get('/admin/accidents/hotspots', { params }).then(r => r.data),
    },

    // Hospitals
    hospitals: {
        list: (params?: Record<string, string>) =>
            api.get<AccidentHospital[]>('/admin/hospitals', { params }).then(r => r.data),
        get: (id: string) =>
            api.get<AccidentHospital>(`/admin/hospitals/${id}`).then(r => r.data),
        create: (data: Partial<AccidentHospital>) =>
            api.post<AccidentHospital>('/admin/hospitals', data).then(r => r.data),
        update: (id: string, data: Partial<AccidentHospital>) =>
            api.patch<AccidentHospital>(`/admin/hospitals/${id}`, data).then(r => r.data),
        delete: (id: string) =>
            api.delete(`/admin/hospitals/${id}`).then(r => r.data),
    },

    // Demo
    demo: {
        createAccident: (data: {
            latitude: number;
            longitude: number;
            cameraId?: string;
            accidentType?: AccidentType;
            confidence?: number;
            severity?: AccidentSeverity;
            vehiclesDetected?: number;
            possiblePersons?: number;
            city?: string;
        }) => api.post('/admin/demo/accident', data).then(r => r.data),
    },
};

// Severity colors for UI
export const SEVERITY_COLORS: Record<AccidentSeverity, string> = {
    LOW: '#22c55e',
    MEDIUM: '#f59e0b',
    HIGH: '#ef4444',
    CRITICAL: '#7f1d1d',
};

export const SEVERITY_BG: Record<AccidentSeverity, string> = {
    LOW: 'bg-green-100 text-green-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    HIGH: 'bg-red-100 text-red-800',
    CRITICAL: 'bg-red-900 text-white',
};

export const STATUS_COLORS: Record<AccidentStatus, string> = {
    DETECTED: 'bg-orange-100 text-orange-800',
    VERIFYING: 'bg-yellow-100 text-yellow-800',
    CONFIRMED: 'bg-blue-100 text-blue-800',
    HOSPITAL_NOTIFIED: 'bg-purple-100 text-purple-800',
    RESPONSE_IN_PROGRESS: 'bg-indigo-100 text-indigo-800',
    HOSPITAL_RECEIVED: 'bg-teal-100 text-teal-800',
    RESOLVED: 'bg-green-100 text-green-800',
    FALSE_POSITIVE: 'bg-gray-100 text-gray-600',
    CANCELLED: 'bg-gray-100 text-gray-500',
};

export const ACCIDENT_TYPE_LABELS: Record<AccidentType, string> = {
    VEHICLE_COLLISION: 'Vehicle Collision',
    MOTORCYCLE_COLLISION: 'Motorcycle Collision',
    CAR_COLLISION: 'Car Collision',
    VEHICLE_ROLLOVER: 'Vehicle Rollover',
    PERSON_VEHICLE_COLLISION: 'Person-Vehicle Collision',
    MULTIPLE_VEHICLE_COLLISION: 'Multi-Vehicle Collision',
    ABNORMAL_VEHICLE_STOP: 'Abnormal Stop',
    PERSON_ON_ROAD: 'Person on Road',
    SMOKE_FIRE_AFTER_COLLISION: 'Smoke/Fire',
    UNKNOWN: 'Unknown',
};
