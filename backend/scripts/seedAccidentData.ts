import mongoose from 'mongoose';
import { env } from '../src/config/env';
import { AccidentCamera, AccidentHospital, AccidentIncident } from '../src/models';
import logger from '../src/utils/logger';

// Sample Udaipur Locations
const UDAIPUR_CITY = 'udaipur';

const CAMERAS = [
    {
        cameraId: 'CAM-UDA-CHETAK-01',
        name: 'Chetak Circle North View',
        city: UDAIPUR_CITY,
        sourceType: 'SIMULATION',
        location: { type: 'Point', coordinates: [73.6828, 24.5973], address: 'Chetak Circle, Udaipur' },
        fps: 30, resolution: '1920x1080', enabled: true, status: 'ONLINE',
    },
    {
        cameraId: 'CAM-UDA-SURP-01',
        name: 'Surajpole Intersection',
        city: UDAIPUR_CITY,
        sourceType: 'SIMULATION',
        location: { type: 'Point', coordinates: [73.6936, 24.5774], address: 'Surajpole, Udaipur' },
        fps: 30, resolution: '1920x1080', enabled: true, status: 'ONLINE',
    },
    {
        cameraId: 'CAM-UDA-FATEH-01',
        name: 'Fatehsagar Promenade',
        city: UDAIPUR_CITY,
        sourceType: 'SIMULATION',
        location: { type: 'Point', coordinates: [73.6775, 24.6025], address: 'Fatehsagar Lake Road, Udaipur' },
        fps: 24, resolution: '1280x720', enabled: true, status: 'ONLINE',
    },
    {
        cameraId: 'CAM-UDA-DELHI-01',
        name: 'Delhi Gate Chauraha',
        city: UDAIPUR_CITY,
        sourceType: 'SIMULATION',
        location: { type: 'Point', coordinates: [73.6895, 24.5854], address: 'Delhi Gate, Udaipur' },
        fps: 30, resolution: '1920x1080', enabled: true, status: 'ONLINE',
    },
    {
        cameraId: 'CAM-UDA-HWY-01',
        name: 'NH8 Bypass Exit',
        city: UDAIPUR_CITY,
        sourceType: 'SIMULATION',
        location: { type: 'Point', coordinates: [73.7125, 24.5699], address: 'NH8 Bypass, Udaipur' },
        fps: 60, resolution: '4K', enabled: true, status: 'ONLINE',
    }
];

const HOSPITALS = [
    {
        hospitalId: 'HOSP-UDA-MB-01',
        name: 'Maharana Bhupal (MB) Government Hospital',
        city: UDAIPUR_CITY,
        location: { type: 'Point', coordinates: [73.6853, 24.5947] },
        address: 'Hospital Road, Chetak Circle, Udaipur',
        email: 'emergency.mb@example.com',
        phone: '+91-294-2428811',
        emergencyAvailable: true, traumaFacility: true, ambulanceAvailable: true, active: true,
    },
    {
        hospitalId: 'HOSP-UDA-GBH-01',
        name: 'GBH American Hospital',
        city: UDAIPUR_CITY,
        location: { type: 'Point', coordinates: [73.7021, 24.5829] },
        address: 'Meera Girls College Road, Udaipur',
        email: 'er.gbh@example.com',
        phone: '+91-294-2426000',
        emergencyAvailable: true, traumaFacility: true, ambulanceAvailable: true, active: true,
    },
    {
        hospitalId: 'HOSP-UDA-PACIFIC-01',
        name: 'Pacific Medical College & Hospital',
        city: UDAIPUR_CITY,
        location: { type: 'Point', coordinates: [73.7431, 24.5501] },
        address: 'Bhilon Ka Bedla, Pratap Pura, Udaipur',
        email: 'trauma.pacific@example.com',
        phone: '+91-294-3920000',
        emergencyAvailable: true, traumaFacility: true, ambulanceAvailable: true, active: true,
    },
    {
        hospitalId: 'HOSP-UDA-GEET-01',
        name: 'Geetanjali Medical College & Hospital',
        city: UDAIPUR_CITY,
        location: { type: 'Point', coordinates: [73.7259, 24.5386] },
        address: 'Hiranmagri Extension, Manwakhera, Udaipur',
        email: 'rescue.geetanjali@example.com',
        phone: '+91-294-2500000',
        emergencyAvailable: true, traumaFacility: true, ambulanceAvailable: true, active: true,
    },
    {
        hospitalId: 'HOSP-UDA-SANJIV-01',
        name: 'Sanjivani Multispeciality Hospital',
        city: UDAIPUR_CITY,
        location: { type: 'Point', coordinates: [73.6912, 24.5714] },
        address: 'Sector 3, Hiran Magri, Udaipur',
        email: 'info.sanjivani@example.com',
        phone: '+91-294-2464646',
        emergencyAvailable: true, traumaFacility: false, ambulanceAvailable: true, active: true,
    }
];

async function seedAccidents() {
    try {
        await mongoose.connect(env.MONGODB_URI);
        logger.info('Connected to MongoDB for Accident Module Seed');

        // Upsert Cameras
        let cameraCount = 0;
        for (const cam of CAMERAS) {
            await AccidentCamera.findOneAndUpdate(
                { cameraId: cam.cameraId },
                { $set: cam },
                { upsert: true, new: true }
            );
            cameraCount++;
        }
        logger.info(`✅ Upserted ${cameraCount} accident cameras`);

        // Upsert Hospitals
        let hospitalCount = 0;
        for (const hosp of HOSPITALS) {
            await AccidentHospital.findOneAndUpdate(
                { hospitalId: hosp.hospitalId },
                { $set: hosp },
                { upsert: true, new: true }
            );
            hospitalCount++;
        }
        logger.info(`✅ Upserted ${hospitalCount} accident hospitals`);

        // Optionally, clear some old test incidents if desired
        // const delRes = await AccidentIncident.deleteMany({ incidentId: { $regex: /^ACC-DEMO/ } });
        // logger.info(`✅ Cleared ${delRes.deletedCount} old demo incidents`);

        logger.info('🎉 Accident system seed completed successfully!');
        process.exit(0);

    } catch (error) {
        logger.error('Failed to seed accident system:', error);
        process.exit(1);
    }
}

seedAccidents();
