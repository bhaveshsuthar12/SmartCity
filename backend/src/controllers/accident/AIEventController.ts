import { Request, Response, NextFunction } from 'express';
import { AccidentAIEventService } from '../../services/accident/AccidentAIEventService';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../utils/AppError';

/**
 * AI Event Controller — handles machine-to-machine accident detection events.
 * Protected by X-AI-Secret header, not admin JWT.
 */
export class AIEventController {
    static async receiveDetection(req: Request, res: Response, next: NextFunction) {
        try {
            const secret = req.headers['x-ai-secret'];
            const expectedSecret = process.env.ACCIDENT_AI_SECRET;

            if (!expectedSecret || secret !== expectedSecret) {
                throw AppError.forbidden('Invalid or missing X-AI-Secret header');
            }

            const { cameraId, city, accidentType, confidence, severity, latitude, longitude } = req.body;
            if (!cameraId || !city || !accidentType || confidence === undefined || !severity || latitude === undefined || longitude === undefined) {
                throw AppError.badRequest('cameraId, city, accidentType, confidence, severity, latitude, longitude are all required');
            }

            const result = await AccidentAIEventService.processDetection({
                cameraId, city, accidentType, confidence, severity,
                latitude, longitude,
                vehiclesDetected: req.body.vehiclesDetected,
                possiblePersons: req.body.possiblePersons,
                detectedAt: req.body.detectedAt,
                framesAnalyzed: req.body.framesAnalyzed,
                description: req.body.description,
                severityConfidence: req.body.severityConfidence,
            });

            sendSuccess(res, result, 'AI event processed');
        } catch (err) {
            next(err);
        }
    }
}
