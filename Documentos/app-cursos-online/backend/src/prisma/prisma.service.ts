import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super();

    this.$use(async (params, next) => {
      const softDeleteModels = ['User', 'Course'];

      if (params.model && softDeleteModels.includes(params.model)) {
        if (params.action === 'delete') {
          params.action = 'update';
          params.args['data'] = { deleted_at: new Date() };
        }
        if (params.action === 'deleteMany') {
          params.action = 'updateMany';
          if (params.args.data !== undefined) {
            params.args.data['deleted_at'] = new Date();
          } else {
            params.args['data'] = { deleted_at: new Date() };
          }
        }
        if (params.action === 'findFirst' || params.action === 'findMany') {
          if (!params.args) params.args = {};
          if (params.args.where) {
            if (params.args.where.deleted_at === undefined) {
              params.args.where.deleted_at = null;
            }
          } else {
            params.args.where = { deleted_at: null };
          }
        }
        if (params.action === 'findUnique' || params.action === 'findUniqueOrThrow') {
          params.action = 'findFirst';
          if (!params.args) params.args = {};
          params.args.where = { ...params.args.where, deleted_at: null };
        }
      }

      return next(params);
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
