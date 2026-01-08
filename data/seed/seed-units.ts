import 'reflect-metadata';
import { getDb, closeDb } from '../db';
import { Unit } from '../entities/Unit';
import { UnitDimension } from '../entities/unit-dimension.enum';
import { DataSource, FindOptionsWhere, In, IsNull, Repository } from 'typeorm';
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
    symbol: 'un',
    name: 'Unidad',
    dimension: UnitDimension.COUNT,
    conversionFactor: 1,
  },
  {
    symbol: 'kg',
    name: 'Kilogramo',
    dimension: UnitDimension.MASS,
    conversionFactor: 1,
  },
  {
    symbol: 'l',
    name: 'Litro',
    dimension: UnitDimension.VOLUME,
    conversionFactor: 1,
  },
  {
    symbol: 'm',
    name: 'Metro',
    dimension: UnitDimension.LENGTH,
    conversionFactor: 1,
  },
];

const DERIVED_UNITS: DerivedUnitSeed[] = [
  {
    symbol: 'cj',
    name: 'Caja (12 unidades)',
    dimension: UnitDimension.COUNT,
    conversionFactor: 12,
    baseSymbol: 'un',
  },
  {
    symbol: 'paq',
    name: 'Paquete (6 unidades)',
    dimension: UnitDimension.COUNT,
    conversionFactor: 6,
    baseSymbol: 'un',
  },
  {
    symbol: 'g',
    name: 'Gramo',
    dimension: UnitDimension.MASS,
    conversionFactor: 0.001,
    baseSymbol: 'kg',
  },
  {
    symbol: 'mL',
    name: 'Mililitro',
    dimension: UnitDimension.VOLUME,
    conversionFactor: 0.001,
    baseSymbol: 'l',
  },
  {
    symbol: 'cm',
    name: 'Centímetro',
    dimension: UnitDimension.LENGTH,
    conversionFactor: 0.01,
    baseSymbol: 'm',
  },
];

const LEGACY_SYMBOLS_BY_NEW: Record<string, string[]> = {
  un: ['UN'],
  kg: ['KG'],
  l: ['LT'],
  m: ['MT'],
  cj: ['CJ'],
  paq: ['PAQ'],
  g: ['G'],
  mL: ['CC'],
  cm: ['CM'],
};

const LEGACY_SYMBOLS = Array.from(
  new Set(Object.values(LEGACY_SYMBOLS_BY_NEW).flat()),
);

async function findUnitBySymbolOrLegacy(
  repo: Repository<Unit>,
  symbol: string,
  withRelations = false,
): Promise<Unit | null> {
  const findOptions = {
    where: { symbol } as FindOptionsWhere<Unit>,
    relations: withRelations ? ['baseUnit'] : undefined,
    withDeleted: true,
  } as const;

  let unit = await repo.findOne(findOptions);
  if (unit) {
    return unit;
  }

  const legacySymbols = LEGACY_SYMBOLS_BY_NEW[symbol];
  if (!legacySymbols || legacySymbols.length === 0) {
    return null;
  }

  unit = await repo.findOne({
    where: legacySymbols.map((legacySymbol) => ({ symbol: legacySymbol })) as FindOptionsWhere<Unit>[],
    relations: withRelations ? ['baseUnit'] : undefined,
    withDeleted: true,
  });

  return unit ?? null;
}

async function ensureBaseUnit(ds: DataSource, seed: BaseUnitSeed): Promise<Unit> {
  const repo = ds.getRepository(Unit);
  let unit = await findUnitBySymbolOrLegacy(repo, seed.symbol);

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
    unit.symbol = seed.symbol;
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
  let unit = await findUnitBySymbolOrLegacy(repo, seed.symbol, true);

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
    unit.symbol = seed.symbol;
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

async function deactivateLegacySymbols(ds: DataSource, preservedIds: Set<string>): Promise<void> {
  if (LEGACY_SYMBOLS.length === 0) {
    return;
  }

  const repo = ds.getRepository(Unit);
  const legacyUnits = await repo.find({
    where: {
      symbol: In(LEGACY_SYMBOLS),
      deletedAt: IsNull(),
    },
  });

  for (const unit of legacyUnits) {
    if (preservedIds.has(unit.id)) {
      continue;
    }
    unit.active = false;
    unit.deletedAt = new Date();
    await repo.save(unit);
  }
}

async function seedUnits() {
  const ds = await getDb();

  try {
    const baseUnitsMap = new Map<string, Unit>();
    const preservedIds = new Set<string>();

    for (const baseSeed of BASE_UNITS) {
      const unit = await ensureBaseUnit(ds, baseSeed);
      preservedIds.add(unit.id);
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
      preservedIds.add(unit.id);
      console.log(`✓ Unidad derivada asegurada: ${unit.symbol} (${unit.name})`);
    }

    await deactivateOrphanDerivedUnits(ds);
    await deactivateLegacySymbols(ds, preservedIds);

    console.log('\n✅ Seed de unidades completado.');
  } finally {
    await closeDb();
  }
}

seedUnits().catch((error) => {
  console.error('✗ Error ejecutando seed de unidades:', error);
  process.exitCode = 1;
});
