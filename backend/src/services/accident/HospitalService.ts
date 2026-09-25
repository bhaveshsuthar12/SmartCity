import { AccidentHospital } from '../../models/AccidentHospital';
import { AppError } from '../../utils/AppError';
import logger from '../../utils/logger';

export interface HospitalSearchResult {
    hospital: InstanceType<typeof AccidentHospital>;
    distanceMeters: number;
    selectionReason: string;
}

export class HospitalService {
    /**
     * Find the most suitable nearby hospital for an accident at given coordinates.
     * Selection priority:
     *   1. emergencyAvailable = true (mandatory)
     *   2. active = true (mandatory)
     *   3. Prefer traumaFacility = true
     *   4. Prefer shorter distance
     */
    static async findNearestSuitableHospital(
        longitude: number,
        latitude: number,
        maxDistanceMeters = 50000
    ): Promise<HospitalSearchResult | null> {
        try {
            // Fetch hospitals within radius using $near geospatial query
            const nearbyHospitals = await AccidentHospital.aggregate([
                {
                    $geoNear: {
                        near: { type: 'Point', coordinates: [longitude, latitude] },
                        distanceField: 'distanceMeters',
                        maxDistance: maxDistanceMeters,
                        query: { active: true, emergencyAvailable: true },
                        spherical: true,
                    },
                },
                { $limit: 10 },
            ]);

            if (!nearbyHospitals.length) {
                logger.warn('[HospitalService] No suitable hospitals found in radius', { longitude, latitude, maxDistanceMeters });
                return null;
            }

            // Rank: trauma first, then distance (already sorted by distance from geoNear)
            const withTrauma = nearbyHospitals.filter((h: { traumaFacility: boolean }) => h.traumaFacility);
            const selected = withTrauma.length > 0 ? withTrauma[0] : nearbyHospitals[0];

            const reason = selected.traumaFacility
                ? `Nearest active hospital with emergency capability and trauma facility (${Math.round(selected.distanceMeters)}m away)`
                : `Nearest active hospital with emergency capability (${Math.round(selected.distanceMeters)}m away)`;

            return {
                hospital: selected,
                distanceMeters: Math.round(selected.distanceMeters),
                selectionReason: reason,
            };
        } catch (error) {
            logger.error('[HospitalService] Error finding nearest hospital', { error });
            return null;
        }
    }

    static async listHospitals(filters: { city?: string; active?: boolean; emergencyAvailable?: boolean } = {}) {
        const query: Record<string, unknown> = {};
        if (filters.city) query['city'] = filters.city;
        if (filters.active !== undefined) query['active'] = filters.active;
        if (filters.emergencyAvailable !== undefined) query['emergencyAvailable'] = filters.emergencyAvailable;
        return AccidentHospital.find(query).sort({ name: 1 });
    }

    static async getHospitalById(id: string) {
        const hospital = await AccidentHospital.findById(id);
        if (!hospital) throw AppError.notFound(`Hospital not found: ${id}`);
        return hospital;
    }

    static async getHospitalByCode(hospitalId: string) {
        const hospital = await AccidentHospital.findOne({ hospitalId: hospitalId.toUpperCase() });
        if (!hospital) throw AppError.notFound(`Hospital not found: ${hospitalId}`);
        return hospital;
    }

    static async createHospital(data: Record<string, unknown>) {
        const existing = await AccidentHospital.findOne({ hospitalId: (data['hospitalId'] as string)?.toUpperCase() });
        if (existing) throw AppError.conflict(`Hospital ID already exists: ${data['hospitalId']}`);

        const hospital = new AccidentHospital({ ...data, hospitalId: (data['hospitalId'] as string)?.toUpperCase() });
        await hospital.save();
        logger.info(`[HospitalService] Hospital created: ${hospital.hospitalId}`);
        return hospital;
    }

    static async updateHospital(id: string, updates: Record<string, unknown>) {
        const hospital = await AccidentHospital.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });
        if (!hospital) throw AppError.notFound(`Hospital not found: ${id}`);
        return hospital;
    }

    static async deleteHospital(id: string) {
        const hospital = await AccidentHospital.findByIdAndDelete(id);
        if (!hospital) throw AppError.notFound(`Hospital not found: ${id}`);
        return hospital;
    }

    static async toggleActive(id: string, active: boolean) {
        return HospitalService.updateHospital(id, { active });
    }
}
