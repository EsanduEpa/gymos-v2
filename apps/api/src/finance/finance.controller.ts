import { Body, Controller, ForbiddenException, Get, Param, Post, Query, Req, Res, UnprocessableEntityException, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { financeReadQuerySchema } from '@gymos/contracts';
import { GymAccessGuard, type GymRequest } from '../gym-access.guard.js';
import { FinanceService } from './finance.service.js';
import { PayrollService } from './payroll.service.js';

@Controller('gyms/:slug')
@UseGuards(GymAccessGuard)
export class FinanceController {
  constructor(private readonly finance: FinanceService, private readonly payroll: PayrollService) {}

  @Get('financials/revenue')
  revenue(@Req() request: GymRequest, @Query() query: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'OWNER') throw new ForbiddenException('Gym financials are owner-only');
    const parsed = financeReadQuerySchema.safeParse(query ?? {});
    if (!parsed.success) throw new UnprocessableEntityException('Enter a valid finance window and page');
    return this.finance.revenue(access, parsed.data);
  }

  @Get('financials/deferred-revenue')
  deferredRevenue(@Req() request: GymRequest, @Query() query: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'OWNER') throw new ForbiddenException('Deferred value is owner-only');
    const parsed = financeReadQuerySchema.safeParse(query ?? {});
    if (!parsed.success) throw new UnprocessableEntityException('Enter a valid finance window and page');
    return this.finance.revenue(access, parsed.data);
  }

  @Get('financials/pnl')
  pnl(@Req() request: GymRequest, @Query() query: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'OWNER') throw new ForbiddenException('Gym financials are owner-only');
    return this.finance.pnl(access, query ?? {});
  }

  @Get('me/earnings')
  myEarnings(@Req() request: GymRequest, @Query() query: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'TRAINER') throw new ForbiddenException('Trainer earnings are owner/trainer financial data');
    const parsed = financeReadQuerySchema.safeParse(query ?? {});
    if (!parsed.success) throw new UnprocessableEntityException('Enter a valid earnings window and page');
    return this.finance.myEarnings(access, parsed.data);
  }

  @Get('financials/expenses')
  expenses(@Req() request: GymRequest, @Query() query: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'OWNER') throw new ForbiddenException('Expenses are owner-only');
    return this.finance.listExpenses(access, query ?? {});
  }

  @Post('financials/expenses')
  createExpense(@Req() request: GymRequest, @Body() body: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'OWNER') throw new ForbiddenException('Expenses are owner-only');
    return this.finance.createExpense(access, body);
  }

  @Get('financials/budgets')
  budgets(@Req() request: GymRequest, @Query('month') month: string) {
    const access = request.gymAccess;
    if (!access || access.role !== 'OWNER') throw new ForbiddenException('Budgets are owner-only');
    return this.finance.listBudgets(access, month);
  }

  @Post('financials/export')
  async exportCsv(@Req() request: GymRequest, @Body() body: unknown, @Res() response: Response) {
    const access = request.gymAccess;
    if (!access || access.role !== 'OWNER') throw new ForbiddenException('Finance exports are owner-only');
    const result = await this.finance.exportCsv(access, body ?? {});
    response.status(200).set({ 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="${result.filename}"`,
      'cache-control': 'no-store, private', 'x-content-type-options': 'nosniff' }).send(result.content);
  }

  @Post('financials/budgets')
  setBudget(@Req() request: GymRequest, @Body() body: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'OWNER') throw new ForbiddenException('Budgets are owner-only');
    return this.finance.setBudget(access, body);
  }

  @Get('payroll/periods')
  payrollPeriods(@Req() request: GymRequest) {
    const access = request.gymAccess;
    if (!access || !['OWNER', 'TRAINER'].includes(access.role)) throw new ForbiddenException('Payroll is not available to this role');
    return this.payroll.list(access);
  }

  @Get('payroll/current')
  currentPayroll(@Req() request: GymRequest) {
    const access = request.gymAccess;
    if (!access || !['OWNER', 'TRAINER'].includes(access.role)) throw new ForbiddenException('Current payroll is not available to this role');
    return this.payroll.current(access);
  }

  @Post('payroll/periods/:periodId/close')
  closePayroll(@Req() request: GymRequest, @Param('periodId') periodId: string, @Body() body: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'OWNER') throw new ForbiddenException('Only the owner can close payroll');
    return this.payroll.close(access, periodId, body);
  }

  @Post('payroll/periods/:periodId/approve')
  approvePayroll(@Req() request: GymRequest, @Param('periodId') periodId: string, @Body() body: unknown) {
    const access = request.gymAccess;
    if (!access || access.role !== 'OWNER') throw new ForbiddenException('Only the owner can approve payroll');
    return this.payroll.approve(access, periodId, body);
  }
}
