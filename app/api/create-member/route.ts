import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  let createdAuthUserId: string | null = null;

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
      agent_code,
      registered_by_agent_name,
    } = body;

    if (!full_name || !email || !member_number) {
      return NextResponse.json(
        { error: "Full name, email, and member number are required." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanMemberNumber = String(member_number).trim();
    const cleanAgentCode = agent_code ? String(agent_code).trim() : "";

    const { data: existingMember } = await supabaseAdmin
      .from("members")
      .select("id")
      .or(`email.eq.${cleanEmail},member_number.eq.${cleanMemberNumber}`)
      .maybeSingle();

    if (existingMember) {
      return NextResponse.json(
        { error: "A member with this email or member number already exists." },
        { status: 400 }
      );
    }

    let linkedAgentId: string | null = null;
    let linkedAgentName: string | null = registered_by_agent_name || null;

    if (cleanAgentCode) {
      const { data: agentData, error: agentError } = await supabaseAdmin
        .from("agents")
        .select("id, full_name, agent_code, status")
        .eq("agent_code", cleanAgentCode)
        .maybeSingle();

      if (agentError) {
        return NextResponse.json(
          { error: agentError.message },
          { status: 400 }
        );
      }

      if (!agentData) {
        return NextResponse.json(
          { error: "No active agent found with this agent code." },
          { status: 400 }
        );
      }

      if (agentData.status !== "active") {
        return NextResponse.json(
          { error: "This agent is not active." },
          { status: 400 }
        );
      }

      linkedAgentId = agentData.id;
      linkedAgentName = agentData.full_name;
    }

    const shares = Number(total_shares || 0);

    if (Number.isNaN(shares) || shares < 0) {
      return NextResponse.json(
        { error: "Total shares must be a valid number and cannot be negative." },
        { status: 400 }
      );
    }

    const portfolioValue = shares * 10000;
    const temporaryPassword = "Capdcoop123!";

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          full_name,
          role: "member",
        },
      });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || "Could not create auth user." },
        { status: 400 }
      );
    }

    createdAuthUserId = authData.user.id;

    const { data: memberData, error: memberError } = await supabaseAdmin
      .from("members")
      .insert({
        auth_user_id: authData.user.id,
        full_name,
        email: cleanEmail,
        phone,
        id_card_number,
        member_number: cleanMemberNumber,
        membership_status: membership_status || "active",
        total_shares: shares,
        portfolio_value: portfolioValue,
        declared_dividends: Number(declared_dividends || 0),
        must_change_password: true,
        agent_code: cleanAgentCode || null,
        registered_by_agent_name: linkedAgentName,
        registered_by_agent_id: linkedAgentId,
      })
      .select(
        "id, full_name, email, phone, id_card_number, member_number, membership_status, total_shares, portfolio_value, declared_dividends, agent_code, registered_by_agent_name, registered_by_agent_id, created_at"
      )
      .single();

    if (memberError) {
      if (createdAuthUserId) {
        await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
      }

      return NextResponse.json(
        { error: memberError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      member: memberData,
      temporaryPassword,
    });
  } catch {
    if (createdAuthUserId) {
      await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
    }

    return NextResponse.json(
      { error: "Something went wrong while creating member." },
      { status: 500 }
    );
  }
}