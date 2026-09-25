import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { Role } from '../../constants/roles';
import { CameraController } from '../../controllers/accident/CameraController';
import { AccidentController } from '../../controllers/accident/AccidentController';
import { HospitalController } from '../../controllers/accident/HospitalController';
import { AnalyticsController } from '../../controllers/accident/AnalyticsController';
import { DemoController } from '../../controllers/accident/DemoController';
import { AIEventController } from '../../controllers/accident/AIEventController';

const router = Router();
const adminOnly = [authenticate, requireRole(Role.SUPER_ADMIN, Role.CITY_ADMIN)];

// ── CAMERAS ──────────────────────────────────────────────────────────────────
router.get('/admin/cameras', ...adminOnly, CameraController.list);
router.post('/admin/cameras', ...adminOnly, CameraController.create);
router.get('/admin/cameras/:id', ...adminOnly, CameraController.getById);
router.patch('/admin/cameras/:id', ...adminOnly, CameraController.update);
router.delete('/admin/cameras/:id', ...adminOnly, CameraController.remove);
router.post('/admin/cameras/:id/test', ...adminOnly, CameraController.test);

// ── ACCIDENTS ─────────────────────────────────────────────────────────────────
// Analytics/hotspots MUST be before /:id to avoid route conflict
router.get('/admin/accidents/analytics', ...adminOnly, AnalyticsController.getAnalytics);
router.get('/admin/accidents/hotspots', ...adminOnly, AnalyticsController.getHotspots);

router.get('/admin/accidents', ...adminOnly, AccidentController.list);
router.post('/admin/accidents', ...adminOnly, AccidentController.create);
router.get('/admin/accidents/:id', ...adminOnly, AccidentController.getById);
router.patch('/admin/accidents/:id', ...adminOnly, AccidentController.update);

// Status transitions
router.post('/admin/accidents/:id/verify', ...adminOnly, AccidentController.verify);
router.post('/admin/accidents/:id/confirm', ...adminOnly, AccidentController.confirm);
router.post('/admin/accidents/:id/false-positive', ...adminOnly, AccidentController.markFalsePositive);
router.post('/admin/accidents/:id/notify-hospital', ...adminOnly, AccidentController.notifyHospital);
router.post('/admin/accidents/:id/resolve', ...adminOnly, AccidentController.resolve);

// ── HOSPITALS ─────────────────────────────────────────────────────────────────
router.get('/admin/hospitals', ...adminOnly, HospitalController.list);
router.post('/admin/hospitals', ...adminOnly, HospitalController.create);
router.get('/admin/hospitals/:id', ...adminOnly, HospitalController.getById);
router.patch('/admin/hospitals/:id', ...adminOnly, HospitalController.update);
router.delete('/admin/hospitals/:id', ...adminOnly, HospitalController.remove);

// ── DEMO ──────────────────────────────────────────────────────────────────────
router.post('/admin/demo/accident', ...adminOnly, DemoController.createDemoAccident);

// ── AI EVENT (machine-to-machine, uses X-AI-Secret not JWT) ──────────────────
router.post('/ai/accident-events', AIEventController.receiveDetection);

export default router;
