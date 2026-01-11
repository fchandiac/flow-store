import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/authOptions';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ authenticated: false });
    }

    const user = session.user as Record<string, unknown>;

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        userName: user.userName ?? user.name,
        rol: user.role,
        personName: user.personName ?? user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('[check-session] Error:', error);
    return NextResponse.json({
      authenticated: false,
      error: 'Error checking session',
    }, { status: 500 });
  }
}