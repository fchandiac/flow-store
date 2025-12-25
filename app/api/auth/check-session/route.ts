import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/app/actions/auth.server';

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();

    if (session) {
      return NextResponse.json({
        authenticated: true,
        user: {
          id: session.id,
          userName: session.userName,
          rol: session.rol,
          personName: session.personName,
        }
      });
    } else {
      return NextResponse.json({
        authenticated: false
      });
    }
  } catch (error) {
    console.error('[check-session] Error:', error);
    return NextResponse.json({
      authenticated: false,
      error: 'Error checking session'
    }, { status: 500 });
  }
}