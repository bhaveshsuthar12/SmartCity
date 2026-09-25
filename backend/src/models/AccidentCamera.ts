import { Schema, model, Document } from 'mongoose';

export type CameraSourceType = 'RTSP' | 'VIDEO_FILE' | 'WEBCAM' | 'SIMULATION';
export type CameraStatus = 'ONLINE' | 'OFFLINE' | 'ERROR' | 'DISABLED';

export interface IAccidentCamera extends Document {
    cameraId: string;
    name: string;
    location: {
        type: 'Point';
        coordinates: [number, number]; // [longitude, latitude]
        address?: string;
        description?: string;
    };
    streamUrl?: string; // Never exposed to frontend
    sourceType: CameraSourceType;
    city: string;
    status: CameraStatus;
    lastFrameAt?: Date;
    lastHeartbeat?: Date;
    fps?: number;
    resolution?: string;
    enabled: boolean;
    errorMessage?: string;
    createdAt: Date;
    updatedAt: Date;
}

const accidentCameraSchema = new Schema<IAccidentCamera>(
    {
        cameraId: { type: String, required: true, unique: true, trim: true, uppercase: true },
        name: { type: String, required: true, trim: true, maxlength: 200 },
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
            description: { type: String, maxlength: 1000 },
        },
        streamUrl: { type: String, select: false }, // Hidden from default queries
        sourceType: {
            type: String,
            enum: ['RTSP', 'VIDEO_FILE', 'WEBCAM', 'SIMULATION'],
            required: true,
        },
        city: { type: String, required: true, trim: true },
        status: {
            type: String,
            enum: ['ONLINE', 'OFFLINE', 'ERROR', 'DISABLED'],
            default: 'OFFLINE',
        },
        lastFrameAt: { type: Date },
        lastHeartbeat: { type: Date },
        fps: { type: Number, min: 1, max: 120 },
        resolution: { type: String, maxlength: 20 }, // e.g. "1920x1080"
        enabled: { type: Boolean, default: true },
        errorMessage: { type: String, maxlength: 1000 },
    },
    { timestamps: true }
);

accidentCameraSchema.index({ cameraId: 1 });
accidentCameraSchema.index({ city: 1, status: 1 });
accidentCameraSchema.index({ location: '2dsphere' });

export const AccidentCamera = model<IAccidentCamera>('AccidentCamera', accidentCameraSchema);
