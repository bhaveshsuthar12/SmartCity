import { Request, Response, NextFunction } from 'express';
import { AccidentAIEventService, AIDetectionPayload } from '../../services/accident/AccidentAIEventService';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../utils/AppError';

const ACCIDENT_TYPES = [
    'VEHICLE_COLLISION', 'MOTORCYCLE_COLLISION', 'CAR_COLLISION',
    'VEHICLE_ROLLOVER', 'PERSON_VEHICLE_COLLISION', 'MULTIPLE_VEHICLE_COLLISION',
    'ABNORMAL_VEHICLE_STOP', 'PERSON_ON_ROAD', 'SMOKE_FIRE_AFTER_COLLISION', 'UNKNOWN',
];

export class DemoController {
    /**
     * POST /api/v1/admin/demo/accident
     * Creates a realistic simulated accident event that exercises the real production flow.
     */
    static async createDemoAccident(req: Request, res: Response, next: NextFunction) {
        try {
            const {
                cameraId = 'CAM-DEMO-001',
                accidentType = 'VEHICLE_COLLISION',
                confidence = 0.94,
                severity = 'HIGH',
                latitude,
                longitude,
                city,
                vehiclesDetected = 2,
                possiblePersons = 1,
            } = req.body;

            // Validate
            if (!latitude || !longitude) {
                throw AppError.badRequest('latitude and longitude are required for demo accident');
            }
            if (latitude < -90 || latitude > 90) {
                throw AppError.badRequest('latitude must be between -90 and 90');
            }
            if (longitude < -180 || longitude > 180) {
                throw AppError.badRequest('longitude must be between -180 and 180');
            }
            if (!ACCIDENT_TYPES.includes(accidentType)) {
                throw AppError.badRequest(`accidentType must be one of: ${ACCIDENT_TYPES.join(', ')}`);
            }
            if (confidence < 0 || confidence > 1) {
                throw AppError.badRequest('confidence must be between 0 and 1');
            }
            if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(severity)) {
                throw AppError.badRequest('severity must be LOW, MEDIUM, HIGH, or CRITICAL');
            }

            const cityId = city || req.user?.cityId || 'demo-city';

            const payload: AIDetectionPayload = {
                cameraId,
                city: cityId,
                accidentType: accidentType as AIDetectionPayload['accidentType'],
                confidence: parseFloat(confidence),
                severity: severity as AIDetectionPayload['severity'],
                vehiclesDetected: parseInt(vehiclesDetected),
                possiblePersons: parseInt(possiblePersons),
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                detectedAt: new Date().toISOString(),
                framesAnalyzed: 15,
                description: `DEMO: AI detected potential ${accidentType.replace(/_/g, ' ')} at camera ${cameraId}. This is a simulated demo event.`,
            };

            const result = await AccidentAIEventService.processDetection(payload);

            sendSuccess(res, {
                ...result,
                demo: true,
                message: result.processed
                    ? `Demo accident created successfully. Incident ID: ${result.incidentId}. Check the Accident Response dashboard.`
                    : `Demo accident not created: ${result.reason}`,
            }, result.processed ? 'Demo accident triggered' : 'Demo event processed (no incident created)', 201);
        } catch (err) {
            next(err);
        }
    }
}
