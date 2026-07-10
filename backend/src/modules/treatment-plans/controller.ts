import { Request, Response, NextFunction } from 'express';
import * as service from './service';
import { CreateTreatmentPlanSchema, UpdatePlanStatusSchema } from './dto';
import { serializeBigInt } from '../../utils/serialize';

const parseId = (id: any): bigint => {
  if (typeof id === 'string') {
    const parts = id.split('-');
    const numStr = parts[1] || parts[0];
    return BigInt(numStr);
  }
  return BigInt(id);
};

/**
 * Lấy danh sách phác đồ điều trị (có thể lọc theo patientId qua query params)
 */
export async function getTreatmentPlansHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const patientIdStr = req.query.patientId as string;
    const patientId = patientIdStr ? parseId(patientIdStr) : undefined;
    
    const data = await service.getTreatmentPlans(patientId);
    return res.status(200).json({
      success: true,
      data: serializeBigInt(data),
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Lấy chi tiết phác đồ theo ID
 */
export async function getTreatmentPlanByIdHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const planId = parseId(req.params.id);
    const data = await service.getTreatmentPlanById(planId);
    return res.status(200).json({
      success: true,
      data: serializeBigInt(data),
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Khởi tạo phác đồ thủ công
 */
export async function createTreatmentPlanHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const body = CreateTreatmentPlanSchema.parse(req.body);
    const patientId = parseId(body.patientId);
    const dentistId = parseId(body.dentistId);

    const data = await service.createTreatmentPlan({
      patientId,
      dentistId,
      title: body.title,
      estimatedTotalCost: body.estimatedTotalCost,
    });

    return res.status(201).json({
      success: true,
      message: 'Khởi tạo phác đồ điều trị thành công',
      data: serializeBigInt(data),
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Cập nhật trạng thái phác đồ điều trị
 */
export async function updatePlanStatusHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const planId = parseId(req.params.id);
    const { status } = UpdatePlanStatusSchema.parse(req.body);

    const data = await service.updatePlanStatus(planId, status);

    return res.status(200).json({
      success: true,
      message: 'Cập nhật trạng thái phác đồ điều trị thành công',
      data: serializeBigInt(data),
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Lấy danh sách phác đồ theo patientId ở params
 */
export async function getPatientPlansHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const patientId = parseId(req.params.patientId);
    const data = await service.getTreatmentPlans(patientId);
    return res.status(200).json({
      success: true,
      data: serializeBigInt(data),
    });
  } catch (err) {
    return next(err);
  }
}
