'use client';

import { useState, useEffect, useCallback } from 'react';
import { Camera, Plus, Edit2, Trash2, RefreshCw, TestTube, ToggleLeft, ToggleRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { accidentService, AccidentCamera, CameraStatus } from '../../../../services/accident.service';

type ApiResponse<T> = { data?: T; success?: boolean };

const STATUS_BADGE: Record<CameraStatus, string> = {
    ONLINE: 'bg-green-100 text-green-800',
    OFFLINE: 'bg-gray-100 text-gray-600',
    ERROR: 'bg-red-100 text-red-800',
    DISABLED: 'bg-yellow-100 text-yellow-800',
};

const emptyForm = {
    cameraId: '', name: '', city: '', sourceType: 'SIMULATION',
    latitude: '', longitude: '', address: '', description: '', fps: '', resolution: '',
};

export default function CamerasPage() {
    const [cameras, setCameras] = useState<AccidentCamera[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState({ ...emptyForm });
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState<string | null>(null);
    const [testResult, setTestResult] = useState<Record<string, { success: boolean; message: string } | null>>({});
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        try {
            const res = await accidentService.cameras.list() as ApiResponse<AccidentCamera[]>;
            const d = (res as unknown as { data?: AccidentCamera[] })?.data;
            if (Array.isArray(d)) setCameras(d);
        } catch { /* ignore */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const openCreate = () => { setForm({ ...emptyForm }); setEditId(null); setShowForm(true); setError(''); };
    const openEdit = (c: AccidentCamera) => {
        const [lon, lat] = c.location.coordinates;
        setForm({
            cameraId: c.cameraId, name: c.name, city: c.city, sourceType: c.sourceType,
            latitude: String(lat), longitude: String(lon),
            address: c.location.address || '', description: c.location.description || '',
            fps: String(c.fps || ''), resolution: c.resolution || '',
        });
        setEditId(c._id);
        setShowForm(true);
        setError('');
    };

    const handleSave = async () => {
        setError('');
        if (!form.cameraId || !form.name || !form.latitude || !form.longitude || !form.city) {
            setError('Camera ID, Name, City, Latitude, and Longitude are required');
            return;
        }
        const lat = parseFloat(form.latitude), lon = parseFloat(form.longitude);
        if (isNaN(lat) || isNaN(lon)) { setError('Latitude and Longitude must be valid numbers'); return; }
        if (lat < -90 || lat > 90) { setError('Latitude must be between -90 and 90'); return; }
        if (lon < -180 || lon > 180) { setError('Longitude must be between -180 and 180'); return; }

        setSaving(true);
        try {
            const payload = {
                cameraId: form.cameraId.toUpperCase(),
                name: form.name, city: form.city, sourceType: form.sourceType as AccidentCamera['sourceType'],
                location: { type: 'Point' as const, coordinates: [lon, lat] as [number, number], address: form.address || undefined, description: form.description || undefined },
                ...(form.fps ? { fps: parseInt(form.fps) } : {}),
                ...(form.resolution ? { resolution: form.resolution } : {}),
            };
            if (editId) await accidentService.cameras.update(editId, payload);
            else await accidentService.cameras.create(payload);
            setShowForm(false);
            load();
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            setError(err?.response?.data?.message || 'Save failed');
        } finally { setSaving(false); }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete camera "${name}"? This cannot be undone.`)) return;
        try {
            await accidentService.cameras.delete(id);
            load();
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            alert(err?.response?.data?.message || 'Delete failed');
        }
    };

    const handleToggle = async (c: AccidentCamera) => {
        try {
            await accidentService.cameras.update(c._id, { enabled: !c.enabled });
            load();
        } catch { /* ignore */ }
    };

    const handleTest = async (id: string) => {
        setTesting(id);
        setTestResult(p => ({ ...p, [id]: null }));
        try {
            const res = await accidentService.cameras.test(id) as { data?: { success: boolean; message: string } };
            const d = (res as unknown as { data?: { success: boolean; message: string } })?.data;
            setTestResult(p => ({ ...p, [id]: d || null }));
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            setTestResult(p => ({ ...p, [id]: { success: false, message: err?.response?.data?.message || 'Test failed' } }));
        } finally { setTesting(null); }
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Link href="/admin/accidents" className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                    </Link>
                    <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
                        <Camera className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold">CCTV Cameras</h1>
                        <p className="text-gray-400 text-xs">Manage accident detection cameras</p>
                    </div>
                </div>
                <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold transition-colors">
                    <Plus className="w-4 h-4" /> Add Camera
                </button>
            </div>

            {/* Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-lg p-6">
                        <h2 className="text-lg font-bold mb-4">{editId ? 'Edit Camera' : 'Add Camera'}</h2>
                        {error && <div className="mb-4 p-3 bg-red-900/40 border border-red-800 rounded-lg text-sm text-red-300">{error}</div>}
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { k: 'cameraId', label: 'Camera ID*', ph: 'e.g. CAM-MAIN-001' },
                                { k: 'name', label: 'Name*', ph: 'e.g. Main Junction CCTV' },
                                { k: 'city', label: 'City*', ph: 'e.g. udaipur' },
                                { k: 'latitude', label: 'Latitude*', ph: 'e.g. 24.5854' },
                                { k: 'longitude', label: 'Longitude*', ph: 'e.g. 73.7125' },
                                { k: 'fps', label: 'FPS', ph: 'e.g. 30' },
                                { k: 'resolution', label: 'Resolution', ph: 'e.g. 1920x1080' },
                            ].map(({ k, label, ph }) => (
                                <div key={k}>
                                    <label className="text-xs text-gray-400 block mb-1">{label}</label>
                                    <input
                                        type="text" value={form[k as keyof typeof form]} placeholder={ph}
                                        onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                                        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                            ))}
                            <div>
                                <label className="text-xs text-gray-400 block mb-1">Source Type</label>
                                <select value={form.sourceType} onChange={e => setForm(p => ({ ...p, sourceType: e.target.value }))}
                                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white">
                                    {['RTSP', 'VIDEO_FILE', 'WEBCAM', 'SIMULATION'].map(t => <option key={t}>{t}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="mt-3">
                            <label className="text-xs text-gray-400 block mb-1">Address (optional)</label>
                            <input type="text" value={form.address} placeholder="Street address or landmark"
                                onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white" />
                        </div>
                        <div className="flex gap-3 mt-5">
                            <button onClick={handleSave} disabled={saving}
                                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold disabled:opacity-50">
                                {saving ? 'Saving…' : (editId ? 'Update Camera' : 'Create Camera')}
                            </button>
                            <button onClick={() => setShowForm(false)}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-gray-900 rounded-xl border border-gray-800">
                {loading ? (
                    <div className="p-12 text-center text-gray-400">Loading cameras…</div>
                ) : cameras.length === 0 ? (
                    <div className="p-12 text-center">
                        <Camera className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                        <p className="text-gray-400">No cameras yet</p>
                        <button onClick={openCreate} className="mt-3 px-4 py-2 bg-blue-600 rounded-lg text-sm">Add First Camera</button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-800 text-gray-400 text-xs">
                                    <th className="text-left py-3 px-4">Camera ID</th>
                                    <th className="text-left py-3 px-4">Name</th>
                                    <th className="text-left py-3 px-4">City</th>
                                    <th className="text-left py-3 px-4">Type</th>
                                    <th className="text-left py-3 px-4">Status</th>
                                    <th className="text-left py-3 px-4">Enabled</th>
                                    <th className="text-left py-3 px-4">Last Heartbeat</th>
                                    <th className="text-left py-3 px-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cameras.map(c => (
                                    <tr key={c._id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                                        <td className="py-3 px-4 font-mono text-xs">{c.cameraId}</td>
                                        <td className="py-3 px-4 text-gray-200">{c.name}</td>
                                        <td className="py-3 px-4 text-gray-400 text-xs">{c.city}</td>
                                        <td className="py-3 px-4 text-xs text-blue-400">{c.sourceType}</td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[c.status]}`}>
                                                {c.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <button onClick={() => handleToggle(c)} title={c.enabled ? 'Disable' : 'Enable'}>
                                                {c.enabled
                                                    ? <ToggleRight className="w-5 h-5 text-green-400 hover:text-green-300" />
                                                    : <ToggleLeft className="w-5 h-5 text-gray-500 hover:text-gray-400" />
                                                }
                                            </button>
                                        </td>
                                        <td className="py-3 px-4 text-xs text-gray-400">
                                            {c.lastHeartbeat ? new Date(c.lastHeartbeat).toLocaleString() : '—'}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleTest(c._id)} disabled={testing === c._id} title="Test Camera">
                                                    <TestTube className={`w-4 h-4 ${testing === c._id ? 'animate-pulse text-yellow-400' : 'text-gray-400 hover:text-yellow-400'}`} />
                                                </button>
                                                <button onClick={() => openEdit(c)} title="Edit">
                                                    <Edit2 className="w-4 h-4 text-gray-400 hover:text-blue-400" />
                                                </button>
                                                <button onClick={() => handleDelete(c._id, c.name)} title="Delete">
                                                    <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
                                                </button>
                                            </div>
                                            {testResult[c._id] && (
                                                <p className={`text-xs mt-1 ${testResult[c._id]?.success ? 'text-green-400' : 'text-red-400'}`}>
                                                    {testResult[c._id]?.message}
                                                </p>
                                            )}
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
