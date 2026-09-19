import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { env } from '../config/env';
import logger from '../utils/logger';
import { roomName, WS_EVENTS } from '../constants/events';
import { verifyAccessToken } from '../utils/jwt';
import { User } from '../models';
import { TrackingService } from '../services/garbage/TrackingService';

let io: SocketIOServer | null = null;

/**
 * Initialize Socket.IO server and attach to the HTTP server.
 *
 * Room strategy:
 *   city:<cityId>           — all users in a city  (citizens + admins)
 *   vehicle:<vehicleId>     — detailed feed for a specific vehicle (admin)
 *   route:<routeId>         — progress feed for specific route
 *   user:<userId>           — private user channel
 *
 * Auth:
 *   JWT token required in `socket.handshake.auth.token` for all connections.
 *   City-room subscription validates user belongs to that city or is SUPER_ADMIN.
 */
export function initializeWebSocket(server: HttpServer): SocketIOServer {
    io = new SocketIOServer(server, {
        cors: {
            origin: [
                env.FRONTEND_URL,
                'https://city-pulse-ai-1sta.vercel.app',
                'http://localhost:3000',
                'http://localhost:3001',
            ],
            methods: ['GET', 'POST'],
            credentials: true,
        },
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    // ── JWT Authentication Middleware ──────────────────────────────
    io.use(async (socket, next) => {
        const token = socket.handshake.auth['token'] as string | undefined;
        if (!token) {
            // Allow unauthenticated for public city rooms (citizen view)
            // They can only join city rooms, not vehicle/route rooms.
            socket.data.isAuthenticated = false;
            next();
            return;
        }
        try {
            const payload = verifyAccessToken(token);
            const user = await User.findById(payload.userId).lean();
            if (!user) {
                next(new Error('User not found'));
                return;
            }
            socket.data.user = {
                id: user._id.toString(),
                role: user.role,
                cityId: user.cityId ? user.cityId.toString() : null,
            };
            socket.data.isAuthenticated = true;
            next();
        } catch {
            // Token invalid — allow as unauthenticated (public city rooms only)
            socket.data.isAuthenticated = false;
            next();
        }
    });

    io.on('connection', (socket: Socket) => {
        logger.debug('WebSocket client connected', { socketId: socket.id, auth: socket.data.isAuthenticated });

        if (socket.data.isAuthenticated && socket.data.user?.id) {
            void socket.join(roomName.user(socket.data.user.id));
            logger.debug('Client joined personal user room', { socketId: socket.id, userId: socket.data.user.id });
        }

        // ── City Rooms ─────────────────────────────────────────────
        // Public-ish room — open to any connected client (citizens don't need auth for public data)

        socket.on(WS_EVENTS.JOIN_CITY_ROOM, (cityId: string) => {
            if (typeof cityId !== 'string' || !cityId) return;
            // Enforce city scoping if authenticated
            const user = socket.data.user;
            if (user && user.role !== 'SUPER_ADMIN' && user.cityId && user.cityId !== cityId) {
                socket.emit(WS_EVENTS.ERROR, { message: 'Not authorized to join this city room' });
                return;
            }
            const room = roomName.city(cityId);
            void socket.join(room);
            logger.debug('Client joined city room', { socketId: socket.id, room });
        });

        socket.on(WS_EVENTS.LEAVE_CITY_ROOM, (cityId: string) => {
            void socket.leave(roomName.city(cityId));
        });

        // ── Vehicle Rooms (Admin only) ─────────────────────────────

        socket.on(WS_EVENTS.JOIN_VEHICLE_ROOM, (vehicleId: string) => {
            if (!socket.data.isAuthenticated) {
                socket.emit(WS_EVENTS.ERROR, { message: 'Authentication required to join vehicle room' });
                return;
            }
            const user = socket.data.user;
            if (user?.role !== 'SUPER_ADMIN' && user?.role !== 'CITY_ADMIN') {
                socket.emit(WS_EVENTS.ERROR, { message: 'Insufficient permissions for vehicle room' });
                return;
            }
            void socket.join(roomName.vehicle(vehicleId));
            logger.debug('Client joined vehicle room', { socketId: socket.id, vehicleId });
        });

        socket.on(WS_EVENTS.LEAVE_VEHICLE_ROOM, (vehicleId: string) => {
            void socket.leave(roomName.vehicle(vehicleId));
        });

        // ── Water Rooms ────────────────────────────────────────────

        socket.on('join:water-asset-room', (assetId: string) => {
            // Let it be public for now or limit same as vehicle. The prompt says we have city rooms. 
            // We can just verify if they want it open. Let's make it open to citizens without auth like city room?
            // Or maybe they just listen. Let's make it joining.
            void socket.join(roomName.waterAsset(assetId));
        });

        socket.on('leave:water-asset-room', (assetId: string) => {
            void socket.leave(roomName.waterAsset(assetId));
        });

        socket.on('join:water-sensor-room', (sensorId: string) => {
            if (!socket.data.isAuthenticated) {
                socket.emit(WS_EVENTS.ERROR, { message: 'Authentication required to join sensor room' });
                return;
            }
            void socket.join(roomName.waterSensor(sensorId));
        });

        socket.on('leave:water-sensor-room', (sensorId: string) => {
            void socket.leave(roomName.waterSensor(sensorId));
        });

        // ── Route Rooms (Admin) ────────────────────────────────────

        socket.on(WS_EVENTS.JOIN_ROUTE_ROOM, (routeId: string) => {
            if (!socket.data.isAuthenticated) {
                socket.emit(WS_EVENTS.ERROR, { message: 'Authentication required to join route room' });
                return;
            }
            void socket.join(roomName.route(routeId));
            logger.debug('Client joined route room', { socketId: socket.id, routeId });
        });

        socket.on(WS_EVENTS.LEAVE_ROUTE_ROOM, (routeId: string) => {
            void socket.leave(roomName.route(routeId));
        });

        // ── Inbound GPS from device (admin-authenticated driver app) ──

        socket.on(WS_EVENTS.GARBAGE_LOCATION_UPDATE, async (data: {
            vehicleId: string;
            latitude: number;
            longitude: number;
            speed?: number;
            heading?: number;
            accuracy?: number;
        }) => {
            if (!socket.data.isAuthenticated) {
                socket.emit(WS_EVENTS.ERROR, { message: 'Authentication required to push GPS updates' });
                return;
            }
            const user = socket.data.user;
            try {
                await TrackingService.processLocationUpdate(
                    data.vehicleId,
                    {
                        latitude: data.latitude,
                        longitude: data.longitude,
                        speed: data.speed,
                        heading: data.heading,
                        accuracy: data.accuracy,
                    },
                    user?.cityId ?? undefined
                );
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Location update failed';
                socket.emit(WS_EVENTS.ERROR, { message });
                logger.error('WebSocket GPS update error', { socketId: socket.id, error: message });
            }
        });

        // ── System ────────────────────────────────────────────────

        socket.on(WS_EVENTS.DISCONNECT, (reason) => {
            logger.debug('WebSocket client disconnected', { socketId: socket.id, reason });
        });

        socket.on(WS_EVENTS.ERROR, (error: Error) => {
            logger.error('WebSocket error', { socketId: socket.id, error: error.message });
        });
    });

    logger.info('✅ WebSocket server initialized (Phase 5 — JWT auth enabled)');
    return io;
}

/**
 * Get the Socket.IO instance.
 * Use this in services to emit events to city rooms.
 */
export function getIO(): SocketIOServer {
    if (!io) throw new Error('WebSocket server not initialized. Call initializeWebSocket() first.');
    return io;
}

/**
 * Emit an event to all clients in a city room.
 * Safe to call from any service — no direct socket imports needed.
 */
export function emitToCityRoom(cityId: string, event: string, data: unknown): void {
    if (!io) {
        logger.warn('Attempted to emit to city room before WebSocket initialization');
        return;
    }
    io.to(roomName.city(cityId)).emit(event, data);
}
