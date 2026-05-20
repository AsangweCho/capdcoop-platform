import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const secret = request.headers.get("x-collection-secret");

    if (!secret || secret !== process.env.COLLECTION_SYNC_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const collections = Array.isArray(body.collections) ? body.collections : [];

    if (collections.length === 0) {
      return NextResponse.json(
        { error: "No collections submitted." },
        { status: 400 }
      );
    }

    const rows = collections.map((item: any) => ({
      collection_date: item.collection_date,
      collector_email: item.collector_email,
      member_number: item.member_number,
      member_name: item.member_name,
      loan_id: item.loan_id || null,
      business_name: item.business_name,
      expected_amount: Number(item.expected_amount || 0),
      amount_collected: Number(item.amount_collected || 0),
      payment_method: item.payment_method,
      reference: item.reference,
      collection_status: item.collection_status || "pending",
      notes: item.notes,
      external_row_id: item.external_row_id,
      synced_by: item.collector_email,
    }));

    const { data, error } = await supabaseAdmin
      .from("daily_collections")
      .insert(rows)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      inserted: data?.length || 0,
      records: data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Collection sync failed." },
      { status: 500 }
    );
  }
}