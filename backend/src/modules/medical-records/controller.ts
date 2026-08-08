import { Request, Response, NextFunction } from 'express';
import * as medicalRecordsService from './service';
import { CreateMedicalRecordSchema } from './dto';

const parseId = (id: any): bigint => {
  if (typeof id === 'string') {
    const parts = id.split('-');
    const numStr = parts[1] || parts[0];
    return BigInt(numStr);
  }
  return BigInt(id);
};

export async function getPatientRecordsHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const patientId = parseId(req.params.patientId);
    const data = await medicalRecordsService.getPatientRecords(patientId);
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    return next(err);
  }
}

export async function getAllRecordsHandler(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const data = await medicalRecordsService.getAllRecords();
    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    return next(err);
  }
}


export async function createRecordHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // 1. Validate payload structure
    const body = CreateMedicalRecordSchema.parse(req.body);

    const patientDbId = parseId(body.patientId);
    const dentistDbId = parseId(body.dentistId);
    const queueTicketDbId = body.queueTicketId ? parseId(body.queueTicketId) : undefined;
    const treatmentPlanDbId = body.treatmentPlanId ? parseId(body.treatmentPlanId) : undefined;
    const performedServicesDbIds = body.performedServices.map(parseId);

    // 2. Call service
    const data = await medicalRecordsService.createRecord({
      patientId: patientDbId,
      dentistId: dentistDbId,
      queueTicketId: queueTicketDbId,
      notes: body.notes,
      performedServices: performedServicesDbIds,
      sessionType: body.sessionType,
      treatmentPlanId: treatmentPlanDbId,
      teeth: body.teeth,
    });

    return res.status(201).json({
      success: true,
      message: 'Khởi tạo hồ sơ bệnh án thành công',
      data,
    });
  } catch (err) {
    return next(err);
  }
}
