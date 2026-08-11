/**
 * @file src/modules/dashboard/__tests__/dashboard.integration.spec.ts
 * @description Integration test suite for NestJS Dashboard & Analytics Controller.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from '../dashboard.controller';
import { DashboardService } from '../dashboard.service';
import { Response } from 'express';

describe('NestJS Dashboard Module Integration Suite', () => {
  let controller: DashboardController;
  let service: DashboardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [DashboardService],
    }).compile();

    controller = module.get<DashboardController>(DashboardController);
    service = module.get<DashboardService>(DashboardService);
  });

  it('should fetch standard dashboard summary stats', async () => {
    const stats = await controller.getStats();
    expect(stats).toBeDefined();
    expect(stats.applicationsToday).toBeDefined();
    expect(stats.countryBreakdown).toBeDefined();
  });

  it('should fetch complete analytics metrics', async () => {
    const analytics = await controller.getAnalytics();
    expect(analytics).toBeDefined();
    expect(analytics.totalApplications).toBeDefined();
    expect(analytics.applicationsPerDay.length).toBe(30);
    expect(analytics.countryDistribution.length).toBe(3);
    expect(analytics.matchScoreDistribution).toBeDefined();
  });

  it('should stream CSV export of application tracker data', async () => {
    const mockRes = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as unknown as Response;

    await controller.exportCsv(mockRes);

    expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalled();
  });

  it('should stream PDF export of executive analytics report', async () => {
    const mockRes = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as unknown as Response;

    await controller.exportPdf(mockRes);

    expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalled();
  });
});
