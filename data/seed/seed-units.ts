import 'reflect-metadata';
import { getDb, closeDb } from '../db';
import { Unit } from '../entities/Unit';
import { UnitDimension } from '../entities/unit-dimension.enum';
import { DataSource, IsNull } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

interface BaseUnitSeed {
  symbol: string;
  name: string;
  dimension: UnitDimension;
  conversionFactor: number;
}

interface DerivedUnitSeed extends BaseUnitSeed {
  baseSymbol: string;
}

const BASE_UNITS: BaseUnitSeed[] = [
  {
    symbol: 'UN',
    name: 'Unidad',
    dimension: UnitDimension.COUNT,
    conversionFactor: 1,
  },
  {
    symbol: 'KG',
    name: 'Kilogramo',
    dimension: UnitDimension.MASS,
    conversionFactor: 1,
  },
  {
    symbol: 'LT',
    name: 'Litro',
    dimension: UnitDimension.VOLUME,
    conversionFactor: 1,
  },
  {
    symbol: 'MT',
    name: 'Metro',
    dimension: UnitDimension.LENGTH,
    conversionFactor: 1,
  },
];

const DERIVED_UNITS: DerivedUnitSeed[] = [
  {
    symbol: 'CJ',
    name: 'Caja (12 unidades)',
    dimension: UnitDimension.COUNT,
    conversionFactor: 12,
    baseSymbol: 'UN',
  },
  {
    symbol: 'PAQ',
    name: 'Paquete (6 unidades)',
    dimension: UnitDimension.COUNT,
    conversionFactor: 6,
    baseSymbol: 'UN',
  },
  {
    symbol: 'G',
    name: 'Gramo',
    dimension: UnitDimension.MASS,
    conversionFactor: 0.001,
    baseSymbol: 'KG',
  },
  {
    symbol: 'CC',
    name: 'Centímetro cúbico',
    dimension: UnitDimension.VOLUME,
    conversionFactor: 0.001,
    baseSymbol: 'LT',
  },
  {
    symbol: 'CM',
    name: 'Centímetro',
    dimension: UnitDimension.LENGTH,
    conversionFactor: 0.01,
    baseSymbol: 'MT',
  },
];

async function ensureBaseUnit(ds: DataSource, seed: BaseUnitSeed): Promise<Unit> {
  const repo = ds.getRepository(Unit);
  let unit = await repo.findOne({
    where: { symbol: seed.symbol },
    withDeleted: true,
  });

  if (!unit) {
    unit = repo.create({
      id: uuidv4(),
      name: seed.name,
      symbol: seed.symbol,
      dimension: seed.dimension,
      conversionFactor: seed.conversionFactor,
      isBase: true,
      baseUnitId: null,
      active: true,
    });
  } else {
    unit.name = seed.name;
    unit.dimension = seed.dimension;
    unit.conversionFactor = seed.conversionFactor;
    unit.isBase = true;
    unit.active = true;
    unit.baseUnit = null;
    unit.baseUnitId = null;
    unit.deletedAt = undefined;
  }

  await repo.save(unit);
  return unit;
}

async function ensureDerivedUnit(ds: DataSource, seed: DerivedUnitSeed, baseUnit: Unit): Promise<Unit> {
  const repo = ds.getRepository(Unit);
  let unit = await repo.findOne({
    where: { symbol: seed.symbol },
    relations: ['baseUnit'],
    withDeleted: true,
  });

  if (!unit) {
    unit = repo.create({
      id: uuidv4(),
      name: seed.name,
      symbol: seed.symbol,
      dimension: seed.dimension,
      conversionFactor: seed.conversionFactor,
      isBase: false,
      baseUnit,
      active: true,
    });
  } else {
    unit.name = seed.name;
    unit.dimension = seed.dimension;
    unit.conversionFactor = seed.conversionFactor;
    unit.isBase = false;
    unit.baseUnit = baseUnit;
    unit.baseUnitId = baseUnit.id;
    unit.active = true;
    unit.deletedAt = undefined;
  }

  await repo.save(unit);
  return unit;
}

async function deactivateOrphanDerivedUnits(ds: DataSource): Promise<void> {
  const repo = ds.getRepository(Unit);
  const orphanUnits = await repo.find({
    where: {
      isBase: false,
      baseUnit: IsNull(),
      deletedAt: IsNull(),
    },
  });

  if (orphanUnits.length === 0) {
    return;
  }

  for (const unit of orphanUnits) {
    unit.active = false;
    unit.deletedAt = new Date();
    await repo.save(unit);
  }
}

async function seedUnits() {
  const ds = await getDb();

  try {
    const baseUnitsMap = new Map<string, Unit>();

    for (const baseSeed of BASE_UNITS) {
      const unit = await ensureBaseUnit(ds, baseSeed);
      baseUnitsMap.set(baseSeed.symbol, unit);
      console.log(`✓ Unidad base asegurada: ${unit.symbol} (${unit.name})`);
    }

    for (const derivedSeed of DERIVED_UNITS) {
      const baseUnit = baseUnitsMap.get(derivedSeed.baseSymbol);
      if (!baseUnit) {
        console.warn(`⚠ Base unit ${derivedSeed.baseSymbol} no disponible. Se omite ${derivedSeed.symbol}.`);
        continue;
      }

      const unit = await ensureDerivedUnit(ds, derivedSeed, baseUnit);
      console.log(`✓ Unidad derivada asegurada: ${unit.symbol} (${unit.name})`);
    }

    await deactivateOrphanDerivedUnits(ds);

    console.log('\n✅ Seed de unidades completado.');
  } finally {
    await closeDb();
  }
}

seedUnits().catch((error) => {
  console.error('✗ Error ejecutando seed de unidades:', error);
  process.exitCode = 1;
});
