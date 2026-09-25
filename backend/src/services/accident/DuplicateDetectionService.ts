import { AccidentIncident } from '../../models/AccidentIncident';
import logger from '../../utils/logger';

const DUPLICATE_RADIUS_METERS = parseInt(process.env.DUPLICATE_RADIUS_METERS || '150');
const DUPLICATE_TIME_WINDOW_SECONDS = parseInt(process.env.DUPLICATE_TIME_WINDOW_SECONDS || '120');

export interface DuplicateCheckResult {
    isDuplicate: boolean;
    existingIncidentId?: string;
    existingMongoId?: string;
}

export class DuplicateDetectionService {
    /**
     * Check if an accident near the given coordinates within a time window already exists.
     * This prevents multiple CCTV cameras detecting the same accident from creating duplicate incidents.
     */
    static async checkDuplicate(
        longitude: number,
        latitude: number,
        accidentType: string,
        detectedAt: Date
    ): Promise<DuplicateCheckResult> {
        try {
            const windowStart = new Date(detectedAt.getTime() - DUPLICATE_TIME_WINDOW_SECONDS * 1000);

            const existing = await AccidentIncident.findOne({
                accidentType,
                detectedAt: { $gte: windowStart, $lte: new Date(detectedAt.getTime() + DUPLICATE_TIME_WINDOW_SECONDS * 1000) },
                status: { $nin: ['FALSE_POSITIVE', 'CANCELLED'] },
                location: {
                    $near: {
                        $geometry: { type: 'Point', coordinates: [longitude, latitude] },
                        $maxDistance: DUPLICATE_RADIUS_METERS,
                    },
                },
            });

            if (existing) {
                logger.info('[DuplicateDetectionService] Duplicate incident detected', {
                    existingId: existing.incidentId,
                    longitude,
                    latitude,
                });
                return {
                    isDuplicate: true,
                    existingIncidentId: existing.incidentId,
                    existingMongoId: (existing as any)._id.toString(),
                };
            }

            return { isDuplicate: false };
        } catch (error) {
            // If the geospatial query fails (e.g. index not ready), log and allow the incident
            logger.error('[DuplicateDetectionService] Duplicate check failed, allowing incident', { error });
            return { isDuplicate: false };
        }
    }
}
