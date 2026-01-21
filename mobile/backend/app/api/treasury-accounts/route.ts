import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../data/db';
import { TreasuryAccount } from '../../../../../data/entities/TreasuryAccount';

export async function GET() {
  try {
    const dataSource = await getDb();
    const treasuryAccountRepo = dataSource.getRepository(TreasuryAccount);

    const accounts = await treasuryAccountRepo.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });

    const response = accounts.map((account: TreasuryAccount) => ({
      id: account.id,
      name: account.name,
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      type: account.type,
    }));

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Error fetching treasury accounts:', error);
    return NextResponse.json(
      { success: false, message: 'Error al obtener cuentas bancarias' },
      { status: 500 }
    );
  }
}