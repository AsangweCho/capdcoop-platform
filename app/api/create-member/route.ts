import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const body = await request.json();

 const {
  full_name,
  email,
  phone,
  id_card_number,
  member_number,
  membership_status,
  total_shares,
  declared_dividends,
} = body;

    if (!full_name || !email || !member_number) {
      return NextResponse.json(
        { error: "Full name, email, and member number are required." },
        { status: 400 }
      );
    }

    const temporaryPassword = "Capdcoop123!";

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          full_name,
          role: "member",
        },
      });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const shares = Number(total_shares || 0);
    const portfolioValue = shares * 10000;

    const { data: memberData, error: memberError } = await supabaseAdmin
      .from("members")
      .insert({
        auth_user_id: authData.user.id,
        full_name,
        email,
        phone,
        id_card_number,
        member_number,
        membership_status: membership_status || "active",
        total_shares: shares,
        portfolio_value: portfolioValue,
        declared_dividends: Number(declared_dividends || 0),
        must_change_password: true,
      })
      .select(
  "id, full_name, email, phone, id_card_number, member_number, membership_status, total_shares, portfolio_value, declared_dividends, created_at"
)
      .single();

    if (memberError) {
      return NextResponse.json({ error: memberError.message }, { status: 400 });
    }

    return NextResponse.json({
      member: memberData,
      temporaryPassword,
    });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong while creating member." },
      { status: 500 }
    );
  }
}