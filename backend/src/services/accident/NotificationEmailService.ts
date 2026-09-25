import nodemailer from 'nodemailer';
import { AccidentIncident } from '../../models/AccidentIncident';
import logger from '../../utils/logger';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASSWORD || '',
    },
    secure: false,
});

export class NotificationEmailService {
    /**
     * Send hospital notification email for an accident incident.
     * Uses idempotency key: incidentId + notificationType + recipientEmail to prevent duplicates.
     * Implements retry up to 3 attempts.
     */
    static async sendHospitalNotification(
        incidentMongoId: string,
        hospitalEmail: string,
        hospitalName: string
    ): Promise<{ success: boolean; error?: string }> {
        const incident = await AccidentIncident.findById(incidentMongoId);
        if (!incident) return { success: false, error: 'Incident not found' };

        const idempotencyKey = `${incident.incidentId}_HOSPITAL_${hospitalEmail.toLowerCase()}`;

        // Check if already successfully sent
        const alreadySent = incident.notification.attempts.some(
            (a) => a.idempotencyKey === idempotencyKey && a.status === 'SENT'
        );
        if (alreadySent) {
            logger.info('[NotificationEmailService] Email already sent (idempotency check)', { incidentId: incident.incidentId });
            return { success: true };
        }

        const subject = `CITYPULSE AI — Accident Alert — ${incident.incidentId}`;
        const html = NotificationEmailService.buildEmailHtml(incident, hospitalName);

        let lastError = '';
        const maxAttempts = 3;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                await transporter.sendMail({
                    from: `"${process.env.SMTP_FROM_NAME || 'CityPulse AI'}" <${process.env.SMTP_FROM_EMAIL || 'noreply@smartcity360.com'}>`,
                    to: hospitalEmail,
                    subject,
                    html,
                });

                await AccidentIncident.findByIdAndUpdate(incidentMongoId, {
                    $push: {
                        'notification.attempts': {
                            attemptedAt: new Date(),
                            status: 'SENT',
                            recipient: hospitalEmail,
                            idempotencyKey,
                        },
                    },
                    $set: {
                        'notification.status': 'SENT',
                        'notification.notifiedAt': new Date(),
                    },
                });

                logger.info('[NotificationEmailService] Hospital notification sent', {
                    incidentId: incident.incidentId,
                    hospital: hospitalEmail,
                });
                return { success: true };
            } catch (err) {
                lastError = err instanceof Error ? err.message : String(err);
                logger.warn(`[NotificationEmailService] Attempt ${attempt + 1} failed`, { error: lastError });

                await AccidentIncident.findByIdAndUpdate(incidentMongoId, {
                    $push: {
                        'notification.attempts': {
                            attemptedAt: new Date(),
                            status: 'FAILED',
                            recipient: hospitalEmail,
                            error: lastError,
                            idempotencyKey,
                        },
                    },
                    $set: { 'notification.status': attempt < maxAttempts - 1 ? 'RETRYING' : 'FAILED' },
                });

                if (attempt < maxAttempts - 1) {
                    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
                }
            }
        }

        return { success: false, error: lastError };
    }

    private static buildEmailHtml(incident: InstanceType<typeof AccidentIncident>, hospitalName: string): string {
        const [lon, lat] = incident.location.coordinates;
        const mapUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`;
        const confidence = Math.round((incident.aiConfidence || 0) * 100);

        return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Accident Alert — ${incident.incidentId}</title></head>
<body style="font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px;">
  <div style="max-width: 620px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
    <div style="background: #DC2626; padding: 20px 30px; color: white;">
      <h1 style="margin: 0; font-size: 22px;">🚨 CITYPULSE AI — Accident Alert</h1>
      <p style="margin: 5px 0 0; opacity: 0.9; font-size: 13px;">This is an automated alert from the CityPulse AI Accident Response System</p>
    </div>
    <div style="padding: 30px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #666; font-size: 13px; width: 40%;">Incident ID</td><td style="padding: 8px 0; font-weight: bold; font-size: 14px;">${incident.incidentId}</td></tr>
        <tr><td style="padding: 8px 0; color: #666; font-size: 13px;">Detection Time</td><td style="padding: 8px 0; font-size: 14px;">${incident.detectedAt.toISOString()}</td></tr>
        <tr><td style="padding: 8px 0; color: #666; font-size: 13px;">Camera</td><td style="padding: 8px 0; font-size: 14px;">${incident.cameraId}</td></tr>
        <tr><td style="padding: 8px 0; color: #666; font-size: 13px;">Location</td><td style="padding: 8px 0; font-size: 14px;">${incident.location.address || `${lat.toFixed(5)}, ${lon.toFixed(5)}`}</td></tr>
        <tr><td style="padding: 8px 0; color: #666; font-size: 13px;">Coordinates</td><td style="padding: 8px 0; font-size: 14px;">${lat.toFixed(6)}, ${lon.toFixed(6)}</td></tr>
        <tr><td style="padding: 8px 0; color: #666; font-size: 13px;">Accident Type</td><td style="padding: 8px 0; font-size: 14px;">${incident.accidentType.replace(/_/g, ' ')}</td></tr>
        <tr><td style="padding: 8px 0; color: #666; font-size: 13px;">AI Confidence</td><td style="padding: 8px 0; font-size: 14px; font-weight: bold; color: ${confidence >= 90 ? '#16a34a' : '#d97706'};">${confidence}%</td></tr>
        <tr><td style="padding: 8px 0; color: #666; font-size: 13px;">Severity</td><td style="padding: 8px 0; font-size: 14px; font-weight: bold; color: #DC2626;">${incident.severity} — <em>AI Estimate</em></td></tr>
        ${incident.vehiclesInvolved !== undefined ? `<tr><td style="padding: 8px 0; color: #666; font-size: 13px;">Vehicles Detected</td><td style="padding: 8px 0; font-size: 14px;">${incident.vehiclesInvolved}</td></tr>` : ''}
        ${incident.possiblePersons !== undefined ? `<tr><td style="padding: 8px 0; color: #666; font-size: 13px;">Possible Persons</td><td style="padding: 8px 0; font-size: 14px;">${incident.possiblePersons}</td></tr>` : ''}
        <tr><td style="padding: 8px 0; color: #666; font-size: 13px;">Notified Hospital</td><td style="padding: 8px 0; font-size: 14px;">${hospitalName}</td></tr>
        <tr><td style="padding: 8px 0; color: #666; font-size: 13px;">Current Status</td><td style="padding: 8px 0; font-size: 14px;">${incident.status}</td></tr>
      </table>
      <div style="margin-top: 20px; padding: 15px; background: #FEF2F2; border-radius: 8px; border-left: 4px solid #DC2626;">
        <p style="margin: 0; font-size: 13px; color: #991B1B;">
          ⚠️ <strong>Important:</strong> This is an AI-generated alert based on CCTV analysis. Severity and injury information are AI estimates only. 
          Please verify with on-site personnel. This system does NOT provide medical diagnosis.
        </p>
      </div>
      <div style="margin-top: 20px; text-align: center;">
        <a href="${mapUrl}" style="background: #2563EB; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">📍 View on Map</a>
      </div>
      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9CA3AF; text-align: center;">
        CityPulse AI Accident Response System • Reference: ${incident.incidentId}<br>
        This is an automated message. Do not reply.
      </div>
    </div>
  </div>
</body>
</html>`;
    }
}
