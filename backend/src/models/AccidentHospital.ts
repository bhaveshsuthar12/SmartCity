import { Schema, model, Document } from 'mongoose';

export interface IAccidentHospital extends Document {
    hospitalId: string;
    name: string;
    address: string;
    city: string;
    location: {
        type: 'Point';
        coordinates: [number, number]; // [longitude, latitude]
    };
    email?: string;
    phone?: string;
    emergencyAvailable: boolean;
    traumaFacility: boolean;
    ambulanceAvailable: boolean;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const accidentHospitalSchema = new Schema<IAccidentHospital>(
    {
        hospitalId: { type: String, required: true, unique: true, trim: true, uppercase: true },
        name: { type: String, required: true, trim: true, maxlength: 300 },
        address: { type: String, required: true, trim: true, maxlength: 500 },
        city: { type: String, required: true, trim: true },
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
        },
        email: { type: String, trim: true, maxlength: 300 },
        phone: { type: String, trim: true, maxlength: 30 },
        emergencyAvailable: { type: Boolean, default: true },
        traumaFacility: { type: Boolean, default: false },
        ambulanceAvailable: { type: Boolean, default: true },
        active: { type: Boolean, default: true },
    },
    { timestamps: true }
);

accidentHospitalSchema.index({ hospitalId: 1 });
accidentHospitalSchema.index({ city: 1, active: 1, emergencyAvailable: 1 });
accidentHospitalSchema.index({ location: '2dsphere' });

export const AccidentHospital = model<IAccidentHospital>('AccidentHospital', accidentHospitalSchema);
