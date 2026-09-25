import 'dotenv/config';
import mongoose from 'mongoose';
import { AccidentAIEventService } from '../src/services/accident/AccidentAIEventService';
import { env } from '../src/config/env';

async function run() {
    await mongoose.connect(env.MONGODB_URI);
    const res = await AccidentAIEventService.processDetection({
        cameraId: 'CAM-DEMO-999',
        city: 'demo-city',
        accidentType: 'VEHICLE_COLLISION',
        confidence: 0.95,
        severity: 'HIGH',
        latitude: 24.5854,
        longitude: 73.7125,
        vehiclesDetected: 2,
        possiblePersons: 1
    });
    console.log(res);
    await mongoose.connection.close();
}
run();
