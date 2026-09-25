import { Schema, model, Document } from 'mongoose';

export type AccidentType =
    | 'VEHICLE_COLLISION'
    | 'MOTORCYCLE_COLLISION'
    | 'CAR_COLLISION'
    | 'VEHICLE_ROLLOVER'
    | 'PERSON_VEHICLE_COLLISION'
    | 'MULTIPLE_VEHICLE_COLLISION'
    | 'ABNORMAL_VEHICLE_STOP'
    | 'PERSON_ON_ROAD'
    | 'SMOKE_FIRE_AFTER_COLLISION'
    | 'UNKNOWN';

export type AccidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AccidentStatus =
    | 'DETECTED'
    | 'VERIFYING'
    | 'CONFIRMED'
    | 'HOSPITAL_NOTIFIED'
    | 'RESPONSE_IN_PROGRESS'
    | 'HOSPITAL_RECEIVED'
    | 'RESOLVED'
    | 'FALSE_POSITIVE'
    | 'CANCELLED';

export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED' | 'RETRYING';

export interface IAuditEntry {
    action: string;
    actor: string;
    timestamp: Date;
    metadata?: Record<string, unknown>;
}

export interface INotificationAttempt {
    attemptedAt: Date;
    status: 'SENT' | 'FAILED';
    recipient: string;
    error?: string;
    idempotencyKey?: string;
}

export interface IEvidenceItem {
    type: 'FRAME' | 'CLIP' | 'METADATA';
    url?: string;
    cloudinaryPublicId?: string;
    timestamp: Date;
    cameraId: string;
    description?: string;
}

export interface IAccidentIncident extends Document {
    incidentId: string; // ACC-2026-000001
    cameraId: string;
    city: string;
    location: {
        type: 'Point';
        coordinates: [number, number];
        address?: string;
    };
    detectedAt: Date;
    accidentType: AccidentType;
    severity: AccidentSeverity;
    severityConfidence?: number;
    aiConfidence: number;
    vehiclesInvolved?: number;
    possiblePersons?: number;
    description?: string;
    evidence: IEvidenceItem[];
    hospital?: {
        hospitalId?: string;
        name?: string;
        distanceMeters?: number;
        selectionReason?: string;
        selectedAt?: Date;
    };
    notification: {
        status: NotificationStatus;
        notifiedAt?: Date;
        attempts: INotificationAttempt[];
    };
    status: AccidentStatus;
    verification?: {
        verifiedBy?: string;
        verifiedAt?: Date;
        notes?: string;
    };
    resolution?: {
        resolvedBy?: string;
        resolvedAt?: Date;
        notes?: string;
    };
    auditLog: IAuditEntry[];
    report?: string; // HTML report
    parentIncidentId?: string;
    relatedIncidentIds?: string[];
    createdAt: Date;
    updatedAt: Date;
}

// Counter schema for sequential incident IDs
const incidentCounterSchema = new Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
});
export const IncidentCounter = model('IncidentCounter', incidentCounterSchema);

const accidentIncidentSchema = new Schema<IAccidentIncident>(
    {
        incidentId: { type: String, required: true, unique: true, index: true },
        cameraId: { type: String, required: true, index: true },
        city: { type: String, required: true, index: true },
        location: {
            type: {
                type: String,
                enum: ['Point'],
                required: true,
            },
            coordinates: {
                type: [Number],
                required: true,
                validate: {
                    validator: (v: number[]) =>
                        v.length === 2
                        && v[0] >= -180 && v[0] <= 180
                        && v[1] >= -90 && v[1] <= 90,
                    message: 'Coordinates must be [longitude, latitude] with valid ranges.',
                },
            },
            address: { type: String, maxlength: 500 },
        },
        detectedAt: { type: Date, required: true, index: true },
        accidentType: {
            type: String,
            enum: [
                'VEHICLE_COLLISION', 'MOTORCYCLE_COLLISION', 'CAR_COLLISION',
                'VEHICLE_ROLLOVER', 'PERSON_VEHICLE_COLLISION', 'MULTIPLE_VEHICLE_COLLISION',
                'ABNORMAL_VEHICLE_STOP', 'PERSON_ON_ROAD', 'SMOKE_FIRE_AFTER_COLLISION', 'UNKNOWN',
            ],
            required: true,
        },
        severity: {
            type: String,
            enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
            required: true,
            index: true,
        },
        severityConfidence: { type: Number, min: 0, max: 1 },
        aiConfidence: { type: Number, required: true, min: 0, max: 1 },
        vehiclesInvolved: { type: Number, min: 0 },
        possiblePersons: { type: Number, min: 0 },
        description: { type: String, maxlength: 4000 },
        evidence: [
            {
                type: { type: String, enum: ['FRAME', 'CLIP', 'METADATA'], required: true },
                url: { type: String },
                cloudinaryPublicId: { type: String },
                timestamp: { type: Date, required: true },
                cameraId: { type: String, required: true },
                description: { type: String, maxlength: 500 },
            },
        ],
        hospital: {
            hospitalId: { type: String },
            name: { type: String },
            distanceMeters: { type: Number },
            selectionReason: { type: String },
            selectedAt: { type: Date },
        },
        notification: {
            status: {
                type: String,
                enum: ['PENDING', 'SENT', 'FAILED', 'RETRYING'],
                default: 'PENDING',
            },
            notifiedAt: { type: Date },
            attempts: [
                {
                    attemptedAt: { type: Date, required: true },
                    status: { type: String, enum: ['SENT', 'FAILED'], required: true },
                    recipient: { type: String, required: true },
                    error: { type: String },
                    idempotencyKey: { type: String },
                },
            ],
        },
        status: {
            type: String,
            enum: [
                'DETECTED', 'VERIFYING', 'CONFIRMED',
                'HOSPITAL_NOTIFIED', 'RESPONSE_IN_PROGRESS',
                'HOSPITAL_RECEIVED', 'RESOLVED', 'FALSE_POSITIVE', 'CANCELLED',
            ],
            default: 'DETECTED',
            index: true,
        },
        verification: {
            verifiedBy: { type: String },
            verifiedAt: { type: Date },
            notes: { type: String, maxlength: 2000 },
        },
        resolution: {
            resolvedBy: { type: String },
            resolvedAt: { type: Date },
            notes: { type: String, maxlength: 2000 },
        },
        auditLog: [
            {
                action: { type: String, required: true },
                actor: { type: String, required: true },
                timestamp: { type: Date, required: true, default: () => new Date() },
                metadata: { type: Schema.Types.Mixed },
            },
        ],
        report: { type: String }, // Full HTML report
        parentIncidentId: { type: String },
        relatedIncidentIds: [{ type: String }],
    },
    { timestamps: true }
);

// Geospatial index for proximity queries
accidentIncidentSchema.index({ location: '2dsphere' });
accidentIncidentSchema.index({ city: 1, status: 1, detectedAt: -1 });
accidentIncidentSchema.index({ city: 1, severity: 1 });
accidentIncidentSchema.index({ cameraId: 1, detectedAt: -1 });

export const AccidentIncident = model<IAccidentIncident>('AccidentIncident', accidentIncidentSchema);
