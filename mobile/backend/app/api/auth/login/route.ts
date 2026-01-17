import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDataSource } from '../../../../src/db';
import { User } from '@/data/entities/User';

interface LoginRequest {
  userName?: string;
  password?: string;
}

export async function POST(request: Request) {
  try {
    const body: LoginRequest = await request.json();
    const userName = body.userName?.trim();
    const password = body.password ?? '';

    if (!userName || password.length === 0) {
      return NextResponse.json(
        { success: false, message: 'userName y password son obligatorios.' },
        { status: 400 },
      );
    }

    const dataSource = await getDataSource();
    const userRepo = dataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { userName } });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Usuario o contraseña inválidos.' },
        { status: 401 },
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.pass);

    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, message: 'Usuario o contraseña inválidos.' },
        { status: 401 },
      );
    }

    const { pass, ...safeUser } = user;

    return NextResponse.json({ success: true, user: safeUser });
  } catch (error) {
    console.error('[auth/login] Error processing request', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor.' },
      { status: 500 },
    );
  }
}
