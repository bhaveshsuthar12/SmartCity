import { Request, Response, NextFunction } from 'express';
import { CameraService } from '../../services/accident/CameraService';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../utils/AppError';

export class CameraController {
    static async list(req: Request, res: Response, next: NextFunction) {
        try {
            const { city, status, enabled } = req.query;
            const cameras = await CameraService.listCameras({
                city: city as string,
                status: status as string,
                enabled: enabled === 'true' ? true : enabled === 'false' ? false : undefined,
            });
            sendSuccess(res, cameras, 'Cameras retrieved');
        } catch (err) { next(err); }
    }

    static async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const camera = await CameraService.getCameraById(req.params['id']!);
            sendSuccess(res, camera, 'Camera retrieved');
        } catch (err) { next(err); }
    }

    static async create(req: Request, res: Response, next: NextFunction) {
        try {
            const { cameraId, name, location, streamUrl, sourceType, city, fps, resolution } = req.body;
            if (!cameraId || !name || !location || !sourceType || !city) {
                throw AppError.badRequest('cameraId, name, location, sourceType and city are required');
            }
            if (!location.coordinates || location.coordinates.length !== 2) {
                throw AppError.badRequest('location.coordinates must be [longitude, latitude]');
            }
            const [lon, lat] = location.coordinates;
            if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
                throw AppError.badRequest('Invalid coordinates. Longitude must be -180..180, latitude -90..90');
            }
            const camera = await CameraService.createCamera({ cameraId, name, location, streamUrl, sourceType, city, fps, resolution });
            sendSuccess(res, camera, 'Camera created', 201);
        } catch (err) { next(err); }
    }

    static async update(req: Request, res: Response, next: NextFunction) {
        try {
            // Never allow streamUrl to be updated via a non-explicitly-privileged endpoint
            const { streamUrl, ...safeUpdates } = req.body;
            const allowStreamUrlUpdate = req.user?.role === 'SUPER_ADMIN' || req.user?.role === 'CITY_ADMIN';
            const updates = allowStreamUrlUpdate ? req.body : safeUpdates;
            const camera = await CameraService.updateCamera(req.params['id']!, updates);
            sendSuccess(res, camera, 'Camera updated');
        } catch (err) { next(err); }
    }

    static async remove(req: Request, res: Response, next: NextFunction) {
        try {
            await CameraService.deleteCamera(req.params['id']!);
            sendSuccess(res, null, 'Camera deleted');
        } catch (err) { next(err); }
    }

    static async toggleEnabled(req: Request, res: Response, next: NextFunction) {
        try {
            const enabled = !!req.body.enabled;
            const camera = await CameraService.toggleEnabled(req.params['id']!, enabled);
            sendSuccess(res, camera, `Camera ${enabled ? 'enabled' : 'disabled'}`);
        } catch (err) { next(err); }
    }

    static async test(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await CameraService.testCamera(req.params['id']!);
            sendSuccess(res, result, 'Camera test complete');
        } catch (err) { next(err); }
    }
}
