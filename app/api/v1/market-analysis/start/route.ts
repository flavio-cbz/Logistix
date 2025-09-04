// app/api/v1/market-analysis/start/route.ts

import { NextRequest } from "next/server";
import { MarketAnalysisRequestSchema } from "@/lib/validations/vinted-market-analysis-schemas";
import { startMarketAnalysis } from "@/lib/services/market-analysis";
import { ApiError } from "@/lib/services/validation/error-types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = MarketAnalysisRequestSchema.safeParse(body);

    if (!validation.success) {
      return Response.json(
        {
          ok: false,
          error: {
            code: "BAD_REQUEST",
            _message: "Invalid request payload",
            details: validation.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const result = await startMarketAnalysis(validation.data);

    return Response.json(
      {
        ok: true,
        _data: result,
      },
      { status: 201 }
    );
  } catch (err: any) {
    if (err instanceof ApiError) {
      return Response.json(
        {
          ok: false,
          error: {
            code: err.code,
            _message: err.message,
          },
        },
        { status: err.statusCode || 500 }
      );
    }
    return Response.json(
      {
        ok: false,
        error: {
          code: "INTERNAL",
          _message: "Internal server error",
        },
      },
      { status: 500 }
    );
  }
}