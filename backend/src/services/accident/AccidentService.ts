import { AccidentIncident, IncidentCounter, AccidentType, AccidentSeverity, AccidentStatus } from '../../models/AccidentIncident';
import { AppError } from '../../utils/AppError';
import logger from '../../utils/logger';

const CONFIDENCE_HIGH = parseFloat(process.env.ACCIDENT_CONFIDENCE_HIGH || '0.90');
const CONFIDENCE_MEDIUM = parseFloat(process.env.ACCIDENT_CONFIDENCE_MEDIUM || '0.70');

// Valid status transitions
const STATUS_TRANSITIONS: Record<AccidentStatus, AccidentStatus[]> = {
    DETECTED: ['VERIFYING', 'FALSE_POSITIVE', 'CANCELLED'],
    VERIFYING: ['CONFIRMED', 'FALSE_POSITIVE', 'CANCELLED'],
    CONFIRMED: ['HOSPITAL_NOTIFIED', 'CANCELLED'],
    HOSPITAL_NOTIFIED: ['RESPONSE_IN_PROGRESS', 'CANCELLED'],
    RESPONSE_IN_PROGRESS: ['HOSPITAL_RECEIVED'],
    HOSPITAL_RECEIVED: ['RESOLVED'],
    RESOLVED: [],
    FALSE_POSITIVE: [],
    CANCELLED: [],
};

