'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart3, ArrowLeft, TrendingUp, Shield, Activity, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { accidentService, AccidentAnalytics, ACCIDENT_TYPE_LABELS, AccidentType } from '../../../../services/accident.service';

type ApiResponse<T> = { data?: T };

export default function AnalyticsPage() {
    const [analytics, setAnalytics] = useState<AccidentAnalytics | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const res = await accidentService.incidents.analytics() as ApiResponse<AccidentAnalytics>;
            const d = (res as unknown as { data?: AccidentAnalytics })?.data;
            if (d) setAnalytics(d);
        } catch { /* ignore */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    if (loading) return (
        <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
            <div className="animate-pulse text-gray-400">Loading analytics…</div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-950 text-white p-6">
            <div className="flex items-center gap-3 mb-6">
                <Link href="/admin/accidents" className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700"><ArrowLeft className="w-4 h-4" /></Link>
                <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center"><BarChart3 className="w-5 h-5" /></div>
                <div>
                    <h1 className="text-xl font-bold">Accident Analytics</h1>
                    <p className="text-gray-400 text-xs">Trends, hotspots & insights</p>
                </div>
            </div>

            {!analytics ? (
                <div className="text-center py-20 text-gray-400">No analytics data available yet. Trigger a demo accident to start.</div>
            ) : (
                <div className="space-y-6">
                    {/* KPI Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Total Incidents', value: analytics.summary.total, icon: Activity, color: 'text-white bg-gray-800' },
                            { label: 'Active Now', value: analytics.summary.active, icon: AlertTriangle, color: 'text-orange-400 bg-orange-900/20' },
                            { label: 'Resolved', value: analytics.summary.resolved, icon: Shield, color: 'text-green-400 bg-green-900/20' },
                            { label: 'False Positive Rate', value: analytics.summary.falsePositiveRate, icon: TrendingUp, color: 'text-gray-400 bg-gray-800' },
                        ].map(({ label, value, icon: Icon, color }) => (
                            <div key={label} className={`p-4 rounded-xl border border-gray-800 ${color}`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon className="w-4 h-4 opacity-70" />
                                    <span className="text-xs text-gray-400">{label}</span>
                                </div>
                                <p className="text-3xl font-bold">{value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Severity + Status */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Severity breakdown */}
                        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                            <h3 className="font-semibold text-sm mb-4">By Severity</h3>
                            <div className="space-y-3">
                                {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(s => {
                                    const count = analytics.bySeverity.find(b => b._id === s)?.count || 0;
                                    const total = analytics.summary.total || 1;
                                    const pct = Math.round((count / total) * 100);
                                    const bar = s === 'CRITICAL' ? 'bg-red-900' : s === 'HIGH' ? 'bg-red-500' : s === 'MEDIUM' ? 'bg-yellow-500' : 'bg-green-500';
                                    return (
                                        <div key={s}>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-gray-300">{s}</span>
                                                <span className="text-gray-400">{count} ({pct}%)</span>
                                            </div>
                                            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                                <div className={`h-full ${bar} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Status breakdown */}
                        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                            <h3 className="font-semibold text-sm mb-4">By Status</h3>
                            <div className="space-y-2">
                                {Object.entries(analytics.byStatus)
                                    .sort(([, a], [, b]) => b - a)
                                    .map(([status, count]) => (
                                        <div key={status} className="flex justify-between items-center text-sm">
                                            <span className="text-gray-300 text-xs">{status.replace(/_/g, ' ')}</span>
                                            <span className="font-bold text-white">{count}</span>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>

                    {/* Top Accident Types */}
                    {analytics.byType.length > 0 && (
                        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                            <h3 className="font-semibold text-sm mb-4">Top Accident Types</h3>
                            <div className="space-y-3">
                                {analytics.byType.slice(0, 8).map((t, i) => {
                                    const max = analytics.byType[0]?.count || 1;
                                    const pct = Math.round((t.count / max) * 100);
                                    return (
                                        <div key={t._id}>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-gray-300">{ACCIDENT_TYPE_LABELS[t._id as AccidentType] || t._id}</span>
                                                <span className="text-gray-400">{t.count}</span>
                                            </div>
                                            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${i === 0 ? 'bg-red-500' : i === 1 ? 'bg-orange-500' : 'bg-purple-500'}`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Daily Trend */}
                    {analytics.byDay.length > 0 && (
                        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                            <h3 className="font-semibold text-sm mb-4">Daily Trend (Last 30 Days)</h3>
                            <div className="flex items-end gap-1 h-24">
                                {analytics.byDay.slice(-30).map(d => {
                                    const max = Math.max(...analytics.byDay.map(x => x.count), 1);
                                    const h = Math.round((d.count / max) * 100);
                                    return (
                                        <div key={d._id} className="flex flex-col items-center flex-1 group">
                                            <div
                                                style={{ height: `${h}%` }}
                                                className="w-full bg-red-600 rounded-t group-hover:bg-red-500 transition-colors min-h-[2px]"
                                                title={`${d._id}: ${d.count}`}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex justify-between text-xs text-gray-600 mt-1">
                                <span>{analytics.byDay[0]?._id}</span>
                                <span>{analytics.byDay[analytics.byDay.length - 1]?._id}</span>
                            </div>
                        </div>
                    )}

                    {/* Hotspots */}
                    {analytics.hotspots.length > 0 && (
                        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                            <h3 className="font-semibold text-sm mb-4">Repeat Hotspots</h3>
                            <div className="space-y-2">
                                {analytics.hotspots.map((h, i) => (
                                    <div key={i} className="flex items-center gap-3 p-2 bg-gray-800 rounded-lg">
                                        <span className="text-xs text-gray-500 w-5 text-center">#{i + 1}</span>
                                        <span className="text-xs text-gray-300 font-mono flex-1">{h.lat?.toFixed(4)}, {h.lon?.toFixed(4)}</span>
                                        <span className="text-xs font-bold text-red-400">{h.count} incidents</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
