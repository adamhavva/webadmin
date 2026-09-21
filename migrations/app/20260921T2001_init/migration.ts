#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/7b74828b2f4e2932b7c2902d61610752a91643638a4b86a4cee0b99517160c74/contract';
import endContract from '../../snapshots/7b74828b2f4e2932b7c2902d61610752a91643638a4b86a4cee0b99517160c74/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'inventoryBatch',
        columns: [
          col('batchCode', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('inventoryItemId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('quantity', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('remainingQuantity', 'numeric', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('sourceType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('totalCost', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('unitCost', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'inventoryBatch_sourceType_check_0c96c6db',
            "\"sourceType\" IN ('RESTOCK', 'PRODUCTION')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'inventoryBatchStock',
        columns: [
          col('batchId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('quantity', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('remainingQuantity', 'numeric', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'inventoryItem',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('unit', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'inventoryItem_type_check_3fb4b103',
            "\"type\" IN ('SEMI_FINISHED', 'DIRECT_USE')",
          ),
          checkExpression('inventoryItem_unit_check_61ddd923', "\"unit\" IN ('ML', 'PCS')"),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'product',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sellingPrice', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'productCostHistory',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('hpp', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('productId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'productRecipe',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('productId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('version', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'production',
        columns: [
          col('batchId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('inventoryItemId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('outputQuantity', 'numeric', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1' },
          }),
          col('totalCost', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('unitCost', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'productionComponent',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('inventoryItemId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('productionId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('quantity', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('totalCost', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('unit', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('unitCost', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('productionComponent_unit_check_61ddd923', "\"unit\" IN ('ML', 'PCS')"),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'recipeItem',
        columns: [
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('inventoryItemId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('quantity', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('recipeId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'restock',
        columns: [
          col('batchId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('inventoryItemId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('quantity', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('supplierName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('totalCost', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('unitCost', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'user',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('email', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('firebaseUid', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('role', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('ACTIVE'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'user_role_check_910f31ad',
            "\"role\" IN ('ADMIN', 'CUSTOMER', 'BARISTA')",
          ),
          checkExpression('user_status_check_ee520df2', "\"status\" IN ('ACTIVE', 'INACTIVE')"),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'inventoryBatch',
        constraint: 'inventoryBatch_batchCode_key',
        columns: ['batchCode'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'inventoryBatchStock',
        constraint: 'inventoryBatchStock_batchId_key',
        columns: ['batchId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'productRecipe',
        constraint: 'productRecipe_productId_version_key',
        columns: ['productId', 'version'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'production',
        constraint: 'production_batchId_key',
        columns: ['batchId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'restock',
        constraint: 'restock_batchId_key',
        columns: ['batchId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'user',
        constraint: 'user_firebaseUid_key',
        columns: ['firebaseUid'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'inventoryBatch',
        index: 'inventoryBatch_inventoryItemId_createdAt_idx_e33c825e',
        columns: ['inventoryItemId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'inventoryBatch',
        index: 'inventoryBatch_inventoryItemId_idx_ddbb7ccf',
        columns: ['inventoryItemId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'productCostHistory',
        index: 'productCostHistory_productId_idx_5858600a',
        columns: ['productId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'productRecipe',
        index: 'productRecipe_productId_idx_5858600a',
        columns: ['productId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'production',
        index: 'production_inventoryItemId_idx_ddbb7ccf',
        columns: ['inventoryItemId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'productionComponent',
        index: 'productionComponent_inventoryItemId_idx_ddbb7ccf',
        columns: ['inventoryItemId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'productionComponent',
        index: 'productionComponent_productionId_idx_76cd023d',
        columns: ['productionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'recipeItem',
        index: 'recipeItem_inventoryItemId_idx_ddbb7ccf',
        columns: ['inventoryItemId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'recipeItem',
        index: 'recipeItem_recipeId_idx_037d8d32',
        columns: ['recipeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'restock',
        index: 'restock_inventoryItemId_idx_ddbb7ccf',
        columns: ['inventoryItemId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'inventoryBatch',
        foreignKey: {
          name: 'inventoryBatch_inventoryItemId_fkey',
          columns: ['inventoryItemId'],
          references: { schema: 'public', table: 'inventoryItem', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'inventoryBatchStock',
        foreignKey: {
          name: 'inventoryBatchStock_batchId_fkey',
          columns: ['batchId'],
          references: { schema: 'public', table: 'inventoryBatch', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'productCostHistory',
        foreignKey: {
          name: 'productCostHistory_productId_fkey',
          columns: ['productId'],
          references: { schema: 'public', table: 'product', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'productRecipe',
        foreignKey: {
          name: 'productRecipe_productId_fkey',
          columns: ['productId'],
          references: { schema: 'public', table: 'product', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'production',
        foreignKey: {
          name: 'production_inventoryItemId_fkey',
          columns: ['inventoryItemId'],
          references: { schema: 'public', table: 'inventoryItem', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'production',
        foreignKey: {
          name: 'production_batchId_fkey',
          columns: ['batchId'],
          references: { schema: 'public', table: 'inventoryBatch', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'productionComponent',
        foreignKey: {
          name: 'productionComponent_productionId_fkey',
          columns: ['productionId'],
          references: { schema: 'public', table: 'production', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'productionComponent',
        foreignKey: {
          name: 'productionComponent_inventoryItemId_fkey',
          columns: ['inventoryItemId'],
          references: { schema: 'public', table: 'inventoryItem', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'recipeItem',
        foreignKey: {
          name: 'recipeItem_recipeId_fkey',
          columns: ['recipeId'],
          references: { schema: 'public', table: 'productRecipe', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'recipeItem',
        foreignKey: {
          name: 'recipeItem_inventoryItemId_fkey',
          columns: ['inventoryItemId'],
          references: { schema: 'public', table: 'inventoryItem', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'restock',
        foreignKey: {
          name: 'restock_inventoryItemId_fkey',
          columns: ['inventoryItemId'],
          references: { schema: 'public', table: 'inventoryItem', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'restock',
        foreignKey: {
          name: 'restock_batchId_fkey',
          columns: ['batchId'],
          references: { schema: 'public', table: 'inventoryBatch', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
