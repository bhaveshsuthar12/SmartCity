import { AccidentService } from './AccidentService';
import { HospitalService } from './HospitalService';
import { DuplicateDetectionService } from './DuplicateDetectionService';
import { NotificationEmailService } from './NotificationEmailService';
import { ReportGenerationService } from './ReportGenerationService';
import { AccidentIncident, AccidentType, AccidentSeverity } from '../../models/AccidentIncident';
import { AccidentHospital } from '../../models/AccidentHospital';
import { getIO, emitToCityRoom } from '../../websocket';
import logger from '../../utils/logger';

const CONFIDENCE_HIGH = parseFloat(process.env.ACCIDENT_CONFIDENCE_HIGH || '0.90');
const CONFIDENCE_MEDIUM = parseFloat(process.env.ACCIDENT_CONFIDENCE_MEDIUM || '0.70');

export interface AIDetectionPayload {
    cameraId: string;
    city: string;
    accidentType: AccidentType;
    confidence: number;
    severity: AccidentSeverity;
    severityConfidence?: number;
    vehiclesDetected?: number;
    possiblePersons?: number;
    latitude: number;
    longitude: number;
    detectedAt?: string;
    framesAnalyzed?: number;
    description?: string;
}

export class AccidentAIEventService {
    /**
     * Main processing pipeline for AI detection events.
     * 
     * Flow:
     * 1. Validate confidence threshold
     * 2. Check for duplicate incidents
     * 3. Create incident with appropriate initial status
     * 4. Find nearest suitable hospital
     * 5. Generate report
     * 6. Send hospital notification (for HIGH confidence confirmed incidents)
     * 7. Emit WebSocket event to admin dashboard
     */
    static async processDetection(payload: AIDetectionPayload): Promise<{
        processed: boolean;
        incidentId?: string;
        reason?: string;
        isDuplicate?: boolean;
    }> {
        const { cameraId, city, accidentType, confidence, severity, latitude, longitude } = payload;
        const detectedAt = payload.detectedAt ? new Date(payload.detectedAt) : new Date();

        // 1. Confidence threshold gate
        if (confidence < CONFIDENCE_MEDIUM) {
            logger.info('[AccidentAIEventService] Low confidence detection ignored', { cameraId, confidence });
            return { processed: false, reason: `Confidence ${confidence} below threshold ${CONFIDENCE_MEDIUM}` };
        }

        // 2. Duplicate detection
        const dupCheck = await DuplicateDetectionService.checkDuplicate(longitude, latitude, accidentType, detectedAt);
        if (dupCheck.isDuplicate) {
            // Add camera as related to existing incident
            if (dupCheck.existingMongoId) {
                await AccidentIncident.findByIdAndUpdate(dupCheck.existingMongoId, {
                    $addToSet: { relatedIncidentIds: cameraId },
                    $push: {
                        auditLog: {
                            action: 'DUPLICATE_DETECTED',
                            actor: 'AI_SYSTEM',
                            timestamp: new Date(),
                            metadata: { cameraId, confidence },
                        },
                    },
                });
            }
            logger.info('[AccidentAIEventService] Duplicate detected, skipping creation', { existingId: dupCheck.existingIncidentId });
            return { processed: false, isDuplicate: true, incidentId: dupCheck.existingIncidentId, reason: 'Duplicate incident' };
        }

        // 3. Determine initial status
        const initialStatus = confidence >= CONFIDENCE_HIGH ? 'DETECTED' : 'VERIFYING';

        // 4. Create incident
        const incidentData = {
            cameraId,
            city,
            location: {
                type: 'Point' as const,
                coordinates: [longitude, latitude] as [number, number],
            },
            detectedAt,
            accidentType,
            severity,
            severityConfidence: payload.severityConfidence,
            aiConfidence: confidence,
            vehiclesInvolved: payload.vehiclesDetected,
            possiblePersons: payload.possiblePersons,
            description: payload.description || `AI detected potential ${accidentType.replace(/_/g, ' ')} at camera ${cameraId}`,
            status: initialStatus,
            notification: { status: 'PENDING', attempts: [] },
            evidence: [],
            auditLog: [{
                action: 'ACCIDENT_DETECTED',
                actor: 'AI_SYSTEM',
                timestamp: new Date(),
                metadata: { confidence, framesAnalyzed: payload.framesAnalyzed, cameraId },
            }],
        };

        const incident = await AccidentService.createIncident(incidentData, 'AI_SYSTEM');
        logger.info(`[AccidentAIEventService] Incident created: ${incident.incidentId} (${initialStatus})`);

        // 5. Find nearest hospital
        let hospitalResult = null;
        try {
            hospitalResult = await HospitalService.findNearestSuitableHospital(longitude, latitude);
        } catch (err) {
            logger.warn('[AccidentAIEventService] Hospital lookup failed', { error: err });
        }

        if (hospitalResult) {
            const { hospital, distanceMeters, selectionReason } = hospitalResult;
            await AccidentIncident.findByIdAndUpdate((incident as any)._id, {
                $set: {
                    hospital: {
                        hospitalId: hospital.hospitalId,
                        name: hospital.name,
                        distanceMeters,
                        selectionReason,
                        selectedAt: new Date(),
                    },
                },
                $push: {
                    auditLog: {
                        action: 'HOSPITAL_SELECTED',
                        actor: 'AI_SYSTEM',
                        timestamp: new Date(),
                        metadata: { hospitalId: hospital.hospitalId, distanceMeters, selectionReason },
                    },
                },
            });
        }

        // 6. Generate and save report
        const updatedIncident = await AccidentIncident.findById((incident as any)._id);
        if (updatedIncident) {
            try {
                const report = ReportGenerationService.generate(updatedIncident);
                updatedIncident.report = report;
                await updatedIncident.save();
            } catch (reportErr) {
                logger.warn('[AccidentAIEventService] Report generation failed', { error: reportErr });
            }
        }

        // 7. Auto-notify hospital for HIGH confidence
        if (confidence >= CONFIDENCE_HIGH && hospitalResult?.hospital?.email) {
            const mongoId = (incident as any)._id.toString();
            // Fire-and-forget notification (don't block the response)
            setImmediate(async () => {
                try {
                    await NotificationEmailService.sendHospitalNotification(
                        mongoId,
                        hospitalResult!.hospital.email!,
                        hospitalResult!.hospital.name
                    );
                    await AccidentIncident.findByIdAndUpdate(mongoId, {
                        $set: { status: 'HOSPITAL_NOTIFIED' },
                        $push: {
                            auditLog: {
                                action: 'HOSPITAL_NOTIFICATION_SENT',
                                actor: 'AI_SYSTEM',
                                timestamp: new Date(),
                                metadata: { hospital: hospitalResult!.hospital.name },
                            },
                        },
                    });
                } catch (err) {
                    logger.error('[AccidentAIEventService] Hospital notification failed', { error: err });
                }
            });
        }

        // 8. Emit WebSocket event to admin dashboard
        try {
            const finalIncident = await AccidentIncident.findById((incident as any)._id);
            emitToCityRoom(city, 'accident:incident-created', {
                incidentId: incident.incidentId,
                status: initialStatus,
                severity,
                confidence,
                accidentType,
                location: { latitude, longitude },
                cameraId,
                hospital: hospitalResult ? { name: hospitalResult.hospital.name } : null,
                detectedAt: detectedAt.toISOString(),
            });
        } catch (wsErr) {
            logger.warn('[AccidentAIEventService] WebSocket emit failed', { error: wsErr });
        }

        return { processed: true, incidentId: incident.incidentId };
    }
}