export class AccidentService {
    /**
     * Generate the next sequential human-readable incident ID: ACC-YYYY-NNNNNN
     */
    static async generateIncidentId(): Promise<string> {
        const year = new Date().getFullYear();
        const counterId = `accident_${year}`;
        const doc = await IncidentCounter.findByIdAndUpdate(
            counterId,
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        const seq = String(doc!.seq).padStart(6, '0');
        return `ACC-${year}-${seq}`;
    }

    /**
     * Determine initial status based on AI confidence.
     */
    static getInitialStatus(confidence: number): AccidentStatus {
        if (confidence >= CONFIDENCE_HIGH) return 'DETECTED'; // Will auto-confirm
        if (confidence >= CONFIDENCE_MEDIUM) return 'VERIFYING'; // Needs verification
        throw AppError.badRequest(`Confidence ${confidence} is below the minimum threshold ${CONFIDENCE_MEDIUM}`);
    }

    static async listIncidents(filters: {
        city?: string;
        status?: string;
        severity?: string;
        cameraId?: string;
        page: number;
        pageSize: number;
    }) {
        const query: Record<string, unknown> = {};
        if (filters.city) query['city'] = filters.city;
        if (filters.status) query['status'] = filters.status;
        if (filters.severity) query['severity'] = filters.severity;
        if (filters.cameraId) query['cameraId'] = filters.cameraId;

        const [total, incidents] = await Promise.all([
            AccidentIncident.countDocuments(query),
            AccidentIncident.find(query)
                .sort({ detectedAt: -1 })
                .skip((filters.page - 1) * filters.pageSize)
                .limit(filters.pageSize),
        ]);

        return { incidents, total, page: filters.page, pageSize: filters.pageSize };
    }

    static async getIncidentById(id: string) {
        // Try MongoDB _id first, then incidentId
        const incident = id.match(/^ACC-/i)
            ? await AccidentIncident.findOne({ incidentId: id.toUpperCase() })
            : await AccidentIncident.findById(id).catch(() => null) ||
            await AccidentIncident.findOne({ incidentId: id.toUpperCase() });

        if (!incident) throw AppError.notFound(`Incident not found: ${id}`);
        return incident;
    }

    static async createIncident(data: Record<string, unknown>, actor = 'SYSTEM') {
        const incidentId = await AccidentService.generateIncidentId();
        const incident = new AccidentIncident({
            ...data,
            incidentId,
            auditLog: [{
                action: 'INCIDENT_CREATED',
                actor,
                timestamp: new Date(),
                metadata: { aiConfidence: data['aiConfidence'] },
            }],
        });
        await incident.save();
        logger.info(`[AccidentService] Incident created: ${incidentId}`);
        return incident;
    }

    static async updateIncident(id: string, updates: Record<string, unknown>, actor = 'ADMIN') {
        const incident = await AccidentService.getIncidentById(id);
        Object.assign(incident, updates);
        incident.auditLog.push({ action: 'INCIDENT_UPDATED', actor, timestamp: new Date(), metadata: updates as Record<string, unknown> });
        await incident.save();
        return incident;
    }

    /**
     * Transition incident to a new status. Enforces valid transitions.
     */
    static async transitionStatus(id: string, newStatus: AccidentStatus, actor: string, notes?: string) {
        const incident = await AccidentService.getIncidentById(id);
        const currentStatus = incident.status as AccidentStatus;
        const allowed = STATUS_TRANSITIONS[currentStatus] || [];

        if (!allowed.includes(newStatus)) {
            throw AppError.badRequest(
                `Invalid status transition: ${currentStatus} → ${newStatus}. Allowed: ${allowed.join(', ') || 'none'}`
            );
        }

        const now = new Date();
        const auditAction = `STATUS_CHANGED_TO_${newStatus}`;

        // Set sub-fields based on transition
        const updates: Record<string, unknown> = { status: newStatus };
        if (newStatus === 'VERIFYING') updates['verification'] = { verifiedBy: actor, verifiedAt: now, notes };
        if (newStatus === 'CONFIRMED') updates['verification.verifiedAt'] = now;
        if (newStatus === 'RESOLVED') updates['resolution'] = { resolvedBy: actor, resolvedAt: now, notes };
        if (newStatus === 'FALSE_POSITIVE') updates['verification'] = { verifiedBy: actor, verifiedAt: now, notes: notes || 'Marked as false positive' };

        incident.set(updates);
        incident.auditLog.push({ action: auditAction, actor, timestamp: now, metadata: { notes, previousStatus: currentStatus } });
        await incident.save();
        logger.info(`[AccidentService] ${incident.incidentId}: ${currentStatus} → ${newStatus} by ${actor}`);
        return incident;
    }

    static async getAnalytics(city: string) {
        const baseQuery = city ? { city } : {};

        const [
            totalByStatus,
            bySeverity,
            byType,
            byDay,
            byHour,
            recentHotspots,
        ] = await Promise.all([
            AccidentIncident.aggregate([
                { $match: baseQuery },
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]),
            AccidentIncident.aggregate([
                { $match: baseQuery },
                { $group: { _id: '$severity', count: { $sum: 1 } } },
            ]),
            AccidentIncident.aggregate([
                { $match: baseQuery },
                { $group: { _id: '$accidentType', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 },
            ]),
            AccidentIncident.aggregate([
                { $match: { ...baseQuery, detectedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$detectedAt' } },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
            ]),
            AccidentIncident.aggregate([
                { $match: baseQuery },
                { $group: { _id: { $hour: '$detectedAt' }, count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
            AccidentIncident.aggregate([
                { $match: { ...baseQuery, 'location.coordinates': { $exists: true } } },
                {
                    $group: {
                        _id: {
                            $concat: [
                                { $toString: { $arrayElemAt: ['$location.coordinates', 1] } },
                                ',',
                                { $toString: { $arrayElemAt: ['$location.coordinates', 0] } }
                            ]
                        },
                        count: { $sum: 1 },
                        lat: { $first: { $arrayElemAt: ['$location.coordinates', 1] } },
                        lon: { $first: { $arrayElemAt: ['$location.coordinates', 0] } },
                    },
                },
                { $match: { count: { $gte: 2 } } },
                { $sort: { count: -1 } },
                { $limit: 10 },
            ]),
        ]);

        const statusMap = totalByStatus.reduce((acc: Record<string, number>, s: { _id: string; count: number }) => {
            acc[s._id] = s.count;
            return acc;
        }, {} as Record<string, number>);

        let totalAccidents = 0;
        for (const count of Object.values(statusMap)) {
            totalAccidents += Number(count);
        }
        const falsePositives: number = statusMap['FALSE_POSITIVE'] || 0;

        return {
            summary: {
                total: totalAccidents,
                active: (statusMap['DETECTED'] || 0) + (statusMap['VERIFYING'] || 0) + (statusMap['CONFIRMED'] || 0),
                critical: bySeverity.find((s: { _id: string; count: number }) => s._id === 'CRITICAL')?.count || 0,
                high: bySeverity.find((s: { _id: string; count: number }) => s._id === 'HIGH')?.count || 0,
                medium: bySeverity.find((s: { _id: string; count: number }) => s._id === 'MEDIUM')?.count || 0,
                low: bySeverity.find((s: { _id: string; count: number }) => s._id === 'LOW')?.count || 0,
                resolved: statusMap['RESOLVED'] || 0,
                falsePositives,
                needsVerification: statusMap['VERIFYING'] || 0,
                falsePositiveRate: totalAccidents > 0 ? ((falsePositives / totalAccidents) * 100).toFixed(1) + '%' : '0%',
            },
            byStatus: statusMap,
            bySeverity,
            byType,
            byDay,
            byHour,
            hotspots: recentHotspots,
        };
    }

    static isValidAccidentStatus(s: string): s is AccidentStatus {
        return Object.keys(STATUS_TRANSITIONS).includes(s);
    }
}
