import { Request, Response, NextFunction } from 'express';
import { AccidentService } from '../../services/accident/AccidentService';
import { sendSuccess } from '../../utils/response';

export class AnalyticsController {
    static async getAnalytics(req: Request, res: Response, next: NextFunction) {
        try {
            const city = (req.query['city'] as string) ||
                (req.user?.role !== 'SUPER_ADMIN' ? req.user?.cityId || '' : '');
            const analytics = await AccidentService.getAnalytics(city);
            sendSuccess(res, analytics, 'Analytics retrieved');
        } catch (err) { next(err); }
    }

    static async getHotspots(req: Request, res: Response, next: NextFunction) {
        try {
            const city = (req.query['city'] as string) ||
                (req.user?.role !== 'SUPER_ADMIN' ? req.user?.cityId || '' : '');
            const analytics = await AccidentService.getAnalytics(city);
            sendSuccess(res, analytics.hotspots, 'Hotspots retrieved');
        } catch (err) { next(err); }
    }
}
