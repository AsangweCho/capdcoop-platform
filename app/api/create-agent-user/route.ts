import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const { agent_id } = await request.json();

    if (!agent_id) {
      return NextResponse.json(
        { error: "Agent ID is required." },
        { status: 400 }
      );
    }

    const { data: agent, error: agentError } = await supabaseAdmin
      .from("agents")
      .select("id, full_name, email, auth_user_id")
      .eq("id", agent_id)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: agentError?.message || "Agent not found." },
        { status: 404 }
      );
    }

    if (!agent.email) {
      return NextResponse.json(
        { error: "Agent must have an email before login can be created." },
        { status: 400 }
      );
    }

    if (agent.auth_user_id) {
      return NextResponse.json(
        { error: "This agent already has a login account." },
        { status: 400 }
      );
    }

    const temporaryPassword = "Capdcoop123!";

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: agent.email.trim().toLowerCase(),
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          full_name: agent.full_name,
          role: "agent",
        },
      });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || "Could not create agent login." },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("agents")
      .update({
        auth_user_id: authData.user.id,
        must_change_password: true,
      })
      .eq("id", agent.id);

    if (updateError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);

      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: "Agent login created successfully.",
      temporaryPassword,
    });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong while creating agent login." },
      { status: 500 }
    );
  }
}