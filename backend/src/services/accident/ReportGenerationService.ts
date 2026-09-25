import { IAccidentIncident } from '../../models/AccidentIncident';

export class ReportGenerationService {
    /**
     * Generate a structured HTML incident report for storage in MongoDB.
     * This is stored in incident.report as an HTML string.
     */
    static generate(incident: IAccidentIncident & { _id?: unknown }): string {
        const [lon, lat] = incident.location.coordinates;
        const confidence = Math.round((incident.aiConfidence || 0) * 100);
        const timestamp = new Date(incident.detectedAt).toUTCString();
        const mapUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`;

        const hospitalSection = incident.hospital?.name
            ? `
            <tr><td class="label">Nearest Suitable Hospital</td><td class="value">${incident.hospital.name}</td></tr>
            <tr><td class="label">Distance to Hospital</td><td class="value">${incident.hospital.distanceMeters ? Math.round(incident.hospital.distanceMeters) + 'm' : 'N/A'}</td></tr>
            <tr><td class="label">Selection Reason</td><td class="value"><em>${incident.hospital.selectionReason || 'N/A'}</em></td></tr>
            `
            : '<tr><td class="label">Hospital</td><td class="value">None selected yet</td></tr>';

        const evidenceSection = incident.evidence && incident.evidence.length > 0
            ? incident.evidence.map((e) =>
                `<div style="margin: 5px 0; padding: 8px; background: #f5f5f5; border-radius: 4px;">
                    <strong>${e.type}</strong> — ${new Date(e.timestamp).toUTCString()}
                    ${e.url ? ` — <a href="${e.url}">View</a>` : ''}
                </div>`
            ).join('')
            : '<p style="color: #999;">No evidence captured yet</p>';

        return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Accident Report — ${incident.incidentId}</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; background: #f9fafb; }
  .report { max-width: 760px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 20px rgba(0,0,0,0.08); }
  .header { background: linear-gradient(135deg, #1e1b4b, #312e81); color: white; padding: 30px 40px; }
  .header h1 { margin: 0 0 4px; font-size: 24px; letter-spacing: 0.5px; }
  .header p { margin: 0; opacity: 0.7; font-size: 13px; }
  .header .badge { display: inline-block; background: rgba(255,255,255,0.15); border-radius: 20px; padding: 4px 12px; font-size: 12px; margin-top: 10px; }
  .body { padding: 40px; }
  table { width: 100%; border-collapse: collapse; }
  .label { color: #6b7280; font-size: 13px; padding: 10px 0; width: 40%; border-bottom: 1px solid #f3f4f6; }
  .value { font-size: 14px; padding: 10px 0; font-weight: 500; border-bottom: 1px solid #f3f4f6; }
  .severity-high { color: #DC2626; font-weight: bold; }
  .severity-critical { color: #7F1D1D; font-weight: bold; }
  .section-title { margin: 30px 0 15px; font-size: 16px; font-weight: 700; color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
  .disclaimer { margin-top: 30px; padding: 15px; background: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 4px; font-size: 12px; color: #92400E; }
  .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #9CA3AF; }
</style>
</head>
<body>
<div class="report">
  <div class="header">
    <h1>CITYPULSE AI</h1>
    <p>ACCIDENT INCIDENT REPORT</p>
    <span class="badge">CONFIDENTIAL — ADMIN USE ONLY</span>
  </div>
  <div class="body">
    <h2 class="section-title">Incident Summary</h2>
    <table>
      <tr><td class="label">Incident ID</td><td class="value"><strong>${incident.incidentId}</strong></td></tr>
      <tr><td class="label">Detection Time</td><td class="value">${timestamp}</td></tr>
      <tr><td class="label">Camera ID</td><td class="value">${incident.cameraId}</td></tr>
      <tr><td class="label">City</td><td class="value">${incident.city}</td></tr>
      <tr><td class="label">Location</td><td class="value">${incident.location.address || 'See coordinates'}</td></tr>
      <tr><td class="label">Coordinates</td><td class="value">${lat.toFixed(6)}, ${lon.toFixed(6)} (<a href="${mapUrl}" target="_blank">Map</a>)</td></tr>
    </table>

    <h2 class="section-title">AI Detection Results</h2>
    <table>
      <tr><td class="label">Accident Type</td><td class="value">${incident.accidentType.replace(/_/g, ' ')}</td></tr>
      <tr><td class="label">AI Confidence</td><td class="value">${confidence}%</td></tr>
      <tr><td class="label">Severity (AI Estimate)</td><td class="value ${incident.severity === 'HIGH' || incident.severity === 'CRITICAL' ? 'severity-' + incident.severity.toLowerCase() : ''}">${incident.severity} — <em>AI ESTIMATE ONLY</em></td></tr>
      <tr><td class="label">Vehicles Detected</td><td class="value">${incident.vehiclesInvolved ?? 'N/A'}</td></tr>
      <tr><td class="label">Possible Persons</td><td class="value">${incident.possiblePersons ?? 'N/A'}</td></tr>
      <tr><td class="label">Current Status</td><td class="value">${incident.status}</td></tr>
    </table>

    <h2 class="section-title">Hospital Information</h2>
    <table>${hospitalSection}</table>

    <h2 class="section-title">Notification Status</h2>
    <table>
      <tr><td class="label">Email Status</td><td class="value">${incident.notification.status}</td></tr>
      <tr><td class="label">Notified At</td><td class="value">${incident.notification.notifiedAt ? new Date(incident.notification.notifiedAt).toUTCString() : 'Not sent yet'}</td></tr>
      <tr><td class="label">Attempts</td><td class="value">${incident.notification.attempts.length}</td></tr>
    </table>

    <h2 class="section-title">Evidence</h2>
    ${evidenceSection}

    <div class="disclaimer">
      ⚠️ <strong>Important Disclaimer:</strong> This report is generated automatically by an AI-powered CCTV analysis system.
      Severity, injury, and vehicle information are AI estimates based on visual analysis only. This system does NOT perform
      medical diagnosis. All AI estimates must be verified by qualified on-site personnel. Do not make medical decisions
      based solely on this report.
    </div>

    <div class="footer">
      Report generated by CityPulse AI Accident Response System • ${new Date().toUTCString()}<br>
      Incident Reference: ${incident.incidentId}
    </div>
  </div>
</div>
</body>
</html>`;
    }
}
