'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Clock, CheckCircle, XCircle, Bell, RefreshCw, MapPin, Camera, Building2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
    accidentService, AccidentIncident, AccidentStatus,
    SEVERITY_BG, STATUS_COLORS, ACCIDENT_TYPE_LABELS
} from '../../../../services/accident.service';

type ApiResponse<T> = { data?: T };

const TRANSITIONS: Partial<Record<AccidentStatus, Array<{ to: AccidentStatus; label: string; icon: React.ElementType; color: string }>>> = {
    DETECTED: [
        { to: 'VERIFYING', label: 'Mark as Verifying', icon: Clock, color: 'bg-yellow-600 hover:bg-yellow-700' },
        { to: 'FALSE_POSITIVE', label: 'Mark False Positive', icon: XCircle, color: 'bg-gray-700 hover:bg-gray-600' },
    ],
    VERIFYING: [
        { to: 'CONFIRMED', label: 'Confirm Incident', icon: CheckCircle, color: 'bg-blue-600 hover:bg-blue-700' },
        { to: 'FALSE_POSITIVE', label: 'Mark False Positive', icon: XCircle, color: 'bg-gray-700 hover:bg-gray-600' },
    ],
    CONFIRMED: [
        { to: 'HOSPITAL_NOTIFIED', label: 'Notify Hospital', icon: Bell, color: 'bg-purple-600 hover:bg-purple-700' },
    ],
    HOSPITAL_RECEIVED: [
        { to: 'RESOLVED', label: 'Resolve Incident', icon: CheckCircle, color: 'bg-green-600 hover:bg-green-700' },
    ],
};

