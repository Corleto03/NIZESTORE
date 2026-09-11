import { NextResponse } from 'next/server';
import { getOrCreateCart } from '@/lib/cart';

export async function GET() {
  try {
    const cart = await getOrCreateCart();
    // Custom serializer to handle BigInt
    const serializedCart = JSON.parse(
      JSON.stringify(cart, (key, value) =>
        typeof value === 'bigint' ? Number(value) : value
      )
    );
    return NextResponse.json(serializedCart);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error retrieving cart' }, { status: 500 });
  }
}
