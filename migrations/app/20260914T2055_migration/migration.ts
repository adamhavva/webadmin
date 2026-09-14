#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/973db2799b29f4a10cad2db8b70617b072ebf997090f8737b011521588685b12/contract';
import endContract from '../../snapshots/973db2799b29f4a10cad2db8b70617b072ebf997090f8737b011521588685b12/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'inventoryBatch',
        columns: [
          col('batchNumber', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('inventoryItemId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('quantity', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('totalCost', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('unitCost', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
        ],
        constraints: [primaryKey(['id'])],
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
          col('locationId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('quantity', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('reservedQuantity', 'numeric', {
            notNull: true,
            default: lit('0'),
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
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'inventoryLocation',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'inventoryTransfer',
        columns: [
          col('batchId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('fromLocationId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('quantity', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('toLocationId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
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
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('finishedProductItemId', 'int4', {
            notNull: true,
            codecRef: { codecId: 'pg/int4@1' },
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
          col('productId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
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
          col('productId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('quantity', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('recipeId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('totalHpp', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
          col('unitHpp', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
        ],
        constraints: [primaryKey(['id'])],
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
          col('totalCost', 'numeric', { notNull: true, codecRef: { codecId: 'pg/numeric@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'inventoryBatchStock',
        constraint: 'inventoryBatchStock_batchId_locationId_key',
        columns: ['batchId', 'locationId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'product',
        constraint: 'product_finishedProductItemId_key',
        columns: ['finishedProductItemId'],
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
      this.createIndex({
        schema: 'public',
        table: 'inventoryBatch',
        index: 'inventoryBatch_inventoryItemId_idx_ddbb7ccf',
        columns: ['inventoryItemId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'inventoryBatchStock',
        index: 'inventoryBatchStock_batchId_idx_84d4b0b9',
        columns: ['batchId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'inventoryBatchStock',
        index: 'inventoryBatchStock_locationId_idx_7aae3038',
        columns: ['locationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'inventoryTransfer',
        index: 'inventoryTransfer_batchId_idx_84d4b0b9',
        columns: ['batchId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'inventoryTransfer',
        index: 'inventoryTransfer_fromLocationId_idx_b4e88e40',
        columns: ['fromLocationId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'inventoryTransfer',
        index: 'inventoryTransfer_toLocationId_idx_d9ceb078',
        columns: ['toLocationId'],
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
        index: 'production_productId_idx_5858600a',
        columns: ['productId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'production',
        index: 'production_recipeId_idx_037d8d32',
        columns: ['recipeId'],
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
        index: 'restock_batchId_idx_84d4b0b9',
        columns: ['batchId'],
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
        table: 'inventoryBatchStock',
        foreignKey: {
          name: 'inventoryBatchStock_locationId_fkey',
          columns: ['locationId'],
          references: { schema: 'public', table: 'inventoryLocation', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'inventoryTransfer',
        foreignKey: {
          name: 'inventoryTransfer_batchId_fkey',
          columns: ['batchId'],
          references: { schema: 'public', table: 'inventoryBatch', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'inventoryTransfer',
        foreignKey: {
          name: 'inventoryTransfer_fromLocationId_fkey',
          columns: ['fromLocationId'],
          references: { schema: 'public', table: 'inventoryLocation', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'inventoryTransfer',
        foreignKey: {
          name: 'inventoryTransfer_toLocationId_fkey',
          columns: ['toLocationId'],
          references: { schema: 'public', table: 'inventoryLocation', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'product',
        foreignKey: {
          name: 'product_finishedProductItemId_fkey',
          columns: ['finishedProductItemId'],
          references: { schema: 'public', table: 'inventoryItem', columns: ['id'] },
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
          name: 'production_productId_fkey',
          columns: ['productId'],
          references: { schema: 'public', table: 'product', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'production',
        foreignKey: {
          name: 'production_recipeId_fkey',
          columns: ['recipeId'],
          references: { schema: 'public', table: 'productRecipe', columns: ['id'] },
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
