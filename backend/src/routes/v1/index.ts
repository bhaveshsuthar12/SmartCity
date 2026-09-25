import { Router } from 'express';
import healthRoutes from './health.routes';
import citiesRoutes from './cities.routes';
import authRoutes from './auth.routes';
import adminRoutes from './admin.routes';
import cityAdminsRoutes from './city-admins.routes';
import citizenAuthRoutes from './citizen.auth.routes';
import citizenProfileRoutes from './citizen.profile.routes';
import garbageRoutes from './garbage.routes';
import trackingRoutes from './tracking.routes';
import publicGarbageRoutes from './publicGarbage.routes';

const router = Router();

/**
 * SmartCity 360 API v1 Router
 *
 * Mounted at: /api/v1
 */

router.use('/health', healthRoutes);
router.use('/auth/citizen', citizenAuthRoutes);
router.use('/auth', authRoutes);
router.use('/citizen', citizenProfileRoutes);
router.use('/cities', citiesRoutes);
router.use('/admin', adminRoutes);
router.use('/city-admins', cityAdminsRoutes);
// Phase 5 — Live Tracking
router.use('/garbage/public', publicGarbageRoutes);
router.use('/garbage', garbageRoutes);
router.use('/garbage', trackingRoutes);

// Phase 6 - Water Management
import waterRoutes from './water.routes';
router.use('/water', waterRoutes);

// Phase 7 - Electricity Management
import electricityRoutes from './electricity.routes';
router.use('/electricity', electricityRoutes);

// Phase 8 - Traffic Management
import trafficRoutes from './traffic.routes';
router.use('/traffic', trafficRoutes);

// Phase 9 - EV Management
import evRoutes from './ev.routes';
router.use('/ev', evRoutes);

// Phase 10 - Streetlight Management
import streetlightRoutes from './streetlight.routes';
router.use('/streetlights', streetlightRoutes);

// Phase 11 - Reports Management
import reportRoutes from './report.routes';
router.use('/reports', reportRoutes);

// Phase 12 - Notifications
import notificationRoutes from './notification.routes';
import adminNotificationRoutes from './adminNotification.routes';
import analyticsRoutes from './analytics.routes';
import intelligenceRoutes from './intelligence.routes';
import digitalTwinRoutes from './digitalTwin.routes';

router.use('/notifications', notificationRoutes);
router.use('/admin/notifications', adminNotificationRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/intelligence', intelligenceRoutes);
router.use('/digital-twin', digitalTwinRoutes);

// Phase 14 - Emergency Response
import emergencyRoutes from './emergency.routes';
router.use('/emergency', emergencyRoutes);

// Phase 21 - Accident Response System (Cameras, Incidents, Hospitals, AI Detection)
import accidentRoutes from './accident.routes';
router.use('/', accidentRoutes);

// Phase 18 - Predictive Maintenance & AI Registry
import aiModelRoutes from './aiModel.routes';
import aiPredictionRoutes from './aiPrediction.routes';
import iotRoutes from './iot.routes';
import optimizationRoutes from './optimization.routes';
import { AIPredictionController } from '../../controllers/admin/AIPredictionController';
import { authenticate, requireRole } from '../../middleware/auth';
import { Role } from '../../constants/roles';

router.use('/ai/models', aiModelRoutes);
router.use('/predictions', aiPredictionRoutes);

// Phase 19 - IoT Ingestion & Admin
router.use('/iot', iotRoutes);

router.use('/optimization', optimizationRoutes);

router.get('/predictive-maintenance', authenticate, requireRole(Role.SUPER_ADMIN, Role.CITY_ADMIN), AIPredictionController.getPredictiveMaintenance);

export default router;
