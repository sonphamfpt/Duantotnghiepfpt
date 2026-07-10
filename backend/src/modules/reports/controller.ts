import { Request, Response, NextFunction } from 'express';
import * as reportsService from './service';
import { serializeBigInt } from '../../utils/serialize';

export class ReportsController {
  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
      
      let start: Date | undefined;
      let end: Date | undefined;

      if (startDate) {
        start = new Date(startDate);
        if (isNaN(start.getTime())) {
          start = undefined;
        }
      }

      if (endDate) {
        end = new Date(endDate);
        if (isNaN(end.getTime())) {
          end = undefined;
        }
      }

      const stats = await reportsService.getDashboardStatistics(start, end);

      return res.status(200).json({
        success: true,
        data: serializeBigInt(stats),
      });
    } catch (error) {
      return next(error);
    }
  }
}

export const reportsController = new ReportsController();