export default function IncidentDetailPage() {
    const params = useParams();
    const id = params['incidentId'] as string;
    const [incident, setIncident] = useState<AccidentIncident | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [notifyEmail, setNotifyEmail] = useState('');
    const [notifyName, setNotifyName] = useState('');
    const [showNotifyForm, setShowNotifyForm] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

    const load = useCallback(async () => {
        try {
            const res = await accidentService.incidents.get(id) as ApiResponse<AccidentIncident>;
            const d = (res as unknown as { data?: AccidentIncident })?.data;
            if (d) setIncident(d);
        } catch { /* ignore */ }
        finally { setLoading(false); }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    const doTransition = async (to: AccidentStatus, notes?: string) => {
        if (!incident) return;
        setActionLoading(true);
        setFeedback(null);
        try {
            if (to === 'VERIFYING') await accidentService.incidents.verify(incident._id, notes);
            else if (to === 'CONFIRMED') await accidentService.incidents.confirm(incident._id, notes);
            else if (to === 'FALSE_POSITIVE') await accidentService.incidents.markFalsePositive(incident._id, notes);
            else if (to === 'RESOLVED') await accidentService.incidents.resolve(incident._id, notes);
            else if (to === 'HOSPITAL_NOTIFIED') {
                setShowNotifyForm(true);
                setActionLoading(false);
                return;
            }
            setFeedback({ type: 'success', msg: `Status updated to ${to.replace(/_/g, ' ')}` });
            load();
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            setFeedback({ type: 'error', msg: err?.response?.data?.message || 'Action failed' });
        } finally { setActionLoading(false); }
    };

    const sendHospitalNotification = async () => {
        if (!incident) return;
        setActionLoading(true);
        try {
            await accidentService.incidents.notifyHospital(incident._id, notifyEmail || undefined, notifyName || undefined);
            setFeedback({ type: 'success', msg: 'Hospital notification sent' });
            setShowNotifyForm(false);
            load();
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            setFeedback({ type: 'error', msg: err?.response?.data?.message || 'Notification failed' });
        } finally { setActionLoading(false); }
    };

    if (loading) return (
        <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
        </div>
    );

    if (!incident) return (
        <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center flex-col gap-4">
            <p className="text-gray-400">Incident not found</p>
            <Link href="/admin/accidents" className="text-blue-400 hover:underline text-sm">← Back to Dashboard</Link>
        </div>
    );

    const [lon, lat] = incident.location.coordinates;
    const mapUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;
    const transitions = TRANSITIONS[incident.status] || [];

    return (
        <div className="min-h-screen bg-gray-950 text-white p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <Link href="/admin/accidents" className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700"><ArrowLeft className="w-4 h-4" /></Link>
                    <div>
                        <p className="text-xs text-gray-500">Incident ID</p>
                        <h1 className="text-xl font-bold font-mono">{incident.incidentId}</h1>
                    </div>
                    <span className={`ml-auto px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[incident.status]}`}>
                        {incident.status.replace(/_/g, ' ')}
                    </span>
                </div>

                {/* Feedback */}
                {feedback && (
                    <div className={`mb-4 p-3 rounded-lg text-sm border ${feedback.type === 'success' ? 'bg-green-900/30 border-green-700 text-green-300' : 'bg-red-900/30 border-red-700 text-red-300'}`}>
                        {feedback.msg}
                    </div>
                )}

                {/* Action Buttons */}
                {transitions.length > 0 && (
                    <div className="flex flex-wrap gap-3 mb-6">
                        {transitions.map(({ to, label, icon: Icon, color }) => (
                            <button key={to} onClick={() => doTransition(to)}
                                disabled={actionLoading}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${color}`}>
                                <Icon className="w-4 h-4" />{label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Notify Hospital Form */}
                {showNotifyForm && (
                    <div className="mb-6 p-4 bg-purple-900/20 border border-purple-700 rounded-xl">
                        <p className="text-sm font-semibold text-purple-300 mb-3">Send Hospital Notification</p>
                        {incident.hospital?.name && (
                            <p className="text-xs text-gray-400 mb-3">
                                Selected hospital: <strong>{incident.hospital.name}</strong> ({incident.hospital.distanceMeters}m away)
                                — leave below blank to use the hospital&apos;s registered email.
                            </p>
                        )}
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Override Email (optional)</label>
                                <input type="email" value={notifyEmail} onChange={e => setNotifyEmail(e.target.value)} placeholder="hospital@example.com"
                                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Hospital Name (optional)</label>
                                <input type="text" value={notifyName} onChange={e => setNotifyName(e.target.value)} placeholder="Hospital name"
                                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white" />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={sendHospitalNotification} disabled={actionLoading}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-semibold disabled:opacity-50">
                                {actionLoading ? 'Sending…' : 'Send Notification'}
                            </button>
                            <button onClick={() => setShowNotifyForm(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm">Cancel</button>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Detection Info */}
                    <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                        <h2 className="font-semibold text-sm mb-4 text-gray-300">Detection Details</h2>
                        <dl className="space-y-2 text-sm">
                            {[
                                { label: 'Type', value: ACCIDENT_TYPE_LABELS[incident.accidentType] || incident.accidentType },
                                { label: 'Severity', value: <span className={`px-2 py-0.5 rounded-full text-xs ${SEVERITY_BG[incident.severity]}`}>{incident.severity}</span> },
                                { label: 'AI Confidence', value: `${Math.round(incident.aiConfidence * 100)}%` },
                                { label: 'Camera', value: <span className="font-mono text-xs">{incident.cameraId}</span> },
                                { label: 'Detected At', value: new Date(incident.detectedAt).toLocaleString() },
                                { label: 'City', value: incident.city },
                                { label: 'Vehicles Detected', value: incident.vehiclesInvolved ?? '—' },
                                { label: 'Possible Persons', value: incident.possiblePersons ?? '—' },
                            ].map(({ label, value }) => (
                                <div key={label} className="flex justify-between items-center">
                                    <dt className="text-gray-400">{label}</dt>
                                    <dd className="text-gray-100 font-medium">{value}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>

                    {/* Location + Hospital */}
                    <div className="space-y-4">
                        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                            <h2 className="font-semibold text-sm mb-3 flex items-center gap-2 text-gray-300">
                                <MapPin className="w-4 h-4" /> Location
                            </h2>
                            <p className="text-sm text-gray-300">{incident.location.address || 'No address recorded'}</p>
                            <p className="text-xs text-gray-500 mt-1 font-mono">{lat.toFixed(6)}, {lon.toFixed(6)}</p>
                            <a href={mapUrl} target="_blank" rel="noopener noreferrer"
                                className="mt-3 inline-block text-xs text-blue-400 hover:underline">📍 Open on Map</a>
                        </div>

                        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                            <h2 className="font-semibold text-sm mb-3 flex items-center gap-2 text-gray-300">
                                <Building2 className="w-4 h-4" /> Selected Hospital
                            </h2>
                            {incident.hospital?.name ? (
                                <dl className="space-y-1.5 text-sm">
                                    <div className="flex justify-between">
                                        <dt className="text-gray-400">Hospital</dt>
                                        <dd className="text-gray-100">{incident.hospital.name}</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-gray-400">Distance</dt>
                                        <dd className="text-gray-100">{incident.hospital.distanceMeters}m</dd>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2 italic">{incident.hospital.selectionReason}</p>
                                </dl>
                            ) : (
                                <p className="text-gray-500 text-sm">No hospital selected yet</p>
                            )}
                        </div>

                        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                            <h2 className="font-semibold text-sm mb-3 flex items-center gap-2 text-gray-300">
                                <Bell className="w-4 h-4" /> Notification
                            </h2>
                            <dl className="space-y-1.5 text-sm">
                                <div className="flex justify-between">
                                    <dt className="text-gray-400">Status</dt>
                                    <dd className={`text-xs font-semibold px-2 py-0.5 rounded-full ${incident.notification.status === 'SENT' ? 'bg-green-100 text-green-800' : incident.notification.status === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}`}>
                                        {incident.notification.status}
                                    </dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-gray-400">Attempts</dt>
                                    <dd className="text-gray-100">{incident.notification.attempts.length}</dd>
                                </div>
                                {incident.notification.notifiedAt && (
                                    <div className="flex justify-between">
                                        <dt className="text-gray-400">Notified At</dt>
                                        <dd className="text-gray-100 text-xs">{new Date(incident.notification.notifiedAt).toLocaleString()}</dd>
                                    </div>
                                )}
                            </dl>
                        </div>
                    </div>
                </div>

                {/* Audit Log */}
                <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 mb-4">
                    <h2 className="font-semibold text-sm mb-4 text-gray-300">Audit Log</h2>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {[...incident.auditLog].reverse().map((entry, i) => (
                            <div key={i} className="flex items-start gap-3 text-xs">
                                <span className="text-gray-600 font-mono mt-0.5">{new Date(entry.timestamp).toLocaleString()}</span>
                                <div>
                                    <span className="font-semibold text-gray-300">{entry.action.replace(/_/g, ' ')}</span>
                                    <span className="text-gray-500 ml-2">by {entry.actor}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Description */}
                {incident.description && (
                    <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                        <h2 className="font-semibold text-sm mb-2 text-gray-300">Description</h2>
                        <p className="text-sm text-gray-300">{incident.description}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
