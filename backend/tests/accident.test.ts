import 'dotenv/config';
import mongoose from 'mongoose';
import { AccidentAIEventService } from '../src/services/accident/AccidentAIEventService';
import { CameraService } from '../src/services/accident/CameraService';
import { HospitalService } from '../src/services/accident/HospitalService';
import { AccidentCamera, AccidentHospital, AccidentIncident } from '../src/models';

describe('Accident Response System Integration Tests', () => {
    const testCity = 'test-city';

    beforeAll(async () => {
        const mongoUri = process.env.MONGODB_URI as string;
        await mongoose.connect(mongoUri);
    });

    afterAll(async () => {
        // Ensure we clean up test data if possible, but since we are inserting on a real database, let's just delete what we created
        await AccidentCamera.deleteMany({ city: testCity });
        await AccidentHospital.deleteMany({ city: testCity });
        await AccidentIncident.deleteMany({ city: testCity });
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        await AccidentCamera.deleteMany({ city: testCity });
        await AccidentHospital.deleteMany({ city: testCity });
        await AccidentIncident.deleteMany({ city: testCity });
    });

    describe('Camera and Hospital System Ecosystem', () => {
        it('should correctly store and retrieve a test camera', async () => {
            const camInfo = {
                cameraId: 'TEST-CAM-01',
                name: 'Test Cam A',
                city: testCity,
                location: { type: 'Point' as const, coordinates: [73.0, 24.0] as [number, number] },
                sourceType: 'SIMULATION' as const
            };

            const created = await CameraService.createCamera(camInfo);
            expect(created.cameraId).toBe('TEST-CAM-01');
            expect(created.status).toBe('ONLINE');
        });

        it('should rank finding nearest hospital for emergency', async () => {
            const h1 = await HospitalService.createHospital({
                hospitalId: 'TEST-HOSP-1',
                name: 'Hosp 1',
                city: testCity,
                location: { type: 'Point', coordinates: [73.001, 24.001] },
                address: 'addr 1',
                emergencyAvailable: true, traumaFacility: true, ambulanceAvailable: true, active: true
            });

            const h2 = await HospitalService.createHospital({
                hospitalId: 'TEST-HOSP-2',
                name: 'Hosp 2',
                city: testCity,
                location: { type: 'Point', coordinates: [73.010, 24.010] },
                address: 'addr 2',
                emergencyAvailable: true, traumaFacility: true, ambulanceAvailable: true, active: true
            });

            const camLonLat = [73.0, 24.0] as [number, number];
            const nearest = await HospitalService.findNearestSuitableHospital(camLonLat[0], camLonLat[1]);

            expect(nearest).toBeDefined();
            expect(nearest?.hospital.hospitalId).toBe('TEST-HOSP-1');
            expect(nearest?.distanceMeters).toBeGreaterThan(0);
        });
    });

    describe('AI Event Processing Pipeline', () => {
        const testCamId = 'AI-CAM-01';

        beforeEach(async () => {
            await CameraService.createCamera({
                cameraId: testCamId,
                name: 'AI Test Cam',
                city: testCity,
                location: { type: 'Point' as const, coordinates: [73.0, 24.0] as [number, number] },
                sourceType: 'SIMULATION' as const
            });
            await HospitalService.createHospital({
                hospitalId: 'AI-HOSP-1',
                name: 'AI Hosp',
                city: testCity,
                location: { type: 'Point', coordinates: [73.001, 24.001] },
                address: 'ai addr',
                emergencyAvailable: true, traumaFacility: true, ambulanceAvailable: true, active: true
            });
        });

        it('should reject low confidence events', async () => {
            const result = await AccidentAIEventService.processDetection({
                cameraId: testCamId,
                city: testCity,
                accidentType: 'VEHICLE_COLLISION',
                confidence: 0.50, // Low confidence (< 0.70)
                severity: 'LOW',
                latitude: 24.0,
                longitude: 73.0,
                detectedAt: new Date().toISOString()
            });

            expect(result.processed).toBe(false);
            expect(result.reason).toContain('below threshold');
        });

        it('should create VERIFYING incidents for medium confidence', async () => {
            const result = await AccidentAIEventService.processDetection({
                cameraId: testCamId,
                city: testCity,
                accidentType: 'VEHICLE_COLLISION',
                confidence: 0.85, // Medium confidence
                severity: 'MEDIUM',
                latitude: 24.0,
                longitude: 73.0,
                detectedAt: new Date().toISOString()
            });

            expect(result.processed).toBe(true);
            const incident = await AccidentIncident.findOne({ incidentId: result.incidentId });
            expect(incident).toBeDefined();
            expect(incident?.status).toBe('VERIFYING');

            // Duplicate detection check
            const dupResult = await AccidentAIEventService.processDetection({
                cameraId: testCamId,
                city: testCity,
                accidentType: 'VEHICLE_COLLISION',
                confidence: 0.86,
                severity: 'MEDIUM',
                latitude: 24.0, // Same location
                longitude: 73.0,
                detectedAt: new Date().toISOString()
            });
            // If it's a duplicate, it usually returns processed=true and isDuplicate=true
            // or we just assert properties
            expect(dupResult.isDuplicate).toBe(true);
        });
    });
});
