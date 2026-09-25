import { AccidentCamera, IAccidentCamera } from '../../models/AccidentCamera';
import { AppError } from '../../utils/AppError';
import logger from '../../utils/logger';

export class CameraService {
    /**
     * List all cameras. By default, streamUrl is excluded (sensitive RTSP credentials).
     */
    static async listCameras(filters: { city?: string; status?: string; enabled?: boolean } = {}) {
        const query: Record<string, unknown> = {};
        if (filters.city) query['city'] = filters.city;
        if (filters.status) query['status'] = filters.status;
        if (filters.enabled !== undefined) query['enabled'] = filters.enabled;

        return AccidentCamera.find(query).sort({ cameraId: 1 });
    }

    static async getCameraById(id: string) {
        const camera = await AccidentCamera.findById(id);
        if (!camera) throw AppError.notFound(`Camera not found: ${id}`);
        return camera;
    }

    static async getCameraByCode(cameraId: string) {
        const camera = await AccidentCamera.findOne({ cameraId: cameraId.toUpperCase() });
        if (!camera) throw AppError.notFound(`Camera not found: ${cameraId}`);
        return camera;
    }

    static async createCamera(data: Partial<IAccidentCamera>) {
        // Ensure cameraId uniqueness
        const existing = await AccidentCamera.findOne({ cameraId: data.cameraId?.toUpperCase() });
        if (existing) throw AppError.conflict(`Camera ID already exists: ${data.cameraId}`);

        const camera = new AccidentCamera({
            ...data,
            cameraId: data.cameraId?.toUpperCase(),
        });
        await camera.save();
        logger.info(`[CameraService] Camera created: ${camera.cameraId}`);
        return camera;
    }

    static async updateCamera(id: string, updates: Partial<IAccidentCamera>) {
        const camera = await AccidentCamera.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });
        if (!camera) throw AppError.notFound(`Camera not found: ${id}`);
        return camera;
    }

    static async deleteCamera(id: string) {
        const camera = await AccidentCamera.findByIdAndDelete(id);
        if (!camera) throw AppError.notFound(`Camera not found: ${id}`);
        return camera;
    }

    static async toggleEnabled(id: string, enabled: boolean) {
        return CameraService.updateCamera(id, { enabled });
    }

    /**
     * Simulate camera test — pings the status and returns a health result.
     * In production this would attempt an RTSP connection. 
     * In SIMULATION mode, it always returns healthy.
     */
    static async testCamera(id: string): Promise<{ success: boolean; message: string; latencyMs?: number }> {
        const camera = await CameraService.getCameraById(id);

        if (camera.sourceType === 'SIMULATION') {
            // Update heartbeat
            await AccidentCamera.findByIdAndUpdate(id, {
                $set: { status: 'ONLINE', lastHeartbeat: new Date(), lastFrameAt: new Date() }
            });
            return { success: true, message: 'SIMULATION camera is healthy', latencyMs: Math.floor(Math.random() * 50) + 10 };
        }

        // For non-simulation cameras in demo environment, just update heartbeat
        await AccidentCamera.findByIdAndUpdate(id, {
            $set: { lastHeartbeat: new Date() }
        });
        return { success: true, message: 'Camera heartbeat updated. Stream connectivity test requires the AI service.', latencyMs: 0 };
    }

    /**
     * Update camera status from AI worker heartbeat.
     */
    static async updateHeartbeat(cameraId: string, status: 'ONLINE' | 'OFFLINE' | 'ERROR', errorMessage?: string) {
        await AccidentCamera.findOneAndUpdate(
            { cameraId: cameraId.toUpperCase() },
            { $set: { status, lastHeartbeat: new Date(), ...(errorMessage ? { errorMessage } : {}) } }
        );
    }
}
