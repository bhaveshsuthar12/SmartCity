import { Request, Response, NextFunction } from 'express';
import { AccidentService } from '../../services/accident/AccidentService';
import { NotificationEmailService } from '../../services/accident/NotificationEmailService';
import { HospitalService } from '../../services/accident/HospitalService';
import { AccidentIncident } from '../../models/AccidentIncident';
import { AccidentHospital } from '../../models/AccidentHospital';
import { sendSuccess, buildPaginationMeta, parsePagination } from '../../utils/response';
import { AppError } from '../../utils/AppError';
import { emitToCityRoom } from '../../websocket';

export class AccidentController {
    static async list(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, pageSize, skip } = parsePagination(req.query as Record<string, unknown>);
            const { city, status, severity, cameraId } = req.query;
            const result = await AccidentService.listIncidents({
                city: city as string,
                status: status as string,
                severity: severity as string,
                cameraId: cameraId as string,
                page,
                pageSize,
            });
            const meta = buildPaginationMeta(result.total, page, pageSize);
            sendSuccess(res, result.incidents, 'Incidents retrieved', 200, meta as unknown as Record<string, unknown>);
        } catch (err) { next(err); }
    }

    static async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const incident = await AccidentService.getIncidentById(req.params['id']!);
            // Log admin view
            incident.auditLog.push({
                action: 'ADMIN_VIEWED',
                actor: req.user?.email || 'ADMIN',
                timestamp: new Date(),
            });
            await incident.save();
            sendSuccess(res, incident, 'Incident retrieved');
        } catch (err) { next(err); }
    }

    static async create(req: Request, res: Response, next: NextFunction) {
        try {
            const incident = await AccidentService.createIncident(req.body, req.user?.email || 'ADMIN');
            sendSuccess(res, incident, 'Incident created', 201);
        } catch (err) { next(err); }
    }

    static async update(req: Request, res: Response, next: NextFunction) {
        try {
            const incident = await AccidentService.updateIncident(req.params['id']!, req.body, req.user?.email || 'ADMIN');
            sendSuccess(res, incident, 'Incident updated');
        } catch (err) { next(err); }
    }

    // ── Status transition endpoints ───────────────────────────────────────────

    static async verify(req: Request, res: Response, next: NextFunction) {
        try {
            const incident = await AccidentService.transitionStatus(
                req.params['id']!, 'VERIFYING', req.user?.email || 'ADMIN', req.body.notes
            );
            sendSuccess(res, incident, 'Incident marked as Verifying');
        } catch (err) { next(err); }
    }

    static async confirm(req: Request, res: Response, next: NextFunction) {
        try {
            const incident = await AccidentService.transitionStatus(
                req.params['id']!, 'CONFIRMED', req.user?.email || 'ADMIN', req.body.notes
            );
            sendSuccess(res, incident, 'Incident confirmed');
        } catch (err) { next(err); }
    }

    static async markFalsePositive(req: Request, res: Response, next: NextFunction) {
        try {
            const incident = await AccidentService.transitionStatus(
                req.params['id']!, 'FALSE_POSITIVE', req.user?.email || 'ADMIN', req.body.notes
            );
            sendSuccess(res, incident, 'Incident marked as false positive');
        } catch (err) { next(err); }
    }

    static async resolve(req: Request, res: Response, next: NextFunction) {
        try {
            const incident = await AccidentService.transitionStatus(
                req.params['id']!, 'RESOLVED', req.user?.email || 'ADMIN', req.body.notes
            );
            sendSuccess(res, incident, 'Incident resolved');
        } catch (err) { next(err); }
    }

    static async notifyHospital(req: Request, res: Response, next: NextFunction) {
        try {
            const incident = await AccidentService.getIncidentById(req.params['id']!);

            // Find hospital email from hospital record
            let hospitalEmail: string | undefined;
            let hospitalName: string | undefined;

            if (incident.hospital?.hospitalId) {
                const hospital = await AccidentHospital.findOne({ hospitalId: incident.hospital.hospitalId });
                hospitalEmail = hospital?.email;
                hospitalName = hospital?.name || incident.hospital.name;
            }

            // Fallback to body-provided email
            if (!hospitalEmail) {
                hospitalEmail = req.body.hospitalEmail;
                hospitalName = req.body.hospitalName || incident.hospital?.name || 'Unknown Hospital';
            }

            if (!hospitalEmail) {
                throw AppError.badRequest('No hospital email available. Please provide hospitalEmail in the request body or ensure the hospital record has an email.');
            }

            const result = await NotificationEmailService.sendHospitalNotification(
                (incident as any)._id.toString(),
                hospitalEmail,
                hospitalName || 'Hospital'
            );

            if (result.success) {
                // Transition to HOSPITAL_NOTIFIED if currently CONFIRMED
                if (incident.status === 'CONFIRMED' || incident.status === 'DETECTED') {
                    await AccidentService.transitionStatus(req.params['id']!, 'HOSPITAL_NOTIFIED', req.user?.email || 'ADMIN');
                }
            }

            sendSuccess(res, { sent: result.success, error: result.error }, result.success ? 'Notification sent' : 'Notification failed');
        } catch (err) { next(err); }
    }
}
