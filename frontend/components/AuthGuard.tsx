'use client';
import { useAuth } from '../hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { LogOut, Map, Users, Shield, Truck, ClipboardList, User, AlertTriangle, Camera, Building2, BarChart3 } from 'lucide-react';
import { NotificationBell } from './ui/NotificationBell';
import { CityPulseLogo } from './ui/CityPulseLogo';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    const isAuthPage = pathname === '/admin/login' || pathname === '/admin/register';

    useEffect(() => {
        if (!loading && !user && !isAuthPage) {
            router.push('/admin/login');
        }
        if (!loading && user && isAuthPage) {
            router.push('/admin');
        }
    }, [user, loading, isAuthPage, router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-900"></div>
            </div>
        );
    }

    if (!user) {
        return <>{children}</>;
    }

    if (isAuthPage) return <>{children}</>;

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar */}
            <div className="w-64 bg-slate-900 text-white shadow-xl flex flex-col">
                <div className="p-5 border-b border-slate-800">
                    <Link href="/admin" className="block group">
                        <CityPulseLogo variant="full" theme="dark" size="sm" showTagline={true} />
                    </Link>
                </div>

                <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                    <Link href="/admin" className={`flex items-center px-3 py-2.5 rounded-lg transition-colors ${pathname === '/admin' ? 'bg-blue-600/20 text-blue-400 font-semibold' : 'hover:bg-slate-800 text-slate-300 hover:text-white'}`}>
                        <Shield className="w-5 h-5 mr-3 opacity-70" /> Dashboard
                    </Link>

                    <Link href="/admin/profile" className={`flex items-center px-3 py-2.5 rounded-lg transition-colors ${pathname === '/admin/profile' ? 'bg-blue-600/20 text-blue-400 font-semibold' : 'hover:bg-slate-800 text-slate-300 hover:text-white'}`}>
                        <User className="w-5 h-5 mr-3 opacity-70" /> Admin Profile
                    </Link>

                    <Link href="/admin/garbage" className={`flex items-center px-3 py-2.5 rounded-lg transition-colors ${pathname === '/admin/garbage' ? 'bg-blue-600/20 text-blue-400 font-semibold' : 'hover:bg-slate-800 text-slate-300 hover:text-white'}`}>
                        <Truck className="w-5 h-5 mr-3 opacity-70" /> Garbage Ops
                    </Link>

                    <Link href="/admin/garbage/live" className={`flex items-center px-3 py-2.5 rounded-lg transition-colors ${pathname === '/admin/garbage/live' ? 'bg-blue-600/20 text-blue-400 font-semibold' : 'hover:bg-slate-800 text-slate-300 hover:text-white'}`}>
                        <span className="mr-3 text-base leading-none">📡</span> Live Tracking
                    </Link>

                    <Link href="/admin/water" className={`flex items-center px-3 py-2.5 rounded-lg transition-colors ${pathname === '/admin/water' ? 'bg-blue-600/20 text-blue-400 font-semibold' : 'hover:bg-slate-800 text-slate-300 hover:text-white'}`}>
                        <span className="mr-3 text-base leading-none">💧</span> Water Ops
                    </Link>

                    <Link href="/admin/electricity" className={`flex items-center px-3 py-2.5 rounded-lg transition-colors ${pathname === '/admin/electricity' ? 'bg-blue-600/20 text-blue-400 font-semibold' : 'hover:bg-slate-800 text-slate-300 hover:text-white'}`}>
                        <span className="mr-3 text-base leading-none">⚡</span> Electricity Ops
                    </Link>

                    <Link href="/admin/traffic" className={`flex items-center px-3 py-2.5 rounded-lg transition-colors ${pathname === '/admin/traffic' ? 'bg-blue-600/20 text-blue-400 font-semibold' : 'hover:bg-slate-800 text-slate-300 hover:text-white'}`}>
                        <span className="mr-3 text-base leading-none">🚥</span> Traffic Ops
                    </Link>

                    <Link href="/admin/ev" className={`flex items-center px-3 py-2.5 rounded-lg transition-colors ${pathname === '/admin/ev' ? 'bg-blue-600/20 text-blue-400 font-semibold' : 'hover:bg-slate-800 text-slate-300 hover:text-white'}`}>
                        <span className="mr-3 text-base leading-none">🔋</span> EV Networks
                    </Link>

                    <Link href="/admin/streetlights" className={`flex items-center px-3 py-2.5 rounded-lg transition-colors ${pathname === '/admin/streetlights' ? 'bg-blue-600/20 text-blue-400 font-semibold' : 'hover:bg-slate-800 text-slate-300 hover:text-white'}`}>
                        <Users className="w-5 h-5 mr-3 opacity-70" /> Streetlights
                    </Link>

                    <Link href="/admin/reports" className={`flex items-center px-3 py-2.5 rounded-lg transition-colors ${pathname === '/admin/reports' ? 'bg-blue-600/20 text-blue-400 font-semibold' : 'hover:bg-slate-800 text-slate-300 hover:text-white'}`}>
                        <ClipboardList className="w-5 h-5 mr-3 opacity-70" /> Manage Reports
                    </Link>

                    {/* Accident Response */}
                    <div className="pt-2">
                        <p className="px-3 text-[10px] text-slate-500 uppercase tracking-widest mb-1">Accident Response</p>
                        <Link href="/admin/accidents" className={`flex items-center px-3 py-2 rounded-lg transition-colors text-sm ${pathname === '/admin/accidents' ? 'bg-red-600/20 text-red-400 font-semibold' : 'hover:bg-slate-800 text-slate-300 hover:text-white'}`}>
                            <AlertTriangle className="w-4 h-4 mr-3 opacity-70" /> Dashboard
                        </Link>
                        <Link href="/admin/accidents/cameras" className={`flex items-center px-3 py-2 rounded-lg transition-colors text-sm ${pathname.startsWith('/admin/accidents/cameras') ? 'bg-blue-600/20 text-blue-400 font-semibold' : 'hover:bg-slate-800 text-slate-300 hover:text-white'}`}>
                            <Camera className="w-4 h-4 mr-3 opacity-70" /> Cameras
                        </Link>
                        <Link href="/admin/accidents/hospitals" className={`flex items-center px-3 py-2 rounded-lg transition-colors text-sm ${pathname.startsWith('/admin/accidents/hospitals') ? 'bg-green-600/20 text-green-400 font-semibold' : 'hover:bg-slate-800 text-slate-300 hover:text-white'}`}>
                            <Building2 className="w-4 h-4 mr-3 opacity-70" /> Hospitals
                        </Link>
                        <Link href="/admin/accidents/analytics" className={`flex items-center px-3 py-2 rounded-lg transition-colors text-sm ${pathname.startsWith('/admin/accidents/analytics') ? 'bg-purple-600/20 text-purple-400 font-semibold' : 'hover:bg-slate-800 text-slate-300 hover:text-white'}`}>
                            <BarChart3 className="w-4 h-4 mr-3 opacity-70" /> Analytics
                        </Link>
                    </div>

                    {user.role === 'SUPER_ADMIN' && (
                        <>
                            <Link href="/admin/cities" className={`flex items-center px-3 py-2.5 rounded-lg transition-colors ${pathname === '/admin/cities' ? 'bg-blue-600/20 text-blue-400 font-semibold' : 'hover:bg-slate-800 text-slate-300 hover:text-white'}`}>
                                <Map className="w-5 h-5 mr-3 opacity-70" /> Cities
                            </Link>
                            <Link href="/admin/city-admins" className={`flex items-center px-3 py-2.5 rounded-lg transition-colors ${pathname === '/admin/city-admins' ? 'bg-blue-600/20 text-blue-400 font-semibold' : 'hover:bg-slate-800 text-slate-300 hover:text-white'}`}>
                                <Users className="w-5 h-5 mr-3 opacity-70" /> City Admins
                            </Link>
                        </>
                    )}
                </nav>

                <div className="p-4 border-t border-slate-800 bg-slate-900/80">
                    <Link href="/admin/profile" className="flex items-center mb-3 px-1 group p-1.5 rounded-xl hover:bg-slate-800/80 transition-all">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center font-bold text-xs uppercase shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                            {user.firstName[0]}{user.lastName[0]}
                        </div>
                        <div className="ml-3 overflow-hidden">
                            <p className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors truncate">{user.firstName} {user.lastName}</p>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                <p className="text-[11px] text-slate-400 truncate">{user.role}</p>
                            </div>
                        </div>
                    </Link>
                    <button
                        onClick={() => logout()}
                        className="w-full flex items-center justify-center px-4 py-2 bg-slate-800 hover:bg-red-500/15 hover:text-red-400 text-slate-300 rounded-lg transition-colors text-sm font-medium"
                    >
                        <LogOut className="w-4 h-4 mr-2" /> Log out
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 shadow-sm z-10">
                    <div className="flex items-center gap-3">
                        <h2 className="text-slate-800 font-semibold">{user.role === 'CITY_ADMIN' && user.cityId ? 'City Admin Zone' : 'Global Platform Control'}</h2>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200/60 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Live System
                        </span>
                    </div>
                    <div className="flex items-center space-x-4">
                        <NotificationBell isAdmin={true} />
                        <Link
                            href="/admin/profile"
                            className="flex items-center gap-2 pl-3 pr-3.5 py-1.5 rounded-xl border border-slate-200 hover:border-blue-400/50 hover:bg-slate-50 transition-all text-sm text-slate-700 font-medium shadow-sm"
                        >
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                                {user.firstName[0]}{user.lastName[0]}
                            </div>
                            <span className="hidden sm:inline text-xs font-semibold text-slate-700">Admin Profile</span>
                        </Link>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-8">
                    <div className="max-w-6xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
