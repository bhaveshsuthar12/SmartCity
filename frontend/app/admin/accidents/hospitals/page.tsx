'use client';

import { useState, useEffect, useCallback } from 'react';
import { Building2, Plus, Edit2, Trash2, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { accidentService, AccidentHospital } from '../../../../services/accident.service';

type ApiResponse<T> = { data?: T };

const emptyForm = {
    hospitalId: '', name: '', address: '', city: '', email: '', phone: '',
    latitude: '', longitude: '',
    emergencyAvailable: true, traumaFacility: false, ambulanceAvailable: true,
};

export default function HospitalsPage() {
    const [hospitals, setHospitals] = useState<AccidentHospital[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState({ ...emptyForm });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        try {
            const res = await accidentService.hospitals.list() as ApiResponse<AccidentHospital[]>;
            const d = (res as unknown as { data?: AccidentHospital[] })?.data;
            if (Array.isArray(d)) setHospitals(d);
        } catch { /* ignore */ }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const openCreate = () => { setForm({ ...emptyForm, emergencyAvailable: true, traumaFacility: false, ambulanceAvailable: true }); setEditId(null); setShowForm(true); setError(''); };
    const openEdit = (h: AccidentHospital) => {
        const [lon, lat] = h.location.coordinates;
        setForm({
            hospitalId: h.hospitalId, name: h.name, address: h.address, city: h.city,
            email: h.email || '', phone: h.phone || '',
            latitude: String(lat), longitude: String(lon),
            emergencyAvailable: h.emergencyAvailable, traumaFacility: h.traumaFacility, ambulanceAvailable: h.ambulanceAvailable,
        });
        setEditId(h._id); setShowForm(true); setError('');
    };

    const handleSave = async () => {
        setError('');
        if (!form.hospitalId || !form.name || !form.address || !form.city || !form.latitude || !form.longitude) {
            setError('Hospital ID, Name, Address, City, Latitude, and Longitude are required');
            return;
        }
        const lat = parseFloat(form.latitude), lon = parseFloat(form.longitude);
        if (isNaN(lat) || isNaN(lon)) { setError('Invalid coordinates'); return; }
        setSaving(true);
        try {
            const payload = {
                hospitalId: form.hospitalId.toUpperCase(), name: form.name, address: form.address, city: form.city,
                email: form.email || undefined, phone: form.phone || undefined,
                location: { type: 'Point' as const, coordinates: [lon, lat] as [number, number] },
                emergencyAvailable: form.emergencyAvailable,
                traumaFacility: form.traumaFacility,
                ambulanceAvailable: form.ambulanceAvailable,
            };
            if (editId) await accidentService.hospitals.update(editId, payload);
            else await accidentService.hospitals.create(payload);
            setShowForm(false); load();
        } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } } };
            setError(err?.response?.data?.message || 'Save failed');
        } finally { setSaving(false); }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete hospital "${name}"?`)) return;
        try { await accidentService.hospitals.delete(id); load(); }
        catch (e: unknown) { const err = e as { response?: { data?: { message?: string } } }; alert(err?.response?.data?.message || 'Delete failed'); }
    };

    const handleToggle = async (h: AccidentHospital) => {
        try { await accidentService.hospitals.update(h._id, { active: !h.active }); load(); }
        catch { /* ignore */ }
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Link href="/admin/accidents" className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700"><ArrowLeft className="w-4 h-4" /></Link>
                    <div className="w-9 h-9 rounded-xl bg-green-600 flex items-center justify-center"><Building2 className="w-5 h-5" /></div>
                    <div>
                        <h1 className="text-xl font-bold">Hospital Network</h1>
                        <p className="text-gray-400 text-xs">Manage hospitals for accident notifications</p>
                    </div>
                </div>
                <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-semibold">
                    <Plus className="w-4 h-4" /> Add Hospital
                </button>
            </div>

            {showForm && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-lg font-bold mb-4">{editId ? 'Edit Hospital' : 'Add Hospital'}</h2>
                        {error && <div className="mb-4 p-3 bg-red-900/40 border border-red-800 rounded-lg text-sm text-red-300">{error}</div>}
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { k: 'hospitalId', label: 'Hospital ID*', ph: 'e.g. HOSP-MB-001' },
                                { k: 'name', label: 'Name*', ph: 'e.g. MB Hospital' },
                                { k: 'city', label: 'City*', ph: 'e.g. udaipur' },
                                { k: 'latitude', label: 'Latitude*', ph: 'e.g. 24.5854' },
                                { k: 'longitude', label: 'Longitude*', ph: 'e.g. 73.7125' },
                                { k: 'email', label: 'Email', ph: 'emergency@hospital.com' },
                                { k: 'phone', label: 'Phone', ph: '+91-294-XXXXXXX' },
                            ].map(({ k, label, ph }) => (
                                <div key={k}>
                                    <label className="text-xs text-gray-400 block mb-1">{label}</label>
                                    <input type="text" value={(form as Record<string, unknown>)[k] as string} placeholder={ph}
                                        onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                                        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500" />
                                </div>
                            ))}
                        </div>
                        <div className="mt-3">
                            <label className="text-xs text-gray-400 block mb-1">Address*</label>
                            <input type="text" value={form.address} placeholder="Full address"
                                onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white" />
                        </div>
                        <div className="flex gap-4 mt-4">
                            {[
                                { k: 'emergencyAvailable', label: 'Emergency Available' },
                                { k: 'traumaFacility', label: 'Trauma Facility' },
                                { k: 'ambulanceAvailable', label: 'Ambulance Available' },
                            ].map(({ k, label }) => (
                                <label key={k} className="flex items-center gap-2 cursor-pointer select-none">
                                    <input type="checkbox" checked={(form as Record<string, unknown>)[k] as boolean}
                                        onChange={e => setForm(p => ({ ...p, [k]: e.target.checked }))}
                                        className="w-4 h-4 accent-green-500" />
                                    <span className="text-xs text-gray-300">{label}</span>
                                </label>
                            ))}
                        </div>
                        <div className="flex gap-3 mt-5">
                            <button onClick={handleSave} disabled={saving}
                                className="flex-1 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-semibold disabled:opacity-50">
                                {saving ? 'Saving…' : (editId ? 'Update Hospital' : 'Create Hospital')}
                            </button>
                            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-gray-900 rounded-xl border border-gray-800">
                {loading ? (
                    <div className="p-12 text-center text-gray-400">Loading hospitals…</div>
                ) : hospitals.length === 0 ? (
                    <div className="p-12 text-center">
                        <Building2 className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                        <p className="text-gray-400">No hospitals yet</p>
                        <button onClick={openCreate} className="mt-3 px-4 py-2 bg-green-600 rounded-lg text-sm">Add First Hospital</button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-800 text-gray-400 text-xs">
                                    <th className="text-left py-3 px-4">ID</th>
                                    <th className="text-left py-3 px-4">Name</th>
                                    <th className="text-left py-3 px-4">City</th>
                                    <th className="text-left py-3 px-4">Email</th>
                                    <th className="text-left py-3 px-4">Emergency</th>
                                    <th className="text-left py-3 px-4">Trauma</th>
                                    <th className="text-left py-3 px-4">Active</th>
                                    <th className="text-left py-3 px-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {hospitals.map(h => (
                                    <tr key={h._id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                                        <td className="py-3 px-4 font-mono text-xs">{h.hospitalId}</td>
                                        <td className="py-3 px-4">{h.name}</td>
                                        <td className="py-3 px-4 text-gray-400 text-xs">{h.city}</td>
                                        <td className="py-3 px-4 text-xs text-gray-400">{h.email || '—'}</td>
                                        <td className="py-3 px-4">
                                            {h.emergencyAvailable
                                                ? <CheckCircle className="w-4 h-4 text-green-400" />
                                                : <XCircle className="w-4 h-4 text-gray-600" />}
                                        </td>
                                        <td className="py-3 px-4">
                                            {h.traumaFacility
                                                ? <CheckCircle className="w-4 h-4 text-blue-400" />
                                                : <XCircle className="w-4 h-4 text-gray-600" />}
                                        </td>
                                        <td className="py-3 px-4">
                                            <button onClick={() => handleToggle(h)} title={h.active ? 'Deactivate' : 'Activate'}
                                                className={`px-2 py-0.5 rounded text-xs font-medium ${h.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                                {h.active ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => openEdit(h)}>
                                                    <Edit2 className="w-4 h-4 text-gray-400 hover:text-blue-400" />
                                                </button>
                                                <button onClick={() => handleDelete(h._id, h.name)}>
                                                    <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
                                                </button>
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
