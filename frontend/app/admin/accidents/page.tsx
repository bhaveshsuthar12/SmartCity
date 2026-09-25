'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    AlertTriangle, Camera, Building2, BarChart3, Plus, RefreshCw,
    CheckCircle, XCircle, Clock, Shield, Zap, Activity, ChevronRight, Eye
} from 'lucide-react';
import {
    accidentService, AccidentIncident, AccidentAnalytics,
    SEVERITY_BG, STATUS_COLORS, ACCIDENT_TYPE_LABELS
} from '../../../services/accident.service';

type ApiResponse<T> = { data?: T; success?: boolean };

export default function AccidentsPage() {
    const [incidents, setIncidents] = useState<AccidentIncident[]>([]);
    const [analytics, setAnalytics] = useState<AccidentAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showDemo, setShowDemo] = useState(false);
    const [demoForm, setDemoForm] = useState({
        latitude: '24.5854', longitude: '73.7125',
        accidentType: 'VEHICLE_COLLISION', severity: 'HIGH', confidence: '0.94',
        cameraId: 'CAM-DEMO-001', vehiclesDetected: '2', possiblePersons: '1',
    });
    const [demoResult, setDemoResult] = useState<string | null>(null);
    const [demoLoading, setDemoLoading] = useState(false);

    const fetchData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        try {
            const [incRes, anaRes] = await Promise.all([
                accidentService.incidents.list({ page: '1', pageSize: '20' }) as Promise<ApiResponse<AccidentIncident[]>>,
                accidentService.incidents.analytics() as Promise<ApiResponse<AccidentAnalytics>>,
            ]);
            const incData = (incRes as unknown as { data?: AccidentIncident[] })?.data;
            const anaData = (anaRes as unknown as { data?: AccidentAnalytics })?.data;
            if (Array.isArray(incData)) setIncidents(incData);
            if (anaData) setAnalytics(anaData);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleDemo = async () => {
        setDemoLoading(true);
        setDemoResult(null);
        try {
            const res = await accidentService.demo.createAccident({
                latitude: parseFloat(demoForm.latitude),
                longitude: parseFloat(demoForm.longitude),
                accidentType: demoForm.accidentType as AccidentIncident['accidentType'],
                severity: demoForm.severity as AccidentIncident['severity'],
                confidence: parseFloat(demoForm.confidence),
                cameraId: demoForm.cameraId,
                vehiclesDetected: parseInt(demoForm.vehiclesDetected),
                possiblePersons: parseInt(demoForm.possiblePersons),
            }) as Record<string, unknown>;
            setDemoResult(`✅ ${res['message'] as string || 'Demo accident created!'}`);
            setTimeout(() => fetchData(), 800);
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            setDemoResult(`❌ ${err?.response?.data?.message || 'Failed to trigger demo'}`);
        } finally {
            setDemoLoading(false);
        }
    };

    const doAction = async (id: string, action: 'verify' | 'confirm' | 'false-positive' | 'resolve', label: string) => {
        if (!confirm(`Mark incident as ${label}?`)) return;
        try {
            if (action === 'verify') await accidentService.incidents.verify(id);
            else if (action === 'confirm') await accidentService.incidents.confirm(id);
            else if (action === 'false-positive') await accidentService.incidents.markFalsePositive(id);
            else if (action === 'resolve') await accidentService.incidents.resolve(id);
            fetchData();
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            alert(err?.response?.data?.message || 'Action failed');
        }
    };

    const summary = analytics?.summary;

    return (
        <div className="min-h-screen bg-gray-950 text-white p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <h1 className="text-2xl font-bold">Accident Response</h1>
                    </div>
                    <p className="text-gray-400 text-sm">AI-powered CCTV accident detection and hospital notification</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => fetchData(true)}
                        disabled={refreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 text-sm transition-colors"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <button
                        onClick={() => setShowDemo(!showDemo)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 text-sm font-semibold transition-colors"
                    >
                        <Zap className="w-4 h-4" />
                        Demo Accident
                    </button>
                </div>
            </div>

            {/* Demo Panel */}
            {showDemo && (
                <div className="mb-6 p-5 bg-gray-900 border border-red-800 rounded-xl">
                    <div className="flex items-center gap-2 mb-4">
                        <Zap className="w-4 h-4 text-red-400" />
                        <h3 className="font-semibold text-red-400">Trigger Demo Accident</h3>
                        <span className="text-xs text-gray-500 ml-2">Runs the full production pipeline with simulated data</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        {Object.entries(demoForm).map(([k, v]) => (
                            <div key={k}>
                                <label className="text-xs text-gray-400 block mb-1 capitalize">{k.replace(/([A-Z])/g, ' $1')}</label>
                                {k === 'accidentType' ? (
                                    <select
                                        value={v}
                                        onChange={e => setDemoForm(p => ({ ...p, [k]: e.target.value }))}
                                        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white"
                                    >
                                        {Object.entries(ACCIDENT_TYPE_LABELS).map(([type, label]) => (
                                            <option key={type} value={type}>{label}</option>
                                        ))}
                                    </select>
                                ) : k === 'severity' ? (
                                    <select
                                        value={v}
                                        onChange={e => setDemoForm(p => ({ ...p, [k]: e.target.value }))}
                                        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white"
                                    >
                                        {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        value={v}
                                        onChange={e => setDemoForm(p => ({ ...p, [k]: e.target.value }))}
                                        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white"
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleDemo}
                            disabled={demoLoading}
                            className="px-5 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                        >
                            {demoLoading ? 'Processing…' : 'Trigger Demo Accident'}
                        </button>
                        {demoResult && <span className="text-sm">{demoResult}</span>}
                    </div>
                </div>
            )}

            {/* Quick Nav */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                    { href: '/admin/accidents/cameras', icon: Camera, label: 'Cameras', desc: 'Manage CCTV cameras', color: 'bg-blue-600' },
                    { href: '/admin/accidents/hospitals', icon: Building2, label: 'Hospitals', desc: 'Manage hospital network', color: 'bg-green-600' },
                    { href: '/admin/accidents/analytics', icon: BarChart3, label: 'Analytics', desc: 'Trends & insights', color: 'bg-purple-600' },
                ].map(({ href, icon: Icon, label, desc, color }) => (
                    <Link key={href} href={href} className="p-4 bg-gray-900 rounded-xl border border-gray-800 hover:border-gray-600 transition-colors flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-semibold text-sm">{label}</p>
                            <p className="text-gray-400 text-xs">{desc}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-600 ml-auto" />
                    </Link>
                ))}
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    {[
                        { label: 'Total', value: summary.total, color: 'text-white', icon: Activity },
                        { label: 'Active', value: summary.active, color: 'text-orange-400', icon: AlertTriangle },
                        { label: 'Critical / High', value: `${summary.critical} / ${summary.high}`, color: 'text-red-400', icon: Zap },
                        { label: 'Resolved', value: summary.resolved, color: 'text-green-400', icon: CheckCircle },
                        { label: 'False Positive Rate', value: summary.falsePositiveRate, color: 'text-gray-400', icon: Shield },
                    ].map(({ label, value, color, icon: Icon }) => (
                        <div key={label} className="p-4 bg-gray-900 rounded-xl border border-gray-800">
                            <div className="flex items-center gap-2 mb-2">
                                <Icon className="w-4 h-4 text-gray-500" />
                                <span className="text-xs text-gray-400">{label}</span>
                            </div>
                            <p className={`text-2xl font-bold ${color}`}>{value}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Incidents Table */}
            <div className="bg-gray-900 rounded-xl border border-gray-800">
                <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                    <h2 className="font-semibold">Recent Incidents</h2>
                    <span className="text-xs text-gray-400">{incidents.length} shown</span>
                </div>
                {loading ? (
                    <div className="p-12 text-center text-gray-500">Loading incidents…</div>
                ) : incidents.length === 0 ? (
                    <div className="p-12 text-center">
                        <AlertTriangle className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                        <p className="text-gray-400">No incidents yet</p>
                        <p className="text-gray-600 text-sm mt-1">Use the Demo Accident button to simulate one</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-800 text-gray-400 text-xs">
                                    <th className="text-left py-3 px-4">ID</th>
                                    <th className="text-left py-3 px-4">Type</th>
                                    <th className="text-left py-3 px-4">Severity</th>
                                    <th className="text-left py-3 px-4">Confidence</th>
                                    <th className="text-left py-3 px-4">Status</th>
                                    <th className="text-left py-3 px-4">Hospital</th>
                                    <th className="text-left py-3 px-4">Detected</th>
                                    <th className="text-left py-3 px-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {incidents.map(inc => (
                                    <tr key={inc._id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                                        <td className="py-3 px-4">
                                            <Link href={`/admin/accidents/${inc._id}`} className="font-mono text-xs text-blue-400 hover:text-blue-300">
                                                {inc.incidentId}
                                            </Link>
                                        </td>
                                        <td className="py-3 px-4 text-xs text-gray-300">{ACCIDENT_TYPE_LABELS[inc.accidentType] || inc.accidentType}</td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SEVERITY_BG[inc.severity]}`}>
                                                {inc.severity}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-xs font-mono">
                                            <span className={inc.aiConfidence >= 0.9 ? 'text-green-400' : 'text-yellow-400'}>
                                                {Math.round(inc.aiConfidence * 100)}%
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[inc.status]}`}>
                                                {inc.status.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-xs text-gray-400">
                                            {inc.hospital?.name || <span className="text-gray-600 italic">None</span>}
                                        </td>
                                        <td className="py-3 px-4 text-xs text-gray-400">
                                            {new Date(inc.detectedAt).toLocaleString()}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-1">
                                                <Link href={`/admin/accidents/${inc._id}`} title="View">
                                                    <Eye className="w-4 h-4 text-gray-400 hover:text-white cursor-pointer" />
                                                </Link>
                                                {inc.status === 'DETECTED' && (
                                                    <button title="Verify" onClick={() => doAction(inc._id, 'verify', 'Verifying')}>
                                                        <Clock className="w-4 h-4 text-yellow-400 hover:text-yellow-300 cursor-pointer" />
                                                    </button>
                                                )}
                                                {inc.status === 'VERIFYING' && (
                                                    <button title="Confirm" onClick={() => doAction(inc._id, 'confirm', 'Confirmed')}>
                                                        <CheckCircle className="w-4 h-4 text-blue-400 hover:text-blue-300 cursor-pointer" />
                                                    </button>
                                                )}
                                                {['DETECTED', 'VERIFYING'].includes(inc.status) && (
                                                    <button title="False Positive" onClick={() => doAction(inc._id, 'false-positive', 'False Positive')}>
                                                        <XCircle className="w-4 h-4 text-gray-400 hover:text-red-400 cursor-pointer" />
                                                    </button>
                                                )}
                                                {inc.status === 'HOSPITAL_RECEIVED' && (
                                                    <button title="Resolve" onClick={() => doAction(inc._id, 'resolve', 'Resolved')}>
                                                        <CheckCircle className="w-4 h-4 text-green-400 hover:text-green-300 cursor-pointer" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
