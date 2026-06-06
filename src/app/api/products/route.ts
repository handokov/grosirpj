import { products, flashSaleProducts } from "@/lib/data";

export async function GET() {
  return Response.json({ products, flashSaleProducts });
}
