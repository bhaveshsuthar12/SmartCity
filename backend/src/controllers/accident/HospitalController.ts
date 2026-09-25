import { Request, Response, NextFunction } from 'express';
import { HospitalService } from '../../services/accident/HospitalService';
import { sendSuccess } from '../../utils/response';
import { AppError } from '../../utils/AppError';

export class HospitalController {
    static async list(req: Request, res: Response, next: NextFunction) {
        try {
            const { city, active, emergencyAvailable } = req.query;
            const hospitals = await HospitalService.listHospitals({
                city: city as string,
                active: active === 'true' ? true : active === 'false' ? false : undefined,
                emergencyAvailable: emergencyAvailable === 'true' ? true : emergencyAvailable === 'false' ? false : undefined,
            });
            sendSuccess(res, hospitals, 'Hospitals retrieved');
        } catch (err) { next(err); }
    }

    static async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const hospital = await HospitalService.getHospitalById(req.params['id']!);
            sendSuccess(res, hospital, 'Hospital retrieved');
        } catch (err) { next(err); }
    }

    static async create(req: Request, res: Response, next: NextFunction) {
        try {
            const { hospitalId, name, address, city, location, email, phone, emergencyAvailable, traumaFacility, ambulanceAvailable } = req.body;
            if (!hospitalId || !name || !address || !city || !location) {
                throw AppError.badRequest('hospitalId, name, address, city, and location are required');
            }
            if (!location.coordinates || location.coordinates.length !== 2) {
                throw AppError.badRequest('location.coordinates must be [longitude, latitude]');
            }
            const [lon, lat] = location.coordinates;
            if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
                throw AppError.badRequest('Invalid coordinates');
            }
            const hospital = await HospitalService.createHospital({
                hospitalId, name, address, city, location, email, phone,
                emergencyAvailable: emergencyAvailable !== false,
                traumaFacility: !!traumaFacility,
                ambulanceAvailable: ambulanceAvailable !== false,
            });
            sendSuccess(res, hospital, 'Hospital created', 201);
        } catch (err) { next(err); }
    }

    static async update(req: Request, res: Response, next: NextFunction) {
        try {
            const hospital = await HospitalService.updateHospital(req.params['id']!, req.body);
            sendSuccess(res, hospital, 'Hospital updated');
        } catch (err) { next(err); }
    }

    static async remove(req: Request, res: Response, next: NextFunction) {
        try {
            await HospitalService.deleteHospital(req.params['id']!);
            sendSuccess(res, null, 'Hospital deleted');
        } catch (err) { next(err); }
    }

    static async toggleActive(req: Request, res: Response, next: NextFunction) {
        try {
            const active = !!req.body.active;
            const hospital = await HospitalService.toggleActive(req.params['id']!, active);
            sendSuccess(res, hospital, `Hospital ${active ? 'activated' : 'deactivated'}`);
        } catch (err) { next(err); }
    }
}
