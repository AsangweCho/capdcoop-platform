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

    const shares = Number(total_shares || 0);
    const dividends = Number(declared_dividends || 0);

    if (Number.isNaN(shares) || shares < 0) {
      return NextResponse.json(
        { error: "Total shares must be a valid number and cannot be negative." },
        { status: 400 }
      );
    }

    if (Number.isNaN(dividends) || dividends < 0) {
      return NextResponse.json(
        {
          error:
            "Declared dividends must be a valid number and cannot be negative.",
        },
        { status: 400 }
      );
    }

    const { data: existingMember, error: existingMemberError } =
      await supabaseAdmin
        .from("members")
        .select("id")
        .or(`email.eq.${cleanEmail},member_number.eq.${cleanMemberNumber}`)
        .maybeSingle();

    if (existingMemberError) {
      return NextResponse.json(
        { error: existingMemberError.message },
        { status: 400 }
      );
    }

    if (existingMember) {
      return NextResponse.json(
        { error: "A member with this email or member number already exists." },
        { status: 400 }
      );
    }

    let linkedAgentId: string | null = null;
    let linkedAgentName: string | null = registered_by_agent_name || null;
    let linkedAgentCommissionRate = 10;

    if (cleanAgentCode) {
      const { data: agentData, error: agentError } = await supabaseAdmin
        .from("agents")
        .select("id, full_name, agent_code, commission_rate, status")
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
      linkedAgentCommissionRate = Number(agentData.commission_rate || 10);
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
        full_name: String(full_name).trim(),
        email: cleanEmail,
        phone: phone ? String(phone).trim() : null,
        id_card_number: id_card_number ? String(id_card_number).trim() : null,
        member_number: cleanMemberNumber,
        membership_status: membership_status || "active",
        total_shares: shares,
        portfolio_value: portfolioValue,
        declared_dividends: dividends,
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

    if (linkedAgentId && shares > 0) {
      const baseAmount = shares * 10000;
      const commissionAmount =
        baseAmount * (linkedAgentCommissionRate / 100);

      const { error: commissionError } = await supabaseAdmin
        .from("agent_commissions")
        .insert({
          agent_id: linkedAgentId,
          member_id: memberData.id,
          payment_id: null,
          commission_type: "registration_share",
          base_amount: baseAmount,
          commission_rate: linkedAgentCommissionRate,
          commission_amount: commissionAmount,
          status: "pending",
        });

      if (commissionError) {
        console.error("AGENT COMMISSION ERROR:", commissionError);
      }
    }

    return NextResponse.json({
      member: memberData,
      temporaryPassword,
    });
  } catch (error) {
    console.error("CREATE MEMBER ERROR:", error);

    if (createdAuthUserId) {
      await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId);
    }

    return NextResponse.json(
      { error: "Something went wrong while creating member." },
      { status: 500 }
    );
  }
}